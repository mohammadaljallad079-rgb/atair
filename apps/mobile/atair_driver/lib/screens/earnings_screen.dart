import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Driver earnings: today/week/total aggregates plus the wallet balance.
class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  EarningsSummary? _earnings;
  Map<String, dynamic>? _wallet;
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
      final earnings = await widget.auth.api.driverEarnings();
      final wallet = await widget.auth.api.driverWallet();
      if (mounted) {
        setState(() {
          _earnings = earnings;
          _wallet = wallet;
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
    final e = _earnings;
    final balance = '${_wallet?['balance'] ?? e?.wallet?['balance'] ?? '0'}';
    return RefreshIndicator(
      onRefresh: _load,
      child: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _loadFailed
                  ? ErrorView(message: context.tr('driver.loadEarningsFailed'), onRetry: _load)
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              children: [
                                Text(context.tr('driver.walletBalance'), style: const TextStyle(color: AtairTheme.textMuted)),
                                const SizedBox(height: 6),
                                Text(AtairFormat.money(balance),
                                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AtairTheme.brandDark)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(child: MetricTile(label: context.tr('driver.todayEarnings'), value: AtairFormat.money(e?.todayAmount), icon: Icons.today)),
                            const SizedBox(width: 10),
                            Expanded(child: MetricTile(label: context.tr('driver.todayOrders'), value: '${e?.todayOrders ?? 0}', icon: Icons.local_shipping_outlined, color: AtairTheme.ink)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(child: MetricTile(label: context.tr('driver.weekEarnings'), value: AtairFormat.money(e?.weekAmount), icon: Icons.date_range)),
                            const SizedBox(width: 10),
                            Expanded(child: MetricTile(label: context.tr('driver.weekOrders'), value: '${e?.weekOrders ?? 0}', icon: Icons.trending_up, color: AtairTheme.ink)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(child: MetricTile(label: context.tr('driver.totalEarnings'), value: AtairFormat.money(e?.totalEarnings), icon: Icons.account_balance_wallet_outlined)),
                            const SizedBox(width: 10),
                            Expanded(child: MetricTile(label: context.tr('driver.completedOrders'), value: '${e?.completedOrders ?? 0}', icon: Icons.done_all, color: AtairTheme.ink)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        MetricTile(
                          label: context.tr('driver.rating'),
                          value: e?.rating == null ? '—' : '${e!.rating} / 5',
                          icon: Icons.star_outline,
                          color: const Color(0xFFD97706),
                        ),
                      ],
                    ),
    );
  }
}
