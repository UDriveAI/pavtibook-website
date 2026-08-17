import 'dart:convert';
import 'package:flutter/foundation.dart';
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
      debugPrint('[PURCHASE_FLOW] [STEP 3 FAILED] User is null. Not authenticated.');
      throw Exception('User is not authenticated.');
    }
    final idToken = await user.getIdToken();
    final projectId = Firebase.app().options.projectId;
    final url =
        'https://$_region-$projectId.cloudfunctions.net/verifyGooglePlayPurchase';

    debugPrint('[PURCHASE_FLOW] [STEP 3] Calling verifyPurchase Cloud Function:');
    debugPrint('  URL: $url');

    final Map<String, dynamic> requestBody = {
      'data': {
        'purchaseToken': purchaseToken,
        'productId': productId,
        'orgId': orgId,
        'planName': planName,
        'operatorName': operatorName,
        'oldPlan': oldPlan,
      }
    };
    debugPrint('  Request Body: ${jsonEncode(requestBody)}');

    http.Response response;
    try {
      response = await http
          .post(
            Uri.parse(url),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $idToken',
            },
            body: jsonEncode(requestBody),
          )
          .timeout(const Duration(seconds: 25));
    } catch (e, stack) {
      debugPrint('[PURCHASE_FLOW] [STEP 3 FAILED] Cloud Function network request failed:');
      debugPrint('  Exception Type: ${e.runtimeType}');
      debugPrint('  Exception Details: $e');
      debugPrint('  Stacktrace:\n$stack');
      rethrow;
    }

    debugPrint('[PURCHASE_FLOW] [STEP 3 RESPONSE] Cloud Function responded:');
    debugPrint('  HTTP Status: ${response.statusCode}');
    debugPrint('  Response Body: ${response.body}');

    if (response.statusCode != 200) {
      debugPrint('[PURCHASE_FLOW] [STEP 3 FAILED] Server returned non-200 response.');
      throw Exception(
          'Verification failed: Server returned status code ${response.statusCode}\n${response.body}');
    }

    final responseBody = jsonDecode(response.body);
    if (responseBody == null || responseBody['result'] == null) {
      debugPrint('[PURCHASE_FLOW] [STEP 3 FAILED] Invalid JSON structure in response.');
      throw Exception('Verification failed: Invalid server response.');
    }

    debugPrint('[PURCHASE_FLOW] [STEP 3 SUCCESS] Cloud Function parsed response successfully.');
    return Map<String, dynamic>.from(responseBody['result']);
  }
}
