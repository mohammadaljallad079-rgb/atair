import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'screens/home_screen.dart';
import 'screens/login_screen.dart';

void main() {
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
    return MaterialApp(
      title: 'عَ الطاير — العملاء',
      debugShowCheckedModeBanner: false,
      theme: AtairTheme.light(),
      home: AnimatedBuilder(
        animation: _auth,
        builder: (context, _) {
          if (_auth.booting) return const LoadingView();
          return _auth.isAuthenticated
              ? HomeScreen(auth: _auth)
              : CustomerLoginScreen(auth: _auth);
        },
      ),
    );
  }
}
