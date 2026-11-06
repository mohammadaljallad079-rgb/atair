import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'api_exception.dart';
import 'endpoints.dart';
import 'models.dart';
import 'session.dart';

/// Holds app-wide auth state and exposes login/logout/bootstrap.
///
/// The three mobile apps each construct one and gate their navigation on
/// [isAuthenticated]. The expected roles are enforced client-side for a clear
/// error, while the backend boundary guards remain the real security boundary.
class AuthController extends ChangeNotifier {
  AuthController({List<String> requiredRoles = const [], ApiClient? client})
      : requiredRoles = requiredRoles,
        client = client ?? ApiClient() {
    api = AtairApi(this.client);
  }

  /// Roles permitted to enter this app. Empty means "any authenticated user".
  final List<String> requiredRoles;
  final ApiClient client;
  late final AtairApi api;

  SessionStore get session => client.session;

  bool _booting = true;
  bool _busy = false;
  bool _guest = false;
  String? _error;
  String? _errorKey;

  bool get booting => _booting;
  bool get busy => _busy;

  /// True when the user chose to browse without an account. Guests can reach
  /// public screens only; any protected action must call [requireLogin].
  bool get isGuest => _guest;

  /// A server-supplied message (already localized by the API when it can).
  String? get error => _error;

  /// A local message key to resolve through [LocaleController] (e.g. role
  /// denial), so the text follows the selected language.
  String? get errorKey => _errorKey;

  bool get isAuthenticated => session.isAuthenticated;
  AppUser? get user => session.user == null ? null : AppUser(session.user!);

  /// Enter guest mode: no session, only public screens.
  void continueAsGuest() {
    _guest = true;
    _error = null;
    _errorKey = null;
    notifyListeners();
  }

  /// Leave guest mode (e.g. the user tapped "Sign in" from the guest shell).
  void exitGuest() {
    if (!_guest) return;
    _guest = false;
    notifyListeners();
  }

  Future<void> bootstrap() async {
    await session.load();
    _booting = false;
    notifyListeners();
  }

  Future<bool> login(String identifier, String password, {String? tenantSlug}) async {
    _busy = true;
    _error = null;
    _errorKey = null;
    notifyListeners();
    try {
      final data = await client.login(identifier, password, tenantSlug: tenantSlug);
      final roles = ((data['user'] as Map)['roles'] as List?)?.cast<String>() ?? const [];
      if (requiredRoles.isNotEmpty && !roles.any(requiredRoles.contains)) {
        await client.logout();
        _errorKey = 'login.roleDenied';
        return false;
      }
      _guest = false;
      return true;
    } on ApiException catch (e) {
      // Network failures carry a stable code so the UI can localize them; other
      // errors keep the server message verbatim.
      _error = e.message;
      _errorKey = e.code == 'TIMEOUT'
          ? 'net.timeout'
          : e.code == 'NETWORK_ERROR'
              ? 'net.error'
              : null;
      return false;
    } catch (_) {
      _errorKey = 'login.failed';
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Create a customer account and sign in with the tokens the server returns.
  ///
  /// Registration already issues a session (User + linked Customer created in
  /// one transaction), so we persist those tokens directly instead of making a
  /// second login round-trip. That removes a whole class of failures where the
  /// account is created but the follow-up login is throttled or rejected.
  Future<bool> register({
    required String fullName,
    required String phone,
    required String password,
    String? email,
    String? tenantSlug,
  }) async {
    _busy = true;
    _error = null;
    _errorKey = null;
    notifyListeners();
    try {
      final data = await api.registerCustomer(
        fullName: fullName,
        phone: phone,
        password: password,
        email: email,
        tenantSlug: tenantSlug,
      );
      final accessToken = data['accessToken'] as String?;
      final refreshToken = data['refreshToken'] as String?;
      final user = (data['user'] as Map?)?.cast<String, dynamic>();
      if (accessToken == null || refreshToken == null || user == null) {
        _errorKey = 'register.failed';
        return false;
      }
      await client.session.save(
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: user,
      );
      _guest = false;
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _errorKey = _registerErrorKey(e);
      return false;
    } catch (_) {
      _errorKey = 'register.failed';
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Maps a registration failure to a localizable key so the user sees the
  /// reason in their own language instead of a raw server string.
  String? _registerErrorKey(ApiException e) {
    switch (e.code) {
      case 'TIMEOUT':
        return 'net.timeout';
      case 'NETWORK_ERROR':
        return 'net.error';
      case 'ACCOUNT_EXISTS':
        return 'register.accountExists';
      case 'TENANT_REQUIRED':
        return 'register.tenantRequired';
      default:
        return null; // keep the server message verbatim
    }
  }

  Future<void> logout() async {
    await client.logout();
    _guest = false;
    notifyListeners();
  }
}
