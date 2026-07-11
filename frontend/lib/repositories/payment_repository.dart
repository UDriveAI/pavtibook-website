import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:http/http.dart' as http;

class PaymentRepository {
  final String _region = 'asia-south1';

  Future<Map<String, dynamic>> createRazorpayOrder({
    required double amount,
    required String orgId,
    required String planName,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('User is not authenticated.');
    }
    final idToken = await user.getIdToken();
    final projectId = Firebase.app().options.projectId;
    final url =
        'https://$_region-$projectId.cloudfunctions.net/createRazorpayOrder';

    final response = await http
        .post(
          Uri.parse(url),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $idToken',
          },
          body: jsonEncode({
            'data': {
              'amount': amount,
              'orgId': orgId,
              'planName': planName,
            }
          }),
        )
        .timeout(const Duration(seconds: 15));

    if (response.statusCode != 200) {
      throw Exception(
          'Failed to create order: Server returned status code ${response.statusCode}\n${response.body}');
    }

    final responseBody = jsonDecode(response.body);
    if (responseBody == null || responseBody['result'] == null) {
      throw Exception('Failed to create order: Invalid server response.');
    }

    return Map<String, dynamic>.from(responseBody['result']);
  }

  Future<Map<String, dynamic>> verifyRazorpayPayment({
    required String paymentId,
    required String orderId,
    required String signature,
    required String orgId,
    required String planName,
    required String operatorName,
    required String oldPlan,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('User is not authenticated.');
    }
    final idToken = await user.getIdToken();
    final projectId = Firebase.app().options.projectId;
    final url =
        'https://$_region-$projectId.cloudfunctions.net/verifyRazorpayPayment';

    final response = await http
        .post(
          Uri.parse(url),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $idToken',
          },
          body: jsonEncode({
            'data': {
              'paymentId': paymentId,
              'orderId': orderId,
              'signature': signature,
              'orgId': orgId,
              'planName': planName,
              'operatorName': operatorName,
              'oldPlan': oldPlan,
            }
          }),
        )
        .timeout(const Duration(seconds: 25));

    if (response.statusCode != 200) {
      throw Exception(
          'Verification failed: Server returned status code ${response.statusCode}\n${response.body}');
    }

    final responseBody = jsonDecode(response.body);
    if (responseBody == null || responseBody['result'] == null) {
      throw Exception('Verification failed: Invalid server response.');
    }

    return Map<String, dynamic>.from(responseBody['result']);
  }

  Future<Map<String, dynamic>> verifyGooglePlayPurchase({
    required String purchaseToken,
    required String productId,
    required String orgId,
    required String planName,
    required String operatorName,
    required String oldPlan,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('User is not authenticated.');
    }
    final idToken = await user.getIdToken();
    final projectId = Firebase.app().options.projectId;
    final url =
        'https://$_region-$projectId.cloudfunctions.net/verifyGooglePlayPurchase';

    final response = await http
        .post(
          Uri.parse(url),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $idToken',
          },
          body: jsonEncode({
            'data': {
              'purchaseToken': purchaseToken,
              'productId': productId,
              'orgId': orgId,
              'planName': planName,
              'operatorName': operatorName,
              'oldPlan': oldPlan,
            }
          }),
        )
        .timeout(const Duration(seconds: 25));

    if (response.statusCode != 200) {
      throw Exception(
          'Verification failed: Server returned status code ${response.statusCode}\n${response.body}');
    }

    final responseBody = jsonDecode(response.body);
    if (responseBody == null || responseBody['result'] == null) {
      throw Exception('Verification failed: Invalid server response.');
    }

    return Map<String, dynamic>.from(responseBody['result']);
  }
}
