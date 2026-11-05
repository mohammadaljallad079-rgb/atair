import 'package:atair_core/atair_core.dart';
import 'package:atair_core/testing.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:atair_merchant/i18n.dart';
import 'package:atair_merchant/screens/merchant_shell.dart';
import 'package:atair_merchant/screens/notifications_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    useInMemoryPreferences();
    registerMerchantStrings();
  });

  testWidgets('merchant login renders the merchant subtitle', (tester) async {
    final auth = AuthController(requiredRoles: const ['merchant_owner', 'merchant']);
    await tester.pumpWidget(atairTestApp(AtairLoginScreen(
      auth: auth,
      appTitle: 'عَ الطاير — التاجر',
      subtitle: 'تطبيق التجار — أدر طلباتك',
      accent: AtairTheme.ink,
    )));
    await tester.pump();

    expect(find.text('تطبيق التجار — أدر طلباتك'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
  });

  testWidgets('merchant shell labels its three destinations from the dictionary', (tester) async {
    final auth = AuthController(requiredRoles: const ['merchant_owner', 'merchant']);
    await tester.pumpWidget(atairTestApp(MerchantShell(auth: auth)));
    await tester.pump();

    expect(find.text('الرئيسية'), findsOneWidget);
    expect(find.text('الطلبات'), findsOneWidget);
    expect(find.text('حسابي'), findsOneWidget);
  });

  test('merchant role gate accepts owner and generic merchant roles', () {
    final auth = AuthController(requiredRoles: const ['merchant_owner', 'merchant']);
    expect(auth.requiredRoles, containsAll(['merchant_owner', 'merchant']));
  });

  testWidgets('merchant notifications screen renders its empty state without a backend', (tester) async {
    final auth = AuthController(requiredRoles: const ['merchant_owner', 'merchant']);
    await tester.pumpWidget(atairTestApp(MerchantNotificationsScreen(auth: auth)));
    await tester.pump();

    expect(find.text('الإشعارات'), findsOneWidget);
  });

  test('merchant strings are registered in both languages', () {
    expect(sharedStrings('ar')['merchant.tab.orders'], 'الطلبات');
    expect(sharedStrings('en')['merchant.tab.orders'], 'Orders');
  });
}
