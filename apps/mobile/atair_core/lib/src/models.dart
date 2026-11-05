/// Lightweight, read-only model wrappers over the API JSON maps.
///
/// Kept intentionally thin (no code-gen) — every field mirrors the backend
/// response shape and defaults safely when a key is absent.
library;

class AppUser {
  AppUser(this.raw);
  final Map<String, dynamic> raw;

  String get id => raw['id'] as String? ?? '';
  String get fullName => raw['fullName'] as String? ?? '';
  String get email => raw['email'] as String? ?? '';
  String get phone => raw['phone'] as String? ?? '';
  String get tenantSlug => raw['tenantSlug'] as String? ?? '';
  List<String> get roles => (raw['roles'] as List?)?.cast<String>() ?? const [];
  List<String> get permissions => (raw['permissions'] as List?)?.cast<String>() ?? const [];
}

class OrderSummary {
  OrderSummary(this.raw);
  final Map<String, dynamic> raw;

  String get id => raw['id'] as String? ?? '';
  String get orderNumber => raw['orderNumber'] as String? ?? '';
  String get status => raw['status'] as String? ?? 'draft';
  String get trackingCode => raw['trackingCode'] as String? ?? '';
  String get pickupAddress => raw['pickupAddress'] as String? ?? '';
  String get dropoffAddress => raw['dropoffAddress'] as String? ?? '';
  String get total => '${raw['total'] ?? '0'}';
  String get currency => raw['currency'] as String? ?? 'SAR';
  String get paymentMethod => raw['paymentMethod'] as String? ?? 'cash';
  String get paymentStatus => raw['paymentStatus'] as String? ?? 'pending';
  String get codAmount => '${raw['codAmount'] ?? '0'}';
  String get createdAt => raw['createdAt'] as String? ?? '';
  String? get deliveredAt => raw['deliveredAt'] as String?;
  num? get distanceKm => raw['distanceKm'] == null ? null : num.tryParse('${raw['distanceKm']}');
  String? get recipientName => raw['recipientName'] as String?;
  String? get recipientPhone => raw['recipientPhone'] as String?;
  String? get notes => raw['notes'] as String?;
  Map<String, dynamic>? get driver => (raw['driver'] as Map?)?.cast<String, dynamic>();
  Map<String, dynamic>? get customer => (raw['customer'] as Map?)?.cast<String, dynamic>();
}

class Quote {
  Quote(this.raw);
  final Map<String, dynamic> raw;
  String get total => '${raw['total'] ?? '0'}';
  String get currency => raw['currency'] as String? ?? 'SAR';
  num? get distanceKm => raw['distanceKm'] == null ? null : num.tryParse('${raw['distanceKm']}');
  int? get estimatedDurationMin => raw['estimatedDurationMin'] as int?;
}

class ServiceArea {
  ServiceArea(this.raw);
  final Map<String, dynamic> raw;
  String get id => raw['id'] as String? ?? '';
  String get name => raw['name'] as String? ?? '';
}

class DriverDelivery {
  DriverDelivery(this.raw);
  final Map<String, dynamic> raw;

  String get id => raw['id'] as String? ?? '';
  String get orderNumber => raw['orderNumber'] as String? ?? '';
  String get status => raw['status'] as String? ?? '';
  String get pickupAddress => raw['pickupAddress'] as String? ?? '';
  String get dropoffAddress => raw['dropoffAddress'] as String? ?? '';
  String get total => '${raw['total'] ?? '0'}';
  String get currency => raw['currency'] as String? ?? 'SAR';
  String get codAmount => '${raw['codAmount'] ?? '0'}';
  String get paymentMethod => raw['paymentMethod'] as String? ?? 'cash';
  num? get distanceKm => raw['distanceKm'] == null ? null : num.tryParse('${raw['distanceKm']}');
  Map<String, dynamic>? get customer => (raw['customer'] as Map?)?.cast<String, dynamic>();
  String? get notes => raw['notes'] as String?;
}

class NotificationItem {
  NotificationItem(this.raw);
  final Map<String, dynamic> raw;
  String get id => raw['id'] as String? ?? '';
  String get title => raw['title'] as String? ?? '';
  String get body => raw['body'] as String? ?? '';
  String get status => raw['status'] as String? ?? 'queued';
  String get createdAt => raw['createdAt'] as String? ?? '';
  bool get isRead => status == 'read';
}

class EarningsSummary {
  EarningsSummary(this.raw);
  final Map<String, dynamic> raw;
  String get totalEarnings => '${raw['totalEarnings'] ?? '0'}';
  int get completedOrders => raw['completedOrders'] as int? ?? 0;
  int get cancelledOrders => raw['cancelledOrders'] as int? ?? 0;
  num? get rating => raw['rating'] == null ? null : num.tryParse('${raw['rating']}');
  String get todayAmount => '${(raw['today'] as Map?)?['amount'] ?? '0'}';
  int get todayOrders => (raw['today'] as Map?)?['orders'] as int? ?? 0;
  String get weekAmount => '${(raw['week'] as Map?)?['amount'] ?? '0'}';
  int get weekOrders => (raw['week'] as Map?)?['orders'] as int? ?? 0;
  Map<String, dynamic>? get wallet => (raw['wallet'] as Map?)?.cast<String, dynamic>();
}

class MerchantSummary {
  MerchantSummary(this.raw);
  final Map<String, dynamic> raw;
  String get id => raw['id'] as String? ?? '';
  String get name => raw['name'] as String? ?? '';
  String get status => raw['status'] as String? ?? '';
  String get approvalStatus => raw['approvalStatus'] as String? ?? 'pending';
}
