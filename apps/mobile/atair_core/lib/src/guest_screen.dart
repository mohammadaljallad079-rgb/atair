import 'package:flutter/material.dart';

import 'api_exception.dart';
import 'auth_controller.dart';
import 'format.dart';
import 'l10n.dart';
import 'models.dart';
import 'theme.dart';
import 'widgets.dart';

/// Public (guest) shell shared by the three ATAIR apps.
///
/// A guest can browse the published services and service areas and look up an
/// order by its public tracking code — all served by the anonymous
/// `/api/v1/public/*` surface. Anything that needs an account (placing an
/// order, seeing "my orders", the profile) is blocked and routes the visitor to
/// sign in instead, so the protected operations genuinely require a session.
class GuestHomeScreen extends StatefulWidget {
  const GuestHomeScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<GuestHomeScreen> createState() => _GuestHomeScreenState();
}

class _GuestHomeScreenState extends State<GuestHomeScreen> {
  List<ServiceArea>? _areas;
  String? _servicesSubtitle;
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
      final site = await widget.auth.api.publicSite();
      final areas = (site['serviceAreas'] as List? ?? [])
          .map((e) => ServiceArea((e as Map).cast<String, dynamic>()))
          .toList();
      final settings = (site['settings'] as Map?)?.cast<String, dynamic>() ?? const {};
      if (!mounted) return;
      setState(() {
        _areas = areas;
        _servicesSubtitle = settings['website.heroSubtitle'] as String?;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = context.tr('guest.noServices'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _promptSignIn() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(context.tr('guest.requiresLogin'))),
    );
    widget.auth.exitGuest();
  }

  Future<void> _track() async {
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.tr('guest.trackTitle')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(context.tr('guest.trackHint'), style: const TextStyle(fontSize: 13, color: AtairTheme.textMuted)),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              textDirection: TextDirection.ltr,
              autofocus: true,
              decoration: InputDecoration(labelText: context.tr('guest.trackCode')),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(context.tr('common.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: Text(context.tr('guest.trackAction'))),
        ],
      ),
    );
    if (code == null || code.isEmpty || !mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => PublicTrackingScreen(auth: widget.auth, code: code)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AtairAppBar(
        title: context.tr('app.brand'),
        actions: [
          const LanguageToggleButton(),
          TextButton(
            onPressed: widget.auth.exitGuest,
            child: Text(context.tr('guest.signIn')),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _GuestBanner(),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const Icon(Icons.qr_code_2, color: AtairTheme.brand),
                title: Text(context.tr('guest.trackTitle'), style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(context.tr('guest.trackHint'), style: const TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.chevron_right),
                onTap: _track,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Icon(Icons.grid_view_rounded, size: 20, color: AtairTheme.ink),
                const SizedBox(width: 8),
                Text(context.tr('guest.services'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              _servicesSubtitle ?? context.tr('guest.servicesSubtitle'),
              style: const TextStyle(color: AtairTheme.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Padding(padding: EdgeInsets.all(32), child: LoadingView())
            else if (_error != null)
              ErrorView(message: _error!, onRetry: _load)
            else if ((_areas ?? []).isEmpty)
              Padding(
                padding: const EdgeInsets.all(28),
                child: EmptyView(message: context.tr('guest.noServices'), icon: Icons.map_outlined),
              )
            else ...[
              Text(context.tr('guest.serviceAreas'), style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: (_areas!)
                    .map((a) => Chip(
                          avatar: const Icon(Icons.location_on_outlined, size: 16, color: AtairTheme.brand),
                          label: Text(a.name),
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: _promptSignIn,
              icon: const Icon(Icons.login, size: 18),
              label: Text(context.tr('guest.signIn')),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

class _GuestBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFED7AA)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: AtairTheme.brandDark, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(context.tr('guest.banner'), style: const TextStyle(fontSize: 13, color: Color(0xFF9A3412))),
          ),
        ],
      ),
    );
  }
}

/// Public tracking result for a guest — reads only `/public/track/:code`, which
/// returns a minimal, PII-free snapshot (coarse status + milestone).
class PublicTrackingScreen extends StatefulWidget {
  const PublicTrackingScreen({super.key, required this.auth, required this.code});

  final AuthController auth;
  final String code;

  @override
  State<PublicTrackingScreen> createState() => _PublicTrackingScreenState();
}

class _PublicTrackingScreenState extends State<PublicTrackingScreen> {
  Map<String, dynamic>? _data;
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
      final data = await widget.auth.api.publicTrack(widget.code);
      if (mounted) setState(() => _data = data);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = context.tr('guest.trackNotFound'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rtl = context.isRtl;
    final status = _data?['status'] as String?;
    return Scaffold(
      appBar: AtairAppBar(title: context.tr('guest.trackTitle')),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text('${_data?['orderNumber'] ?? widget.code}',
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                ),
                                if (status != null)
                                  StatusPill(label: AtairFormat.status(status, rtl: rtl), color: statusColor(status)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            _line(Icons.trip_origin, '${_data?['pickupAddress'] ?? '—'}', AtairTheme.brand),
                            const SizedBox(height: 6),
                            _line(Icons.place_outlined, '${_data?['dropoffAddress'] ?? '—'}', AtairTheme.ink),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _line(IconData icon, String text, Color color) => Row(
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      );
}
