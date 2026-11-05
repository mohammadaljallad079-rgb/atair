import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Merchant dashboard: today's KPIs plus the recent orders feed.
class MerchantHomeScreen extends StatefulWidget {
  const MerchantHomeScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<MerchantHomeScreen> createState() => _MerchantHomeScreenState();
}

class _MerchantHomeScreenState extends State<MerchantHomeScreen> {
  Map<String, dynamic>? _dashboard;
  List<OrderSummary> _orders = [];
  bool _loading = true;
  String? _error;

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
      final dashboard = await widget.auth.api.merchantDashboard();
      final orders = await widget.auth.api.merchantOrders();
      if (mounted) {
        setState(() {
          _dashboard = dashboard;
          _orders = orders;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر تحميل لوحة التحكم');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _dashboard ?? {};
    final ordersToday = '${d['ordersToday'] ?? d['orders'] ?? 0}';
    final revenue = '${d['revenueToday'] ?? d['revenue'] ?? '0'}';
    final delivered = '${d['deliveredToday'] ?? d['delivered'] ?? 0}';
    final pending = '${d['pendingToday'] ?? d['pending'] ?? 0}';
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AtairAppBar(
          title: 'عَ الطاير — التاجر',
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'تسجيل الخروج',
              onPressed: () => widget.auth.logout(),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const LoadingView()
              : _error != null
                  ? ErrorView(message: _error!, onRetry: _load)
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        const Text('ملخّص اليوم', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(child: MetricTile(label: 'طلبات اليوم', value: ordersToday, icon: Icons.receipt_long_outlined)),
                            const SizedBox(width: 10),
                            Expanded(child: MetricTile(label: 'إيرادات اليوم', value: AtairFormat.money(revenue), icon: Icons.payments_outlined, color: AtairTheme.ink)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(child: MetricTile(label: 'تم التسليم', value: delivered, icon: Icons.done_all, color: const Color(0xFF16A34A))),
                            const SizedBox(width: 10),
                            Expanded(child: MetricTile(label: 'قيد الانتظار', value: pending, icon: Icons.hourglass_bottom, color: const Color(0xFFD97706))),
                          ],
                        ),
                        const SizedBox(height: 22),
                        const Text('أحدث الطلبات', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        const SizedBox(height: 10),
                        if (_orders.isEmpty)
                          const Padding(padding: EdgeInsets.all(24), child: EmptyView(message: 'لا توجد طلبات'))
                        else
                          ..._orders.map((o) => Card(
                                child: ListTile(
                                  title: Text(o.orderNumber.isEmpty ? o.id.substring(0, 8) : o.orderNumber,
                                      style: const TextStyle(fontWeight: FontWeight.w600)),
                                  subtitle: Text('${o.dropoffAddress} • ${AtairFormat.money(o.total, o.currency)}'),
                                  trailing: StatusPill(label: AtairFormat.status(o.status), color: statusColor(o.status)),
                                ),
                              )),
                        const SizedBox(height: 40),
                      ],
                    ),
        ),
      ),
    );
  }
}
