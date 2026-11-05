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
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: IndexedStack(index: _index, children: pages),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'الرئيسية'),
            NavigationDestination(icon: Icon(Icons.local_shipping_outlined), selectedIcon: Icon(Icons.local_shipping), label: 'المهمات'),
            NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments), label: 'الأرباح'),
            NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'الإشعارات'),
            NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'حسابي'),
          ],
        ),
      ),
    );
  }
}
