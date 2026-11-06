import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Customer self-registration.
///
/// Registration is a public endpoint that creates the account *and* issues a
/// session, so a successful submit lands the user straight on the home screen.
/// Client-side validation mirrors the server contract exactly (a valid phone
/// and a password with at least 8 characters containing a letter and a digit),
/// so the common mistakes are caught before a round-trip and the user gets the
/// reason in their own language.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _errorKey;

  /// Same rule the API enforces (`^\+?[0-9]{7,15}$`).
  static final _phoneRe = RegExp(r'^\+?[0-9]{7,15}$');

  /// Same rule the API enforces: 8+ chars with at least one letter and one digit.
  static final _passwordRe = RegExp(r'^(?=.*[A-Za-z])(?=.*\d).+$');

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  /// Returns an error key for the first invalid field, or null when valid.
  String? _validate() {
    if (_fullName.text.trim().isEmpty || _phone.text.trim().isEmpty) {
      return 'register.required';
    }
    if (!_phoneRe.hasMatch(_phone.text.trim())) {
      return 'register.invalidPhone';
    }
    final email = _email.text.trim();
    if (email.isNotEmpty && !email.contains('@')) {
      return 'register.invalidEmail';
    }
    final password = _password.text;
    if (password.length < 8) return 'register.passwordTooShort';
    if (!_passwordRe.hasMatch(password)) return 'register.passwordNeedsLetterAndNumber';
    return null;
  }

  Future<void> _submit() async {
    final invalid = _validate();
    if (invalid != null) {
      setState(() => _errorKey = invalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _errorKey = null;
    });
    final ok = await widget.auth.register(
      fullName: _fullName.text.trim(),
      phone: _phone.text.trim(),
      password: _password.text,
      email: _email.text.trim(),
    );
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() {
      _error = widget.auth.error;
      _errorKey = widget.auth.errorKey;
      _busy = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('register.title'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: BrandLogo(
                variant: BrandLogoVariant.full,
                height: 96,
                semanticLabel: context.tr('register.title'),
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _fullName,
              decoration: InputDecoration(labelText: context.tr('register.fullName'), prefixIcon: const Icon(Icons.badge_outlined)),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              textDirection: TextDirection.ltr,
              decoration: InputDecoration(labelText: context.tr('register.phone'), hintText: '+9665xxxxxxxx', prefixIcon: const Icon(Icons.phone_outlined)),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textDirection: TextDirection.ltr,
              decoration: InputDecoration(labelText: context.tr('register.email'), prefixIcon: const Icon(Icons.email_outlined)),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: InputDecoration(
                labelText: context.tr('register.password'),
                helperText: context.tr('register.passwordHint'),
                prefixIcon: const Icon(Icons.lock_outline),
              ),
            ),
            if (_error != null || _errorKey != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _errorKey != null ? context.tr(_errorKey!) : _error!,
                  style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
                ),
              ),
            ],
            const SizedBox(height: 22),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(context.tr('register.submit')),
            ),
          ],
        ),
      ),
    );
  }
}
