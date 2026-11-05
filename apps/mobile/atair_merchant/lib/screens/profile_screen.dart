import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Merchant profile: business identity and approval state.
class MerchantProfileScreen extends StatefulWidget {
  const MerchantProfileScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<MerchantProfileScreen> createState() => _MerchantProfileScreenState();
}

class _MerchantProfileScreenState extends State<MerchantProfileScreen> {
  Map<String, dynamic>? _context;
  Map<String, dynamic>? _profile;
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
      final ctx = await widget.auth.api.merchantContext();
      Map<String, dynamic>? profile;
      try {
        profile = await widget.auth.api.merchantProfile();
      } catch (_) {
        profile = null;
      }
      if (mounted) {
        setState(() {
          _context = ctx;
          _profile = profile;
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
    final c = _context ?? {};
    final p = _profile ?? {};
    final user = widget.auth.user;
    final name = '${p['name'] ?? c['merchantName'] ?? c['name'] ?? user?.fullName ?? ''}';
    final approval = '${p['approvalStatus'] ?? c['approvalStatus'] ?? 'approved'}';
    final rtl = context.isRtl;
    return RefreshIndicator(
      onRefresh: _load,
      child: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _loadFailed
                  ? ErrorView(message: context.tr('merchant.loadProfileFailed'), onRetry: _load)
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              children: [
                                const CircleAvatar(
                                  radius: 34,
                                  backgroundColor: Color(0x1F2563EB),
                                  child: Text('🏪', style: TextStyle(fontSize: 30)),
                                ),
                                const SizedBox(height: 12),
                                Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                                const SizedBox(height: 4),
                                Text(user?.email ?? user?.phone ?? '', style: const TextStyle(color: AtairTheme.textMuted)),
                                const SizedBox(height: 10),
                                StatusPill(label: AtairFormat.approval(approval, rtl: rtl), color: statusColor(approval)),
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
                                Text(context.tr('merchant.accountData'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                const SizedBox(height: 12),
                                _row(context.tr('merchant.name'), user?.fullName ?? '—'),
                                _row(context.tr('merchant.email'), user?.email ?? '—'),
                                _row(context.tr('merchant.phone'), user?.phone ?? '—'),
                                _row(context.tr('merchant.branchCount'), '${(c['branchCount'] ?? p['branchCount'] ?? '—')}'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Text(label, style: const TextStyle(color: AtairTheme.textMuted, fontSize: 13)),
            const Spacer(),
            Flexible(child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
          ],
        ),
      );
}
