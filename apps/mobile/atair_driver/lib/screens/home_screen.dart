import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Driver home: availability toggle, live stats and the current assignment.
///
/// The driver toggles availability and, when online, reports position so the
/// dispatcher can assign nearby orders. Assignments surface as accept/reject
/// cards, mirroring the backend `/driver/assignments` contract.
class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  bool _available = false;
  bool _toggling = false;
  EarningsSummary? _earnings;
  List<Map<String, dynamic>> _assignments = [];
  List<DriverDelivery> _active = [];
  String? _error;
  bool _loadFailed = false;
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
      _loadFailed = false;
    });
    try {
      final me = await widget.auth.api.driverMe();
      final earnings = await widget.auth.api.driverEarnings();
      final assignments = await widget.auth.api.driverAssignments();
      final active = await widget.auth.api.driverDeliveries();
      if (mounted) {
        setState(() {
          _available = (me['isAvailable'] as bool?) ?? false;
          _earnings = earnings;
          _assignments = assignments;
          _active = active;
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

  Future<void> _toggle(bool value) async {
    setState(() => _toggling = true);
    try {
      await widget.auth.api.driverSetAvailability(value);
      if (mounted) setState(() => _available = value);
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  Future<void> _respond(Map<String, dynamic> a, bool accept) async {
    final id = (a['id'] ?? a['assignmentId'] ?? '').toString();
    if (id.isEmpty) return;
    try {
      if (accept) {
        await widget.auth.api.driverAcceptAssignment(id);
      } else {
        await widget.auth.api.driverRejectAssignment(id, context.tr('driver.unavailableReason'));
      }
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.auth.user;
    final e = _earnings;
    final rtl = context.isRtl;
    return Scaffold(
      appBar: AtairAppBar(
        title: context.tr('app.title'),
        actions: [
          const LanguageToggleButton(),
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
                    ? ErrorView(message: context.tr('driver.loadFailed'), onRetry: _load)
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          Card(
                            child: SwitchListTile(
                              title: Text(context.tr('driver.available'), style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text(_available ? context.tr('driver.online') : context.tr('driver.offline'),
                                  style: const TextStyle(color: AtairTheme.textMuted, fontSize: 12)),
                              value: _available,
                              onChanged: _toggling ? null : _toggle,
                              activeColor: AtairTheme.brand,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(context.tr('driver.welcome', {'name': user?.fullName ?? ''}),
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(child: MetricTile(label: context.tr('driver.todayOrders'), value: '${e?.todayOrders ?? 0}', icon: Icons.today, color: AtairTheme.ink)),
                              const SizedBox(width: 10),
                              Expanded(child: MetricTile(label: context.tr('driver.todayEarnings'), value: AtairFormat.money(e?.todayAmount), icon: Icons.payments_outlined)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(child: MetricTile(label: context.tr('driver.totalOrders'), value: '${e?.completedOrders ?? 0}', icon: Icons.done_all, color: AtairTheme.ink)),
                              const SizedBox(width: 10),
                              Expanded(child: MetricTile(label: context.tr('driver.totalEarnings'), value: AtairFormat.money(e?.totalEarnings), icon: Icons.account_balance_wallet_outlined)),
                            ],
                          ),
                          if (_assignments.isNotEmpty) ...[
                            const SizedBox(height: 20),
                            Text(context.tr('driver.newOffers'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                            const SizedBox(height: 10),
                            ..._assignments.map((a) => _assignmentCard(a)),
                          ],
                          if (_active.isNotEmpty) ...[
                            const SizedBox(height: 20),
                            Text(context.tr('driver.currentTasks'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                            const SizedBox(height: 10),
                            ..._active.map((d) => _deliveryCard(d, rtl)),
                          ],
                          const SizedBox(height: 40),
                        ],
                      ),
      ),
    );
  }

  Widget _assignmentCard(Map<String, dynamic> a) {
    final pickup = (a['pickupAddress'] ?? a['order']?['pickupAddress'] ?? '').toString();
    final dropoff = (a['dropoffAddress'] ?? a['order']?['dropoffAddress'] ?? '').toString();
    final total = (a['total'] ?? a['order']?['total'] ?? '0').toString();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.notifications_active_outlined, color: AtairTheme.brand),
                const SizedBox(width: 8),
                Expanded(child: Text(context.tr('driver.newRequest'), style: const TextStyle(fontWeight: FontWeight.w700))),
                Text(AtairFormat.money(total), style: const TextStyle(fontWeight: FontWeight.w700, color: AtairTheme.brandDark)),
              ],
            ),
            const SizedBox(height: 10),
            Text(context.tr('driver.from', {'value': pickup}), style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 4),
            Text(context.tr('driver.to', {'value': dropoff}), style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: () => _respond(a, true),
                    child: Text(context.tr('driver.accept')),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _respond(a, false),
                    child: Text(context.tr('driver.reject')),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _deliveryCard(DriverDelivery d, bool rtl) => Card(
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
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(AtairFormat.money(d.total, d.currency), style: const TextStyle(fontWeight: FontWeight.w700, color: AtairTheme.brand)),
                  const Spacer(),
                  if (d.paymentMethod == 'cod' && d.codAmount != '0')
                    Text(context.tr('driver.collect', {'value': AtairFormat.money(d.codAmount, d.currency)}),
                        style: const TextStyle(fontSize: 12, color: AtairTheme.ink)),
                ],
              ),
            ],
          ),
        ),
      );
}
