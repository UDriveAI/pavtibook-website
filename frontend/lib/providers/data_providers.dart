import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';

// ==========================================
// 1. DASHBOARD PROVIDER
// ==========================================
class DashboardProvider with ChangeNotifier {
  DashboardStats? _stats;
  bool _isLoading = false;
  String? _errorMessage;
  String? _cachedOrgId;

  DashboardStats? get stats => _stats;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _receiptsSubscription;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _donorsSubscription;
  int _currentGeneration = 0;

  void clearCache() {
    _cachedOrgId = null;
  }

  /// Clears all cached data and cancels active listeners when switching organizations.
  void reset() {
    _receiptsSubscription?.cancel();
    _receiptsSubscription = null;
    _donorsSubscription?.cancel();
    _donorsSubscription = null;
    _currentGeneration++;
    _stats = null;
    _errorMessage = null;
    _cachedOrgId = null;
    _isLoading = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _receiptsSubscription?.cancel();
    _donorsSubscription?.cancel();
    super.dispose();
  }

  /// Initialize real-time dashboard stream for active organization context
  void initRealtimeDashboard({
    required String orgId,
    required String userRole,
    required String uid,
    required int generation,
  }) {
    _receiptsSubscription?.cancel();
    _donorsSubscription?.cancel();
    _currentGeneration = generation;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    _receiptsSubscription = FirebaseFirestore.instance
        .collection('receipts')
        .where('organizationId', isEqualTo: orgId)
        .snapshots()
        .listen((receiptsSnapshot) async {
      if (generation != _currentGeneration) {
        debugPrint('[REALTIME_DASHBOARD] Discarding stale snapshot for org $orgId.');
        return;
      }

      double total = 0;
      double today = 0;
      double monthly = 0;
      double yearly = 0;
      double cash = 0;
      double upi = 0;
      double bank = 0;
      double cheque = 0;
      double other = 0;
      double pending = 0;
      int totalReceipts = 0;

      final now = DateTime.now();
      final startOfToday = DateTime(now.year, now.month, now.day);
      final startOfTomorrow = DateTime(now.year, now.month, now.day + 1);
      final startOfMonth = DateTime(now.year, now.month, 1);
      final startOfNextMonth = DateTime(now.year, now.month + 1, 1);
      final startOfYear = DateTime(now.year, 1, 1);
      final startOfNextYear = DateTime(now.year + 1, 1, 1);

      final Map<String, double> weekdayAmounts = {
        'Mon': 0.0,
        'Tue': 0.0,
        'Wed': 0.0,
        'Thu': 0.0,
        'Fri': 0.0,
        'Sat': 0.0,
        'Sun': 0.0
      };

      int todayReceipts = 0;
      int monthReceipts = 0;
      int deliveredReceipts = 0;
      int pendingReceipts = 0;

      final isOwnerRole = userRole == 'admin' || userRole == 'owner' || userRole == 'president' || userRole == 'treasurer';

      for (var doc in receiptsSnapshot.docs) {
        final data = doc.data();
        final amount = (data['amount'] is num) ? (data['amount'] as num).toDouble() : 0.0;
        final status = normalizePaymentStatus(data['paymentStatus'] ?? data['payment_status'] ?? data['status']);
        final mode = normalizePaymentMode(data['paymentMode'] ?? data['payment_mode'] ?? data['paymentMethod']);
        final createdAtStr = data['createdAt'] ?? data['created_at'];
        final createdBy = data['createdBy'] ?? data['collectorId'] ?? '';
        final collectorId = data['collectorId'] ?? '';

        if (status == 'cancelled') continue;

        // Member dashboard only aggregates member's own receipts
        if (!isOwnerRole && createdBy != uid && collectorId != uid) continue;

        bool isToday = false;
        bool isMonth = false;
        bool isYear = false;

        if (createdAtStr != null) {
          final date = DateTime.tryParse(createdAtStr);
          if (date != null) {
            isToday = !date.isBefore(startOfToday) && date.isBefore(startOfTomorrow);
            isMonth = !date.isBefore(startOfMonth) && date.isBefore(startOfNextMonth);
            isYear = !date.isBefore(startOfYear) && date.isBefore(startOfNextYear);

            if (isToday) todayReceipts++;
            if (isMonth) monthReceipts++;
          }
        }

        if (status == 'paid') {
          deliveredReceipts++;
          total += amount;
          totalReceipts++;

          if (mode == 'cash') {
            cash += amount;
          } else if (mode == 'upi') {
            upi += amount;
          } else if (mode == 'bank') {
            bank += amount;
          } else if (mode == 'cheque') {
            cheque += amount;
          } else {
            other += amount;
          }

          if (createdAtStr != null) {
            final date = DateTime.tryParse(createdAtStr);
            if (date != null) {
              if (isToday) today += amount;
              if (isMonth) monthly += amount;
              if (isYear) yearly += amount;

              final diffDays = now.difference(date).inDays;
              if (diffDays < 7) {
                final List<String> weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                final dayIndex = date.weekday - 1;
                if (dayIndex >= 0 && dayIndex < 7) {
                  final dayName = weekdays[dayIndex];
                  weekdayAmounts[dayName] = (weekdayAmounts[dayName] ?? 0.0) + amount;
                }
              }
            }
          }
        } else if (status == 'pending') {
          pendingReceipts++;
          pending += amount;
        }
      }

      int totalDonors = 0;
      try {
        final countSnap = await FirebaseFirestore.instance
            .collection('donors')
            .where('organizationId', isEqualTo: orgId)
            .count()
            .get();
        if (generation == _currentGeneration) {
          totalDonors = countSnap.count ?? 0;
        }
      } catch (_) {
        // Fallback for compatibility
        try {
          final donorsSnap = await FirebaseFirestore.instance
              .collection('donors')
              .where('organizationId', isEqualTo: orgId)
              .get();
          if (generation == _currentGeneration) {
            totalDonors = donorsSnap.docs.length;
          }
        } catch (_) {}
      }

      int whatsappToday = 0;
      int whatsappMonth = 0;
      double estimatedCost = 0.0;
      try {
        final queryStartOfMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
        final whatsappSnapshot = await FirebaseFirestore.instance
            .collection('whatsapp_usage')
            .where('organizationId', isEqualTo: orgId)
            .where('timestamp', isGreaterThanOrEqualTo: Timestamp.fromDate(queryStartOfMonth))
            .get();

        if (generation == _currentGeneration) {
          for (var doc in whatsappSnapshot.docs) {
            final data = doc.data();
            final cost = (data['estimatedCost'] is num) ? (data['estimatedCost'] as num).toDouble() : 0.0;
            final timestampVal = data['timestamp'];
            estimatedCost += cost;

            if (timestampVal != null) {
              DateTime? date;
              if (timestampVal is Timestamp) {
                date = timestampVal.toDate();
              } else if (timestampVal is String) {
                date = DateTime.tryParse(timestampVal);
              }
              if (date != null) {
                if (date.isAfter(startOfToday)) whatsappToday++;
                if (date.isAfter(startOfMonth)) whatsappMonth++;
              }
            }
          }
        }
      } catch (_) {}

      if (generation != _currentGeneration) return;

      final weeklyTrend = weekdayAmounts.entries
          .map((e) => {'day': e.key, 'amount': e.value})
          .toList();

      _stats = DashboardStats(
        todayCollection: today,
        monthlyCollection: monthly,
        yearlyCollection: yearly,
        totalCollection: total,
        totalReceipts: totalReceipts,
        totalDonors: totalDonors,
        cashCollection: cash,
        upiCollection: upi,
        bankCollection: bank,
        chequeCollection: cheque,
        otherCollection: other,
        pendingCollection: pending,
        dailyChart: weeklyTrend,
        monthlyChart: [],
        totalWhatsappToday: whatsappToday,
        totalWhatsappMonth: whatsappMonth,
        estimatedWhatsappCost: estimatedCost,
        todayReceiptsCount: todayReceipts,
        monthReceiptsCount: monthReceipts,
        deliveredReceiptsCount: deliveredReceipts,
        pendingReceiptsCount: pendingReceipts,
      );
      _isLoading = false;
      _errorMessage = null;
      notifyListeners();
    }, onError: (e) {
      if (generation == _currentGeneration) {
        _errorMessage = 'Dashboard real-time connection error: $e';
        _isLoading = false;
        notifyListeners();
      }
    });
  }

