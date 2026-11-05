import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists the refresh token and the last-known user across app restarts.
///
/// The access token is kept **in memory only** (short-lived), mirroring the
/// web apps: the refresh token is the durable credential and it is rotated
/// server-side on every refresh.
///
/// The refresh token is a bearer credential, so it is written to
/// platform-backed secure storage (Android Keystore / iOS Keychain) and never
/// to plain `shared_preferences`. Only the non-sensitive, last-known user
/// snapshot (name, roles) lives in `shared_preferences`, purely so the UI can
/// render instantly on launch.
class SessionStore {
  SessionStore({FlutterSecureStorage? secureStorage})
      : _secure = secureStorage ??
            const FlutterSecureStorage(
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  static const _kRefresh = 'atair.refreshToken';
  static const _kUser = 'atair.user';

  final FlutterSecureStorage _secure;

  String? accessToken;
  Map<String, dynamic>? user;
  String? _cachedRefresh;

  Future<void> load() async {
    // A failure to reach secure storage must not crash the app — treat it as
    // "no stored session" and fall back to the login screen.
    try {
      _cachedRefresh = await _secure.read(key: _kRefresh);
    } catch (_) {
      _cachedRefresh = null;
    }
    final prefs = await SharedPreferences.getInstance();
    user = _decodeUser(prefs.getString(_kUser));
  }

  String? get refreshToken => _cachedRefresh;

  bool get isAuthenticated => accessToken != null || _cachedRefresh != null;

  String? get role {
    final roles = (user?['roles'] as List?)?.cast<String>() ?? const [];
    if (roles.contains('driver')) return 'driver';
    if (roles.contains('merchant_owner') || roles.contains('merchant')) return 'merchant';
    if (roles.contains('customer')) return 'customer';
    return roles.isEmpty ? null : roles.first;
  }

  Future<void> save({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> user,
  }) async {
    this.accessToken = accessToken;
    this.user = user;
    _cachedRefresh = refreshToken;
    await _secure.write(key: _kRefresh, value: refreshToken);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kUser, jsonEncode(user));
  }

  Future<void> updateTokens({required String accessToken, required String refreshToken}) async {
    this.accessToken = accessToken;
    _cachedRefresh = refreshToken;
    await _secure.write(key: _kRefresh, value: refreshToken);
  }

  Future<void> clear() async {
    accessToken = null;
    user = null;
    _cachedRefresh = null;
    try {
      await _secure.delete(key: _kRefresh);
    } catch (_) {
      // best-effort: the in-memory session is already gone
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kUser);
  }

  Map<String, dynamic>? _decodeUser(String? raw) {
    if (raw == null) return null;
    try {
      return (jsonDecode(raw) as Map).cast<String, dynamic>();
    } catch (_) {
      return null;
    }
  }
}
