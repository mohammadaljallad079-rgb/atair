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
  String get code => raw['code'] as String? ?? '';
}

class CustomerAddress {
  CustomerAddress(this.raw);
  final Map<String, dynamic> raw;
  String get id => raw['id'] as String? ?? '';
  String get label => raw['label'] as String? ?? '';
  String get address => raw['address'] as String? ?? '';
  String? get details => raw['details'] as String?;
  num? get latitude => raw['latitude'] == null ? null : num.tryParse('${raw['latitude']}');
  num? get longitude => raw['longitude'] == null ? null : num.tryParse('${raw['longitude']}');
  bool get isDefault => raw['isDefault'] as bool? ?? false;
}

/// Live tracking snapshot: the order plus the last recorded driver position.
///
/// A null [driverLocation] means no position has been reported yet — the UI
/// must show "not available", never an invented marker.
class OrderTracking {
  OrderTracking(this.raw);
  final Map<String, dynamic> raw;

  Map<String, dynamic> get order => (raw['order'] as Map?)?.cast<String, dynamic>() ?? const {};
  Map<String, dynamic>? get driverLocation => (raw['driverLocation'] as Map?)?.cast<String, dynamic>();
  String get status => order['status'] as String? ?? '';
  num? get pickupLat => order['pickupLat'] == null ? null : num.tryParse('${order['pickupLat']}');
  num? get pickupLng => order['pickupLng'] == null ? null : num.tryParse('${order['pickupLng']}');
  num? get dropoffLat => order['dropoffLat'] == null ? null : num.tryParse('${order['dropoffLat']}');
  num? get dropoffLng => order['dropoffLng'] == null ? null : num.tryParse('${order['dropoffLng']}');
  num? get driverLat => driverLocation?['latitude'] == null ? null : num.tryParse('${driverLocation!['latitude']}');
  num? get driverLng => driverLocation?['longitude'] == null ? null : num.tryParse('${driverLocation!['longitude']}');
  bool get hasDriverPosition => driverLat != null && driverLng != null;
}

/// Merchant dashboard KPIs, matching the nested `/merchant/dashboard` shape.
class MerchantDashboard {
  MerchantDashboard(this.raw);
  final Map<String, dynamic> raw;

  Map<String, dynamic> get _orders => (raw['orders'] as Map?)?.cast<String, dynamic>() ?? const {};
  Map<String, dynamic> get _cod => (raw['cod'] as Map?)?.cast<String, dynamic>() ?? const {};
  Map<String, dynamic> get _finance => (raw['finance'] as Map?)?.cast<String, dynamic>() ?? const {};
  Map<String, dynamic> get _branches => (raw['branches'] as Map?)?.cast<String, dynamic>() ?? const {};
  Map<String, dynamic> get _customers => (raw['customers'] as Map?)?.cast<String, dynamic>() ?? const {};

  int get ordersTotal => _orders['total'] as int? ?? 0;
  int get ordersActive => _orders['active'] as int? ?? 0;
  int get ordersPending => _orders['pending'] as int? ?? 0;
  int get ordersSearchingDriver => _orders['searchingDriver'] as int? ?? 0;
  int get ordersInTransit => _orders['inTransit'] as int? ?? 0;
  int get ordersDelivered => _orders['delivered'] as int? ?? 0;
  int get ordersCancelled => _orders['cancelled'] as int? ?? 0;
  int get ordersFailed => _orders['failed'] as int? ?? 0;
  String get codPending => '${_cod['pending'] ?? '0'}';
  String get deliverySpend => '${_finance['deliverySpend'] ?? '0'}';
  int get activeBranches => _branches['active'] as int? ?? 0;
  int get customersTotal => _customers['total'] as int? ?? 0;
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
