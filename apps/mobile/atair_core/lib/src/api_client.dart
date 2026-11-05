import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_exception.dart';
import 'config.dart';
import 'session.dart';

/// Thin, typed HTTP client for the ATAIR REST API.
///
/// Responsibilities kept deliberately small and explicit:
///  * unwraps the `{ success, data, meta? }` envelope;
///  * attaches the in-memory access token;
///  * transparently refreshes an expired access token **once**, then retries.
///
/// A single-flight guard serialises concurrent refreshes so two parallel 401s
/// do not both rotate the (single-use) refresh token and log the user out.
class ApiClient {
  ApiClient({http.Client? httpClient, SessionStore? session})
      : _http = httpClient ?? http.Client(),
        session = session ?? SessionStore();

  final http.Client _http;
  final SessionStore session;

  Future<bool>? _refreshInFlight;

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final base = Uri.parse(AtairConfig.apiBase);
    final normalized = path.startsWith('/') ? path.substring(1) : path;
    final joined = '${base.path.endsWith('/') ? base.path : '${base.path}/'}$normalized';
    final uri = base.replace(path: joined);
    if (query == null || query.isEmpty) return uri;
    final q = <String, String>{};
    query.forEach((k, v) {
      if (v != null) q[k] = '$v';
    });
    return uri.replace(queryParameters: {...uri.queryParameters, ...q});
  }

  Map<String, String> _headers({bool withAuth = true}) {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (withAuth && session.accessToken != null) {
      headers['Authorization'] = 'Bearer ${session.accessToken}';
    }
    return headers;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query, bool auth = true}) =>
      _send('GET', path, query: query, auth: auth);

  Future<dynamic> post(String path, {Object? body, Map<String, dynamic>? query, bool auth = true}) =>
      _send('POST', path, body: body, query: query, auth: auth);

  Future<dynamic> patch(String path, {Object? body, Map<String, dynamic>? query, bool auth = true}) =>
      _send('PATCH', path, body: body, query: query, auth: auth);

  Future<dynamic> delete(String path, {Map<String, dynamic>? query, bool auth = true}) =>
      _send('DELETE', path, query: query, auth: auth);

  Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    bool auth = true,
    bool retryOn401 = true,
  }) async {
    final request = http.Request(method, _uri(path, query));
    request.headers.addAll(_headers(withAuth: auth));
    if (body != null) request.body = jsonEncode(body);

    http.Response response;
    try {
      final streamed = await _http.send(request).timeout(const Duration(seconds: 30));
      response = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw ApiException('انتهت مهلة الاتصال بالخادم', code: 'TIMEOUT');
    } catch (e) {
      throw ApiException('تعذّر الاتصال بالخادم', code: 'NETWORK_ERROR');
    }

    if (response.statusCode == 401 && auth && retryOn401 && session.refreshToken != null) {
      final refreshed = await _refreshOnce();
      if (refreshed) {
        return _send(method, path, body: body, query: query, auth: auth, retryOn401: false);
      }
    }

    return _decode(response);
  }

  dynamic _decode(http.Response response) {
    final raw = response.body.isEmpty ? null : jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (raw is Map && raw.containsKey('success') && raw['success'] == true) {
        if (raw.containsKey('meta')) {
          return {'items': raw['data'], 'meta': raw['meta']};
        }
        return raw['data'];
      }
      return raw;
    }

    String message = 'حدث خطأ غير متوقع';
    String? code;
    if (raw is Map && raw['error'] is Map) {
      final err = raw['error'] as Map;
      message = (err['message'] ?? message).toString();
      code = err['code']?.toString();
    }
    throw ApiException(message, code: code, statusCode: response.statusCode);
  }

  /// Refresh the access token exactly once across concurrent callers.
  Future<bool> _refreshOnce() {
    final existing = _refreshInFlight;
    if (existing != null) return existing;
    final future = _doRefresh().whenComplete(() => _refreshInFlight = null);
    _refreshInFlight = future;
    return future;
  }

  Future<bool> _doRefresh() async {
    final token = session.refreshToken;
    if (token == null) return false;
    try {
      final res = await _send('POST', '/auth/refresh', body: {'refreshToken': token}, auth: false, retryOn401: false);
      if (res is Map && res['accessToken'] != null) {
        await session.updateTokens(
          accessToken: res['accessToken'] as String,
          refreshToken: (res['refreshToken'] as String?) ?? token,
        );
        return true;
      }
    } catch (_) {
      // fall through — caller will surface the 401
    }
    await session.clear();
    return false;
  }

  /// Authenticate and persist the session. Returns the auth payload.
  ///
  /// [tenantSlug] disambiguates an identifier that exists in more than one
  /// tenant; it falls back to the build-time [AtairConfig.tenantSlug].
  Future<Map<String, dynamic>> login(String identifier, String password, {String? tenantSlug}) async {
    final slug = (tenantSlug == null || tenantSlug.isEmpty) ? AtairConfig.tenantSlug : tenantSlug;
    final res = await _send(
      'POST',
      '/auth/login',
      body: {
        'identifier': identifier,
        'password': password,
        if (slug.isNotEmpty) 'tenantSlug': slug,
      },
      auth: false,
      retryOn401: false,
    );
    final data = (res as Map).cast<String, dynamic>();
    await session.save(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      user: (data['user'] as Map).cast<String, dynamic>(),
    );
    return data;
  }

  Future<void> logout() async {
    try {
      await _send('POST', '/auth/logout', body: {'refreshToken': session.refreshToken}, auth: false, retryOn401: false);
    } catch (_) {
      // best-effort; the local session is cleared regardless
    }
    await session.clear();
  }
}
