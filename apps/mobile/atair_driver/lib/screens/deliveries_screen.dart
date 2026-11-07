import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Driver deliveries: active assignments with one-tap status progression.
class DeliveriesScreen extends StatefulWidget {
  const DeliveriesScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<DeliveriesScreen> createState() => _DeliveriesScreenState();
}

class _DeliveriesScreenState extends State<DeliveriesScreen> {
  List<DriverDelivery> _active = [];
  List<DriverDelivery> _history = [];
  bool _loading = true;
  String? _error;
  bool _loadFailed = false;

  /// Forward-only status progression a driver is allowed to drive, mirroring
  /// the backend `DRIVER_TRANSITIONS` whitelist.
  static const _flow = ['assigned', 'driver_arriving', 'picked_up', 'in_transit', 'arriving', 'delivered'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _loadFailed = false;
    });
    try {
      final active = await widget.auth.api.driverDeliveries();
      final history = await widget.auth.api.driverDeliveryHistory();
      if (mounted) {
        setState(() {
          _active = active;
          _history = history;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _loadFailed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _nextStatus(String current) {
    final idx = _flow.indexOf(current);
    if (idx == -1 || idx >= _flow.length - 1) return null;
    return _flow[idx + 1];
  }

  Future<void> _advance(DriverDelivery d) async {
    final next = _nextStatus(d.status);
    if (next == null) return;
    try {
      await widget.auth.api.driverUpdateDeliveryStatus(d.id, next);
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final rtl = context.isRtl;
    return RefreshIndicator(
      onRefresh: _load,
      child: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _loadFailed
                  ? ErrorView(message: context.tr('driver.loadDeliveriesFailed'), onRetry: _load)
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Text(context.tr('driver.activeTasks'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        const SizedBox(height: 10),
                        if (_active.isEmpty)
                          Padding(padding: const EdgeInsets.all(24), child: EmptyView(message: context.tr('driver.noActiveTasks'), icon: Icons.local_shipping_outlined))
                        else
                          ..._active.map((d) => _deliveryTile(d, rtl)),
                        const SizedBox(height: 24),
                        Text(context.tr('driver.history'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        const SizedBox(height: 10),
                        if (_history.isEmpty)
                          Padding(padding: const EdgeInsets.all(24), child: EmptyView(message: context.tr('driver.noHistory'), icon: Icons.history))
                        else
                          ..._history.map((d) => _historyTile(d, rtl)),
                        const SizedBox(height: 40),
                      ],
                    ),
    );
  }

  Widget _deliveryTile(DriverDelivery d, bool rtl) {
    final next = _nextStatus(d.status);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(d.orderNumber, style: const TextStyle(fontWeight: FontWeight.w700))),
                StatusPill(label: AtairFormat.status(d.status, rtl: rtl), color: statusColor(d.status)),
              ],
            ),
            const SizedBox(height: 8),
            Text(context.tr('driver.from', {'value': d.pickupAddress}), style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 4),
            Text(context.tr('driver.to', {'value': d.dropoffAddress}), style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            if (next != null)
              FilledButton.icon(
                onPressed: () => _advance(d),
                icon: const Icon(Icons.arrow_forward),
                label: Text(context.tr('driver.updateStatus', {'value': AtairFormat.status(next, rtl: rtl)})),
              )
            else
              Center(child: Text(context.tr('driver.taskComplete'), style: const TextStyle(color: AtairTheme.textMuted))),
          ],
        ),
      ),
    );
  }

  Widget _historyTile(DriverDelivery d, bool rtl) => Card(
        child: ListTile(
          leading: Icon(Icons.check_circle_outline, color: statusColor(d.status)),
          title: Text(d.orderNumber, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text('${AtairFormat.status(d.status, rtl: rtl)} • ${AtairFormat.money(d.total, d.currency)}'),
        ),
      );
}
