import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:atair_customer/screens/login_screen.dart';
import 'package:atair_customer/screens/register_screen.dart';

void main() {
  testWidgets('login screen renders the brand title and both fields', (tester) async {
    final auth = AuthController(requiredRoles: const ['customer']);
    await tester.pumpWidget(MaterialApp(home: CustomerLoginScreen(auth: auth)));
    await tester.pump();

    expect(find.text('عَ الطاير'), findsOneWidget);
    expect(find.text('تطبيق العملاء — اطلب ووصّل بسهولة'), findsOneWidget);
    expect(find.text('البريد أو الجوال'), findsOneWidget);
    expect(find.text('كلمة المرور'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
    expect(find.text('أنشئ حسابًا جديدًا'), findsOneWidget);
  });

  testWidgets('registration screen validates required fields before calling the API', (tester) async {
    final auth = AuthController(requiredRoles: const ['customer']);
    await tester.pumpWidget(MaterialApp(home: RegisterScreen(auth: auth)));
    await tester.pump();

    await tester.tap(find.text('إنشاء الحساب'));
    await tester.pump();

    expect(find.text('الاسم ورقم الجوال مطلوبان'), findsOneWidget);
  });
}
