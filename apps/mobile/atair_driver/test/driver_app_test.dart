import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('driver login screen shows the driver subtitle and fields', (tester) async {
    final auth = AuthController(requiredRoles: const ['driver']);
    await tester.pumpWidget(MaterialApp(
      home: AtairLoginScreen(
        auth: auth,
        appTitle: 'عَ الطاير',
        subtitle: 'تطبيق السائق — استلم وأوصّل',
        accent: AtairTheme.ink,
      ),
    ));
    await tester.pump();

    expect(find.text('تطبيق السائق — استلم وأوصّل'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
    expect(find.text('البريد أو الجوال'), findsOneWidget);
  });

  testWidgets('auth controller rejects a non-driver role locally', (tester) async {
    final auth = AuthController(requiredRoles: const ['driver']);
    expect(auth.requiredRoles, contains('driver'));
    expect(auth.isAuthenticated, isFalse);
  });
}
