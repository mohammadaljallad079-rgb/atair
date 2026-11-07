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
    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.dashboard_outlined), selectedIcon: const Icon(Icons.dashboard), label: context.tr('merchant.tab.home')),
          NavigationDestination(icon: const Icon(Icons.receipt_long_outlined), selectedIcon: const Icon(Icons.receipt_long), label: context.tr('merchant.tab.orders')),
          NavigationDestination(icon: const Icon(Icons.storefront_outlined), selectedIcon: const Icon(Icons.storefront), label: context.tr('merchant.tab.profile')),
        ],
      ),
    );
  }
}
