import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'l10n.dart';
import 'map_config.dart';
import 'models.dart';
import 'theme.dart';

/// Interactive route map shared by the customer and merchant apps.
///
/// Draws only coordinates the backend actually recorded: pickup, drop-off and
/// (when present) the last reported driver position. Nothing is interpolated or
/// invented — if a coordinate is absent its marker is simply omitted.
///
/// Tiles require [AtairMapConfig.tileUrl]; without it the widget shows the
/// coordinate summary and an explicit "map not configured" note instead of
/// silently rendering a blank or third-party map.
class AtairTrackingMap extends StatelessWidget {
  const AtairTrackingMap({super.key, required this.tracking, this.height = 300});

  final OrderTracking tracking;
  final double height;

  @override
  Widget build(BuildContext context) {
    final l10n = AtairL10n.maybeOf(context);
    String t(String key) => l10n?.t(key) ?? key;

    final points = <LatLng>[
      if (tracking.pickupLat != null && tracking.pickupLng != null)
        LatLng(tracking.pickupLat!.toDouble(), tracking.pickupLng!.toDouble()),
      if (tracking.dropoffLat != null && tracking.dropoffLng != null)
        LatLng(tracking.dropoffLat!.toDouble(), tracking.dropoffLng!.toDouble()),
      if (tracking.hasDriverPosition) LatLng(tracking.driverLat!.toDouble(), tracking.driverLng!.toDouble()),
    ];

    if (points.isEmpty) {
      return Card(
        child: SizedBox(
          height: height,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.map_outlined, size: 42, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 10),
                  Text(t('map.noCoordinates'), textAlign: TextAlign.center, style: const TextStyle(color: AtairTheme.textMuted)),
                ],
              ),
            ),
          ),
        ),
      );
    }

    if (!AtairMapConfig.isConfigured) {
      return Card(
        child: SizedBox(
          height: height,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.map_outlined, size: 42, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 10),
                  Text(t('map.notConfigured'), textAlign: TextAlign.center, style: const TextStyle(color: AtairTheme.textMuted)),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final mapController = MapController();
    final center = _center(points);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: SizedBox(
        height: height,
        child: FlutterMap(
          mapController: mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: _zoomFor(points),
            minZoom: AtairMapConfig.minZoom,
            maxZoom: AtairMapConfig.maxZoom,
            interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
          ),
          children: [
            TileLayer(
              urlTemplate: AtairMapConfig.tileUrl,
              userAgentPackageName: 'store.sumu.atair',
              maxZoom: AtairMapConfig.maxZoom,
            ),
            if (points.length >= 2)
              PolylineLayer(
                polylines: [
                  Polyline(points: points, strokeWidth: 3, color: AtairTheme.ink),
                ],
              ),
            MarkerLayer(
              markers: [
                if (tracking.pickupLat != null && tracking.pickupLng != null)
                  _marker(LatLng(tracking.pickupLat!.toDouble(), tracking.pickupLng!.toDouble()), AtairTheme.brand, Icons.trip_origin, t('tracking.pickup')),
                if (tracking.dropoffLat != null && tracking.dropoffLng != null)
                  _marker(LatLng(tracking.dropoffLat!.toDouble(), tracking.dropoffLng!.toDouble()), AtairTheme.ink, Icons.place, t('tracking.dropoff')),
                if (tracking.hasDriverPosition)
                  _marker(LatLng(tracking.driverLat!.toDouble(), tracking.driverLng!.toDouble()), const Color(0xFF16A34A), Icons.local_shipping, t('tracking.driver')),
              ],
            ),
            RichAttributionWidget(
              attributions: [TextSourceAttribution(AtairMapConfig.attribution)],
            ),
          ],
        ),
      ),
    );
  }

  Marker _marker(LatLng point, Color color, IconData icon, String label) => Marker(
        point: point,
        width: 42,
        height: 42,
        child: Tooltip(
          message: label,
          child: Container(
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
        ),
      );

  LatLng _center(List<LatLng> points) {
    final lat = points.map((p) => p.latitude).reduce((a, b) => a + b) / points.length;
    final lng = points.map((p) => p.longitude).reduce((a, b) => a + b) / points.length;
    return LatLng(lat, lng);
  }

  /// Fit all points at a sensible zoom without needing a post-layout fit call.
  double _zoomFor(List<LatLng> points) {
    if (points.length < 2) return AtairMapConfig.defaultZoom;
    final lats = points.map((p) => p.latitude).toList();
    final lngs = points.map((p) => p.longitude).toList();
    final latSpan = lats.reduce((a, b) => a > b ? a : b) - lats.reduce((a, b) => a < b ? a : b);
    final lngSpan = lngs.reduce((a, b) => a > b ? a : b) - lngs.reduce((a, b) => a < b ? a : b);
    final span = latSpan > lngSpan ? latSpan : lngSpan;
    if (span > 1.0) return 8;
    if (span > 0.3) return 10;
    if (span > 0.1) return 12;
    return 14;
  }
}
