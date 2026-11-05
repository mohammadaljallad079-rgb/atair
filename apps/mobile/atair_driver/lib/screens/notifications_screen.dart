import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Driver notifications feed backed by `/driver/notifications`.
class DriverNotificationsScreen extends StatefulWidget {
  const DriverNotificationsScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<DriverNotificationsScreen> createState() => _DriverNotificationsScreenState();
}

class _DriverNotificationsScreenState extends State<DriverNotificationsScreen> {
  List<NotificationItem> _items = [];
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
      final items = await widget.auth.api.driverNotifications();
      if (mounted) setState(() => _items = items);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _loadFailed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(NotificationItem item) async {
    if (item.isRead) return;
    try {
      await widget.auth.api.driverMarkNotificationRead(item.id);
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final rtl = context.isRtl;
    return RefreshIndicator(
      onRefresh: _load,
      child: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _loadFailed
                  ? ErrorView(message: context.tr('notifications.loadFailed'), onRetry: _load)
                  : _items.isEmpty
                      ? EmptyView(message: context.tr('notifications.empty'), icon: Icons.notifications_none)
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
                                subtitle: Text('${n.body}\n${AtairFormat.dateTime(n.createdAt, rtl: rtl)}'),
                                isThreeLine: true,
                                onTap: () => _markRead(n),
                              ),
                            );
                          },
                        ),
    );
  }
}
