import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'notifications_screen.dart';

/// Merchant dashboard: today's KPIs plus the recent orders feed.
class MerchantHomeScreen extends StatefulWidget {
  const MerchantHomeScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<MerchantHomeScreen> createState() => _MerchantHomeScreenState();
}

class _MerchantHomeScreenState extends State<MerchantHomeScreen> {
  MerchantDashboard? _dashboard;
  List<OrderSummary> _orders = [];
  bool _loading = true;
  String? _error;
  bool _loadFailed = false;

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
      if (mounted) setState(() => _loadFailed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _dashboard;
    final rtl = context.isRtl;
    return Scaffold(
      appBar: AtairAppBar(
        title: context.tr('app.title'),
        actions: [
          const LanguageToggleButton(),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            tooltip: context.tr('notifications.title'),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => MerchantNotificationsScreen(auth: widget.auth)),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: context.tr('common.logout'),
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
                : _loadFailed
                    ? ErrorView(message: context.tr('merchant.loadDashboardFailed'), onRetry: _load)
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          Text(context.tr('merchant.todaySummary'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(child: MetricTile(label: context.tr('merchant.ordersToday'), value: '${d?.ordersTotal ?? 0}', icon: Icons.receipt_long_outlined)),
                              const SizedBox(width: 10),
                              Expanded(child: MetricTile(label: context.tr('merchant.codPending'), value: AtairFormat.money(d?.codPending), icon: Icons.payments_outlined, color: AtairTheme.ink)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(child: MetricTile(label: context.tr('merchant.delivered'), value: '${d?.ordersDelivered ?? 0}', icon: Icons.done_all, color: const Color(0xFF16A34A))),
                              const SizedBox(width: 10),
                              Expanded(child: MetricTile(label: context.tr('merchant.pending'), value: '${d?.ordersPending ?? 0}', icon: Icons.hourglass_bottom, color: const Color(0xFFD97706))),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(child: MetricTile(label: context.tr('merchant.inTransit'), value: '${d?.ordersInTransit ?? 0}', icon: Icons.local_shipping_outlined, color: AtairTheme.ink)),
                              const SizedBox(width: 10),
                              Expanded(child: MetricTile(label: context.tr('merchant.cancelled'), value: '${d?.ordersCancelled ?? 0}', icon: Icons.cancel_outlined, color: const Color(0xFFDC2626))),
                            ],
                          ),
                          const SizedBox(height: 22),
                          Text(context.tr('merchant.latestOrders'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          const SizedBox(height: 10),
                          if (_orders.isEmpty)
                            Padding(padding: const EdgeInsets.all(24), child: EmptyView(message: context.tr('merchant.noOrders')))
                          else
                            ..._orders.map((o) => Card(
                                  child: ListTile(
                                    title: Text(o.orderNumber.isEmpty ? o.id.substring(0, 8) : o.orderNumber,
                                        style: const TextStyle(fontWeight: FontWeight.w600)),
                                    subtitle: Text('${o.dropoffAddress} • ${AtairFormat.money(o.total, o.currency)}'),
                                    trailing: StatusPill(label: AtairFormat.status(o.status, rtl: rtl), color: statusColor(o.status)),
                                  ),
                                )),
                          const SizedBox(height: 40),
                        ],
                      ),
      ),
    );
  }
}
