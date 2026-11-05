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
  String? _error;
  String? _errorKey;

  bool get booting => _booting;
  bool get busy => _busy;

  /// A server-supplied message (already localized by the API when it can).
  String? get error => _error;

  /// A local message key to resolve through [LocaleController] (e.g. role
  /// denial), so the text follows the selected language.
  String? get errorKey => _errorKey;

  bool get isAuthenticated => session.isAuthenticated;
  AppUser? get user => session.user == null ? null : AppUser(session.user!);

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

  Future<void> logout() async {
    await client.logout();
    notifyListeners();
  }
}
