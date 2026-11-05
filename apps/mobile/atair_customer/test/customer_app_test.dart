import 'package:atair_core/atair_core.dart';
import 'package:atair_core/testing.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:atair_customer/i18n.dart';
import 'package:atair_customer/screens/notifications_screen.dart';
import 'package:atair_customer/screens/register_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    useInMemoryPreferences();
    registerCustomerStrings();
  });

  testWidgets('shared login screen renders the customer title and fields', (tester) async {
    final auth = AuthController(requiredRoles: const ['customer']);
    await tester.pumpWidget(atairTestApp(AtairLoginScreen(
      auth: auth,
      appTitle: 'عَ الطاير — العملاء',
      subtitle: 'تطبيق العملاء — اطلب ووصّل بسهولة',
    )));
    await tester.pump();

    expect(find.text('عَ الطاير — العملاء'), findsOneWidget);
    expect(find.text('تطبيق العملاء — اطلب ووصّل بسهولة'), findsOneWidget);
    expect(find.text('البريد أو الجوال'), findsOneWidget);
    expect(find.text('كلمة المرور'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
  });

  testWidgets('the login screen switches to English when toggled', (tester) async {
    final auth = AuthController(requiredRoles: const ['customer']);
    await tester.pumpWidget(atairTestApp(AtairLoginScreen(
      auth: auth,
      appTitle: 'Al-Tayer — Customer',
      subtitle: 'Customer app — order and track deliveries',
    )));
    await tester.pump();

    await tester.tap(find.text('EN'));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Email or phone'), findsOneWidget);
  });

  testWidgets('registration screen validates required fields before calling the API', (tester) async {
    final auth = AuthController(requiredRoles: const ['customer']);
    await tester.pumpWidget(atairTestApp(RegisterScreen(auth: auth)));
    await tester.pump();

    await tester.tap(find.text('إنشاء الحساب'));
    await tester.pump();

    expect(find.text('الاسم ورقم الجوال مطلوبان'), findsOneWidget);
  });

  testWidgets('registration screen rejects a short password locally', (tester) async {
    final auth = AuthController(requiredRoles: const ['customer']);
    await tester.pumpWidget(atairTestApp(RegisterScreen(auth: auth)));
    await tester.pump();

    await tester.enterText(find.byType(TextField).at(0), 'أحمد');
    await tester.enterText(find.byType(TextField).at(1), '+966500000000');
    await tester.enterText(find.byType(TextField).at(3), 'short');
    await tester.tap(find.text('إنشاء الحساب'));
    await tester.pump();

    expect(find.text('كلمة المرور يجب أن تكون ٨ أحرف على الأقل'), findsOneWidget);
  });

  testWidgets('notifications screen renders its empty state without a backend', (tester) async {
    final auth = AuthController(requiredRoles: const ['customer']);
    await tester.pumpWidget(atairTestApp(CustomerNotificationsScreen(auth: auth)));
    await tester.pump();

    expect(find.text('الإشعارات'), findsOneWidget);
  });

  test('customer strings are registered in both languages', () {
    expect(sharedStrings('ar')['customer.newOrder'], 'طلب جديد');
    expect(sharedStrings('en')['customer.newOrder'], 'New order');
  });
}
