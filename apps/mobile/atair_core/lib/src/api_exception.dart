/// Error thrown for any non-2xx API response or transport failure.
///
/// Carries the backend's stable machine `code` (e.g. `INVALID_CREDENTIALS`,
/// `PRICING_UNAVAILABLE`) so callers can branch on it instead of parsing text.
class ApiException implements Exception {
  ApiException(this.message, {this.code, this.statusCode});

  final String message;
  final String? code;
  final int? statusCode;

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}