  Future<void> fetchStats({bool forceRefresh = false}) async {
    if (forceRefresh) {
      clearCache();
    }
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw Exception("User not authenticated.");

      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(currentUser.uid)
          .get();
      final orgId = userDoc.data()?['organization_id'] ??
          userDoc.data()?['organizationId'];
      final userRole = userDoc.data()?['role'] ?? 'member';
      if (orgId == null) throw Exception("No organization found for user.");
      _cachedOrgId = orgId;

      // Fetch all receipts to calculate totals
      Query<Map<String, dynamic>> query = FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId);

      if (userRole == 'member' || userRole == 'collector') {
        query = query.where('collectorId', isEqualTo: currentUser.uid);
      }

      final receiptsSnapshot = await query.get();

      // Fetch donors for donor counts
      final donorsSnapshot = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .get();

      List<QueryDocumentSnapshot> whatsappDocs = [];
      try {
        final queryStartOfMonth =
            DateTime(DateTime.now().year, DateTime.now().month, 1);
        final whatsappSnapshot = await FirebaseFirestore.instance
            .collection('whatsapp_usage')
            .where('organizationId', isEqualTo: orgId)
            .where('timestamp',
                isGreaterThanOrEqualTo: Timestamp.fromDate(queryStartOfMonth))
            .get();
        whatsappDocs = whatsappSnapshot.docs;
      } catch (e) {
        debugPrint(
            'Dashboard whatsapp_usage query error (index might be building): $e');
      }

      double total = 0;
      double today = 0;
      double monthly = 0;
      double yearly = 0;
      double cash = 0;
      double upi = 0;
      double bank = 0;
      double cheque = 0;
      double other = 0;
      double pending = 0;
      int totalReceipts = 0;

      final now = DateTime.now();
      final startOfToday = DateTime(now.year, now.month, now.day);
      final startOfTomorrow = DateTime(now.year, now.month, now.day + 1);
      final startOfMonth = DateTime(now.year, now.month, 1);
      final startOfNextMonth = DateTime(now.year, now.month + 1, 1);
      final startOfYear = DateTime(now.year, 1, 1);
      final startOfNextYear = DateTime(now.year + 1, 1, 1);

      // Weekly trend amounts
      final Map<String, double> weekdayAmounts = {
        'Mon': 0.0,
        'Tue': 0.0,
        'Wed': 0.0,
        'Thu': 0.0,
        'Fri': 0.0,
        'Sat': 0.0,
        'Sun': 0.0
      };

      int todayReceipts = 0;
      int monthReceipts = 0;
      int deliveredReceipts = 0;
      int pendingReceipts = 0;

