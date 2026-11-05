import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AtairFormat', () {
    test('formats money with the SAR suffix', () {
      expect(AtairFormat.money('12.5'), '12.50 SAR');
      expect(AtairFormat.money(null), '0.00 SAR');
    });

    test('maps order statuses to Arabic labels', () {
      expect(AtairFormat.status('delivered'), 'تم التسليم');
      expect(AtairFormat.status('in_transit'), 'قيد التوصيل');
      expect(AtairFormat.status('unknown_status'), 'unknown_status');
    });

    test('formats dates safely', () {
      expect(AtairFormat.dateTime(null), '—');
      expect(AtairFormat.dateTime('not-a-date'), '—');
      expect(AtairFormat.dateTime('2026-01-02T10:30:00.000Z'), contains('2026-01-02'));
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

  test('statusColor is stable for known statuses', () {
    expect(statusColor('delivered'), isNot(equals(statusColor('cancelled'))));
    expect(statusColor('assigned'), isNot(equals(Colors.transparent)));
  });
}
