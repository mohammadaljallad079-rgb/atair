import 'package:intl/intl.dart';

/// Arabic-first formatting helpers. Numbers stay in Latin digits (Saudi
/// convention for currency/phones) while dates render in the active locale.
class AtairFormat {
  static final _money = NumberFormat('#,##0.00', 'en');
  static final _int = NumberFormat('#,##0', 'en');

  static String money(String? value, [String currency = 'SAR']) {
    final n = num.tryParse(value ?? '') ?? 0;
    return '${_money.format(n)} $currency';
  }

  static String number(num? value) => value == null ? '—' : _int.format(value);

  static String dateTime(String? iso, {bool rtl = true}) {
    if (iso == null || iso.isEmpty) return '—';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return '—';
    final fmt = DateFormat(rtl ? 'yyyy-MM-dd HH:mm' : 'dd MMM yyyy, HH:mm',
        rtl ? null : 'en');
    return fmt.format(parsed.toLocal());
  }

  static const Map<String, String> _statusAr = {
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

  static const Map<String, String> _statusEn = {
    'draft': 'Draft',
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'searching_driver': 'Searching for driver',
    'assigned': 'Driver assigned',
    'driver_arriving': 'Driver arriving',
    'picked_up': 'Picked up',
    'in_transit': 'In transit',
    'arriving': 'Arriving',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'failed_delivery': 'Delivery failed',
    'returned': 'Returned',
  };

  /// Human label for an order status. [rtl] true → Arabic.
  static String status(String? status, {bool rtl = true}) {
    final table = rtl ? _statusAr : _statusEn;
    return table[status] ?? (status ?? '—');
  }

  static const Map<String, String> _approvalAr = {
    'pending': 'بانتظار الموافقة',
    'approved': 'معتمد',
    'rejected': 'مرفوض',
    'suspended': 'موقوف',
  };

  static const Map<String, String> _approvalEn = {
    'pending': 'Pending approval',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'suspended': 'Suspended',
  };

  static String approval(String? status, {bool rtl = true}) {
    final table = rtl ? _approvalAr : _approvalEn;
    return table[status] ?? (status ?? '—');
  }

  static const Map<String, String> _paymentAr = {
    'pending': 'غير مدفوع',
    'paid': 'مدفوع',
    'failed': 'فشل الدفع',
    'refunded': 'مُسترد',
    'cod_pending': 'الدفع عند التسليم',
  };

  static const Map<String, String> _paymentEn = {
    'pending': 'Unpaid',
    'paid': 'Paid',
    'failed': 'Payment failed',
    'refunded': 'Refunded',
    'cod_pending': 'Cash on delivery',
  };

  static String payment(String? status, {bool rtl = true}) {
    final table = rtl ? _paymentAr : _paymentEn;
    return table[status] ?? (status ?? '—');
  }
}
