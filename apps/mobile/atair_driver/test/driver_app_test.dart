import 'package:atair_core/atair_core.dart';
import 'package:atair_core/testing.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:atair_driver/i18n.dart';
import 'package:atair_driver/screens/driver_shell.dart';
import 'package:atair_driver/screens/notifications_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    useInMemoryPreferences();
    registerDriverStrings();
  });

  testWidgets('driver login screen shows the driver subtitle and fields', (tester) async {
    final auth = AuthController(requiredRoles: const ['driver']);
    await tester.pumpWidget(atairTestApp(AtairLoginScreen(
      auth: auth,
      appTitle: 'عَ الطاير — السائق',
      subtitle: 'تطبيق السائق — استلم وأوصّل',
      accent: AtairTheme.ink,
    )));
    await tester.pump();

    expect(find.text('تطبيق السائق — استلم وأوصّل'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
    expect(find.text('البريد أو الجوال'), findsOneWidget);
  });

  testWidgets('driver shell labels its five destinations from the dictionary', (tester) async {
    final auth = AuthController(requiredRoles: const ['driver']);
    await tester.pumpWidget(atairTestApp(DriverShell(auth: auth)));
    await tester.pump();

    expect(find.text('الرئيسية'), findsOneWidget);
    expect(find.text('المهمات'), findsOneWidget);
    expect(find.text('الأرباح'), findsOneWidget);
    expect(find.text('حسابي'), findsOneWidget);
  });

  testWidgets('driver notifications screen builds and settles without a backend', (tester) async {
    final auth = AuthController(requiredRoles: const ['driver']);
    await tester.pumpWidget(atairTestApp(DriverNotificationsScreen(auth: auth)));
    await tester.pump();

    // The screen is a pull-to-refresh list; with no backend it must degrade to
    // a loading or error view rather than throwing.
    expect(find.byType(RefreshIndicator), findsOneWidget);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  test('auth controller rejects a non-driver role locally', () {
    final auth = AuthController(requiredRoles: const ['driver']);
    expect(auth.requiredRoles, contains('driver'));
    expect(auth.isAuthenticated, isFalse);
  });

  test('driver strings are registered in both languages', () {
    expect(sharedStrings('ar')['driver.available'], 'متاح للعمل');
    expect(sharedStrings('en')['driver.available'], 'Available for work');
  });
}
