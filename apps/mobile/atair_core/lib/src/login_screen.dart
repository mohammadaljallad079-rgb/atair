import 'package:flutter/material.dart';

import 'auth_controller.dart';
import 'brand.dart';
import 'l10n.dart';
import 'theme.dart';
import 'widgets.dart';

/// Shared, Arabic-first login screen used by every ATAIR mobile app.
///
/// The caller supplies the app title, an accent color and an optional
/// registration builder (customer app only). All three apps keep the access
/// token in memory and the refresh token in secure storage via [AuthController].
class AtairLoginScreen extends StatefulWidget {
  const AtairLoginScreen({
    super.key,
    required this.auth,
    required this.appTitle,
    required this.subtitle,
    this.accent = AtairTheme.brand,
    this.footer,
    this.onGuest,
  });

  final AuthController auth;
  final String appTitle;
  final String subtitle;
  final Color accent;
  final Widget? footer;

  /// When provided, a "Continue as guest" action is shown under the sign-in
  /// button (customer app only). Guests reach public screens without a session.
  final VoidCallback? onGuest;

  @override
  State<AtairLoginScreen> createState() => _AtairLoginScreenState();
}

class _AtairLoginScreenState extends State<AtairLoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    await widget.auth.login(_identifier.text.trim(), _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AtairL10n.of(context);
    return Directionality(
      textDirection: l10n.direction,
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              Align(
                alignment: AlignmentDirectional.topEnd,
                child: Padding(padding: const EdgeInsets.all(8), child: LanguageToggleButton()),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: AnimatedBuilder(
                      animation: widget.auth,
                      builder: (context, _) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const SizedBox(height: 8),
                            Center(
                              child: BrandLogo(
                                variant: BrandLogoVariant.full,
                                height: 132,
                                semanticLabel: widget.appTitle,
                              ),
                            ),
                            const SizedBox(height: 18),
                            Text(
                              widget.appTitle,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              widget.subtitle,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AtairTheme.textMuted),
                            ),
                            const SizedBox(height: 28),
                            TextField(
                              controller: _identifier,
                              textInputAction: TextInputAction.next,
                              decoration: InputDecoration(
                                labelText: l10n.t('login.identifier'),
                                prefixIcon: const Icon(Icons.person_outline),
                              ),
                            ),
                            const SizedBox(height: 14),
                            TextField(
                              controller: _password,
                              obscureText: _obscure,
                              onSubmitted: (_) => _submit(),
                              decoration: InputDecoration(
                                labelText: l10n.t('login.password'),
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                ),
                              ),
                            ),
                            if (widget.auth.error != null || widget.auth.errorKey != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF2F2),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  widget.auth.errorKey != null
                                      ? l10n.t(widget.auth.errorKey!)
                                      : widget.auth.error!,
                                  style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
                                ),
                              ),
                            ],
                            const SizedBox(height: 22),
                            FilledButton(
                              style: FilledButton.styleFrom(backgroundColor: widget.accent),
                              onPressed: widget.auth.busy ? null : _submit,
                              child: widget.auth.busy
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Text(l10n.t('login.submit')),
                            ),
                            if (widget.onGuest != null) ...[
                              const SizedBox(height: 10),
                              OutlinedButton.icon(
                                onPressed: widget.auth.busy ? null : widget.onGuest,
                                icon: const Icon(Icons.explore_outlined, size: 18),
                                label: Text(l10n.t('guest.continue')),
                              ),
                            ],
                            if (widget.footer != null) ...[
                              const SizedBox(height: 18),
                              widget.footer!,
                            ],
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
