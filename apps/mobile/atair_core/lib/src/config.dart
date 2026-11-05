/// Runtime configuration for the ATAIR mobile apps.
///
/// The base URL is injected at build time so the same source builds against
/// staging or production without edits:
///
///   flutter build apk --dart-define=ATAIR_API_BASE=https://admin.sumu-app.store/api/v1
///
/// It defaults to the public production API.
class AtairConfig {
  static const String apiBase = String.fromEnvironment(
    'ATAIR_API_BASE',
    defaultValue: 'https://admin.sumu-app.store/api/v1',
  );

  /// Tenant slug sent with login when an identifier is ambiguous across
  /// tenants. Left empty by default so a unique identifier logs in directly —
  /// passing a wrong slug would filter the account out entirely.
  static const String tenantSlug = String.fromEnvironment('ATAIR_TENANT_SLUG');

  static const String appVersion = '1.0.0';
}
