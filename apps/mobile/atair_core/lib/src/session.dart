import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Persists the refresh token and the last-known user across app restarts.
///
/// The access token is kept **in memory only** (short-lived), mirroring the
/// web apps: the refresh token is the durable credential and it is rotated
/// server-side on every refresh.
class SessionStore {
  static const _kRefresh = 'atair.refreshToken';
  static const _kUser = 'atair.user';

  String? accessToken;
  Map<String, dynamic>? user;
  String? _cachedRefresh;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    user = _decodeUser(prefs.getString(_kUser));
    _cachedRefresh = prefs.getString(_kRefresh);
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
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kRefresh, refreshToken);
    await prefs.setString(_kUser, jsonEncode(user));
  }

  Future<void> updateTokens({required String accessToken, required String refreshToken}) async {
    this.accessToken = accessToken;
    _cachedRefresh = refreshToken;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kRefresh, refreshToken);
  }

  Future<void> clear() async {
    accessToken = null;
    user = null;
    _cachedRefresh = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kRefresh);
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
