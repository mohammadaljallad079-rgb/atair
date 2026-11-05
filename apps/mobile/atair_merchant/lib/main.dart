import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'i18n.dart';
import 'screens/merchant_shell.dart';

void main() {
  registerMerchantStrings();
  runApp(const AtairMerchantApp());
}

/// ATAIR Merchant app — monitor orders and business performance on the go.
class AtairMerchantApp extends StatefulWidget {
  const AtairMerchantApp({super.key});

  @override
  State<AtairMerchantApp> createState() => _AtairMerchantAppState();
}

class _AtairMerchantAppState extends State<AtairMerchantApp> {
  final AuthController _auth = AuthController(requiredRoles: const ['merchant_owner', 'merchant']);

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
      subtitleKey: 'merchant.subtitle',
      accent: AtairTheme.ink,
      builder: (context, auth) => MerchantShell(auth: auth),
    );
  }
}
