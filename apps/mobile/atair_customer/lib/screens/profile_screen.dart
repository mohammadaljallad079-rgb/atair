import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Customer profile: editable identity plus saved delivery addresses.
class CustomerProfileScreen extends StatefulWidget {
  const CustomerProfileScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<CustomerProfileScreen> createState() => _CustomerProfileScreenState();
}

class _CustomerProfileScreenState extends State<CustomerProfileScreen> {
  Map<String, dynamic>? _profile;
  List<CustomerAddress> _addresses = [];
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
      final profile = await widget.auth.api.customerProfile();
      final addresses = await widget.auth.api.customerAddresses();
      if (mounted) {
        setState(() {
          _profile = profile;
          _addresses = addresses;
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

  Future<void> _edit() async {
    final p = _profile ?? {};
    final name = TextEditingController(text: '${p['fullName'] ?? ''}');
    final email = TextEditingController(text: '${p['email'] ?? ''}');
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(ctx.tr('profile.editTitle')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: InputDecoration(labelText: ctx.tr('register.fullName'))),
            const SizedBox(height: 12),
            TextField(controller: email, keyboardType: TextInputType.emailAddress, textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: ctx.tr('register.email'))),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(ctx.tr('orderDetail.cancelBack'))),
          FilledButton(
            onPressed: () async {
              try {
                await widget.auth.api.customerUpdateProfile({
                  if (name.text.trim().isNotEmpty) 'fullName': name.text.trim(),
                  if (email.text.trim().isNotEmpty) 'email': email.text.trim(),
                });
                if (ctx.mounted) Navigator.pop(ctx, true);
              } on ApiException catch (e) {
                if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(e.message)));
              }
            },
            child: Text(ctx.tr('common.save')),
          ),
        ],
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _addAddress() async {
    final label = TextEditingController(text: 'home');
    final address = TextEditingController();
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(ctx.tr('profile.addTitle')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: label, decoration: InputDecoration(labelText: ctx.tr('profile.label'))),
            const SizedBox(height: 12),
            TextField(controller: address, maxLines: 2, decoration: InputDecoration(labelText: ctx.tr('profile.address'))),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(ctx.tr('orderDetail.cancelBack'))),
          FilledButton(
            onPressed: () async {
              if (address.text.trim().isEmpty) return;
              try {
                await widget.auth.api.customerAddAddress({
                  'label': label.text.trim().isEmpty ? 'home' : label.text.trim(),
                  'address': address.text.trim(),
                });
                if (ctx.mounted) Navigator.pop(ctx, true);
              } on ApiException catch (e) {
                if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(e.message)));
              }
            },
            child: Text(ctx.tr('profile.add')),
          ),
        ],
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _deleteAddress(CustomerAddress a) async {
    try {
      await widget.auth.api.customerDeleteAddress(a.id);
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _profile ?? {};
    final user = widget.auth.user;
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('profile.title')),
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
                    ? ErrorView(message: context.tr('profile.loadFailed'), onRetry: _load)
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
                                    child: Icon(Icons.person_outline, size: 34, color: AtairTheme.brandDark),
                                  ),
                                  const SizedBox(height: 12),
                                  Text('${p['fullName'] ?? user?.fullName ?? ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                                  const SizedBox(height: 4),
                                  Text('${p['phone'] ?? user?.phone ?? ''}', style: const TextStyle(color: AtairTheme.textMuted)),
                                  const SizedBox(height: 14),
                                  OutlinedButton.icon(
                                    onPressed: _edit,
                                    icon: const Icon(Icons.edit_outlined, size: 18),
                                    label: Text(context.tr('profile.edit')),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              const Icon(Icons.bookmark_outline, size: 20, color: AtairTheme.ink),
                              const SizedBox(width: 8),
                              Expanded(child: Text(context.tr('profile.savedAddresses'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
                              TextButton.icon(
                                onPressed: _addAddress,
                                icon: const Icon(Icons.add, size: 18),
                                label: Text(context.tr('profile.add')),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          if (_addresses.isEmpty)
                            Padding(padding: const EdgeInsets.all(16), child: EmptyView(message: context.tr('profile.noAddresses'), icon: Icons.bookmark_border))
                          else
                            ..._addresses.map((a) => Card(
                                  child: ListTile(
                                    leading: Icon(
                                      a.isDefault ? Icons.star : Icons.place_outlined,
                                      color: a.isDefault ? const Color(0xFFD97706) : AtairTheme.ink,
                                    ),
                                    title: Text(a.address, style: const TextStyle(fontWeight: FontWeight.w600)),
                                    subtitle: Text(a.details ?? a.label),
                                    trailing: IconButton(
                                      icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                                      onPressed: () => _deleteAddress(a),
                                    ),
                                  ),
                                )),
                          const SizedBox(height: 30),
                        ],
                      ),
      ),
    );
  }
}
