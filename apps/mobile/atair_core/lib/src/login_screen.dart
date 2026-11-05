import 'package:flutter/material.dart';

import 'auth_controller.dart';
import 'theme.dart';

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
  });

  final AuthController auth;
  final String appTitle;
  final String subtitle;
  final Color accent;
  final Widget? footer;

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
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: SafeArea(
          child: Center(
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
                        Container(
                          width: 84,
                          height: 84,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: widget.accent.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: const Text('🐦', style: TextStyle(fontSize: 42)),
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
                          decoration: const InputDecoration(
                            labelText: 'البريد أو الجوال',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: _password,
                          obscureText: _obscure,
                          onSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: 'كلمة المرور',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                              onPressed: () => setState(() => _obscure = !_obscure),
                            ),
                          ),
                        ),
                        if (widget.auth.error != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              widget.auth.error!,
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
                              : const Text('تسجيل الدخول'),
                        ),
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
        ),
      ),
    );
  }
}