      for (var doc in receiptsSnapshot.docs) {
        final data = doc.data();
        final amount =
            (data['amount'] is num) ? (data['amount'] as num).toDouble() : 0.0;
        final status = normalizePaymentStatus(data['paymentStatus'] ?? data['payment_status'] ?? data['status']);
        final mode = normalizePaymentMode(data['paymentMode'] ?? data['payment_mode'] ?? data['paymentMethod']);
        final createdAtStr = data['createdAt'] ?? data['created_at'];

        if (status == 'cancelled') continue;

        bool isToday = false;
        bool isMonth = false;
        bool isYear = false;

        if (createdAtStr != null) {
          final date = DateTime.tryParse(createdAtStr);
          if (date != null) {
            isToday = !date.isBefore(startOfToday) && date.isBefore(startOfTomorrow);
            isMonth = !date.isBefore(startOfMonth) && date.isBefore(startOfNextMonth);
            isYear = !date.isBefore(startOfYear) && date.isBefore(startOfNextYear);

            if (isToday) {
              todayReceipts++;
            }
            if (isMonth) {
              monthReceipts++;
            }
          }
        }

        if (status == 'paid') {
          deliveredReceipts++;
          total += amount;
          totalReceipts++;

          if (mode == 'cash') {
            cash += amount;
          } else if (mode == 'upi') {
            upi += amount;
          } else if (mode == 'bank') {
            bank += amount;
          } else if (mode == 'cheque') {
            cheque += amount;
          } else {
            other += amount;
          }

          if (createdAtStr != null) {
            final date = DateTime.tryParse(createdAtStr);
            if (date != null) {
              if (isToday) {
                today += amount;
              }
              if (isMonth) {
                monthly += amount;
              }
              if (isYear) {
                yearly += amount;
              }

              final diffDays = now.difference(date).inDays;
              if (diffDays < 7) {
                final List<String> weekdays = [
                  'Mon',
                  'Tue',
                  'Wed',
                  'Thu',
                  'Fri',
                  'Sat',
                  'Sun'
                ];
                final dayIndex = date.weekday - 1;
                if (dayIndex >= 0 && dayIndex < 7) {
                  final dayName = weekdays[dayIndex];
                  weekdayAmounts[dayName] =
                      (weekdayAmounts[dayName] ?? 0.0) + amount;
                }
              }
            }
          }
        } else if (status == 'pending') {
          pendingReceipts++;
          pending += amount;
        }
      }

      int whatsappToday = 0;
      int whatsappMonth = 0;
      double estimatedCost = 0.0;

      for (var doc in whatsappDocs) {
        final data = doc.data() as Map<String, dynamic>;
        final cost = (data['estimatedCost'] is num)
            ? (data['estimatedCost'] as num).toDouble()
            : 0.0;
        final timestampVal = data['timestamp'];

        estimatedCost += cost;

        if (timestampVal != null) {
          DateTime? date;
          if (timestampVal is Timestamp) {
            date = timestampVal.toDate();
          } else if (timestampVal is String) {
            date = DateTime.tryParse(timestampVal);
          }

          if (date != null) {
            if (!date.isBefore(startOfToday) && date.isBefore(startOfTomorrow)) {
              whatsappToday++;
            }
            if (!date.isBefore(startOfMonth) && date.isBefore(startOfNextMonth)) {
              whatsappMonth++;
            }
          }
        }
      }

      final weeklyTrend = weekdayAmounts.entries
          .map((e) => {'day': e.key, 'amount': e.value})
          .toList();

