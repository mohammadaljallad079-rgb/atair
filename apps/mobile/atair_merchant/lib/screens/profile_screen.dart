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
      if (mounted) setState(() => _error = 'تعذّر تحميل الملف التجاري');
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
                              StatusPill(label: AtairFormat.approval(approval), color: statusColor(approval)),
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
                              const Text('بيانات الحساب', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              const SizedBox(height: 12),
                              _row('الاسم', user?.fullName ?? '—'),
                              _row('البريد الإلكتروني', user?.email ?? '—'),
                              _row('الجوال', user?.phone ?? '—'),
                              _row('عدد الفروع', '${(c['branchCount'] ?? p['branchCount'] ?? '—')}'),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
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
