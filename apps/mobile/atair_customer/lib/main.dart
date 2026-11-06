import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'i18n.dart';
import 'screens/guest_home_screen.dart';
import 'screens/home_screen.dart';
import 'screens/register_screen.dart';

void main() {
  registerCustomerStrings();
  runApp(const AtairCustomerApp());
}

/// ATAIR Customer app — create and track delivery orders.
class AtairCustomerApp extends StatefulWidget {
  const AtairCustomerApp({super.key});

  @override
  State<AtairCustomerApp> createState() => _AtairCustomerAppState();
}

class _AtairCustomerAppState extends State<AtairCustomerApp> {
  final AuthController _auth = AuthController(requiredRoles: const ['customer']);

  @override
  void initState() {
    super.initState();
    _auth.bootstrap();
  }

  @override
  Widget build(BuildContext context) {
    return AtairAppRoot(
      auth: _auth,
      titleKey: 'app.title',
      subtitleKey: 'customer.subtitle',
      builder: (context, auth) => HomeScreen(auth: auth),
      guestBuilder: (context, auth) => GuestHomeScreen(auth: auth),
      loginFooter: (context) => Wrap(
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Text(context.tr('customer.register.question'),
              style: const TextStyle(color: AtairTheme.textMuted)),
          TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => RegisterScreen(auth: _auth)),
            ),
            child: Text(context.tr('customer.register.action')),
          ),
        ],
      ),
    );
  }
}
