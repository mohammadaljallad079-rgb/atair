import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Merchant notifications feed backed by `/merchant/notifications`.
class MerchantNotificationsScreen extends StatefulWidget {
  const MerchantNotificationsScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<MerchantNotificationsScreen> createState() => _MerchantNotificationsScreenState();
}

class _MerchantNotificationsScreenState extends State<MerchantNotificationsScreen> {
  List<NotificationItem> _items = [];
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
      final items = await widget.auth.api.merchantNotifications();
      if (mounted) setState(() => _items = items);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر تحميل الإشعارات');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(NotificationItem item) async {
    if (item.isRead) return;
    try {
      await widget.auth.api.merchantMarkNotificationRead(item.id);
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('الإشعارات')),
        body: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const LoadingView()
              : _error != null
                  ? ErrorView(message: _error!, onRetry: _load)
                  : _items.isEmpty
                      ? const EmptyView(message: 'لا توجد إشعارات', icon: Icons.notifications_none)
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _items.length,
                          itemBuilder: (context, i) {
                            final n = _items[i];
                            return Card(
                              child: ListTile(
                                leading: Icon(
                                  n.isRead ? Icons.mark_email_read_outlined : Icons.mark_email_unread_outlined,
                                  color: n.isRead ? AtairTheme.textMuted : AtairTheme.brand,
                                ),
                                title: Text(n.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Text('${n.body}\n${AtairFormat.dateTime(n.createdAt)}'),
                                isThreeLine: true,
                                onTap: () => _markRead(n),
                              ),
                            );
                          },
                        ),
        ),
      ),
    );
  }
}
