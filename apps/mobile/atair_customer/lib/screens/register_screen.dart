import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Customer self-registration.
///
/// Registration is a public endpoint; on success we immediately log in with the
/// same credentials so the user lands inside the app without a second step.
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

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_fullName.text.trim().isEmpty || _phone.text.trim().isEmpty) {
      setState(() => _errorKey = 'register.required');
      return;
    }
    if (_password.text.length < 8) {
      setState(() => _errorKey = 'register.passwordTooShort');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _errorKey = null;
    });
    try {
      await widget.auth.api.registerCustomer(
        fullName: _fullName.text.trim(),
        phone: _phone.text.trim(),
        password: _password.text,
        email: _email.text.trim(),
      );
      final ok = await widget.auth.login(_phone.text.trim(), _password.text);
      if (!ok && mounted) {
        setState(() {
          _error = widget.auth.error;
          _errorKey = widget.auth.errorKey;
        });
      }
      if (ok && mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _errorKey = 'register.failed');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
              Text(_errorKey != null ? context.tr(_errorKey!) : _error!,
                  style: const TextStyle(color: Color(0xFFB91C1C))),
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
