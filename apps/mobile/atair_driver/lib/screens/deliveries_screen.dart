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
      if (mounted) setState(() => _error = 'تعذّر تحميل المهمات');
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
    return Directionality(
      textDirection: TextDirection.rtl,
      child: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const LoadingView()
            : _error != null
                ? ErrorView(message: _error!, onRetry: _load)
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Text('المهمات الجارية', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      const SizedBox(height: 10),
                      if (_active.isEmpty)
                        const Padding(padding: EdgeInsets.all(24), child: EmptyView(message: 'لا توجد مهمات جارية', icon: Icons.local_shipping_outlined))
                      else
                        ..._active.map((d) => _deliveryTile(d)),
                      const SizedBox(height: 24),
                      const Text('السجل', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      const SizedBox(height: 10),
                      if (_history.isEmpty)
                        const Padding(padding: EdgeInsets.all(24), child: EmptyView(message: 'لا يوجد سجل بعد', icon: Icons.history))
                      else
                        ..._history.map((d) => _historyTile(d)),
                      const SizedBox(height: 40),
                    ],
                  ),
      ),
    );
  }

  Widget _deliveryTile(DriverDelivery d) {
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
                StatusPill(label: AtairFormat.status(d.status), color: statusColor(d.status)),
              ],
            ),
            const SizedBox(height: 8),
            Text('من: ${d.pickupAddress}', style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 4),
            Text('إلى: ${d.dropoffAddress}', style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            if (next != null)
              FilledButton.icon(
                onPressed: () => _advance(d),
                icon: const Icon(Icons.arrow_forward),
                label: Text('تحديث الحالة: ${AtairFormat.status(next)}'),
              )
            else
              const Center(child: Text('اكتملت المهمة', style: TextStyle(color: AtairTheme.textMuted))),
          ],
        ),
      ),
    );
  }

  Widget _historyTile(DriverDelivery d) => Card(
        child: ListTile(
          leading: Icon(Icons.check_circle_outline, color: statusColor(d.status)),
          title: Text(d.orderNumber, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text('${AtairFormat.status(d.status)} • ${AtairFormat.money(d.total, d.currency)}'),
        ),
      );
}
