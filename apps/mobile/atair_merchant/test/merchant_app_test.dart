import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:atair_merchant/screens/notifications_screen.dart';

void main() {
  testWidgets('merchant login renders the merchant subtitle', (tester) async {
    final auth = AuthController(requiredRoles: const ['merchant_owner', 'merchant']);
    await tester.pumpWidget(MaterialApp(
      home: AtairLoginScreen(
        auth: auth,
        appTitle: 'عَ الطاير',
        subtitle: 'تطبيق التجار — أدر طلباتك',
        accent: AtairTheme.ink,
      ),
    ));
    await tester.pump();
    expect(find.text('تطبيق التجار — أدر طلباتك'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
  });

  test('merchant role gate accepts owner and generic merchant roles', () {
    final auth = AuthController(requiredRoles: const ['merchant_owner', 'merchant']);
    expect(auth.requiredRoles, containsAll(['merchant_owner', 'merchant']));
  });

  testWidgets('merchant notifications screen renders its title without a backend', (tester) async {
    final auth = AuthController(requiredRoles: const ['merchant_owner', 'merchant']);
    await tester.pumpWidget(MaterialApp(home: MerchantNotificationsScreen(auth: auth)));
    await tester.pump();
    expect(find.text('الإشعارات'), findsOneWidget);
  });
}
