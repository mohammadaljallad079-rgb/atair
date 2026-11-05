import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'screens/merchant_shell.dart';

void main() {
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
    return MaterialApp(
      title: 'عَ الطاير — التاجر',
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
              subtitle: 'تطبيق التجار — أدر طلباتك',
              accent: AtairTheme.ink,
            );
          }
          return MerchantShell(auth: _auth);
        },
      ),
    );
  }
}
