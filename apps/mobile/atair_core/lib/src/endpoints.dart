import 'api_client.dart';
import 'models.dart';

/// Typed endpoint facade over [ApiClient].
///
/// Grouped by principal so each mobile app only touches its own surface — the
/// backend boundary guards (Customer/Driver/Merchant) reject anything else.
class AtairApi {
  AtairApi(this.client);

  final ApiClient client;

  // ------------------------------------------------------------------ public

  Future<Map<String, dynamic>> publicSite() async =>
      (await client.get('/public/site', auth: false) as Map).cast<String, dynamic>();

  Future<Map<String, dynamic>> registerCustomer({
    required String fullName,
    required String phone,
    required String password,
    String? email,
  }) async {
    final res = await client.post('/customer/auth/register', auth: false, body: {
      'fullName': fullName,
      'phone': phone,
      'password': password,
      if (email != null && email.isNotEmpty) 'email': email,
    });
    return (res as Map).cast<String, dynamic>();
  }

  // ---------------------------------------------------------------- customer

  Future<List<OrderSummary>> customerOrders({int page = 1, int pageSize = 20, String? search}) async {
    final res = await client.get('/customer/orders', query: {'page': page, 'pageSize': pageSize, if (search != null) 'search': search});
    final items = (res is Map ? res['items'] : res) as List? ?? [];
    return items.map((e) => OrderSummary((e as Map).cast<String, dynamic>())).toList();
  }

  Future<OrderSummary> customerOrder(String id) async =>
      OrderSummary((await client.get('/customer/orders/$id') as Map).cast<String, dynamic>());

  Future<List<Map<String, dynamic>>> customerOrderTimeline(String id) async {
    final res = await client.get('/customer/orders/$id/timeline');
    final list = res is Map ? res['items'] ?? res['timeline'] ?? res : res;
    return ((list as List?) ?? []).map((e) => (e as Map).cast<String, dynamic>()).toList();
  }

  Future<Quote> customerQuote(Map<String, dynamic> body) async =>
      Quote((await client.post('/customer/orders/quote', body: body) as Map).cast<String, dynamic>());

  Future<OrderSummary> customerCreateOrder(Map<String, dynamic> body) async =>
      OrderSummary((await client.post('/customer/orders', body: body) as Map).cast<String, dynamic>());

  Future<void> customerCancelOrder(String id, String? reason) =>
      client.post('/customer/orders/$id/cancel', body: {'reason': reason});

  Future<List<ServiceArea>> customerServiceAreas() async {
    final res = await client.get('/customer/service-areas');
    final list = res is Map ? res['items'] ?? res : res;
    return ((list as List?) ?? []).map((e) => ServiceArea((e as Map).cast<String, dynamic>())).toList();
  }

  Future<Map<String, dynamic>> customerProfile() async =>
      (await client.get('/customer/profile') as Map).cast<String, dynamic>();

  Future<List<NotificationItem>> customerNotifications() async {
    final res = await client.get('/customer/notifications');
    final list = res is Map ? res['items'] ?? res : res;
    return ((list as List?) ?? []).map((e) => NotificationItem((e as Map).cast<String, dynamic>())).toList();
  }

  Future<void> customerMarkNotificationRead(String id) => client.post('/customer/notifications/$id/read');

  // ------------------------------------------------------------------ driver

  Future<Map<String, dynamic>> driverMe() async =>
      (await client.get('/driver/me') as Map).cast<String, dynamic>();

  Future<Map<String, dynamic>> driverProfile() async =>
      (await client.get('/driver/profile') as Map).cast<String, dynamic>();

  Future<void> driverSetAvailability(bool isAvailable) =>
      client.patch('/driver/availability', body: {'isAvailable': isAvailable});

  Future<void> driverUpdateLocation(double lat, double lng) =>
      client.post('/driver/location', body: {'latitude': lat, 'longitude': lng});

  Future<List<DriverDelivery>> driverDeliveries() async {
    final res = await client.get('/driver/deliveries');
    final list = res is Map ? res['items'] ?? res : res;
    return ((list as List?) ?? []).map((e) => DriverDelivery((e as Map).cast<String, dynamic>())).toList();
  }

  Future<List<DriverDelivery>> driverDeliveryHistory() async {
    final res = await client.get('/driver/deliveries/history');
    final list = res is Map ? res['items'] ?? res : res;
    return ((list as List?) ?? []).map((e) => DriverDelivery((e as Map).cast<String, dynamic>())).toList();
  }

  Future<DriverDelivery> driverDelivery(String id) async =>
      DriverDelivery((await client.get('/driver/deliveries/$id') as Map).cast<String, dynamic>());

  Future<void> driverUpdateDeliveryStatus(String id, String status, {String? note}) =>
      client.patch('/driver/deliveries/$id/status', body: {'status': status, if (note != null) 'note': note});

  Future<List<Map<String, dynamic>>> driverAssignments() async {
    final res = await client.get('/driver/assignments');
    final list = res is Map ? res['items'] ?? res['assignments'] ?? res : res;
    return ((list as List?) ?? []).map((e) => (e as Map).cast<String, dynamic>()).toList();
  }

  Future<void> driverAcceptAssignment(String id) => client.post('/driver/assignments/$id/accept');

  Future<void> driverRejectAssignment(String id, String? reason) =>
      client.post('/driver/assignments/$id/reject', body: {'reason': reason});

  Future<EarningsSummary> driverEarnings() async =>
      EarningsSummary((await client.get('/driver/earnings') as Map).cast<String, dynamic>());

  Future<Map<String, dynamic>> driverWallet() async =>
      (await client.get('/driver/wallet') as Map).cast<String, dynamic>();

  Future<List<NotificationItem>> driverNotifications() async {
    final res = await client.get('/driver/notifications');
    final list = res is Map ? res['items'] ?? res : res;
    return ((list as List?) ?? []).map((e) => NotificationItem((e as Map).cast<String, dynamic>())).toList();
  }

  Future<void> driverMarkNotificationRead(String id) => client.post('/driver/notifications/$id/read');

  // ---------------------------------------------------------------- merchant

  Future<Map<String, dynamic>> merchantContext() async =>
      (await client.get('/merchant/context') as Map).cast<String, dynamic>();

  Future<Map<String, dynamic>> merchantDashboard() async =>
      (await client.get('/merchant/dashboard') as Map).cast<String, dynamic>();

  Future<List<OrderSummary>> merchantOrders({int page = 1, int pageSize = 20, String? status}) async {
    final res = await client.get('/merchant/orders', query: {'page': page, 'pageSize': pageSize, if (status != null) 'status': status});
    final list = res is Map ? res['items'] ?? res : res;
    return ((list as List?) ?? []).map((e) => OrderSummary((e as Map).cast<String, dynamic>())).toList();
  }

  Future<OrderSummary> merchantOrder(String id) async =>
      OrderSummary((await client.get('/merchant/orders/$id') as Map).cast<String, dynamic>());

  Future<Map<String, dynamic>> merchantProfile() async =>
      (await client.get('/merchant/profile') as Map).cast<String, dynamic>();
}
