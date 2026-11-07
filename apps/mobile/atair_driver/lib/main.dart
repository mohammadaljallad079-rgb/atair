import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'i18n.dart';
import 'screens/driver_shell.dart';

void main() {
  registerDriverStrings();
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
    return AtairAppRoot(
      auth: _auth,
      titleKey: 'app.title',
      subtitleKey: 'driver.subtitle',
      accent: AtairTheme.ink,
      builder: (context, auth) => DriverShell(auth: auth),
      guestBuilder: (context, auth) => GuestHomeScreen(auth: auth),
    );
  }
}
