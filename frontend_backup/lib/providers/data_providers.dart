import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

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

  void clearCache() {
    _cachedOrgId = null;
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
      double pending = 0;
      int totalReceipts = 0;

      final now = DateTime.now();
      final startOfToday = DateTime(now.year, now.month, now.day);
      final startOfMonth = DateTime(now.year, now.month, 1);
      final startOfYear = DateTime(now.year, 1, 1);

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
        final status = data['paymentStatus'] ?? data['payment_status'] ?? '';
        final mode = data['paymentMode'] ?? data['payment_mode'] ?? '';
        final createdAtStr = data['createdAt'] ?? data['created_at'];

        if (status == 'cancelled') continue;

        if (createdAtStr != null) {
          final date = DateTime.tryParse(createdAtStr);
          if (date != null) {
            if (date.isAfter(startOfToday)) {
              todayReceipts++;
            }
            if (date.isAfter(startOfMonth)) {
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
          }

          if (createdAtStr != null) {
            final date = DateTime.tryParse(createdAtStr);
            if (date != null) {
              if (date.isAfter(startOfToday)) {
                today += amount;
              }
              if (date.isAfter(startOfMonth)) {
                monthly += amount;
              }
              if (date.isAfter(startOfYear)) {
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
            if (date.isAfter(startOfToday)) {
              whatsappToday++;
            }
            if (date.isAfter(startOfMonth)) {
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

      Query<Map<String, dynamic>> query = FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId);

      if (userRole == 'member' || userRole == 'collector') {
        query = query.where('collectorId', isEqualTo: currentUser.uid);
      }

      final snapshot = await query.get();

      List<ReceiptModel> loaded = snapshot.docs.map((doc) {
        final data = doc.data();
        return ReceiptModel.fromJson(data);
      }).toList();

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
        final startOfMonth = DateTime(now.year, now.month, 1);
        final startOfYear = DateTime(now.year, 1, 1);

        loaded = loaded.where((r) {
          final date = DateTime.tryParse(r.createdAt);
          if (date == null) return false;
          if (dateFilter == 'today') {
            return date.isAfter(startOfToday) ||
                date.isAtSameMomentAs(startOfToday);
          } else if (dateFilter == 'month') {
            return date.isAfter(startOfMonth) ||
                date.isAtSameMomentAs(startOfMonth);
          } else if (dateFilter == 'year') {
            return date.isAfter(startOfYear) ||
                date.isAtSameMomentAs(startOfYear);
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

  // Generate Receipt
  Future<Map<String, dynamic>?> createReceipt(
      Map<String, dynamic> receiptData) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw Exception("User not authenticated.");

      String? orgId = _cachedOrgId;
      Map<String, dynamic>? orgData = _cachedOrgData;
      String? userDisplayName = _cachedUserDisplayName;

      DocumentSnapshot<Map<String, dynamic>>? userDoc;

      if (orgId == null || orgData == null || userDisplayName == null) {
        userDoc = await FirebaseFirestore.instance
            .collection('users')
            .doc(currentUser.uid)
            .get();
        orgId = userDoc.data()?['organization_id'] ??
            userDoc.data()?['organizationId'];
        userDisplayName = userDoc.data()?['name'] ?? 'PavtiBook Collector';
        if (orgId == null) throw Exception("No organization found.");

        _cachedOrgId = orgId;
        _cachedUserDisplayName = userDisplayName;

        final orgDoc = await FirebaseFirestore.instance
            .collection('organizations')
            .doc(orgId)
            .get();
        orgData = orgDoc.data() ?? {};
        _cachedOrgData = orgData;
      }

      // Check if organization is archived (Read Only)
      if (orgData['isArchived'] == true) {
        throw Exception("Organization is archived and currently read-only. Cannot create receipts.");
      }

      // Check subscription receipt limit
      final subDoc = await FirebaseFirestore.instance
          .collection('subscriptions')
          .doc(orgId)
          .get();
      if (subDoc.exists) {
        final subData = subDoc.data()!;
        final used = subData['receiptsUsed'] ?? 0;
        final limit = subData['receiptLimit'] ?? 10;
        if (used >= limit) {
          throw Exception("Receipt limit reached. Please upgrade your plan.");
        }

        final plan = subData['plan'] ?? 'free_trial';
        final renewalDateStr = subData['renewalDate'] ?? '';
        if (renewalDateStr.isNotEmpty) {
          try {
            final renewalDate = DateTime.parse(renewalDateStr);
            if (plan == 'free_trial') {
              if (DateTime.now().isAfter(renewalDate)) {
                throw Exception(
                    "Free trial has expired. Please upgrade your plan.");
              }
            } else {
              // Paid plans: check renewal date + grace period
              final configDoc = await FirebaseFirestore.instance
                  .collection('subscription_config')
                  .doc('config')
                  .get();
              final graceDays = configDoc.data()?['grace_period_days'] ?? 7;
              if (DateTime.now()
                  .isAfter(renewalDate.add(Duration(days: graceDays)))) {
                throw Exception(
                    "Subscription expired. Please renew your plan to continue.");
              }
            }
          } catch (_) {}
        }
      }

      final upiId = orgData['upi_id'] ?? orgData['upiId'] ?? 'org@upi';
      final orgName = orgData['name'] ?? 'Organization';

      final amount = double.tryParse(receiptData['amount'].toString()) ?? 100.0;
      final purpose = receiptData['purpose'] ?? 'Donation';
      final paymentMode = receiptData['paymentMode'] ?? 'cash';
      final donorName = receiptData['donorName'] ?? 'Guest Donor';
      final donorMobile = receiptData['donorMobile'] ?? '9999999999';
      final donorEmail = receiptData['donorEmail'];
      final donorAddress = receiptData['donorAddress'];

      // Fetch organization customization & signature snapshots
      final headerLogoUrl = orgData['logo_url'] ?? orgData['logoUrl'];
      final leftSideImageUrl =
          orgData['left_side_image_url'] ?? orgData['leftSideImageUrl'];
      final rightSideImageUrl =
          orgData['right_side_image_url'] ?? orgData['rightSideImageUrl'];
      final customStampUrl =
          orgData['custom_stamp_url'] ?? orgData['customStampUrl'];
      final footerText = orgData['footer_text'] ?? orgData['footerText'];
      final orgMerchantName =
          orgData['upi_merchant_name'] ?? orgData['upiMerchantName'] ?? orgName;
      final receiptThemeId =
          orgData['receipt_theme_id'] ?? orgData['receiptThemeId'];

      final inputRole = receiptData['collectorRole'];
      String collectorRole;
      String? signatureUrl;
      String? collectorName;
      String? collectorDesignation;

      if (inputRole == 'President') {
        collectorRole = 'President';
        collectorName = orgData['president_name'] ?? orgData['presidentName'];
        signatureUrl = orgData['president_signature_url'] ??
            orgData['presidentSignatureUrl'];
        collectorDesignation = orgData['president_designation'] ??
            orgData['presidentDesignation'] ??
            'President';
      } else if (inputRole == 'Treasurer') {
        collectorRole = 'Treasurer';
        collectorName = orgData['treasurer_name'] ?? orgData['treasurerName'];
        signatureUrl = orgData['treasurer_signature_url'] ??
            orgData['treasurerSignatureUrl'];
        collectorDesignation = orgData['treasurer_designation'] ??
            orgData['treasurerDesignation'] ??
            'Treasurer';
      } else if (inputRole == 'Member') {
        collectorRole = 'Member';
        collectorName = orgData['member_name'] ??
            orgData['memberName'] ??
            orgData['agent_name'] ??
            orgData['agentName'];
        signatureUrl =
            orgData['agent_signature_url'] ?? orgData['agentSignatureUrl'];
        collectorDesignation = orgData['member_designation'] ??
            orgData['memberDesignation'] ??
            'Member (Sadasya)';
      } else {
        // Fallback to existing logic based on user's role
        userDoc ??= await FirebaseFirestore.instance
            .collection('users')
            .doc(currentUser.uid)
            .get();
        final role = userDoc.data()?['role'] ?? 'collector';
        if (role == 'admin' || role == 'president' || role == 'org_admin') {
          collectorRole = 'President';
          collectorName = orgData['president_name'] ?? orgData['presidentName'];
          signatureUrl = orgData['president_signature_url'] ??
              orgData['presidentSignatureUrl'];
          collectorDesignation = orgData['president_designation'] ??
              orgData['presidentDesignation'] ??
              'President';
        } else if (role == 'treasurer') {
          collectorRole = 'Treasurer';
          collectorName = orgData['treasurer_name'] ?? orgData['treasurerName'];
          signatureUrl = orgData['treasurer_signature_url'] ??
              orgData['treasurerSignatureUrl'];
          collectorDesignation = orgData['treasurer_designation'] ??
              orgData['treasurerDesignation'] ??
              'Treasurer';
        } else {
          collectorRole = 'Member';
          collectorName = orgData['member_name'] ??
              orgData['memberName'] ??
              orgData['agent_name'] ??
              orgData['agentName'];
          signatureUrl =
              orgData['agent_signature_url'] ?? orgData['agentSignatureUrl'];
          collectorDesignation = orgData['member_designation'] ??
              orgData['memberDesignation'] ??
              'Member (Sadasya)';
        }
      }

      // Fallback name if bearer name is not configured in Settings
      collectorName = (collectorName != null && collectorName.trim().isNotEmpty)
          ? collectorName
          : userDisplayName;

      // Fetch user doc to get profilePhotoUrl for snapshotting
      userDoc ??= await FirebaseFirestore.instance
          .collection('users')
          .doc(currentUser.uid)
          .get();
      final collectorPhotoSnapshot = userDoc.data()?['profilePhotoUrl'] ?? userDoc.data()?['profile_photo_url'];

      // 1. Fetch/Update Donor Metrics
      final donorQuery = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .where('mobile', isEqualTo: donorMobile)
          .limit(1)
          .get();

      String donorId;
      if (donorQuery.docs.isNotEmpty) {
        final doc = donorQuery.docs.first;
        donorId = doc.id;
        final currentTotal = (doc.data()['totalDonated'] is num)
            ? (doc.data()['totalDonated'] as num).toDouble()
            : 0.0;
        final currentCount = doc.data()['donationCount'] ?? 0;
        await doc.reference.update({
          'name': donorName,
          if (donorEmail != null) 'email': donorEmail,
          if (donorAddress != null) 'address': donorAddress,
          'totalDonated': currentTotal + amount,
          'donationCount': currentCount + 1,
        });
      } else {
        final donorRef = FirebaseFirestore.instance.collection('donors').doc();
        donorId = donorRef.id;
        await donorRef.set({
          'id': donorId,
          'organizationId': orgId,
          'name': donorName,
          'mobile': donorMobile,
          'email': donorEmail,
          'address': donorAddress,
          'totalDonated': amount,
          'donationCount': 1,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }

      // 2. Compute Receipt Sequence Number using a Firestore transaction on counters/receiptCounter
      final counterRef = FirebaseFirestore.instance
          .collection('counters')
          .doc('receiptCounter');
      int seqNum = await FirebaseFirestore.instance
          .runTransaction<int>((transaction) async {
        final counterSnapshot = await transaction.get(counterRef);
        if (!counterSnapshot.exists) {
          transaction.set(counterRef, {'currentNumber': 1});
          return 1;
        } else {
          final current = counterSnapshot.data()?['currentNumber'] ?? 0;
          final next = current + 1;
          transaction.update(counterRef, {'currentNumber': next});
          return next;
        }
      });

      final year = DateTime.now().year;
      final receiptNumber = 'PB-$year-${seqNum.toString().padLeft(6, '0')}';
      final upiDeepLink =
          'upi://pay?pa=$upiId&pn=${Uri.encodeComponent(orgMerchantName)}&am=$amount';

      // 3. Create Receipt in Firestore
      final receiptRef =
          FirebaseFirestore.instance.collection('receipts').doc();
      final receiptId = receiptRef.id;

      final newReceipt = {
        'id': receiptId,
        'organizationId': orgId,
        'templateId': receiptData['templateId'] ?? 'classic',
        'donorId': donorId,
        'collectorId': currentUser.uid,
        'receiptNumber': receiptNumber,
        'amount': amount,
        'purpose': purpose,
        'paymentMode': paymentMode,
        'paymentStatus': (paymentMode == 'upi' || paymentMode == 'pending')
            ? 'pending'
            : 'paid',
        'paidAt':
            paymentMode == 'cash' ? DateTime.now().toIso8601String() : null,
        'qrCodeValue': paymentMode == 'upi' ? upiDeepLink : '',
        'createdAt': DateTime.now().toIso8601String(),
        'donorName': donorName,
        'donorMobile': donorMobile,
        'collectorName': collectorName,
        'donorAddress': donorAddress,
        'headerLogoUrl': headerLogoUrl,
        'leftSideImageUrl': leftSideImageUrl,
        'rightSideImageUrl': rightSideImageUrl,
        'customStampUrl': customStampUrl,
        'footerText': footerText,
        'signatureUrl': signatureUrl,
        'collectorRole': collectorRole,
        'collectorDesignation': collectorDesignation,

        // Explicit snapshot fields for auditing & backup
        'organizationName': orgName,
        'organizationLogoUrl': headerLogoUrl,
        'leftImageUrl': leftSideImageUrl,
        'rightImageUrl': rightSideImageUrl,
        'stampUrl': customStampUrl,
        'collectorSignatureUrl': signatureUrl,
        'receiptThemeId': receiptThemeId,
        'collectorPhotoSnapshot': collectorPhotoSnapshot,
        'collectorSignatureSnapshot': signatureUrl,
        'receiptVersion': 1,
      };

      await receiptRef.set(newReceipt);

      // Increment receiptsUsed count in subscriptions collection
      await FirebaseFirestore.instance
          .collection('subscriptions')
          .doc(orgId)
          .update({
        'receiptsUsed': FieldValue.increment(1),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      // Add Activity Log
      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': orgId,
        'userId': currentUser.uid,
        'userName': collectorName ?? userDisplayName,
        'userRole': collectorRole,
        'action': 'Receipt Created',
        'details': 'Created Receipt $receiptNumber',
        'timestamp': DateTime.now().toIso8601String(),
      });

      final newModel = ReceiptModel.fromJson(newReceipt);
      _receipts.insert(0, newModel);
      _isLoading = false;
      notifyListeners();

      return {
        'receipt': newReceipt,
        'upiPayload': paymentMode == 'upi' ? {'qrCode': upiDeepLink} : null
      };
    } catch (e) {
      _errorMessage = 'Connection error: $e';
    }

    _isLoading = false;
    notifyListeners();
    return null;
  }

  // Update Pending Payment to paid
  Future<bool> reconcilePayment(
      String receiptId, String? transactionRef) async {
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
        'paymentStatus': 'paid',
        'confirmationMethod': 'Collector Confirmation',
        'paymentConfirmationMethod':
            'Collector Confirmation', // Keep for safety
        'confirmedByUserId': confirmedByUserId,
        'confirmedByName': confirmedByName,
        'confirmedAt': confirmedAt,
        'transactionRef': transactionRef,
        'reconciledAt': confirmedAt,
        'paidAt': confirmedAt,
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
        'details': rPaymentMode.toLowerCase() == 'upi'
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
          paymentMode: old.paymentMode,
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

      await FirebaseFirestore.instance
          .collection('receipts')
          .doc(receiptId)
          .update({
        'donorName': donorName,
        'donorMobile': donorMobile,
        'donorAddress': donorAddress,
        'purpose': purpose,
        'editedAt': editTime,
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
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw Exception("User not authenticated.");

      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(currentUser.uid)
          .get();
      final orgId = userDoc.data()?['organization_id'] ??
          userDoc.data()?['organizationId'];
      if (orgId == null) throw Exception("No organization found.");

      final snapshot = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .get();

      List<DonorModel> loaded =
          snapshot.docs.map((doc) => DonorModel.fromJson(doc.data())).toList();

      if (search != null && search.isNotEmpty) {
        final lower = search.toLowerCase();
        loaded = loaded
            .where((d) =>
                d.name.toLowerCase().contains(lower) ||
                d.mobile.contains(lower))
            .toList();
      }

      _donors = loaded;
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
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw Exception("User not authenticated.");

      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(currentUser.uid)
          .get();
      final orgId = userDoc.data()?['organization_id'] ??
          userDoc.data()?['organizationId'];
      if (orgId == null) throw Exception("No organization found.");

      final snapshot = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .where('mobile', isEqualTo: mobile)
          .limit(1)
          .get();

      if (snapshot.docs.isNotEmpty) {
        final data = snapshot.docs.first.data();
        _foundDonor = DonorModel.fromJson(data);
        _foundDonorStats = {
          'totalDonations': data['totalDonated'] ?? 0.0,
          'donationCount': data['donationCount'] ?? 0,
        };
        _isLookingUp = false;
        notifyListeners();
        return true;
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
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw Exception("User not authenticated.");

      String? orgId = _cachedOrgId;
      if (orgId == null) {
        final userDoc = await FirebaseFirestore.instance
            .collection('users')
            .doc(currentUser.uid)
            .get();
        orgId = userDoc.data()?['organization_id'] ??
            userDoc.data()?['organizationId'];
        if (orgId == null) throw Exception("No organization found.");
        _cachedOrgId = orgId;
      }

      final snapshot = await FirebaseFirestore.instance
          .collection('templates')
          .where('organizationId', isEqualTo: orgId)
          .get();

      List<TemplateModel> loaded = snapshot.docs
          .map((doc) => TemplateModel.fromJson(doc.data()))
          .toList();

      if (loaded.isEmpty) {
        final ref = FirebaseFirestore.instance.collection('templates').doc();
        final defaultTemplate = {
          'id': ref.id,
          'organizationId': orgId,
          'name': 'Classic Template',
          'type': 'classic',
          'bg_color': '#FFFDD0',
          'border_style': 'double',
          'border_color': '#7A1F1F',
          'font_family': 'Outfit',
          'font_color': '#2E1C0C',
          'logo_visible': true,
          'god_image_position': 'left',
          'watermark_opacity': 0.10,
          'signature_label': 'Authorized Signatory',
          'is_default': true,
        };
        await ref.set(defaultTemplate);
        loaded.add(TemplateModel.fromJson(defaultTemplate));
      }

      _templates = loaded;
    } catch (e) {
      debugPrint('Fetch templates error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createTemplate(Map<String, dynamic> templateData) async {
    _isLoading = true;
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
      if (orgId == null) throw Exception("No organization found.");

      final ref = FirebaseFirestore.instance.collection('templates').doc();
      final data = {
        ...templateData,
        'id': ref.id,
        'organizationId': orgId,
        'is_default': false,
      };
      await ref.set(data);
      await fetchTemplates();
      _isLoading = false;
      return true;
    } catch (e) {
      debugPrint('Create template error: $e');
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
