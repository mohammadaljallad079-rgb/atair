/// Map provider configuration for the ATAIR mobile apps.
///
/// The platform does not ship a bundled map SDK key, so the tile endpoint is
/// injected at build time:
///
///   flutter build apk --dart-define=ATAIR_MAP_TILE_URL=https://tile.example/{z}/{x}/{y}.png
///
/// When it is left empty the tracking screen renders coordinates and a route
/// summary but **no map tiles** — it never falls back to a provider the project
/// has not been authorised to use.
class AtairMapConfig {
  static const String tileUrl = String.fromEnvironment('ATAIR_MAP_TILE_URL');

  /// Optional attribution string required by most tile providers.
  static const String attribution = String.fromEnvironment(
    'ATAIR_MAP_ATTRIBUTION',
    defaultValue: '© OpenStreetMap contributors',
  );

  static const double defaultZoom = 12;
  static const double minZoom = 3;
  static const double maxZoom = 19;

  static bool get isConfigured => tileUrl.isNotEmpty;
}