      _stats = DashboardStats(
        todayCollection: today,
        monthlyCollection: monthly,
        yearlyCollection: yearly,
        totalCollection: total,
        totalReceipts: totalReceipts,
        totalDonors: donorsSnapshot.docs.length,
        cashCollection: cash,
        upiCollection: upi,
        bankCollection: bank,
        chequeCollection: cheque,
        otherCollection: other,
        pendingCollection: pending,
        dailyChart: weeklyTrend,
        monthlyChart: [],
        totalWhatsappToday: whatsappToday,
        totalWhatsappMonth: whatsappMonth,
        estimatedWhatsappCost: estimatedCost,
        todayReceiptsCount: todayReceipts,
        monthReceiptsCount: monthReceipts,
        deliveredReceiptsCount: deliveredReceipts,
        pendingReceiptsCount: pendingReceipts,
      );
    } catch (e) {
      _errorMessage = 'Connection error: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

// ==========================================
// 2. RECEIPT PROVIDER
// ==========================================
class ReceiptProvider with ChangeNotifier {
  List<ReceiptModel> _receipts = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Caching during session
  String? _cachedOrgId;
  String? _cachedUserRole;
  Map<String, dynamic>? _cachedOrgData;
  String? _cachedUserDisplayName;
  String? _cachedUid;

  // Collector Mode settings
  bool _collectorMode = false;
  bool _collectorRememberSelections = true;
  bool _collectorAutoNext = true;
  String _lastPurpose = '';
  String _lastPaymentMode = 'cash';
  String _lastCollectedBy = '';

  ReceiptProvider() {
    loadCollectorSettings();
  }

  List<ReceiptModel> get receipts => _receipts;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get collectorMode => _collectorMode;
  bool get collectorRememberSelections => _collectorRememberSelections;
  bool get collectorAutoNext => _collectorAutoNext;
  String get lastPurpose => _lastPurpose;
  String get lastPaymentMode => _lastPaymentMode;
  String get lastCollectedBy => _lastCollectedBy;

  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _activeReceiptSub;

  /// Clears all receipt data and cancels active listeners when switching organizations.
  void reset() {
    _activeReceiptSub?.cancel();
    _activeReceiptSub = null;
    _receipts = [];
    _errorMessage = null;
    _cachedOrgId = null;
    _cachedUserRole = null;
    _cachedOrgData = null;
    _cachedUserDisplayName = null;
    _cachedUid = null;
    _isLoading = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _activeReceiptSub?.cancel();
    super.dispose();
  }

  /// Real-time stream of receipts scoped strictly to active organization.
  /// Owners/presidents/treasurers see all org receipts; members/collectors see only their own.
  /// Member filtering uses createdBy field (immutable audit field) with collectorId fallback.
  Stream<List<ReceiptModel>> receiptsStream({
    required String orgId,
    required String uid,
    required String role,
  }) {
    _activeReceiptSub?.cancel();

    final bool isMemberRole = role == 'member' || role == 'collector';

    // Base query always scoped to active organization
    Query<Map<String, dynamic>> query = FirebaseFirestore.instance
        .collection('receipts')
        .where('organizationId', isEqualTo: orgId);

    final stream = query.snapshots().map((snap) {
      var results = snap.docs.map((d) => ReceiptModel.fromJson(d.data())).toList();
      // Member filtering: in-memory filter on createdBy for correctness
      if (isMemberRole) {
        results = results.where((r) {
          return r.createdBy == uid || r.collectorId == uid;
        }).toList();
      }
      // Always sort newest first
      results.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return results;
    });

    return stream;
  }


  Future<void> loadCollectorSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _collectorMode = prefs.getBool('collector_mode') ?? false;
    _collectorRememberSelections =
        prefs.getBool('collector_remember_selections') ?? true;
    _collectorAutoNext = prefs.getBool('collector_auto_next') ?? true;
    _lastPurpose = prefs.getString('last_purpose') ?? '';
    _lastPaymentMode = prefs.getString('last_payment_mode') ?? 'cash';
    _lastCollectedBy = prefs.getString('last_collected_by') ?? '';
    notifyListeners();
  }

  void setCollectorMode(bool val) {
    _collectorMode = val;
    notifyListeners();
  }

  void setCollectorRememberSelections(bool val) {
    _collectorRememberSelections = val;
    notifyListeners();
  }

  void setCollectorAutoNext(bool val) {
    _collectorAutoNext = val;
    notifyListeners();
  }

  Future<void> saveLastSelections({
    required String purpose,
    required String paymentMode,
    required String collectedBy,
  }) async {
    _lastPurpose = purpose;
    _lastPaymentMode = paymentMode;
    _lastCollectedBy = collectedBy;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_purpose', purpose);
    await prefs.setString('last_payment_mode', paymentMode);
    await prefs.setString('last_collected_by', collectedBy);
  }

  void clearCache() {
    _cachedOrgId = null;
    _cachedUserRole = null;
    _cachedOrgData = null;
    _cachedUserDisplayName = null;
    _cachedUid = null;
  }

  Future<void> fetchReceipts(
      {String? search,
      String? paymentMode,
      String? paymentStatus,
      String? dateFilter,
      bool forceRefresh = false}) async {
    if (forceRefresh) {
      clearCache();
    }
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw Exception("User not authenticated.");

      if (_cachedUid != currentUser.uid) {
        clearCache();
        _cachedUid = currentUser.uid;
      }

      String? orgId = _cachedOrgId;
      String? userRole = _cachedUserRole;
      if (orgId == null || userRole == null) {
        final userDoc = await FirebaseFirestore.instance
            .collection('users')
            .doc(currentUser.uid)
            .get();
        orgId = userDoc.data()?['organization_id'] ??
            userDoc.data()?['organizationId'];
        userRole = userDoc.data()?['role'] ?? 'member';
        if (orgId == null) throw Exception("No organization found for user.");
        _cachedOrgId = orgId;
        _cachedUserRole = userRole;
      }
      if (orgId == null) throw Exception("No organization found for user.");

      // Always scope to active organization — server-side
      Query<Map<String, dynamic>> query = FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId);

      // Member filtering applied in-memory using createdBy (immutable audit field)
      // so both old receipts (collectorId only) and new receipts (createdBy) are included
      final bool isMemberRole = userRole == 'member' || userRole == 'collector';

      final snapshot = await query.get();

      List<ReceiptModel> loaded = snapshot.docs.map((doc) {
        final data = doc.data();
        return ReceiptModel.fromJson(data);
      }).toList();

      // Apply member-scope filter in memory (createdBy || collectorId)
      if (isMemberRole) {
        loaded = loaded.where((r) {
          return r.createdBy == currentUser.uid || r.collectorId == currentUser.uid;
        }).toList();
      }

      // Always sort newest first
      loaded.sort((a, b) => b.createdAt.compareTo(a.createdAt));

      if (search != null && search.isNotEmpty) {
        final lower = search.toLowerCase();
        loaded = loaded
            .where((r) =>
                (r.donorName ?? '').toLowerCase().contains(lower) ||
                (r.donorMobile ?? '').contains(lower) ||
                r.receiptNumber.toLowerCase().contains(lower))
            .toList();
      }
      if (paymentMode != null && paymentMode.isNotEmpty) {
        loaded = loaded.where((r) => r.paymentMode == paymentMode).toList();
      }
      if (paymentStatus != null && paymentStatus.isNotEmpty) {
        loaded = loaded.where((r) => r.paymentStatus == paymentStatus).toList();
      }

      if (dateFilter != null && dateFilter.isNotEmpty) {
        final now = DateTime.now();
        final startOfToday = DateTime(now.year, now.month, now.day);
        final startOfTomorrow = DateTime(now.year, now.month, now.day + 1);
        final startOfMonth = DateTime(now.year, now.month, 1);
        final startOfNextMonth = DateTime(now.year, now.month + 1, 1);
        final startOfYear = DateTime(now.year, 1, 1);
        final startOfNextYear = DateTime(now.year + 1, 1, 1);

        loaded = loaded.where((r) {
          final date = DateTime.tryParse(r.createdAt);
          if (date == null) return false;
          if (dateFilter == 'today') {
            return !date.isBefore(startOfToday) && date.isBefore(startOfTomorrow);
          } else if (dateFilter == 'month') {
            return !date.isBefore(startOfMonth) && date.isBefore(startOfNextMonth);
          } else if (dateFilter == 'year') {
            return !date.isBefore(startOfYear) && date.isBefore(startOfNextYear);
          }
          return true;
        }).toList();
      }

      _receipts = loaded;
    } catch (e) {
      _errorMessage = 'Connection error: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Generate Receipt via PostgreSQL Backend API
  Future<Map<String, dynamic>?> createReceipt(
      Map<String, dynamic> receiptData) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final payload = {
        'donorName': receiptData['donorName'] ?? '',
        'donorMobile': receiptData['donorMobile'] ?? '',
        'donorEmail': (receiptData['donorEmail'] != null &&
                receiptData['donorEmail'].toString().isNotEmpty)
            ? receiptData['donorEmail']
            : null,
        'donorAddress': receiptData['donorAddress'],
        'amount': receiptData['amount'],
        'purpose': receiptData['purpose'] ?? 'General Donation',
        'paymentMode': receiptData['paymentMode'] ?? 'cash',
        'idempotencyKey': receiptData['idempotencyKey'],
        'templateId': receiptData['templateId'],
      };

      final response = await ApiService.post('/receipts', payload);
      final responseBody = jsonDecode(response.body);

      if (response.statusCode == 201) {
        final receiptJson = responseBody['receipt'];
        final upiPayload = responseBody['upiPayload'];

        final newModel = ReceiptModel.fromJson(receiptJson);
        _receipts.insert(0, newModel);
        _isLoading = false;
        notifyListeners();

        return {
          'receipt': receiptJson,
          'upiPayload': upiPayload != null ? {'qrCode': upiPayload} : null,
        };
      } else {
        _errorMessage = responseBody['message'] ?? 'Failed to generate receipt.';
        _isLoading = false;
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Receipt creation error: $e');
      _errorMessage = 'Connection error: $e';
    }

    _isLoading = false;
    notifyListeners();
    return null;
  }

  // Update Pending Payment to paid
  Future<bool> reconcilePayment(
      String receiptId, String paymentMethod, String? transactionRef) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      String confirmedBy = 'Collector';
      String confirmedRole = 'Collector';
      if (currentUser != null) {
        try {
          final userDoc = await FirebaseFirestore.instance
              .collection('users')
              .doc(currentUser.uid)
              .get();
          confirmedBy = userDoc.data()?['name'] ?? 'Collector';
          confirmedRole = userDoc.data()?['role'] ?? 'Collector';
        } catch (_) {}
      }

      final confirmedByUserId = currentUser?.uid ?? '';
      final confirmedByName = confirmedBy;
      final confirmedAtStr = DateTime.now().toIso8601String();
      final confirmedAt = FieldValue.serverTimestamp();

      await FirebaseFirestore.instance
          .collection('receipts')
          .doc(receiptId)
          .update({
        'status': 'paid',
        'paymentStatus': 'paid',
        'paymentMethod': normalizePaymentMode(paymentMethod),
        'paymentMode': normalizePaymentMode(paymentMethod),
        'paidAt': confirmedAt,
        'updatedAt': confirmedAt,
        'pending': false,
        'confirmationMethod': 'Collector Confirmation',
        'paymentConfirmationMethod': 'Collector Confirmation',
        'confirmedByUserId': confirmedByUserId,
        'confirmedByName': confirmedByName,
        'confirmedAt': confirmedAt,
        'transactionRef': transactionRef,
        'reconciledAt': confirmedAt,
      });

      // Log payment confirmation activity
      String rNumber = 'Receipt';
      String rPaymentMode = 'Payment';
      try {
        final rModel = _receipts.firstWhere((r) => r.id == receiptId);
        rNumber = rModel.receiptNumber;
        rPaymentMode = rModel.paymentMode;
      } catch (_) {}

      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': _cachedOrgId ?? '',
        'userId': currentUser?.uid ?? '',
        'userName': confirmedByName,
        'userRole': confirmedRole,
        'action': 'Payment Confirmed',
        'details': paymentMethod.toLowerCase() == 'upi'
            ? 'Confirmed UPI Payment'
            : 'Confirmed Payment',
        'timestamp': DateTime.now().toIso8601String(),
      });

      final idx = _receipts.indexWhere((r) => r.id == receiptId);
      if (idx != -1) {
        final old = _receipts[idx];
        _receipts[idx] = ReceiptModel(
          id: old.id,
          organizationId: old.organizationId,
          templateId: old.templateId,
          donorId: old.donorId,
          collectorId: old.collectorId,
          receiptNumber: old.receiptNumber,
          amount: old.amount,
          purpose: old.purpose,
          paymentMode: paymentMethod.toLowerCase(),
          paymentStatus: 'paid',
          qrCodeValue: old.qrCodeValue,
          createdAt: old.createdAt,
          donorName: old.donorName,
          donorMobile: old.donorMobile,
          collectorName: old.collectorName,
          donorAddress: old.donorAddress,
          headerLogoUrl: old.headerLogoUrl,
          leftSideImageUrl: old.leftSideImageUrl,
          rightSideImageUrl: old.rightSideImageUrl,
          customStampUrl: old.customStampUrl,
          footerText: old.footerText,
          signatureUrl: old.signatureUrl,
          collectorRole: old.collectorRole,
          organizationName: old.organizationName,
          organizationLogoUrl: old.organizationLogoUrl,
          leftImageUrl: old.leftImageUrl,
          rightImageUrl: old.rightImageUrl,
          stampUrl: old.stampUrl,
          collectorSignatureUrl: old.collectorSignatureUrl,
          editedAt: old.editedAt,
          editedBy: old.editedBy,
          confirmedByUserId: confirmedByUserId,
          confirmedByName: confirmedByName,
          confirmedAt: confirmedAtStr,
          lastReminderAttemptAt: old.lastReminderAttemptAt,
          reminderAttemptCount: old.reminderAttemptCount,
          receiptThemeId: old.receiptThemeId,
        );
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Connection error: $e';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Log payment reminder attempt
  Future<void> logReminderAttempt(String receiptId) async {
    try {
      final docRef =
          FirebaseFirestore.instance.collection('receipts').doc(receiptId);
      final nowStr = DateTime.now().toIso8601String();
      int newCount = 1;

      await FirebaseFirestore.instance.runTransaction((transaction) async {
        final snapshot = await transaction.get(docRef);
        if (snapshot.exists) {
          final currentCount = snapshot.data()?['reminderAttemptCount'] ??
              snapshot.data()?['reminderCount'] ??
              0;
          newCount = currentCount + 1;
          transaction.update(docRef, {
            'lastReminderAttemptAt': nowStr,
            'reminderAttemptCount': newCount,
          });
        } else {
          transaction.set(
              docRef,
              {
                'lastReminderAttemptAt': nowStr,
                'reminderAttemptCount': 1,
              },
              SetOptions(merge: true));
        }
      });

      final idx = _receipts.indexWhere((r) => r.id == receiptId);
      if (idx != -1) {
        final old = _receipts[idx];
        _receipts[idx] = ReceiptModel(
          id: old.id,
          organizationId: old.organizationId,
          templateId: old.templateId,
          donorId: old.donorId,
          collectorId: old.collectorId,
          receiptNumber: old.receiptNumber,
          amount: old.amount,
          purpose: old.purpose,
          paymentMode: old.paymentMode,
          paymentStatus: old.paymentStatus,
          qrCodeValue: old.qrCodeValue,
          createdAt: old.createdAt,
          donorName: old.donorName,
          donorMobile: old.donorMobile,
          collectorName: old.collectorName,
          donorAddress: old.donorAddress,
          headerLogoUrl: old.headerLogoUrl,
          leftSideImageUrl: old.leftSideImageUrl,
          rightSideImageUrl: old.rightSideImageUrl,
          customStampUrl: old.customStampUrl,
          footerText: old.footerText,
          signatureUrl: old.signatureUrl,
          collectorRole: old.collectorRole,
          organizationName: old.organizationName,
          organizationLogoUrl: old.organizationLogoUrl,
          leftImageUrl: old.leftImageUrl,
          rightImageUrl: old.rightImageUrl,
          stampUrl: old.stampUrl,
          collectorSignatureUrl: old.collectorSignatureUrl,
          editedAt: old.editedAt,
          editedBy: old.editedBy,
          confirmedByUserId: old.confirmedByUserId,
          confirmedByName: old.confirmedByName,
          confirmedAt: old.confirmedAt,
          lastReminderAttemptAt: nowStr,
          reminderAttemptCount: newCount,
          receiptThemeId: old.receiptThemeId,
        );
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to log reminder attempt: $e');
    }
  }

  // Update receipt details (Edit Governance)
  Future<bool> updateReceipt({
    required String receiptId,
    required String donorName,
    required String donorMobile,
    required String? donorAddress,
    required String purpose,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw Exception("User not authenticated.");

      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(currentUser.uid)
          .get();
      final editorName = userDoc.data()?['name'] ?? 'PavtiBook Editor';
      final editorRole = userDoc.data()?['role'] ?? 'Member';
      final editTime = DateTime.now().toIso8601String();

      // Immutable fields (organizationId, createdBy, createdByName, createdAt, receiptNumber)
      // are NEVER included in updates — receipt ownership is permanent.
      await FirebaseFirestore.instance
          .collection('receipts')
          .doc(receiptId)
          .update({
        'donorName': donorName,
        'donorMobile': donorMobile,
        'donorAddress': donorAddress,
        'purpose': purpose,
        'editedAt': FieldValue.serverTimestamp(),
        'editedBy': editorName,
      });

      // Log receipt edit activity
      String rNumber = 'Receipt';
      try {
        rNumber = _receipts.firstWhere((r) => r.id == receiptId).receiptNumber;
      } catch (_) {}

      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': _cachedOrgId ?? '',
        'userId': currentUser.uid,
        'userName': editorName,
        'userRole': editorRole,
        'action': 'Receipt Edited',
        'details': 'Edited Receipt $rNumber',
        'timestamp': DateTime.now().toIso8601String(),
      });

      final idx = _receipts.indexWhere((r) => r.id == receiptId);
      if (idx != -1) {
        final old = _receipts[idx];
        _receipts[idx] = ReceiptModel(
          id: old.id,
          organizationId: old.organizationId,
          templateId: old.templateId,
          donorId: old.donorId,
          collectorId: old.collectorId,
          receiptNumber: old.receiptNumber,
          amount: old.amount,
          purpose: purpose,
          paymentMode: old.paymentMode,
          paymentStatus: old.paymentStatus,
          qrCodeValue: old.qrCodeValue,
          createdAt: old.createdAt,
          donorName: donorName,
          donorMobile: donorMobile,
          collectorName: old.collectorName,
          donorAddress: donorAddress,
          headerLogoUrl: old.headerLogoUrl,
          leftSideImageUrl: old.leftSideImageUrl,
          rightSideImageUrl: old.rightSideImageUrl,
          customStampUrl: old.customStampUrl,
          footerText: old.footerText,
          signatureUrl: old.signatureUrl,
          collectorRole: old.collectorRole,
          organizationName: old.organizationName,
          organizationLogoUrl: old.organizationLogoUrl,
          leftImageUrl: old.leftImageUrl,
          rightImageUrl: old.rightImageUrl,
          stampUrl: old.stampUrl,
          collectorSignatureUrl: old.collectorSignatureUrl,
          editedAt: editTime,
          editedBy: editorName,
          receiptThemeId: old.receiptThemeId,
        );
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Edit failed: $e';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Cancel Pending Payment
  Future<bool> cancelPayment(String receiptId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final doc = await FirebaseFirestore.instance
          .collection('receipts')
          .doc(receiptId)
          .get();
      if (doc.exists) {
        final data = doc.data()!;
        final oldStatus = data['paymentStatus'] ?? data['payment_status'] ?? '';
        final donorId = data['donorId'] ?? data['donor_id'];
        final amount =
            (data['amount'] is num) ? (data['amount'] as num).toDouble() : 0.0;

        await FirebaseFirestore.instance
            .collection('receipts')
            .doc(receiptId)
            .update({
          'paymentStatus': 'cancelled',
          'cancelledAt': FieldValue.serverTimestamp(),
        });

        // Deduct donor metrics if previously paid
        if (oldStatus == 'paid' && donorId != null) {
          final donorDoc = await FirebaseFirestore.instance
              .collection('donors')
              .doc(donorId)
              .get();
          if (donorDoc.exists) {
            final currentTotal = (donorDoc.data()!['totalDonated'] is num)
                ? (donorDoc.data()!['totalDonated'] as num).toDouble()
                : 0.0;
            final currentCount = donorDoc.data()!['donationCount'] ?? 0;
            await donorDoc.reference.update({
              'totalDonated':
                  currentTotal - amount >= 0 ? currentTotal - amount : 0.0,
              'donationCount': currentCount - 1 >= 0 ? currentCount - 1 : 0,
            });
          }
        }
      }

      final idx = _receipts.indexWhere((r) => r.id == receiptId);
      if (idx != -1) {
        final old = _receipts[idx];
        _receipts[idx] = ReceiptModel(
          id: old.id,
          organizationId: old.organizationId,
          templateId: old.templateId,
          donorId: old.donorId,
          collectorId: old.collectorId,
          receiptNumber: old.receiptNumber,
          amount: old.amount,
          purpose: old.purpose,
          paymentMode: old.paymentMode,
          paymentStatus: 'cancelled',
          qrCodeValue: old.qrCodeValue,
          createdAt: old.createdAt,
          donorName: old.donorName,
          donorMobile: old.donorMobile,
          collectorName: old.collectorName,
          donorAddress: old.donorAddress,
          headerLogoUrl: old.headerLogoUrl,
          leftSideImageUrl: old.leftSideImageUrl,
          rightSideImageUrl: old.rightSideImageUrl,
          customStampUrl: old.customStampUrl,
          footerText: old.footerText,
          signatureUrl: old.signatureUrl,
          collectorRole: old.collectorRole,
          organizationName: old.organizationName,
          organizationLogoUrl: old.organizationLogoUrl,
          leftImageUrl: old.leftImageUrl,
          rightImageUrl: old.rightImageUrl,
          stampUrl: old.stampUrl,
          collectorSignatureUrl: old.collectorSignatureUrl,
          editedAt: old.editedAt,
          editedBy: old.editedBy,
          receiptThemeId: old.receiptThemeId,
        );
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Connection error: $e';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Log receipt sharing
  Future<bool> deliverReceipt(
      String receiptId, String channel, String recipient,
      {String status = 'success', String? shareMethod}) async {
    try {
      await FirebaseFirestore.instance
          .collection('receipts')
          .doc(receiptId)
          .collection('delivery_logs')
          .add({
        'channel': channel,
        'recipientAddress': recipient,
        'status': status,
        'shareMethod': shareMethod ?? channel,
        'timestamp': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      debugPrint('Delivery logging failed: $e');
      return false;
    }
  }
}

// ==========================================
// 3. DONOR PROVIDER
// ==========================================
class DonorProvider with ChangeNotifier {
  List<DonorModel> _donors = [];
  DonorModel? _selectedDonor;
  DonorModel? _foundDonor;
  Map<String, dynamic> _foundDonorStats = {};
  List<ReceiptModel> _donorHistory = [];
  Map<String, dynamic> _donorSummary = {};
  bool _isLoading = false;
  bool _isLookingUp = false;

  List<DonorModel> get donors => _donors;
  DonorModel? get selectedDonor => _selectedDonor;
  DonorModel? get foundDonor => _foundDonor;
  Map<String, dynamic> get foundDonorStats => _foundDonorStats;
  List<ReceiptModel> get donorHistory => _donorHistory;
  Map<String, dynamic> get donorSummary => _donorSummary;
  bool get isLoading => _isLoading;
  bool get isLookingUp => _isLookingUp;

  Future<void> fetchDonors({String? search}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final endpoint = search != null && search.isNotEmpty
          ? '/donors?search=${Uri.encodeComponent(search)}'
          : '/donors';
      final response = await ApiService.get(endpoint);
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body);
        if (list is List) {
          _donors = list.map((d) => DonorModel.fromJson(d)).toList();
        }
      }
    } catch (e) {
      debugPrint('Fetch donors error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> lookupByMobile(String mobile) async {
    _isLookingUp = true;
    _foundDonor = null;
    _foundDonorStats = {};
    notifyListeners();
    try {
      final cleanMobile = mobile.replaceAll(RegExp(r'\D'), '');
      final tenDigit = cleanMobile.length >= 10
          ? cleanMobile.substring(cleanMobile.length - 10)
          : cleanMobile;

      final response = await ApiService.get('/donors/lookup?mobile=$tenDigit');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['found'] == true && data['donor'] != null) {
          final d = data['donor'];
          _foundDonor = DonorModel(
            id: d['id'] ?? '',
            organizationId: '',
            name: d['name'] ?? '',
            mobile: d['mobile'] ?? '',
            email: d['email'],
            address: d['address'],
          );
          _foundDonorStats = {
            'totalDonations': (d['totalDonations'] is num)
                ? (d['totalDonations'] as num).toDouble()
                : 0.0,
            'donationCount': (d['donationCount'] is num)
                ? (d['donationCount'] as num).toInt()
                : 0,
          };
          _isLookingUp = false;
          notifyListeners();
          return true;
        }
      }
    } catch (e) {
      debugPrint('Mobile lookup error: $e');
    }
    _isLookingUp = false;
    notifyListeners();
    return false;
  }

  void clearFoundDonor() {
    _foundDonor = null;
    _foundDonorStats = {};
    notifyListeners();
  }

  void reset() {
    _donors = [];
    _selectedDonor = null;
    _foundDonor = null;
    _foundDonorStats = {};
    _donorHistory = [];
    _donorSummary = {};
    _isLoading = false;
    _isLookingUp = false;
    notifyListeners();
  }

  Future<bool> updateDonor(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      await FirebaseFirestore.instance
          .collection('donors')
          .doc(id)
          .update(data);

      final doc =
          await FirebaseFirestore.instance.collection('donors').doc(id).get();
      if (doc.exists) {
        final updated = DonorModel.fromJson(doc.data()!);
        if (_selectedDonor?.id == id) {
          _selectedDonor = updated;
        }
        if (_foundDonor?.id == id) {
          _foundDonor = updated;
        }
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Update donor error: $e');
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> fetchDonorDetail(String id) async {
    _isLoading = true;
    notifyListeners();
    try {
      final doc =
          await FirebaseFirestore.instance.collection('donors').doc(id).get();
      if (doc.exists) {
        _selectedDonor = DonorModel.fromJson(doc.data()!);
        final orgId =
            doc.data()?['organizationId'] ?? doc.data()?['organization_id'];

        final historySnapshot = await FirebaseFirestore.instance
            .collection('receipts')
            .where('organizationId', isEqualTo: orgId)
            .where('donorId', isEqualTo: id)
            .get();

        final history = historySnapshot.docs
            .map((d) => ReceiptModel.fromJson(d.data()))
            .toList();
        history.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        _donorHistory = history;

        double total = 0;
        int count = 0;
        for (var r in history) {
          if (r.paymentStatus == 'paid') {
            total += r.amount;
            count++;
          }
        }

        _donorSummary = {
          'totalDonations': total,
          'donationCount': count,
          'lastDonationDate':
              history.isNotEmpty ? history.first.createdAt : null,
        };
      }
    } catch (e) {
      debugPrint('Fetch donor detail error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

// ==========================================
// 4. TEMPLATE PROVIDER
// ==========================================
class TemplateProvider with ChangeNotifier {
  List<TemplateModel> _templates = [];
  bool _isLoading = false;
  String? _cachedOrgId;

  List<TemplateModel> get templates => _templates;
  bool get isLoading => _isLoading;

  void clearCache() {
    _cachedOrgId = null;
    _templates = [];
  }

  void reset() {
    _templates = [];
    _cachedOrgId = null;
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchTemplates({bool forceRefresh = false}) async {
    if (forceRefresh) {
      clearCache();
    }
    if (_templates.isNotEmpty && !forceRefresh) {
      return;
    }
    _isLoading = true;
    notifyListeners();
    try {
      final response = await ApiService.get('/templates');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          _templates = data.map((t) => TemplateModel.fromJson(t)).toList();
        }
      }
    } catch (e) {
      debugPrint('Fetch templates error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createTemplate(Map<String, dynamic> templateData) async {
    return saveOrgTemplate(TemplateModel.fromJson(templateData));
  }

  Future<bool> saveOrgTemplate(TemplateModel template) async {
    _isLoading = true;
    notifyListeners();
    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw Exception("User not authenticated.");

      final orgId = template.organizationId;
      if (orgId.isEmpty) throw Exception("No organization found.");

      // Find existing template document for this organization
      final existingDocs = await FirebaseFirestore.instance
          .collection('templates')
          .where('organizationId', isEqualTo: orgId)
          .limit(1)
          .get();

      final docRef = existingDocs.docs.isNotEmpty
          ? existingDocs.docs.first.reference
          : FirebaseFirestore.instance.collection('templates').doc();

      final data = {
        ...template.toJson(),
        'id': docRef.id,
        'organizationId': orgId,
        'is_default': true,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      await docRef.set(data, SetOptions(merge: true));
      await fetchTemplates(forceRefresh: true);
      _isLoading = false;
      return true;
    } catch (e) {
      debugPrint('Save org template error: $e');
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> setDefault(String id) async {
    _isLoading = true;
    notifyListeners();
    try {
      final batch = FirebaseFirestore.instance.batch();
      for (var temp in _templates) {
        final ref =
            FirebaseFirestore.instance.collection('templates').doc(temp.id);
        batch.update(ref, {'is_default': temp.id == id});
      }
      await batch.commit();
      await fetchTemplates();
      _isLoading = false;
      return true;
    } catch (e) {
      debugPrint('Set default template error: $e');
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }
}
