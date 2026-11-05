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

  bool get booting => _booting;
  bool get busy => _busy;
  String? get error => _error;
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
    notifyListeners();
    try {
      final data = await client.login(identifier, password, tenantSlug: tenantSlug);
      final roles = ((data['user'] as Map)['roles'] as List?)?.cast<String>() ?? const [];
      if (requiredRoles.isNotEmpty && !roles.any(requiredRoles.contains)) {
        await client.logout();
        _error = 'هذا الحساب غير مصرّح له بالدخول إلى هذا التطبيق';
        return false;
      }
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (_) {
      _error = 'تعذّر تسجيل الدخول، حاول مرة أخرى';
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
