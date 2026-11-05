import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'new_order_screen.dart';
import 'notifications_screen.dart';
import 'order_detail_screen.dart';
import 'profile_screen.dart';

/// Customer home: active shipments plus quick access to a new order.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<OrderSummary>? _orders;
  String? _error;
  bool _loading = true;

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
      final orders = await widget.auth.api.customerOrders();
      if (mounted) setState(() => _orders = orders);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر تحميل الطلبات');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _newOrder() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => NewOrderScreen(auth: widget.auth)),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.auth.user;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AtairAppBar(
          title: 'عَ الطاير',
          actions: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              tooltip: 'الإشعارات',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => CustomerNotificationsScreen(auth: widget.auth)),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.person_outline),
              tooltip: 'حسابي',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => CustomerProfileScreen(auth: widget.auth)),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'تسجيل الخروج',
              onPressed: () => widget.auth.logout(),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _newOrder,
          backgroundColor: AtairTheme.brand,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.add),
          label: const Text('طلب جديد'),
        ),
        body: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: Color(0x1FF97316),
                        child: Text('👤', style: TextStyle(fontSize: 20)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('مرحبًا، ${user?.fullName ?? ''}',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                            const SizedBox(height: 2),
                            Text(user?.phone ?? '', style: const TextStyle(color: AtairTheme.textMuted, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Row(
                children: [
                  Icon(Icons.local_shipping_outlined, size: 20, color: AtairTheme.ink),
                  SizedBox(width: 8),
                  Text('شحناتي', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                ],
              ),
              const SizedBox(height: 10),
              if (_loading)
                const Padding(padding: EdgeInsets.all(32), child: LoadingView())
              else if (_error != null)
                ErrorView(message: _error!, onRetry: _load)
              else if ((_orders ?? []).isEmpty)
                const Padding(padding: EdgeInsets.all(32), child: EmptyView(message: 'لا توجد طلبات بعد', icon: Icons.inbox_outlined))
              else
                ...(_orders!).map(
                  (o) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _OrderTile(
                      order: o,
                      onTap: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => OrderDetailScreen(auth: widget.auth, orderId: o.id)),
                        );
                        _load();
                      },
                    ),
                  ),
                ),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  const _OrderTile({required this.order, required this.onTap});
  final OrderSummary order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(order.orderNumber.isEmpty ? order.id.substring(0, 8) : order.orderNumber,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  StatusPill(label: AtairFormat.status(order.status), color: statusColor(order.status)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.trip_origin, size: 14, color: AtairTheme.brand),
                  const SizedBox(width: 6),
                  Expanded(child: Text(order.pickupAddress, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.place_outlined, size: 14, color: AtairTheme.ink),
                  const SizedBox(width: 6),
                  Expanded(child: Text(order.dropoffAddress, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(AtairFormat.money(order.total, order.currency),
                      style: const TextStyle(fontWeight: FontWeight.w700, color: AtairTheme.brand)),
                  const Spacer(),
                  Text(AtairFormat.dateTime(order.createdAt),
                      style: const TextStyle(fontSize: 11, color: AtairTheme.textMuted)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
