import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const bool demoMode = true; // Temporary DEMO MODE for mobile testing
  static String baseUrl = 'http://localhost:5000/api';

  static Future<void> updateBaseUrl(String url) async {
    baseUrl = url;
  }

  // Retrieve access token
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  // Retrieve refresh token
  static Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('refresh_token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  static Future<void> saveTokens(
      String accessToken, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', accessToken);
    await prefs.setString('refresh_token', refreshToken);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('refresh_token');
  }

  static Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('refresh_token');
  }

  // Generate generic headers
  static Future<Map<String, String>> _headers() async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = await getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Centralised HTTP request handler with automatic token refresh on 401
  static Future<http.Response> _request(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    bool isRetry = false,
  }) async {
    if (demoMode) {
      // Simulate network delay
      await Future.delayed(const Duration(milliseconds: 300));
      final prefs = await SharedPreferences.getInstance();

      if (endpoint == '/auth/register-org') {
        final name = body?['orgName'] ?? 'Demo Trust';
        final type = body?['orgType'] ?? 'Trust';
        final email = body?['orgEmail'] ?? body?['email'] ?? 'admin@demo.org';
        final address = body?['address'] ?? '123 Demo Lane';
        final pincode = body?['pincode'] ?? '400001';
        final upiId = body?['upiId'] ?? 'demotrust@upi';
        final regNumber =
            body?['registrationNumber'] ?? body?['regNumber'] ?? 'REG-12345';
        final panNumber = body?['panNumber'] ?? 'ABCDE1234F';

        final mockOrg = {
          'id': 'mock-org-uuid',
          'name': name,
          'type': type,
          'regNumber': regNumber,
          'address': address,
          'pincode': pincode,
          'upiId': upiId,
          'panNumber': panNumber,
          'isVerified': true
        };

        final mockUser = {
          'id': 'mock-user-uuid',
          'email': email,
          'role': 'admin',
          'name': body?['adminName'] ?? 'Demo Admin',
          'createdAt': DateTime.now().toIso8601String()
        };

        await prefs.setString('mock_org', jsonEncode(mockOrg));
        await prefs.setString('mock_user', jsonEncode(mockUser));

        return http.Response(
            jsonEncode({
              'token': 'mock-jwt-token',
              'refreshToken': 'mock-refresh-token',
              'user': mockUser,
              'organization': mockOrg
            }),
            200);
      }

      if (endpoint == '/auth/login-email' || endpoint == '/auth/verify-otp') {
        final savedOrgStr = prefs.getString('mock_org');
        final savedUserStr = prefs.getString('mock_user');

        Map<String, dynamic> mockOrg;
        Map<String, dynamic> mockUser;

        if (savedOrgStr != null && savedUserStr != null) {
          mockOrg = jsonDecode(savedOrgStr);
          mockUser = jsonDecode(savedUserStr);
        } else {
          mockOrg = {
            'id': 'mock-org-uuid',
            'name': 'Demo Trust',
            'type': 'Trust',
            'regNumber': 'REG-12345',
            'address': '123 Demo Lane',
            'pincode': '400001',
            'upiId': 'demotrust@upi',
            'panNumber': 'ABCDE1234F',
            'isVerified': true
          };
          mockUser = {
            'id': 'mock-user-uuid',
            'email': body?['email'] ?? 'admin@demo.org',
            'role': 'admin',
            'name': 'Demo Admin',
            'createdAt': '2026-06-12T12:00:00Z'
          };
        }

        return http.Response(
            jsonEncode({
              'token': 'mock-jwt-token',
              'refreshToken': 'mock-refresh-token',
              'user': mockUser,
              'organization': mockOrg
            }),
            200);
      }

      if (endpoint == '/auth/send-otp') {
        return http.Response(
            jsonEncode({'message': 'OTP sent successfully'}), 200);
      }

      if (endpoint == '/auth/me') {
        final savedOrgStr = prefs.getString('mock_org');
        final savedUserStr = prefs.getString('mock_user');

        Map<String, dynamic> mockOrg;
        Map<String, dynamic> mockUser;

        if (savedOrgStr != null && savedUserStr != null) {
          mockOrg = jsonDecode(savedOrgStr);
          mockUser = jsonDecode(savedUserStr);
        } else {
          mockOrg = {
            'id': 'mock-org-uuid',
            'name': 'Demo Trust',
            'type': 'Trust',
            'regNumber': 'REG-12345',
            'address': '123 Demo Lane',
            'pincode': '400001',
            'upiId': 'demotrust@upi',
            'panNumber': 'ABCDE1234F',
            'isVerified': true
          };
          mockUser = {
            'id': 'mock-user-uuid',
            'email': 'admin@demo.org',
            'role': 'admin',
            'name': 'Demo Admin',
            'createdAt': '2026-06-12T12:00:00Z'
          };
        }

        return http.Response(
            jsonEncode({'user': mockUser, 'organization': mockOrg}), 200);
      }

      if (endpoint == '/dashboard/stats') {
        return http.Response(
            jsonEncode({
              'totalDonations': 142500.0,
              'receiptCount': 18,
              'pendingCount': 3,
              'verified': true,
              'weeklyTrend': [
                {'day': 'Mon', 'amount': 12000.0},
                {'day': 'Tue', 'amount': 15000.0},
                {'day': 'Wed', 'amount': 8000.0},
                {'day': 'Thu', 'amount': 25000.0},
                {'day': 'Fri', 'amount': 32000.0},
                {'day': 'Sat', 'amount': 40000.0},
                {'day': 'Sun', 'amount': 10500.0}
              ]
            }),
            200);
      }

      if (endpoint.startsWith('/receipts')) {
        if (method == 'POST') {
          final amount = body?['amount'] ?? 100.0;
          final purpose = body?['purpose'] ?? 'Donation';
          final paymentMode = body?['paymentMode'] ?? 'cash';
          final donorName = body?['donorName'] ?? 'Guest Donor';
          final donorMobile = body?['donorMobile'] ?? '9999999999';

          final savedOrgStr = prefs.getString('mock_org');
          String upiId = 'demotrust@upi';
          String orgName = 'Demo Trust';
          if (savedOrgStr != null) {
            final savedOrg = jsonDecode(savedOrgStr);
            upiId = savedOrg['upiId'] ?? 'demotrust@upi';
            orgName = savedOrg['name'] ?? 'Demo Trust';
          }

          final newReceiptJson = {
            'id': 'receipt-${DateTime.now().millisecondsSinceEpoch}',
            'organizationId': 'mock-org-uuid',
            'templateId': 'classic',
            'donorId': 'donor-${DateTime.now().millisecondsSinceEpoch}',
            'collectorId': 'mock-user-uuid',
            'receiptNumber': 'PB-DEMO-${1000 + DateTime.now().millisecond}',
            'amount': double.tryParse(amount.toString()) ?? 100.0,
            'purpose': purpose,
            'paymentMode': paymentMode,
            'paymentStatus': paymentMode == 'upi' ? 'pending' : 'paid',
            'qrCodeValue': paymentMode == 'upi'
                ? 'upi://pay?pa=$upiId&pn=${Uri.encodeComponent(orgName)}&am=$amount'
                : '',
            'createdAt': DateTime.now().toIso8601String(),
            'donorName': donorName,
            'donorMobile': donorMobile,
            'collectorName': 'Demo Admin'
          };
          return http.Response(
              jsonEncode({
                'receipt': newReceiptJson,
                'upiPayload': paymentMode == 'upi'
                    ? {
                        'qrCode':
                            'upi://pay?pa=$upiId&pn=${Uri.encodeComponent(orgName)}&am=$amount'
                      }
                    : null
              }),
              201);
        }

        return http.Response(
            jsonEncode([
              {
                'id': 'receipt-1',
                'organizationId': 'mock-org-uuid',
                'templateId': 'classic',
                'donorId': 'donor-1',
                'collectorId': 'mock-user-uuid',
                'receiptNumber': 'PB-DEMO-0001',
                'amount': 5000.0,
                'purpose': 'General Donation',
                'paymentMode': 'upi',
                'paymentStatus': 'paid',
                'qrCodeValue':
                    'upi://pay?pa=demotrust@upi&pn=Demo%20Trust&am=5000.00',
                'createdAt': '2026-06-12T10:00:00Z',
                'donorName': 'Ramesh Kumar',
                'donorMobile': '9876543210',
                'collectorName': 'Demo Admin'
              },
              {
                'id': 'receipt-2',
                'organizationId': 'mock-org-uuid',
                'templateId': 'classic',
                'donorId': 'donor-2',
                'collectorId': 'mock-user-uuid',
                'receiptNumber': 'PB-DEMO-0002',
                'amount': 2500.0,
                'purpose': 'Building Fund',
                'paymentMode': 'cash',
                'paymentStatus': 'pending',
                'qrCodeValue': '',
                'createdAt': '2026-06-12T11:00:00Z',
                'donorName': 'Suresh Patel',
                'donorMobile': '9812345678',
                'collectorName': 'Demo Admin'
              }
            ]),
            200);
      }

      if (endpoint.startsWith('/payments/')) {
        return http.Response(jsonEncode({'success': true}), 200);
      }

      if (endpoint.startsWith('/donors/lookup')) {
        final uri = Uri.parse(endpoint);
        final mobile = uri.queryParameters['mobile'] ?? '';
        if (mobile == '9876543210') {
          return http.Response(
              jsonEncode({
                'found': true,
                'donor': {
                  'id': 'donor-1',
                  'organizationId': 'mock-org-uuid',
                  'name': 'Ramesh Kumar',
                  'mobile': '9876543210',
                  'email': 'ramesh@gmail.com',
                  'address': 'Mumbai, Maharashtra',
                  'createdAt': '2026-06-11T12:00:00Z',
                  'totalDonations': 5000.0,
                  'donationCount': 1
                }
              }),
              200);
        }
        return http.Response(jsonEncode({'found': false}), 200);
      }

      if (endpoint.startsWith('/donors')) {
        if (method == 'GET') {
          final parts = endpoint.split('/');
          if (parts.length > 2 && parts[2] != 'lookup') {
            final id = parts[2];
            return http.Response(
                jsonEncode({
                  'donor': {
                    'id': id,
                    'organizationId': 'mock-org-uuid',
                    'name': id == 'donor-1' ? 'Ramesh Kumar' : 'Suresh Patel',
                    'mobile': id == 'donor-1' ? '9876543210' : '9812345678',
                    'email': id == 'donor-1'
                        ? 'ramesh@gmail.com'
                        : 'suresh@gmail.com',
                    'address': id == 'donor-1'
                        ? 'Mumbai, Maharashtra'
                        : 'Pune, Maharashtra',
                    'createdAt': '2026-06-11T12:00:00Z'
                  },
                  'summary': {
                    'total': id == 'donor-1' ? 5000 : 2500,
                    'count': 1
                  },
                  'history': []
                }),
                200);
          }

          return http.Response(
              jsonEncode([
                {
                  'id': 'donor-1',
                  'organizationId': 'mock-org-uuid',
                  'name': 'Ramesh Kumar',
                  'mobile': '9876543210',
                  'email': 'ramesh@gmail.com',
                  'address': 'Mumbai, Maharashtra',
                  'createdAt': '2026-06-11T12:00:00Z'
                },
                {
                  'id': 'donor-2',
                  'organizationId': 'mock-org-uuid',
                  'name': 'Suresh Patel',
                  'mobile': '9812345678',
                  'email': 'suresh@gmail.com',
                  'address': 'Pune, Maharashtra',
                  'createdAt': '2026-06-12T11:00:00Z'
                }
              ]),
              200);
        }

        if (method == 'PUT') {
          final parts = endpoint.split('/');
          final id = parts.isNotEmpty ? parts.last : 'donor-1';
          return http.Response(
              jsonEncode({
                'id': id,
                'organizationId': 'mock-org-uuid',
                'name': body?['name'] ?? 'Ramesh Kumar',
                'mobile': body?['mobile'] ?? '9876543210',
                'email': body?['email'] ?? 'ramesh@gmail.com',
                'address': body?['address'] ?? 'Mumbai, Maharashtra',
                'createdAt': '2026-06-11T12:00:00Z'
              }),
              200);
        }
      }

      if (endpoint.startsWith('/templates')) {
        return http.Response(
            jsonEncode([
              {
                'id': 'classic',
                'organizationId': 'mock-org-uuid',
                'name': 'Classic Template',
                'styles': {
                  'fontFamily': 'Outfit',
                  'primaryColor': '#8B1E2D',
                  'secondaryColor': '#F47C20'
                },
                'isDefault': true,
                'createdAt': '2026-06-12T12:00:00Z'
              }
            ]),
            200);
      }

      if (endpoint.startsWith('/organizations/verification')) {
        return http.Response(jsonEncode({'success': true}), 200);
      }

      if (endpoint.startsWith('/public/verify/')) {
        final savedOrgStr = prefs.getString('mock_org');
        String orgName = 'Demo Trust';
        String orgType = 'Trust';
        if (savedOrgStr != null) {
          final savedOrg = jsonDecode(savedOrgStr);
          orgName = savedOrg['name'] ?? 'Demo Trust';
          orgType = savedOrg['type'] ?? 'Trust';
        }
        return http.Response(
            jsonEncode({
              'isValid': true,
              'isOrganizationVerified': true,
              'organizationName': orgName,
              'organizationType': orgType,
              'receiptNumber': 'PB-DEMO-9999',
              'donorName': 'Ramesh Kumar',
              'amount': '5000',
              'purpose': 'Festival Contribution',
              'date': DateTime.now().toIso8601String(),
              'paymentMode': 'upi',
              'paymentStatus': 'paid'
            }),
            200);
      }

      return http.Response(jsonEncode({'success': true}), 200);
    }

    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _headers();

    http.Response response;

    try {
      if (method == 'GET') {
        response = await http.get(url, headers: headers);
      } else if (method == 'POST') {
        response = await http.post(url,
            headers: headers, body: body != null ? jsonEncode(body) : null);
      } else if (method == 'PUT') {
        response = await http.put(url,
            headers: headers, body: body != null ? jsonEncode(body) : null);
      } else if (method == 'DELETE') {
        response = await http.delete(url, headers: headers);
      } else {
        throw Exception('Unsupported HTTP method: $method');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }

    // If unauthorized, attempt to perform silent refresh (unless it is an auth route itself)
    if (response.statusCode == 401 &&
        !isRetry &&
        !endpoint.startsWith('/auth/')) {
      final refreshSuccess = await _performRefresh();
      if (refreshSuccess) {
        // Retry the request with the new tokens
        return await _request(method, endpoint, body: body, isRetry: true);
      }
    }

    return response;
  }

  static Future<bool> _performRefresh() async {
    if (demoMode) {
      await Future.delayed(const Duration(milliseconds: 100));
      return true;
    }
    final refreshToken = await getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['token'] != null && data['refreshToken'] != null) {
          await saveTokens(data['token'], data['refreshToken']);
          return true;
        }
      }
    } catch (e) {
      debugPrint('Auto token refresh failed: $e');
    }

    // Refresh failed or revoked, clear session
    await clearTokens();
    return false;
  }

  // GET Request
  static Future<http.Response> get(String endpoint) async {
    return await _request('GET', endpoint);
  }

  // POST Request
  static Future<http.Response> post(
      String endpoint, Map<String, dynamic> body) async {
    return await _request('POST', endpoint, body: body);
  }

  // PUT Request
  static Future<http.Response> put(
      String endpoint, Map<String, dynamic> body) async {
    return await _request('PUT', endpoint, body: body);
  }

  // DELETE Request
  static Future<http.Response> delete(String endpoint) async {
    return await _request('DELETE', endpoint);
  }
}
