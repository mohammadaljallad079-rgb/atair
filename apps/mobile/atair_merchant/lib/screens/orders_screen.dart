import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Merchant orders list with a status filter.
class MerchantOrdersScreen extends StatefulWidget {
  const MerchantOrdersScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<MerchantOrdersScreen> createState() => _MerchantOrdersScreenState();
}

class _MerchantOrdersScreenState extends State<MerchantOrdersScreen> {
  List<OrderSummary> _orders = [];
  bool _loading = true;
  String? _error;
  String? _status;

  static const _filters = [
    ('', 'الكل'),
    ('pending', 'قيد الانتظار'),
    ('assigned', 'مُسند'),
    ('in_transit', 'قيد التوصيل'),
    ('delivered', 'تم التسليم'),
    ('cancelled', 'ملغي'),
  ];

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
      final orders = await widget.auth.api.merchantOrders(status: _status);
      if (mounted) setState(() => _orders = orders);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر تحميل الطلبات');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Column(
        children: [
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: _filters
                  .map((f) => Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: ChoiceChip(
                          label: Text(f.$2),
                          selected: (_status ?? '') == f.$1,
                          onSelected: (_) {
                            setState(() => _status = f.$1.isEmpty ? null : f.$1);
                            _load();
                          },
                        ),
                      ))
                  .toList(),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: _loading
                  ? const LoadingView()
                  : _error != null
                      ? ErrorView(message: _error!, onRetry: _load)
                      : _orders.isEmpty
                          ? const EmptyView(message: 'لا توجد طلبات')
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _orders.length,
                              itemBuilder: (context, i) {
                                final o = _orders[i];
                                return Card(
                                  child: ListTile(
                                    title: Text(o.orderNumber.isEmpty ? o.id.substring(0, 8) : o.orderNumber,
                                        style: const TextStyle(fontWeight: FontWeight.w600)),
                                    subtitle: Text('${o.pickupAddress} ← ${o.dropoffAddress}', maxLines: 2, overflow: TextOverflow.ellipsis),
                                    trailing: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        StatusPill(label: AtairFormat.status(o.status), color: statusColor(o.status)),
                                        const SizedBox(height: 4),
                                        Text(AtairFormat.money(o.total, o.currency), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }
}
