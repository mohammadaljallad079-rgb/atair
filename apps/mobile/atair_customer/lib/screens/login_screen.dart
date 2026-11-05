import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'register_screen.dart';

/// Customer login, wrapping the shared [AtairLoginScreen] and adding a link to
/// self-registration.
class CustomerLoginScreen extends StatelessWidget {
  const CustomerLoginScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return AtairLoginScreen(
      auth: auth,
      appTitle: 'عَ الطاير',
      subtitle: 'تطبيق العملاء — اطلب ووصّل بسهولة',
      footer: Wrap(
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          const Text('ليس لديك حساب؟', style: TextStyle(color: AtairTheme.textMuted)),
          TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => RegisterScreen(auth: auth)),
            ),
            child: const Text('أنشئ حسابًا جديدًا'),
          ),
        ],
      ),
    );
  }
}
