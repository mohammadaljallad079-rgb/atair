import 'dart:async';

import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Live order tracking.
///
/// Polls `/customer/orders/:id/tracking` and renders only what the backend
/// actually recorded. When no driver position has been reported yet the screen
/// says so explicitly — it never invents a marker.
class CustomerTrackingScreen extends StatefulWidget {
  const CustomerTrackingScreen({super.key, required this.auth, required this.orderId});
  final AuthController auth;
  final String orderId;

  @override
  State<CustomerTrackingScreen> createState() => _CustomerTrackingScreenState();
}

class _CustomerTrackingScreenState extends State<CustomerTrackingScreen> {
  OrderTracking? _tracking;
  bool _loading = true;
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final tracking = await widget.auth.api.customerOrderTracking(widget.orderId);
      if (mounted) {
        setState(() {
          _tracking = tracking;
          _error = null;
        });
      }
    } on ApiException catch (e) {
      if (mounted && !silent) setState(() => _error = e.message);
    } catch (_) {
      if (mounted && !silent) setState(() => _error = 'تعذّر تحميل التتبّع');
    } finally {
      if (mounted && !silent) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = _tracking;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('تتبّع الطلب'),
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
          ],
        ),
        body: _loading
            ? const LoadingView()
            : _error != null
                ? ErrorView(message: _error!, onRetry: _load)
                : t == null
                    ? const EmptyView(message: 'لا توجد بيانات تتبّع')
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(18),
                                child: Column(
                                  children: [
                                    const Icon(Icons.local_shipping, size: 40, color: AtairTheme.brand),
                                    const SizedBox(height: 10),
                                    StatusPill(label: AtairFormat.status(t.status), color: statusColor(t.status)),
                                    const SizedBox(height: 10),
                                    Text(
                                      t.hasDriverPosition ? 'الموقع الحالي للسائق متاح' : 'لم يُبلّغ السائق عن موقعه بعد',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(color: AtairTheme.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('إحداثيات المسار', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                    const SizedBox(height: 12),
                                    _coord('الاستلام', t.pickupLat, t.pickupLng),
                                    const SizedBox(height: 8),
                                    _coord('التسليم', t.dropoffLat, t.dropoffLng),
                                    const Divider(height: 26),
                                    _coord('السائق', t.driverLat, t.driverLng),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
      ),
    );
  }

  Widget _coord(String label, num? lat, num? lng) => Row(
        children: [
          Text(label, style: const TextStyle(color: AtairTheme.textMuted, fontSize: 13)),
          const Spacer(),
          Text(
            (lat == null || lng == null) ? '—' : '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
            style: const TextStyle(fontWeight: FontWeight.w600, fontFamily: 'monospace', fontSize: 12),
          ),
        ],
      );
}
