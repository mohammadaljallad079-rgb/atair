import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Merchant order detail: status timeline, assigned driver/vehicle visibility
/// and a cancel action while the order is still cancellable.
class MerchantOrderDetailScreen extends StatefulWidget {
  const MerchantOrderDetailScreen({super.key, required this.auth, required this.orderId});
  final AuthController auth;
  final String orderId;

  @override
  State<MerchantOrderDetailScreen> createState() => _MerchantOrderDetailScreenState();
}

class _MerchantOrderDetailScreenState extends State<MerchantOrderDetailScreen> {
  OrderSummary? _order;
  List<Map<String, dynamic>> _timeline = [];
  bool _loading = true;
  bool _cancelling = false;
  String? _error;
  bool _loadFailed = false;

  static const _cancellable = {'draft', 'pending', 'confirmed', 'searching_driver', 'assigned'};

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
      final order = await widget.auth.api.merchantOrder(widget.orderId);
      final timeline = await widget.auth.api.merchantOrderTimeline(widget.orderId);
      if (mounted) {
        setState(() {
          _order = order;
          _timeline = timeline;
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

  Future<void> _cancel() async {
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final controller = TextEditingController();
        return AlertDialog(
          title: Text(ctx.tr('orderDetail.cancelTitle')),
          content: TextField(
            controller: controller,
            maxLines: 2,
            decoration: InputDecoration(labelText: ctx.tr('orderDetail.cancelReason')),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(ctx.tr('orderDetail.cancelBack'))),
            FilledButton(onPressed: () => Navigator.pop(ctx, controller.text), child: Text(ctx.tr('orderDetail.cancelConfirm'))),
          ],
        );
      },
    );
    if (reason == null) return;
    setState(() => _cancelling = true);
    try {
      await widget.auth.api.merchantCancelOrder(widget.orderId, reason.isEmpty ? null : reason);
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final rtl = context.isRtl;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('orderDetail.title'))),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _loadFailed
                  ? ErrorView(message: context.tr('orderDetail.loadFailed'), onRetry: _load)
                  : order == null
                      ? EmptyView(message: context.tr('orderDetail.notFound'))
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView(
                            padding: const EdgeInsets.all(16),
                            children: [
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(order.orderNumber.isEmpty ? order.id.substring(0, 8) : order.orderNumber,
                                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                                          ),
                                          StatusPill(label: AtairFormat.status(order.status, rtl: rtl), color: statusColor(order.status)),
                                        ],
                                      ),
                                      const SizedBox(height: 14),
                                      _line(Icons.trip_origin, AtairTheme.brand, order.pickupAddress),
                                      const SizedBox(height: 8),
                                      _line(Icons.place_outlined, AtairTheme.ink, order.dropoffAddress),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 14),
                              _driverCard(context, order, rtl),
                              const SizedBox(height: 14),
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    children: [
                                      Text(context.tr('orderDetail.total'), style: const TextStyle(fontWeight: FontWeight.w600)),
                                      const Spacer(),
                                      Text(AtairFormat.money(order.total, order.currency),
                                          style: const TextStyle(fontWeight: FontWeight.w800, color: AtairTheme.brandDark, fontSize: 16)),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 18),
                              Text(context.tr('orderDetail.stages'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              const SizedBox(height: 10),
                              if (_timeline.isEmpty)
                                Padding(padding: const EdgeInsets.all(16), child: EmptyView(message: context.tr('orderDetail.noUpdates')))
                              else
                                Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      children: [
                                        for (int i = 0; i < _timeline.length; i++)
                                          _timelineRow(context, _timeline[i], isLast: i == _timeline.length - 1),
                                      ],
                                    ),
                                  ),
                                ),
                              if (_cancellable.contains(order.status)) ...[
                                const SizedBox(height: 20),
                                OutlinedButton.icon(
                                  onPressed: _cancelling ? null : _cancel,
                                  icon: const Icon(Icons.cancel_outlined, color: Color(0xFFDC2626)),
                                  label: Text(context.tr('orderDetail.cancel'), style: const TextStyle(color: Color(0xFFDC2626))),
                                ),
                              ],
                              const SizedBox(height: 30),
                            ],
                          ),
                        ),
    );
  }

  Widget _driverCard(BuildContext context, OrderSummary order, bool rtl) {
    final driver = order.driver;
    if (driver == null) {
      return Card(
        child: ListTile(
          leading: const Icon(Icons.person_search_outlined, color: AtairTheme.textMuted),
          title: Text(context.tr('merchant.noDriver')),
          subtitle: Text(AtairFormat.status(order.status, rtl: rtl)),
        ),
      );
    }
    return Card(
      child: ListTile(
        leading: const Icon(Icons.delivery_dining, color: AtairTheme.brand),
        title: Text('${driver['fullName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text([
          if (driver['phone'] != null) '${driver['phone']}',
          if (driver['status'] != null) AtairFormat.status('${driver['status']}', rtl: rtl),
        ].join(' • ')),
      ),
    );
  }

  Widget _line(IconData icon, Color color, String text) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 14))),
        ],
      );

  Widget _timelineRow(BuildContext context, Map<String, dynamic> entry, {required bool isLast}) {
    final status = (entry['status'] ?? entry['toStatus'] ?? '').toString();
    final at = (entry['createdAt'] ?? entry['at'] ?? '').toString();
    final note = (entry['note'] ?? entry['reason'] ?? '').toString();
    final rtl = context.isRtl;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(color: statusColor(status), shape: BoxShape.circle),
              ),
              if (!isLast) Expanded(child: Container(width: 2, color: const Color(0xFFE2E8F0))),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(AtairFormat.status(status, rtl: rtl), style: const TextStyle(fontWeight: FontWeight.w600)),
                  if (note.isNotEmpty)
                    Text(note, style: const TextStyle(fontSize: 12, color: AtairTheme.textMuted)),
                  Text(AtairFormat.dateTime(at, rtl: rtl), style: const TextStyle(fontSize: 11, color: AtairTheme.textMuted)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
