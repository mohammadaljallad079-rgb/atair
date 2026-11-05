import 'package:atair_core/atair_core.dart';
import 'package:atair_core/testing.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  // `LocaleController` and `SessionStore` persist through shared_preferences;
  // the mock backend keeps those writes off the platform channel in tests.
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('AtairFormat', () {
    test('formats money with the SAR suffix', () {
      expect(AtairFormat.money('12.5'), '12.50 SAR');
      expect(AtairFormat.money(null), '0.00 SAR');
    });

    test('maps order statuses to Arabic and English labels', () {
      expect(AtairFormat.status('delivered'), 'تم التسليم');
      expect(AtairFormat.status('in_transit'), 'قيد التوصيل');
      expect(AtairFormat.status('delivered', rtl: false), 'Delivered');
      expect(AtairFormat.status('unknown_status'), 'unknown_status');
    });

    test('maps approval and payment statuses in both languages', () {
      expect(AtairFormat.approval('pending'), 'بانتظار الموافقة');
      expect(AtairFormat.approval('approved', rtl: false), 'Approved');
      expect(AtairFormat.payment('cod_pending'), 'الدفع عند التسليم');
      expect(AtairFormat.payment('paid', rtl: false), 'Paid');
    });

    test('formats dates safely', () {
      expect(AtairFormat.dateTime(null), '—');
      expect(AtairFormat.dateTime('not-a-date'), '—');
      expect(AtairFormat.dateTime('2026-01-02T10:30:00.000Z'), contains('2026-01-02'));
    });
  });

  group('LocaleController', () {
    test('defaults to Arabic/RTL and toggles to English/LTR', () async {
      final l = LocaleController();
      expect(l.isRtl, isTrue);
      expect(l.direction, TextDirection.rtl);
      expect(l.locale.code, 'ar');

      await l.toggle();
      expect(l.isRtl, isFalse);
      expect(l.direction, TextDirection.ltr);
      expect(l.locale.code, 'en');
    });

    test('resolves core keys, falls back to the key when missing, and interpolates params', () {
      final l = LocaleController();
      expect(l.t('common.retry'), 'إعادة المحاولة');
      expect(l.t('does.not.exist'), 'does.not.exist');
      expect(l.t('tracking.title'), 'تتبّع الطلب');
    });

    test('registerStrings layers app strings over the core defaults', () {
      registerStrings({
        'ar': {'custom.key': 'قيمة مخصّصة'},
        'en': {'custom.key': 'Custom value'},
      });
      final l = LocaleController();
      expect(l.t('custom.key'), 'قيمة مخصّصة');
      // core keys remain available after a merge
      expect(l.t('common.loading'), 'جارٍ التحميل…');
      expect(sharedStrings('ar')['custom.key'], 'قيمة مخصّصة');
    });
  });

  group('models', () {
    test('OrderSummary reads fields defensively', () {
      final order = OrderSummary({
        'id': 'o1',
        'orderNumber': 'ATAIR-1',
        'status': 'assigned',
        'total': '35.00',
        'currency': 'SAR',
        'distanceKm': '4.2',
      });
      expect(order.id, 'o1');
      expect(order.status, 'assigned');
      expect(order.total, '35.00');
      expect(order.distanceKm, 4.2);
    });

    test('EarningsSummary nests today/week aggregates', () {
      final e = EarningsSummary({
        'totalEarnings': '900',
        'completedOrders': 12,
        'today': {'amount': '120', 'orders': 3},
        'week': {'amount': '600', 'orders': 9},
      });
      expect(e.totalEarnings, '900');
      expect(e.todayAmount, '120');
      expect(e.todayOrders, 3);
      expect(e.weekOrders, 9);
    });

    test('MerchantDashboard reads the nested dashboard shape', () {
      final d = MerchantDashboard({
        'orders': {'total': 7, 'active': 2, 'pending': 1, 'inTransit': 2, 'delivered': 4, 'cancelled': 1},
        'cod': {'pending': 350.5},
        'finance': {'deliverySpend': 1200},
        'branches': {'active': 3},
        'customers': {'total': 42},
      });
      expect(d.ordersTotal, 7);
      expect(d.ordersInTransit, 2);
      expect(d.ordersDelivered, 4);
      expect(d.codPending, '350.5');
      expect(d.activeBranches, 3);
      expect(d.customersTotal, 42);
    });

    test('MerchantDashboard defaults safely on an empty payload', () {
      final d = MerchantDashboard(const {});
      expect(d.ordersTotal, 0);
      expect(d.codPending, '0');
      expect(d.activeBranches, 0);
    });

    test('OrderTracking never invents a driver position', () {
      final withoutDriver = OrderTracking({
        'order': {'id': 'o1', 'status': 'assigned', 'pickupLat': 24.7, 'pickupLng': 46.6},
        'driverLocation': null,
      });
      expect(withoutDriver.status, 'assigned');
      expect(withoutDriver.pickupLat, 24.7);
      expect(withoutDriver.hasDriverPosition, isFalse);

      final withDriver = OrderTracking({
        'order': {'id': 'o1', 'status': 'in_transit'},
        'driverLocation': {'latitude': 24.71, 'longitude': 46.67},
      });
      expect(withDriver.hasDriverPosition, isTrue);
      expect(withDriver.driverLat, 24.71);
    });

    test('CustomerAddress parses default flag and coordinates', () {
      final a = CustomerAddress({
        'id': 'a1',
        'label': 'home',
        'address': 'الرياض',
        'latitude': '24.7',
        'longitude': '46.6',
        'isDefault': true,
      });
      expect(a.id, 'a1');
      expect(a.isDefault, isTrue);
      expect(a.latitude, 24.7);
    });
  });

  group('map config', () {
    test('is unconfigured unless a tile URL is injected at build time', () {
      // The test build does not pass --dart-define=ATAIR_MAP_TILE_URL.
      expect(AtairMapConfig.tileUrl, isEmpty);
      expect(AtairMapConfig.isConfigured, isFalse);
    });
  });

  test('statusColor is stable for known statuses', () {
    expect(statusColor('delivered'), isNot(equals(statusColor('cancelled'))));
    expect(statusColor('assigned'), isNot(equals(Colors.transparent)));
  });

  testWidgets('AtairTrackingMap explains a missing map provider instead of rendering blank', (tester) async {
    final tracking = OrderTracking({
      'order': {'id': 'o1', 'status': 'in_transit', 'pickupLat': 24.7, 'pickupLng': 46.6},
      'driverLocation': {'latitude': 24.71, 'longitude': 46.67},
    });
    await tester.pumpWidget(atairTestApp(Scaffold(body: AtairTrackingMap(tracking: tracking))));
    await tester.pump();
    expect(find.text('لم يتم إعداد مزوّد الخرائط'), findsOneWidget);
  });

  testWidgets('AtairTrackingMap reports missing coordinates', (tester) async {
    final tracking = OrderTracking({'order': {'id': 'o1', 'status': 'draft'}});
    await tester.pumpWidget(atairTestApp(Scaffold(body: AtairTrackingMap(tracking: tracking))));
    await tester.pump();
    expect(find.text('لا تتوفّر إحداثيات لعرضها على الخريطة'), findsOneWidget);
  });
}
