import 'package:intl/intl.dart';

/// Arabic-first formatting helpers. Numbers stay in Latin digits (Saudi
/// convention for currency/phones) while dates render in Arabic.
class AtairFormat {
  static final _money = NumberFormat('#,##0.00', 'en');
  static final _int = NumberFormat('#,##0', 'en');
  static final _date = DateFormat('yyyy-MM-dd HH:mm');

  static String money(String? value, [String currency = 'SAR']) {
    final n = num.tryParse(value ?? '') ?? 0;
    return '${_money.format(n)} $currency';
  }

  static String number(num? value) => value == null ? '—' : _int.format(value);

  static String dateTime(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return '—';
    return _date.format(parsed.toLocal());
  }

  /// Human Arabic label for an order status.
  static const Map<String, String> statusLabels = {
    'draft': 'مسودة',
    'pending': 'قيد الانتظار',
    'confirmed': 'مؤكد',
    'searching_driver': 'جارٍ البحث عن سائق',
    'assigned': 'تم إسناد سائق',
    'driver_arriving': 'السائق في الطريق',
    'picked_up': 'تم الاستلام',
    'in_transit': 'قيد التوصيل',
    'arriving': 'قريب من الموقع',
    'delivered': 'تم التسليم',
    'cancelled': 'ملغي',
    'failed_delivery': 'فشل التسليم',
    'returned': 'مُرتجع',
  };

  static String status(String? status) => statusLabels[status] ?? (status ?? '—');

  static const Map<String, String> approvalLabels = {
    'pending': 'بانتظار الموافقة',
    'approved': 'معتمد',
    'rejected': 'مرفوض',
    'suspended': 'موقوف',
  };

  static String approval(String? status) => approvalLabels[status] ?? (status ?? '—');
}
