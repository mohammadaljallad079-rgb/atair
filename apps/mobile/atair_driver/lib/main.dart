import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'screens/driver_shell.dart';

void main() {
  runApp(const AtairDriverApp());
}

/// ATAIR Driver app — accept assignments, progress deliveries, track earnings.
class AtairDriverApp extends StatefulWidget {
  const AtairDriverApp({super.key});

  @override
  State<AtairDriverApp> createState() => _AtairDriverAppState();
}

class _AtairDriverAppState extends State<AtairDriverApp> {
  final AuthController _auth = AuthController(requiredRoles: const ['driver']);

  @override
  void initState() {
    super.initState();
    _auth.bootstrap();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'عَ الطاير — السائق',
      debugShowCheckedModeBanner: false,
      theme: AtairTheme.light(),
      home: AnimatedBuilder(
        animation: _auth,
        builder: (context, _) {
          if (_auth.booting) return const LoadingView();
          if (!_auth.isAuthenticated) {
            return AtairLoginScreen(
              auth: _auth,
              appTitle: 'عَ الطاير',
              subtitle: 'تطبيق السائق — استلم وأوصّل',
              accent: AtairTheme.ink,
            );
          }
          return DriverShell(auth: _auth);
        },
      ),
    );
  }
}
