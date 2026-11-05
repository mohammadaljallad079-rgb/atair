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
  });

  test('statusColor is stable for known statuses', () {
    expect(statusColor('delivered'), isNot(equals(statusColor('cancelled'))));
    expect(statusColor('assigned'), isNot(equals(Colors.transparent)));
  });
}
