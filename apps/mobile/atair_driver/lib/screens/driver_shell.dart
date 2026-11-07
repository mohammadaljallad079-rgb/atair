import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

import 'deliveries_screen.dart';
import 'earnings_screen.dart';
import 'home_screen.dart';
import 'notifications_screen.dart';
import 'profile_screen.dart';

/// Bottom-navigation shell for the authenticated driver.
class DriverShell extends StatefulWidget {
  const DriverShell({super.key, required this.auth});
  final AuthController auth;

  @override
  State<DriverShell> createState() => _DriverShellState();
}

class _DriverShellState extends State<DriverShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      DriverHomeScreen(auth: widget.auth),
      DeliveriesScreen(auth: widget.auth),
      EarningsScreen(auth: widget.auth),
      DriverNotificationsScreen(auth: widget.auth),
      ProfileScreen(auth: widget.auth),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home), label: context.tr('driver.tab.home')),
          NavigationDestination(icon: const Icon(Icons.local_shipping_outlined), selectedIcon: const Icon(Icons.local_shipping), label: context.tr('driver.tab.deliveries')),
          NavigationDestination(icon: const Icon(Icons.payments_outlined), selectedIcon: const Icon(Icons.payments), label: context.tr('driver.tab.earnings')),
          NavigationDestination(icon: const Icon(Icons.notifications_outlined), selectedIcon: const Icon(Icons.notifications), label: context.tr('driver.tab.notifications')),
          NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person), label: context.tr('driver.tab.profile')),
        ],
      ),
    );
  }
}