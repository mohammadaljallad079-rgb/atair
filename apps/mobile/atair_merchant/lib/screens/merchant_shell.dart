import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'home_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';

/// Bottom-navigation shell for the authenticated merchant.
class MerchantShell extends StatefulWidget {
  const MerchantShell({super.key, required this.auth});
  final AuthController auth;

  @override
  State<MerchantShell> createState() => _MerchantShellState();
}

class _MerchantShellState extends State<MerchantShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      MerchantHomeScreen(auth: widget.auth),
      MerchantOrdersScreen(auth: widget.auth),
      MerchantProfileScreen(auth: widget.auth),
    ];
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: IndexedStack(index: _index, children: pages),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'الرئيسية'),
            NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'الطلبات'),
            NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'حسابي'),
          ],
        ),
      ),
    );
  }
}
