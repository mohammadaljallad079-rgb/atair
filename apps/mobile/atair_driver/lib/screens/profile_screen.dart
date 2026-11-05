import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Driver profile: read-only identity plus license and vehicle summary.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
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
      final profile = await widget.auth.api.driverProfile();
      if (mounted) setState(() => _profile = profile);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر تحميل الملف الشخصي');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit() async {
    final p = _profile ?? {};
    final email = TextEditingController(text: '${p['email'] ?? ''}');
    final address = TextEditingController(text: '${p['address'] ?? ''}');
    final nationality = TextEditingController(text: '${p['nationality'] ?? ''}');
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: const Text('تعديل الملف'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: email, keyboardType: TextInputType.emailAddress, textDirection: TextDirection.ltr, decoration: const InputDecoration(labelText: 'البريد الإلكتروني')),
              const SizedBox(height: 12),
              TextField(controller: nationality, decoration: const InputDecoration(labelText: 'الجنسية')),
              const SizedBox(height: 12),
              TextField(controller: address, maxLines: 2, decoration: const InputDecoration(labelText: 'العنوان')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('تراجع')),
            FilledButton(
              onPressed: () async {
                try {
                  await widget.auth.api.driverUpdateProfile({
                    if (email.text.trim().isNotEmpty) 'email': email.text.trim(),
                    if (nationality.text.trim().isNotEmpty) 'nationality': nationality.text.trim(),
                    if (address.text.trim().isNotEmpty) 'address': address.text.trim(),
                  });
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } on ApiException catch (e) {
                  if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(e.message)));
                }
              },
              child: const Text('حفظ'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final p = _profile ?? {};
    final vehicle = (p['vehicle'] as Map?)?.cast<String, dynamic>();
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
                                backgroundColor: Color(0x1FF97316),
                                child: Text('🧑‍✈️', style: TextStyle(fontSize: 30)),
                              ),
                              const SizedBox(height: 12),
                              Text('${p['fullName'] ?? ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                              const SizedBox(height: 4),
                              Text('${p['phone'] ?? ''}', style: const TextStyle(color: AtairTheme.textMuted)),
                              const SizedBox(height: 10),
                              StatusPill(
                                label: AtairFormat.approval('${p['approvalStatus'] ?? ''}'),
                                color: statusColor('${p['approvalStatus'] ?? ''}'),
                              ),
                              const SizedBox(height: 14),
                              OutlinedButton.icon(
                                onPressed: _edit,
                                icon: const Icon(Icons.edit_outlined, size: 18),
                                label: const Text('تعديل الملف'),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      _infoCard('البيانات المهنية', [
                        _row('رقم الرخصة', '${p['licenseNumber'] ?? '—'}'),
                        _row('الجنسية', '${p['nationality'] ?? '—'}'),
                        _row('تصنيف الخدمة', '${p['classification'] ?? '—'}'),
                        _row('نوع التوظيف', '${p['employmentType'] ?? '—'}'),
                        _row('التقييم', p['rating'] == null ? '—' : '${p['rating']}'),
                      ]),
                      const SizedBox(height: 14),
                      _infoCard('المركبة', [
                        _row('رقم اللوحة', '${vehicle?['plateNumber'] ?? p['vehiclePlate'] ?? '—'}'),
                        _row('النوع', '${vehicle?['vehicleType']?['name'] ?? '—'}'),
                        _row('الماركة', '${vehicle?['make'] ?? '—'}'),
                        _row('الطراز', '${vehicle?['model'] ?? '—'}'),
                      ]),
                    ],
                  ),
      ),
    );
  }

  Widget _infoCard(String title, List<Widget> rows) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 12),
              ...rows,
            ],
          ),
        ),
      );

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Text(label, style: const TextStyle(color: AtairTheme.textMuted, fontSize: 13)),
            const Spacer(),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      );
}
