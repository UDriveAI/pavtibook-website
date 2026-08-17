import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/models.dart';
import '../services/image_processing_service.dart';
import '../services/registration_validator.dart';
import '../main.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  OrganizationModel? _organization;
  int _switchGeneration = 0;
  String? _activeRole;
  bool _isLoading = false;
  String? _errorMessage;
  SubscriptionModel? _subscription;
  String? _lastRegisteredOrgId;
  bool _needsOrgRegistration = false;

  String? _pendingLinkingEmail;
  PhoneAuthCredential? _pendingPhoneCredential;
  AuthCredential? _pendingGoogleCredential;

  UserModel? get user => _user;
  OrganizationModel? get organization => _organization;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;
  bool get needsOrgRegistration => _needsOrgRegistration;
  String? get pendingLinkingEmail => _pendingLinkingEmail;
  SubscriptionModel? get subscription => _subscription;
  String? get lastRegisteredOrgId => _lastRegisteredOrgId;

  int get switchGeneration => _switchGeneration;
  String? get activeOrganizationId => _organization?.id;
  OrganizationModel? get activeOrganization => _organization;
  String get activeUserRole => _activeRole ?? _user?.role ?? 'member';

  Future<String> resolveActiveRole(String uid, String orgId, Map<String, dynamic>? orgData) async {
    final ownerUid = orgData?['ownerUid'] ?? orgData?['owner_uid'];
    if (ownerUid != null && ownerUid == uid) {
      return 'owner';
    }

    try {
      final memberDoc = await FirebaseFirestore.instance
          .collection('organization_members')
          .doc('${uid}_${orgId}')
          .get();
      if (memberDoc.exists && memberDoc.data()?['role'] != null) {
        return memberDoc.data()!['role'].toString().toLowerCase();
      }

      final querySnap = await FirebaseFirestore.instance
          .collection('organization_members')
          .where('userId', isEqualTo: uid)
          .where('organizationId', isEqualTo: orgId)
          .limit(1)
          .get();
      if (querySnap.docs.isNotEmpty) {
        final r = querySnap.docs.first.data()['role'];
        if (r != null) return r.toString().toLowerCase();
      }
    } catch (e) {
      debugPrint('Error resolving role for org $orgId: $e');
    }

    return _user?.role ?? 'member';
  }


  Map<String, dynamic> _subConfig = {
    'monthly_price': 99,
    'yearly_price': 999,
    'monthly_users': 3,
    'yearly_users': 10,
    'monthly_receipts': 150,
    'yearly_receipts': 2000,
    'free_trial_receipts': 10,
    'invite_expiry_days': 7,
    'max_pending_invites': 5,
    'trial_valid_days': 30,
    'subscription_reminder_days': 7,
    'grace_period_days': 7,
  };
  Map<String, dynamic> get subConfig => _subConfig;

  Future<void> fetchSubscriptionConfig() async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection('subscription_config')
          .doc('config')
          .get();
      if (doc.exists) {
        _subConfig = doc.data()!;
      } else {
        await FirebaseFirestore.instance
            .collection('subscription_config')
            .doc('config')
            .set(_subConfig);
      }
    } catch (e) {
      debugPrint('Failed to fetch subscription config: $e');
    }
  }

  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _subListener;

  void cancelSubListener() {
    _subListener?.cancel();
    _subListener = null;
  }

  Future<void> loadSubscription(String orgId) async {
    try {
      _subListener?.cancel();
      _subListener = FirebaseFirestore.instance
          .collection('subscriptions')
          .doc(orgId)
          .snapshots()
          .listen((subDoc) async {
        if (subDoc.exists) {
          final data = Map<String, dynamic>.from(subDoc.data()!);
          _subscription = SubscriptionModel.fromJson(data);
        } else {
          final defaultSub = {
            'id': orgId,
            'organizationId': orgId,
            'plan': 'free',
            'receiptsUsed': 0,
            'receiptLimit': 10,
            'usersUsed': 1,
            'usersLimit': 1,
            'autoWhatsAppLimit': 0,
            'canShareNow': true,
            'status': 'free',
            'renewalDate': null,
            'createdAt': DateTime.now().toIso8601String(),
            'updatedAt': DateTime.now().toIso8601String(),
          };
          await FirebaseFirestore.instance
              .collection('subscriptions')
              .doc(orgId)
              .set(defaultSub);
          _subscription = SubscriptionModel.fromJson(defaultSub);
        }
        notifyListeners();
      }, onError: (e) {
        debugPrint('Error listening to subscription changes: $e');
      });
    } catch (e) {
      debugPrint('Failed to load subscription for org $orgId: $e');
    }
  }

  // Initialize and check persistent login session
  Future<void> tryAutoLogin() async {
    _isLoading = true;
    notifyListeners();

    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser != null) {
        final userDoc = await FirebaseFirestore.instance
            .collection('users')
            .doc(currentUser.uid)
            .get();
        if (userDoc.exists) {
          final userData = userDoc.data()!;
          await _migrateUserData(currentUser.uid, userData);
          _user = UserModel.fromJson(userData);
          final orgId =
              userData['organization_id'] ?? userData['organizationId'];
          if (orgId != null) {
            final orgDoc = await FirebaseFirestore.instance
                .collection('organizations')
                .doc(orgId)
                .get();
            if (orgDoc.exists) {
              final orgData = orgDoc.data()!;
              _organization = OrganizationModel.fromJson(orgData);

              // Parallelize independent post-organization loading operations
              await Future.wait([
                resolveActiveRole(currentUser.uid, orgId, orgData)
                    .then((r) => _activeRole = r),
                fetchSubscriptionConfig(),
                loadSubscription(orgId),
                loadUserOrganizations(currentUser.uid),
              ]);
            } else {
              await loadUserOrganizations(currentUser.uid);
            }
          } else {
            await loadUserOrganizations(currentUser.uid);
          }
          _errorMessage = null;
        } else {
          // Profile doc doesn't exist, sign out
          await logout();
        }
      }
    } catch (e) {
      debugPrint('Auto login check failed: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Register organization and administrator
  Future<bool> registerOrganization(Map<String, dynamic> regData) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    const String fileIdentifier = 'auth_provider.dart';

    try {
      final adminEmail = regData['adminEmail'];
      final adminMobile = regData['adminMobile'] ?? regData['orgMobile'] ?? '';
      final password = regData['password'];

      // 1. Get or Create User in Firebase Auth
      String uid;
      User? newlyCreatedAuthUser;
      final existingAuthUser = FirebaseAuth.instance.currentUser;
      if (existingAuthUser != null) {
        uid = existingAuthUser.uid;
        debugPrint('[REGISTER_FLOW] [STEP 1 SUCCESS] Using existing authenticated Auth user with UID: $uid');
      } else {
        debugPrint(
            '[REGISTER_FLOW] [STEP 1] Attempting FirebaseAuth.createUserWithEmailAndPassword for email: $adminEmail');
        try {
          final authResult = await FirebaseAuth.instance.createUserWithEmailAndPassword(
            email: adminEmail,
            password: password ?? '',
          );
          newlyCreatedAuthUser = authResult.user;
          uid = authResult.user!.uid;
        } on FirebaseAuthException catch (fae, stack) {
          debugPrint('[REGISTER_FLOW] [STEP 1 FAILED] FirebaseAuthException:');
          debugPrint('  File: $fileIdentifier');
          debugPrint('  Code: ${fae.code}');
          debugPrint('  Message: ${fae.message}');
          debugPrint('  Stacktrace: $stack');
          if (fae.code == 'email-already-in-use') {
            _errorMessage = 'This email is already registered. Please log in.';
          } else {
            _errorMessage = fae.message ?? 'Registration failed.';
          }
          _isLoading = false;
          notifyListeners();
          return false;
        } catch (e, stack) {
          debugPrint('[REGISTER_FLOW] [STEP 1 FAILED] Unknown Exception: $e');
          _errorMessage = e.toString();
          _isLoading = false;
          notifyListeners();
          return false;
        }
      }

      // 1.2. Perform Mobile Uniqueness Check (after Auth creation so the user is authenticated to read Firestore)
      debugPrint('[REGISTER_FLOW] [STEP 1.2] Checking mobile uniqueness...');
      String cleanMobile = adminMobile.replaceAll(RegExp(r'\D'), '');
      if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
        cleanMobile = cleanMobile.substring(2);
      }

      try {
        final mobileQuery = await FirebaseFirestore.instance
            .collection('users')
            .where('mobile', whereIn: [
              adminMobile,
              cleanMobile,
              '+91$cleanMobile',
              '+91 $cleanMobile'
            ])
            .limit(1)
            .get();

        if (mobileQuery.docs.isNotEmpty) {
          debugPrint('[REGISTER_FLOW] [STEP 1.2 FAILED] Mobile number already registered.');
          _errorMessage = 'This mobile number is already registered. Please log in.';
          
          if (newlyCreatedAuthUser != null) {
            debugPrint('[REGISTER_FLOW] Deleting temporary Auth user to maintain atomicity...');
            await newlyCreatedAuthUser.delete();
          }
          
          _isLoading = false;
          notifyListeners();
          return false;
        }
      } catch (e) {
        debugPrint('[REGISTER_FLOW] [STEP 1.2 FAILED] Validation error: $e');
        _errorMessage = 'Validation error: $e';
        if (newlyCreatedAuthUser != null) {
          await newlyCreatedAuthUser.delete();
        }
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // 1.5. Trial Protection (run after user is signed in to avoid unauthenticated read errors)
      final orgName = regData['orgName'] ?? '';
      final city = regData['city'] ?? '';
      final orgMobile = regData['orgMobile'] ?? '';

      try {
        final existingOrgQuery = await FirebaseFirestore.instance
            .collection('organizations')
            .where('name', isEqualTo: orgName)
            .where('city', isEqualTo: city)
            .where('mobile', isEqualTo: orgMobile)
            .get();

        if (existingOrgQuery.docs.isNotEmpty) {
          throw Exception(
              'An organization with this Name, City, and Owner Mobile has already registered a Free Trial. Multiple free trials are not allowed.');
        }
      } on Exception catch (e) {
        if (e.toString().contains('Multiple free trials')) rethrow;
        debugPrint('[REGISTER_FLOW] Trial check skipped or passed: $e');
      }

      // 2. Create Organization Doc in Firestore
      debugPrint(
          '[REGISTER_FLOW] [STEP 2] Preparing Firestore organization document reference...');
      const orgCollectionPath = 'organizations';
      final orgRef =
          FirebaseFirestore.instance.collection(orgCollectionPath).doc();
      final orgId = orgRef.id;
      final orgDocPath = '$orgCollectionPath/$orgId';
      debugPrint(
          '[REGISTER_FLOW] [STEP 2] Generated Org Document path: $orgDocPath');

      final orgData = {
        'id': orgId,
        'name': regData['orgName'],
        'type': regData['orgType'],
        'contact_person': regData['contactPerson'] ?? regData['adminName'],
        'mobile': regData['orgMobile'] ?? regData['adminMobile'],
        'email': regData['orgEmail'] ?? regData['adminEmail'],
        'address': regData['address'],
        'city': regData['city'],
        'state': regData['state'],
        'pincode': regData['pincode'],
        'upi_id': regData['upiId'],
        'registration_number': regData['registrationNumber'],
        'logo_url': null,
        'is_verified': false,
        'subscription_plan': 'free_trial',
        'createdAt': FieldValue.serverTimestamp(),
        'organizationVersion': 1,
      };

      debugPrint(
          '[REGISTER_FLOW] [STEP 2] Writing organization data to Firestore path: $orgDocPath');
      try {
        await orgRef.set(orgData);
      } on FirebaseException catch (fe, stack) {
        debugPrint(
            '[REGISTER_FLOW] [STEP 2 FAILED] FirebaseException writing organization:');
        debugPrint('  File: $fileIdentifier');
        debugPrint('  Line: ~90 (orgRef.set)');
        debugPrint('  Code: ${fe.code}');
        debugPrint('  Message: ${fe.message}');
        debugPrint('  Path: $orgDocPath');
        debugPrint('  Stacktrace: $stack');
        rethrow;
      } catch (e, stack) {
        debugPrint(
            '[REGISTER_FLOW] [STEP 2 FAILED] General Exception writing organization:');
        debugPrint('  File: $fileIdentifier');
        debugPrint('  Line: ~90 (orgRef.set)');
        debugPrint('  Error: $e');
        debugPrint('  Path: $orgDocPath');
        debugPrint('  Stacktrace: $stack');
        rethrow;
      }
      debugPrint(
          '[REGISTER_FLOW] [STEP 2 SUCCESS] Organization document written successfully.');

      // 3. Create User Doc in Firestore
      const usersCollectionPath = 'users';
      final userDocPath = '$usersCollectionPath/$uid';
      debugPrint(
          '[REGISTER_FLOW] [STEP 3] Preparing user data for path: $userDocPath');

      final userData = {
        'id': uid,
        'organization_id': orgId,
        'organizationId': orgId,
        'name': regData['adminName'],
        'email': adminEmail,
        'mobile': regData['adminMobile'],
        'role': 'admin',
        'is_active': true,
        'createdAt': FieldValue.serverTimestamp(),
      };

      debugPrint(
          '[REGISTER_FLOW] [STEP 3] Writing user data to Firestore path: $userDocPath');
      try {
        await FirebaseFirestore.instance
            .collection(usersCollectionPath)
            .doc(uid)
            .set(userData);
      } on FirebaseException catch (fe, stack) {
        debugPrint(
            '[REGISTER_FLOW] [STEP 3 FAILED] FirebaseException writing user:');
        debugPrint('  File: $fileIdentifier');
        debugPrint('  Line: ~103 (usersRef.doc.set)');
        debugPrint('  Code: ${fe.code}');
        debugPrint('  Message: ${fe.message}');
        debugPrint('  Path: $userDocPath');
        debugPrint('  Stacktrace: $stack');
        rethrow;
      } catch (e, stack) {
        debugPrint(
            '[REGISTER_FLOW] [STEP 3 FAILED] General Exception writing user:');
        debugPrint('  File: $fileIdentifier');
        debugPrint('  Line: ~103 (usersRef.doc.set)');
        debugPrint('  Error: $e');
        debugPrint('  Path: $userDocPath');
        debugPrint('  Stacktrace: $stack');
        rethrow;
      }
      debugPrint(
          '[REGISTER_FLOW] [STEP 3 SUCCESS] User document written successfully.');

      // 4. Create Subscription Doc in Firestore
      debugPrint('[REGISTER_FLOW] [STEP 4] Preparing subscription data...');
      try {
        await fetchSubscriptionConfig();
        final subscriptionRef =
            FirebaseFirestore.instance.collection('subscriptions').doc(orgId);
        final defaultSub = {
          'id': orgId,
          'organizationId': orgId,
          'plan': 'free_trial',
          'receiptsUsed': 0,
          'receiptLimit': 10,
          'usersUsed': 1,
          'usersLimit': 1,
          'autoWhatsAppLimit': 0,
          'canShareNow': true,
          'status': 'free_trial',
          'renewalDate': null,
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        };
        await subscriptionRef.set(defaultSub);
      } on FirebaseException catch (fe, stack) {
        debugPrint('[REGISTER_FLOW] [STEP 4 FAILED] FirebaseException: ${fe.code} - ${fe.message}');
        debugPrint('$stack');
        throw FirebaseException(
          plugin: fe.plugin,
          code: fe.code,
          message: '[Step 4 failed: ${fe.message}]',
        );
      }
      debugPrint('[REGISTER_FLOW] Subscription document written successfully.');

      // 5. Create Member Doc in Firestore
      debugPrint('[REGISTER_FLOW] [STEP 5] Preparing member data...');
      try {
        final memberRef = FirebaseFirestore.instance
            .collection('organization_members')
            .doc(uid);
        await memberRef.set({
          'id': uid,
          'userId': uid,
          'organizationId': orgId,
          'name': regData['adminName'],
          'mobile': regData['adminMobile'],
          'role': 'owner',
          'joinedAt': DateTime.now().toIso8601String(),
        });
      } on FirebaseException catch (fe, stack) {
        debugPrint('[REGISTER_FLOW] [STEP 5 FAILED] FirebaseException: ${fe.code} - ${fe.message}');
        debugPrint('$stack');
        throw FirebaseException(
          plugin: fe.plugin,
          code: fe.code,
          message: '[Step 5 failed: ${fe.message}]',
        );
      }
      debugPrint('[REGISTER_FLOW] Member document written successfully.');

      _lastRegisteredOrgId = orgId;

      // Automatically load the local profile models so user is logged in
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(uid).get();
      if (userDoc.exists) {
        _user = UserModel.fromJson(userDoc.data()!);
        final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(orgId).get();
        if (orgDoc.exists) {
          _organization = OrganizationModel.fromJson(orgDoc.data()!);
          await fetchSubscriptionConfig();
          await loadSubscription(orgId);
        }
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e, stack) {
      debugPrint('[REGISTER_FLOW] Global Catch triggered. Exception: $e');
      debugPrint('[REGISTER_FLOW] Global Stacktrace: $stack');

      // Roll back newly created Firebase Auth account if Firestore setup failed
      try {
        final currentUser = FirebaseAuth.instance.currentUser;
        if (currentUser != null) {
          debugPrint(
              '[REGISTER_FLOW] Attempting to clean up orphan Auth account: ${currentUser.email}');
          await currentUser.delete();
          debugPrint(
              '[REGISTER_FLOW] Orphan Auth account deleted successfully.');
        }
      } catch (cleanupError, cleanupStack) {
        debugPrint(
            '[REGISTER_FLOW] Failed to clean up orphan Auth user: $cleanupError');
        debugPrint('$cleanupStack');
      }

      if (e is FirebaseAuthException) {
        _errorMessage = 'Auth failed: [${e.code}] ${e.message}';
      } else if (e is FirebaseException) {
        _errorMessage = 'Database failed: [${e.code}] ${e.message}';
      } else {
        _errorMessage = 'General failed: ${e.toString()}';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  /// Switch active organization context with race condition initialization lock
  Future<bool> switchOrganization(String orgId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    _switchGeneration++;
    final currentGen = _switchGeneration;

    try {
      final uid = FirebaseAuth.instance.currentUser?.uid ?? _user?.id;
      if (uid == null) {
        _errorMessage = 'User not authenticated.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(orgId).get();
      if (!orgDoc.exists) {
        _errorMessage = 'Organization not found.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Check initialization lock / race condition
      if (currentGen != _switchGeneration) {
        debugPrint('[ORG_SWITCH] Aborted switch to $orgId due to rapid switch race condition.');
        return false;
      }

      final orgData = orgDoc.data()!;
      final resolvedRole = await resolveActiveRole(uid, orgId, orgData);

      if (currentGen != _switchGeneration) {
        debugPrint('[ORG_SWITCH] Aborted switch to $orgId post role-resolution due to rapid switch.');
        return false;
      }

      _organization = OrganizationModel.fromJson(orgData);
      _activeRole = resolvedRole;

      // Save lastSelectedOrgId in user profile (only lastSelectedOrgId is updated;
      // root organizationId is immutable on users collection per security rules)
      try {
        await FirebaseFirestore.instance.collection('users').doc(uid).set({
          'lastSelectedOrgId': orgId,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      } catch (e) {
        debugPrint('[FIRESTORE_DENIED_AUDIT] Path: users/$uid | Operation: set(lastSelectedOrgId) | Error: $e');
      }

      // Reload active subscription stream, config & user organization memberships safely
      try {
        await fetchSubscriptionConfig();
        await loadSubscription(orgId);
        await loadUserOrganizations(uid);
      } catch (e) {
        debugPrint('[FIRESTORE_DENIED_AUDIT] Path: subscriptions/orgs | Error: $e');
      }

      // Audit Log for organization switch (optional write — fail gracefully)
      try {
        await FirebaseFirestore.instance.collection('activity_logs').add({
          'organizationId': orgId,
          'userId': uid,
          'userName': _user?.name ?? 'User',
          'userRole': _activeRole ?? 'member',
          'action': 'Organization Switched',
          'details': '${_user?.name} switched active organization to ${_organization?.name}',
          'timestamp': FieldValue.serverTimestamp(),
        });
      } catch (e) {
        debugPrint('[FIRESTORE_DENIED_AUDIT] Path: activity_logs | Operation: add | Error: $e');
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('[FIRESTORE_DENIED_AUDIT] Path: switchOrganization | Error: $e');
      _errorMessage = 'Failed to switch organization: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  List<Map<String, dynamic>> _userOrganizations = [];
  List<Map<String, dynamic>> get userOrganizations => _userOrganizations;
  bool get hasMultipleOrganizations => _userOrganizations.length > 1;

  /// Get list of all organization memberships for a user
  Future<List<Map<String, dynamic>>> loadUserOrganizations(String uid) async {
    try {
      final membersSnap = await FirebaseFirestore.instance
          .collection('organization_members')
          .where('userId', isEqualTo: uid)
          .get();

      List<Map<String, dynamic>> results = [];
      Set<String> seenOrgIds = {};

      for (var doc in membersSnap.docs) {
        final data = doc.data();
        final orgId = data['organizationId'];
        if (orgId != null && orgId.toString().isNotEmpty && !seenOrgIds.contains(orgId.toString())) {
          seenOrgIds.add(orgId.toString());
          final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(orgId).get();
          if (orgDoc.exists) {
            results.add({
              'membershipId': doc.id,
              'organizationId': orgId,
              'organizationName': orgDoc.data()?['name'] ?? 'Organization',
              'role': data['role'] ?? 'member',
              'joinedAt': data['joinedAt'] ?? '',
            });
          }
        }
      }

      // Include user's current primary organization if not already in membership results
      final primaryOrgId = _user?.lastSelectedOrgId ?? _user?.organizationId;
      if (primaryOrgId != null && primaryOrgId.isNotEmpty && !seenOrgIds.contains(primaryOrgId)) {
        seenOrgIds.add(primaryOrgId);
        final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(primaryOrgId).get();
        if (orgDoc.exists) {
          results.add({
            'membershipId': 'owner_$primaryOrgId',
            'organizationId': primaryOrgId,
            'organizationName': orgDoc.data()?['name'] ?? 'Organization',
            'role': _user?.role ?? 'owner',
            'joinedAt': '',
          });
        }
      }

      _userOrganizations = results;
      notifyListeners();
      return results;
    } catch (e) {
      debugPrint('[AUTH_PROVIDER] Error loading user organizations: $e');
      return _userOrganizations;
    }
  }

  /// Securely resolves a 10-digit mobile number to a registered email address.
  /// First invokes the Cloud Function `resolveMobileToEmail`.
  /// Fallbacks to direct query if offline/local dev.
  Future<String?> _resolveMobileToEmail(String mobile) async {
    final cleanMobile = mobile.trim().replaceAll(RegExp(r'\D'), '');
    if (cleanMobile.length < 10) return null;
    final tenDigit = cleanMobile.substring(cleanMobile.length - 10);

    // 1. Primary: HTTPS Callable Cloud Function endpoint
    try {
      final url = Uri.parse(
          'https://asia-south1-pavtibook-7251a.cloudfunctions.net/resolveMobileToEmail');
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'data': {'mobile': tenDigit}
            }),
          )
          .timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final result = jsonBody['result'];
        if (result != null &&
            result['success'] == true &&
            result['email'] != null) {
          return result['email'] as String;
        }
      }
    } catch (e) {
      debugPrint('[MOBILE_RESOLVER] Cloud Function call error: $e');
    }

    // 2. Secondary Fallback: Firestore Admin/Users search (For local offline resilience)
    try {
      final formattedWithPlus = '+91$tenDigit';
      final querySnap = await FirebaseFirestore.instance
          .collection('users')
          .where('mobile', whereIn: [tenDigit, formattedWithPlus])
          .limit(1)
          .get();

      if (querySnap.docs.isNotEmpty) {
        final email = querySnap.docs.first.data()['email'] as String?;
        if (email != null && email.contains('@')) return email;
      }
    } catch (e) {
      debugPrint('[MOBILE_RESOLVER] Local fallback search error: $e');
    }

    return null;
  }

  /// Unified Login method accepting either Email or Mobile + Password
  Future<bool> loginEmailOrMobile(String identifier, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    String targetEmail = identifier.trim();

    // If identifier does not contain '@', resolve mobile -> email
    if (!targetEmail.contains('@')) {
      final resolvedEmail = await _resolveMobileToEmail(targetEmail);
      if (resolvedEmail == null) {
        _errorMessage = 'Invalid credentials or account not found.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      targetEmail = resolvedEmail;
    }

    try {
      final authResult = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: targetEmail,
        password: password,
      );
      final user = authResult.user!;

      final success = await _loadAndMigrateUserProfile(user);
      _isLoading = false;
      notifyListeners();
      return success;
    } on FirebaseAuthException catch (e) {
      if (e.code == 'invalid-credential' ||
          e.code == 'wrong-password' ||
          e.code == 'user-not-found' ||
          e.code == 'invalid-email') {
        _errorMessage = 'Incorrect email or password.';
      } else if (e.code == 'user-disabled') {
        _errorMessage = 'This account has been disabled. Please contact support.';
      } else if (e.code == 'too-many-requests') {
        _errorMessage = 'Too many login attempts. Please try again later.';
      } else {
        _errorMessage = e.message ?? 'Login failed. Please try again.';
      }
    } catch (e) {
      _errorMessage = 'An unexpected error occurred. Please try again.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  /// Legacy alias for loginEmail
  Future<bool> loginEmail(String email, String password) async {
    return loginEmailOrMobile(email, password);
  }

  /// Authenticate using Google Sign-In and Firebase Auth GoogleAuthProvider
  Future<bool> loginWithGoogle() async {
    _isLoading = true;
    _errorMessage = null;
    _needsOrgRegistration = false;
    notifyListeners();

    try {
      const String webClientId = '780452591351-ligh78331iu5s341ehm75o2ucnnbf6iu.apps.googleusercontent.com';
      try {
        await GoogleSignIn.instance.initialize(
          serverClientId: webClientId,
        );
      } catch (e) {
        debugPrint('GoogleSignIn.instance.initialize note: $e');
      }

      final GoogleSignInAccount? googleUser = await GoogleSignIn.instance.authenticate();

      if (googleUser == null) {
        // User cancelled Google login prompt
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final OAuthCredential credential = GoogleAuthProvider.credential(
        idToken: googleAuth.idToken,
      );

      UserCredential userCredential;
      try {
        userCredential = await FirebaseAuth.instance.signInWithCredential(credential);
      } on FirebaseAuthException catch (e) {
        if (e.code == 'account-exists-with-different-credential') {
          _pendingGoogleCredential = credential;
          _pendingLinkingEmail = e.email ?? googleUser.email;
          _errorMessage = 'account-exists-with-different-credential:${_pendingLinkingEmail}';
          _isLoading = false;
          notifyListeners();
          return false;
        } else {
          _errorMessage = e.message ?? 'Google Sign-In authentication failed.';
          _isLoading = false;
          notifyListeners();
          return false;
        }
      }

      final User user = userCredential.user!;

      // Check if user has an existing Firestore user document and organization
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();

      if (userDoc.exists) {
        final userData = userDoc.data()!;
        final orgId = userData['lastSelectedOrgId'] ?? userData['organization_id'] ?? userData['organizationId'];

        final membersSnap = await FirebaseFirestore.instance
            .collection('organization_members')
            .where('userId', isEqualTo: user.uid)
            .limit(1)
            .get();

        if (orgId != null || membersSnap.docs.isNotEmpty) {
          // EXISTING GOOGLE USER WITH ORGANIZATION
          final success = await _loadAndMigrateUserProfile(user);
          _needsOrgRegistration = false;
          _isLoading = false;
          notifyListeners();
          return success;
        } else {
          // User doc exists but has no organization -> Needs org registration
          await _loadAndMigrateUserProfile(user);
          _needsOrgRegistration = true;
          _isLoading = false;
          notifyListeners();
          return true;
        }
      } else {
        // NEW GOOGLE USER -> Create user doc in Firestore and flag for org registration
        final newUserDoc = {
          'id': user.uid,
          'email': user.email ?? googleUser.email,
          'mobile': user.phoneNumber ?? '',
          'name': (user.displayName != null && user.displayName!.isNotEmpty)
              ? user.displayName
              : (googleUser.displayName != null && googleUser.displayName!.isNotEmpty)
                  ? googleUser.displayName
                  : 'User',
          'photoUrl': user.photoURL ?? googleUser.photoUrl ?? '',
          'authProvider': 'google',
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        };

        await FirebaseFirestore.instance.collection('users').doc(user.uid).set(newUserDoc);
        _user = UserModel.fromJson(newUserDoc);
        _needsOrgRegistration = true;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('loginWithGoogle Exception: $e');
      _errorMessage = 'Google Sign-In failed: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Safely link pending Google credential after authenticating with existing provider password
  Future<bool> linkPendingGoogleCredentialWithPassword(String password) async {
    if (_pendingGoogleCredential == null || _pendingLinkingEmail == null || _pendingLinkingEmail!.isEmpty) {
      _errorMessage = 'No pending Google credential to link.';
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final UserCredential existingUserCred = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _pendingLinkingEmail!,
        password: password,
      );

      // Link Google credential to existing Firebase Auth user
      await existingUserCred.user!.linkWithCredential(_pendingGoogleCredential!);
      
      _pendingGoogleCredential = null;
      _pendingLinkingEmail = null;

      final success = await _loadAndMigrateUserProfile(existingUserCred.user!);
      _needsOrgRegistration = false;
      _isLoading = false;
      notifyListeners();
      return success;
    } on FirebaseAuthException catch (e) {
      _errorMessage = e.message ?? 'Failed to authenticate and link account.';
    } catch (e) {
      _errorMessage = 'An unexpected error occurred during account linking.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  /// Send password reset link accepting Email or Mobile
  Future<bool> sendPasswordResetForInput(String identifier) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    String targetEmail = identifier.trim();

    if (!targetEmail.contains('@')) {
      final resolved = await _resolveMobileToEmail(targetEmail);
      if (resolved == null) {
        _errorMessage =
            'If an account exists with that number, a password reset email has been sent to the registered address.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      targetEmail = resolved;
    }

    try {
      await FirebaseAuth.instance.sendPasswordResetEmail(email: targetEmail);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage =
          'Failed to send password reset email. Please verify the email/mobile number.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Helper method to load user profile, handle legacy migration, and set active organization
  Future<bool> _loadAndMigrateUserProfile(User user) async {
    final uid = user.uid;

    final userDoc =
        await FirebaseFirestore.instance.collection('users').doc(uid).get();

    if (userDoc.exists) {
      final userData = userDoc.data()!;
      
      // Legacy Migration Case B: Update missing email if user logged in via Firebase Auth with email
      if ((userData['email'] == null || userData['email'].toString().isEmpty) &&
          user.email != null) {
        await FirebaseFirestore.instance.collection('users').doc(uid).update({
          'email': user.email,
          'updatedAt': DateTime.now().toIso8601String(),
        });
        userData['email'] = user.email;
      }

      await _migrateUserData(uid, userData);
      _user = UserModel.fromJson(userData);

      final orgId = userData['lastSelectedOrgId'] ??
          userData['organization_id'] ??
          userData['organizationId'];

      if (orgId != null) {
        final orgDoc = await FirebaseFirestore.instance
            .collection('organizations')
            .doc(orgId)
            .get();
        if (orgDoc.exists) {
          _organization = OrganizationModel.fromJson(orgDoc.data()!);
          await fetchSubscriptionConfig();
          await loadSubscription(orgId);
          await loadUserOrganizations(uid);

          try {
            FirebaseFirestore.instance.collection('activity_logs').add({
              'organizationId': orgId,
              'userId': uid,
              'userName': _user?.name ?? 'User',
              'userRole': _user?.role ?? 'member',
              'action': 'Login',
              'details': '${_user?.name} logged in successfully',
              'timestamp': DateTime.now().toIso8601String(),
            });
          } catch (_) {}
        }
      }
      return true;
    } else {
      // Create user doc if missing (Legacy Migration fallback)
      final newUserDoc = {
        'id': uid,
        'email': user.email ?? '',
        'mobile': user.phoneNumber ?? '',
        'name': user.displayName ?? 'User',
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };
      await FirebaseFirestore.instance.collection('users').doc(uid).set(newUserDoc);
      _user = UserModel.fromJson(newUserDoc);
      return true;
    }
  }

  String? _verificationId;

  /// Legacy Phone Auth OTP Request (Deprecated - retained for backward compatibility)
  @Deprecated('Use Email/Mobile authentication')
  Future<bool> requestOtp(String mobile) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final completer = Completer<bool>();
    String phone = mobile.trim();
    if (phone.length == 10 && !phone.startsWith('+')) {
      phone = '+91$phone';
    }

    try {
      print('[PHONE_AUTH] STEP 1: Calling FirebaseAuth.instance.verifyPhoneNumber(phoneNumber: $phone)');
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: phone,
        verificationCompleted: (PhoneAuthCredential credential) async {
          print('[PHONE_AUTH] CALLBACK: verificationCompleted triggered');
          print('[PHONE_AUTH] credential.smsCode: ${credential.smsCode}');
          print('[PHONE_AUTH] credential.verificationId: ${credential.verificationId}');
          try {
            print('[PHONE_AUTH] Attempting signInWithCredential...');
            final authResult = await FirebaseAuth.instance.signInWithCredential(credential);
            final uid = authResult.user!.uid;
            print('[PHONE_AUTH] SUCCESS: Signed in with credential. uid: $uid');
            
            final success = await _handlePostSignIn(authResult.user!, credential, phone);
            _isLoading = false;
            notifyListeners();
            if (!completer.isCompleted) completer.complete(success);
          } catch (e) {
            print('[PHONE_AUTH] ERROR during verificationCompleted sign-in: $e');
            _errorMessage = e.toString();
            _isLoading = false;
            notifyListeners();
            if (!completer.isCompleted) completer.complete(false);
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          print('[PHONE_AUTH] CALLBACK: verificationFailed triggered');
          print('[PHONE_AUTH] FirebaseAuthException code: ${e.code}');
          print('[PHONE_AUTH] FirebaseAuthException message: ${e.message}');
          print('[PHONE_AUTH] FirebaseAuthException email: ${e.email}');
          print('[PHONE_AUTH] FirebaseAuthException credential: ${e.credential}');
          _errorMessage = e.message ?? 'Phone verification failed.';
          _isLoading = false;
          notifyListeners();
          if (!completer.isCompleted) completer.complete(false);
        },
        codeSent: (String verificationId, int? resendToken) {
          print('[PHONE_AUTH] CALLBACK: codeSent triggered');
          print('[PHONE_AUTH] verificationId: $verificationId');
          print('[PHONE_AUTH] resendToken: $resendToken');
          _verificationId = verificationId;
          _isLoading = false;
          notifyListeners();
          if (!completer.isCompleted) completer.complete(true);
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          print('[PHONE_AUTH] CALLBACK: codeAutoRetrievalTimeout triggered. verificationId: $verificationId');
          _verificationId = verificationId;
        },
        timeout: const Duration(seconds: 60),
      );
      
      return completer.future;
    } catch (e) {
      print('[PHONE_AUTH] ERROR calling verifyPhoneNumber: $e');
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Helper to handle post-sign-in logic (profile check & linking detection)
  Future<bool> _handlePostSignIn(User user, PhoneAuthCredential credential, String mobile) async {
    final uid = user.uid;
    print('[PHONE_AUTH] Post-SignIn check for UID: $uid, Mobile: $mobile');

    String cleanMobile = mobile.replaceAll(RegExp(r'\D'), '');
    if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
      cleanMobile = cleanMobile.substring(2);
    }

    // 1. Search for existing Owner/Admin user document with this mobile number
    final querySnap = await FirebaseFirestore.instance
        .collection('users')
        .where('mobile', whereIn: [mobile, cleanMobile, '+91$cleanMobile', '+91 $cleanMobile'])
        .get();

    DocumentSnapshot? existingOwnerDoc;
    for (var doc in querySnap.docs) {
      final data = doc.data() as Map<String, dynamic>;
      final role = data['role'];
      if (role == 'admin' || role == 'owner') {
        if (doc.id != uid) {
          existingOwnerDoc = doc;
          break;
        }
      }
    }

    if (existingOwnerDoc != null) {
      final existingEmail = (existingOwnerDoc.data() as Map<String, dynamic>)['email'];
      if (existingEmail != null && existingEmail.toString().isNotEmpty) {
        print('[PHONE_AUTH] Found existing owner email account $existingEmail for phone $mobile. Triggering linking flow...');
        _pendingLinkingEmail = existingEmail;
        _pendingPhoneCredential = credential;
        _errorMessage = 'linking-required:$existingEmail';
        return false;
      }
    }

    // 2. If no owner account needs to be linked, load profile by current UID
    final userDoc = await FirebaseFirestore.instance.collection('users').doc(uid).get();
    if (userDoc.exists) {
      final userData = userDoc.data()!;
      await _migrateUserData(uid, userData);
      _user = UserModel.fromJson(userData);
      final orgId = userData['organization_id'] ?? userData['organizationId'];
      print('[PHONE_AUTH] User profile loaded. organizationId: $orgId');
      if (orgId != null) {
        final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(orgId).get();
        if (orgDoc.exists) {
          _organization = OrganizationModel.fromJson(orgDoc.data()!);
          print('[PHONE_AUTH] Organization loaded successfully.');
          await fetchSubscriptionConfig();
          await loadSubscription(orgId);
        } else {
          print('[PHONE_AUTH] WARNING: Organization document not found.');
        }
      }
      return true;
    } else {
      // No user profile exists. Check if this number has any pending invitation!
      print('[PHONE_AUTH] No user profile found. Checking for invitations for: $cleanMobile');
      try {
        final invitesQuery = await FirebaseFirestore.instance
            .collection('organization_invites')
            .where('mobile', whereIn: [cleanMobile, '+91$cleanMobile', mobile])
            .where('status', isEqualTo: 'pending')
            .get();

        if (invitesQuery.docs.isNotEmpty) {
          print('[PHONE_AUTH] Found pending invitation(s) for $cleanMobile. Keeping session and redirecting to invite verification.');
          _errorMessage = 'invite-verification-required:$cleanMobile';
          return false; // Returns false, but sets the specific error message to trigger redirection
        }
      } catch (e) {
        print('[PHONE_AUTH] Error querying invites: $e');
      }

      print('[PHONE_AUTH] No pending invitation found. Signing out.');
      await FirebaseAuth.instance.signOut();
      _errorMessage = 'User profile not found. Members must join via invitation first.';
      return false;
    }
  }

  /// Legacy Phone Auth OTP Verification (Deprecated - retained for backward compatibility)
  @Deprecated('Use Email/Mobile authentication')
  Future<bool> verifyOtp(String mobile, String otp) async {
    print('[PHONE_AUTH] STEP 2: verifyOtp called for mobile: $mobile, otp: $otp');
    if (_verificationId == null) {
      print('[PHONE_AUTH] FAILURE: verificationId is null');
      _errorMessage = 'Verification session expired. Please request OTP again.';
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      print('[PHONE_AUTH] Creating PhoneAuthProvider credential for verificationId: $_verificationId, code: $otp');
      final credential = PhoneAuthProvider.credential(
        verificationId: _verificationId!,
        smsCode: otp,
      );

      print('[PHONE_AUTH] Attempting signInWithCredential...');
      final authResult = await FirebaseAuth.instance.signInWithCredential(credential);
      print('[PHONE_AUTH] SUCCESS: Signed in. uid: ${authResult.user!.uid}');

      final success = await _handlePostSignIn(authResult.user!, credential, mobile);
      _isLoading = false;
      notifyListeners();
      return success;
    } on FirebaseAuthException catch (e) {
      print('[PHONE_AUTH] ERROR: FirebaseAuthException in verifyOtp');
      print('[PHONE_AUTH] code: ${e.code}');
      print('[PHONE_AUTH] message: ${e.message}');
      if (e.code == 'invalid-verification-code') {
        _errorMessage = 'Invalid verification code.';
      } else {
        _errorMessage = e.message ?? 'OTP verification failed.';
      }
    } catch (e) {
      print('[PHONE_AUTH] ERROR: Unexpected error in verifyOtp: $e');
      _errorMessage = 'An unexpected error occurred.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Link Phone to existing Email account and clean up temporary user
  Future<bool> linkPhoneAccount(String password) async {
    if (_pendingLinkingEmail == null || _pendingPhoneCredential == null) {
      _errorMessage = 'No pending linking session found.';
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final email = _pendingLinkingEmail!;
      final phoneCred = _pendingPhoneCredential!;

      // 1. Delete temporary/orphan phone user to free up the phone number in Auth
      final tempUser = FirebaseAuth.instance.currentUser;
      if (tempUser != null) {
        print('[PHONE_AUTH] Deleting temporary phone user account: ${tempUser.uid}');
        await tempUser.delete();
      }

      // 2. Sign in to the original email account
      print('[PHONE_AUTH] Signing into email account: $email');
      final emailAuthResult = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      final emailUser = emailAuthResult.user!;
      final emailUid = emailUser.uid;

      // 3. Link the phone credential to this email user
      print('[PHONE_AUTH] Linking phone credential to email user: $emailUid');
      await emailUser.linkWithCredential(phoneCred);

      // 4. Load the profile and organization for the linked user
      print('[PHONE_AUTH] Loading profile details for email user: $emailUid');
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(emailUid).get();
      if (userDoc.exists) {
        final userData = userDoc.data()!;
        await _migrateUserData(emailUid, userData);
        _user = UserModel.fromJson(userData);
        final orgId = userData['organization_id'] ?? userData['organizationId'];
        if (orgId != null) {
          final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(orgId).get();
          if (orgDoc.exists) {
            _organization = OrganizationModel.fromJson(orgDoc.data()!);
            await fetchSubscriptionConfig();
            await loadSubscription(orgId);
          }
        }

        _pendingLinkingEmail = null;
        _pendingPhoneCredential = null;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'User profile document not found.';
      }
    } on FirebaseAuthException catch (e) {
      print('[PHONE_AUTH] FirebaseAuthException during linking: ${e.code} - ${e.message}');
      if (e.code == 'wrong-password' || e.code == 'invalid-credential') {
        _errorMessage = 'Incorrect email or password.';
      } else {
        _errorMessage = e.message ?? 'Failed to link account.';
      }
    } catch (e) {
      print('[PHONE_AUTH] Unexpected error during linking: $e');
      _errorMessage = 'An unexpected error occurred.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Cancel pending link operation
  void cancelPendingLinking() {
    _pendingLinkingEmail = null;
    _pendingPhoneCredential = null;
    _errorMessage = null;
    notifyListeners();
  }

  // Refresh organization details
  Future<void> reloadProfile() async {
    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser != null) {
        final userDoc = await FirebaseFirestore.instance
            .collection('users')
            .doc(currentUser.uid)
            .get();
        if (userDoc.exists) {
          final userData = userDoc.data()!;
          await _migrateUserData(currentUser.uid, userData);
          _user = UserModel.fromJson(userData);
          final orgId =
              userData['organization_id'] ?? userData['organizationId'];
          if (orgId != null) {
            final orgDoc = await FirebaseFirestore.instance
                .collection('organizations')
                .doc(orgId)
                .get();
            if (orgDoc.exists) {
              final orgData = orgDoc.data()!;
              _organization = OrganizationModel.fromJson(orgData);
              await fetchSubscriptionConfig();
              await loadSubscription(orgId);
            }
          }
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('Reload profile error: $e');
    }
  }

  // Submit compliance document
  Future<bool> uploadVerificationDocument(String docType, String docUrl) async {
    _isLoading = true;
    notifyListeners();
    try {
      final orgId = _organization?.id;
      if (orgId != null) {
        await FirebaseFirestore.instance
            .collection('organizations')
            .doc(orgId)
            .collection('verifications')
            .add({
          'document_type': docType,
          'document_url': docUrl,
          'status': 'pending',
          'createdAt': FieldValue.serverTimestamp(),
        });
        await reloadProfile();
        _isLoading = false;
        return true;
      }
    } catch (e) {
      debugPrint('Upload KYC error: $e');
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Logout session
  Future<void> logout() async {
    final orgId = _organization?.id;
    final uid = _user?.id;
    final name = _user?.name;
    final role = _user?.role;

    if (orgId != null && uid != null) {
      try {
        await FirebaseFirestore.instance.collection('activity_logs').add({
          'organizationId': orgId,
          'userId': uid,
          'userName': name ?? 'User',
          'userRole': role ?? 'member',
          'action': 'Logout',
          'details': '$name logged out successfully',
          'timestamp': DateTime.now().toIso8601String(),
        });
      } catch (_) {}
    }

    // Clear local caches
    try {
      // 1. Clear Profile Cache
      final docDir = await getApplicationDocumentsDirectory();
      final docFiles = docDir.listSync();
      for (var f in docFiles) {
        if (f is File) {
          final filename = f.path.split('/').last.split('\\').last;
          if (filename.startsWith('profile_photo_')) {
            await f.delete();
          }
        }
      }

      // 2. Clear Temporary Image Cache & Receipt Preview Cache
      final tempDir = await getTemporaryDirectory();
      final tempFiles = tempDir.listSync();
      for (var f in tempFiles) {
        if (f is File) {
          await f.delete();
        }
      }
    } catch (e) {
      debugPrint('Error clearing local caches on logout: $e');
    }

    try {
      scaffoldMessengerKey.currentState?.clearSnackBars();
      cancelSubListener();
      try {
        await GoogleSignIn.instance.signOut();
      } catch (e) {
        debugPrint('Google SignOut error: $e');
      }
      await FirebaseAuth.instance.signOut();
    } catch (e) {
      debugPrint('Logout failed: $e');
    }
    _user = null;
    _organization = null;
    _subscription = null;
    _activeRole = null;
    _switchGeneration++;
    notifyListeners();
  }

  // Activity Log Helper
  Future<void> _logActivity(String action, String details) async {
    if (_user == null || _organization == null) return;
    try {
      final os = Platform.isAndroid ? 'Android' : (Platform.isIOS ? 'iOS' : 'Web/Desktop');
      const appVersion = '1.0.0';

      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': _organization!.id,
        'userId': _user!.id,
        'userName': _user!.name,
        'userRole': _user!.role,
        'action': action,
        'details': '$details (OS: $os, Ver: $appVersion)',
        'timestamp': DateTime.now().toIso8601String(),
        'device': os,
        'appVersion': appVersion,
      });
    } catch (e) {
      debugPrint('Failed to add activity log: $e');
    }
  }

  // Auto-Ownership Migration Helper
  Future<Map<String, dynamic>> _ensureOwnerFields(
      String orgId, String uid, Map<String, dynamic> userData, Map<String, dynamic> orgData) async {
    if (orgData['ownerUid'] == null || orgData['ownerUid'].toString().trim().isEmpty) {
      final updatedFields = {
        'ownerUid': uid,
        'ownerName': userData['name'] ?? 'Owner',
        'ownerEmail': userData['email'] ?? '',
        'ownerMobile': userData['mobile'] ?? '',
        'activeTransferId': null,
        'isArchived': orgData['isArchived'] ?? false,
      };
      
      await FirebaseFirestore.instance
          .collection('organizations')
          .doc(orgId)
          .update(updatedFields);

      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .update({
        'isSoftwareOwner': true,
      });

      final updatedOrgDoc = await FirebaseFirestore.instance
          .collection('organizations')
          .doc(orgId)
          .get();
      
      return updatedOrgDoc.data() ?? orgData;
    }
    return orgData;
  }

  // Auto-User and Organization Migration Helper
  Future<void> _migrateUserData(String uid, Map<String, dynamic> userData) async {
    try {
      final orgId = userData['organization_id'] ?? userData['organizationId'];
      if (orgId != null) {
        // 1. User document migration: ensure both organizationId and organization_id exist
        if (userData['organizationId'] == null || userData['organization_id'] == null) {
          debugPrint('[MIGRATION] Migrating user document for uid: $uid');
          await FirebaseFirestore.instance.collection('users').doc(uid).update({
            'organizationId': orgId,
            'organization_id': orgId,
          });
        }
        
        // 2. Organization document migration: ensure owner fields are set
        final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(orgId).get();
        if (orgDoc.exists) {
          final orgData = orgDoc.data()!;
          if (orgData['ownerUid'] == null || orgData['ownerUid'].toString().trim().isEmpty) {
            final role = userData['role'];
            if (role == 'admin' || role == 'owner') {
              debugPrint('[MIGRATION] Migrating organization document for org: $orgId');
              await _ensureOwnerFields(orgId, uid, userData, orgData);
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[MIGRATION] Error migrating user/org data: $e');
    }
  }

  // Upload profile photo
  Future<bool> uploadProfilePhoto(List<int> photoBytes) async {
    if (_user == null) return false;
    _isLoading = true;
    notifyListeners();

    final stopwatch = Stopwatch()..start();

    try {
      final uid = _user!.id;
      final newVersion = (_user!.profilePhotoVersion ?? 0) + 1;
      
      // 1. Process images in a single off-thread pass
      final startProcess = stopwatch.elapsedMilliseconds;
      final processedData = await ImageProcessingService.processAllThumbnails(Uint8List.fromList(photoBytes));
      final processTime = stopwatch.elapsedMilliseconds - startProcess;

      if (processedData == null) {
        throw Exception("Failed to generate image thumbnails.");
      }

      final bytes512 = processedData.bytes512;
      final bytes256 = processedData.bytes256;
      final bytes128 = processedData.bytes128;

      String? url512;
      String? url256;
      String? url128;

      // 2. Parallel upload of files with timeout fallback to Data URI
      final startUpload = stopwatch.elapsedMilliseconds;
      try {
        final metadata = SettableMetadata(contentType: 'image/jpeg');

        final ref512 = FirebaseStorage.instance.ref().child('users').child(uid).child('profile_photo.jpg');
        final ref256 = FirebaseStorage.instance.ref().child('users').child(uid).child('profile_photo_256.jpg');
        final ref128 = FirebaseStorage.instance.ref().child('users').child(uid).child('profile_photo_128.jpg');

        final uploadTasks = [
          ref512.putData(bytes512, metadata).then((_) => ref512.getDownloadURL()),
          ref256.putData(bytes256, metadata).then((_) => ref256.getDownloadURL()),
          ref128.putData(bytes128, metadata).then((_) => ref128.getDownloadURL()),
        ];

        final urls = await Future.wait(uploadTasks).timeout(const Duration(seconds: 10));
        url512 = urls[0];
        url256 = urls[1];
        url128 = urls[2];
      } catch (e) {
        debugPrint('[PROFILE_PHOTO] Storage upload failed or timed out: $e. Falling back to Data URI.');
        final dataUri = 'data:image/jpeg;base64,${base64Encode(bytes128)}';
        url512 = dataUri;
        url256 = dataUri;
        url128 = dataUri;
      }
      final uploadTime = stopwatch.elapsedMilliseconds - startUpload;

      // 3. Cache compressed images locally and AWAIT file write
      await ImageProcessingService.cachePhotoLocally(uid, newVersion, bytes512, suffix: '');
      await ImageProcessingService.cachePhotoLocally(uid, newVersion, bytes256, suffix: '_256');
      await ImageProcessingService.cachePhotoLocally(uid, newVersion, bytes128, suffix: '_128');

      // 4. Firestore update immediately after upload
      final startFirestore = stopwatch.elapsedMilliseconds;
      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .update({
        'profilePhotoUrl': url512,
        'profilePhotoUrl256': url256,
        'profilePhotoUrl128': url128,
        'profilePhotoVersion': newVersion,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      final firestoreTime = stopwatch.elapsedMilliseconds - startFirestore;

      final totalTime = stopwatch.elapsedMilliseconds;

      if (kDebugMode) {
        print('=== PROFILE PHOTO UPLOAD BENCHMARKS ===');
        print('Image Processing: ${processTime}ms');
        print('Storage Upload (Parallel): ${uploadTime}ms');
        print('Firestore Update: ${firestoreTime}ms');
        print('Total Elapsed: ${totalTime}ms');
        print('=======================================');
      }

      await reloadProfile();
      
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error uploading profile photo: $e');
      _errorMessage = 'Failed to upload profile photo: $e';
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Delete profile photo
  Future<bool> deleteProfilePhoto() async {
    if (_user == null) return false;
    _isLoading = true;
    notifyListeners();

    try {
      final uid = _user!.id;
      final newVersion = (_user!.profilePhotoVersion ?? 0) + 1;

      for (var suffix in ['', '_256', '_128']) {
        try {
          final storageRef = FirebaseStorage.instance
              .ref()
              .child('users')
              .child(uid)
              .child(suffix == '' ? 'profile_photo.jpg' : 'profile_photo$suffix.jpg');
          await storageRef.delete();
        } catch (_) {}
      }

      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .update({
        'profilePhotoUrl': null,
        'profilePhotoUrl256': null,
        'profilePhotoUrl128': null,
        'profilePhotoVersion': newVersion,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      await ImageProcessingService.clearLocalCache(uid);

      try {
        await _logActivity('Profile Photo Deleted', 'Removed profile photo and thumbnails');
      } catch (_) {}
      
      await reloadProfile();

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error deleting profile photo: $e');
      _errorMessage = 'Failed to delete profile photo: $e';
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Update profile details
  Future<bool> updateProfileDetails(String name, String mobile) async {
    if (_user == null) return false;
    _isLoading = true;
    notifyListeners();

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(_user!.id)
          .update({
        'name': name,
        'mobile': mobile,
      });

      await _logActivity('Profile Updated', 'Updated profile details');
      await reloadProfile();

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error updating profile details: $e');
      _errorMessage = 'Failed to update details: $e';
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Password re-authentication
  Future<bool> verifyCurrentOwnerPassword(String password) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null || user.email == null) return false;
      
      final credential = EmailAuthProvider.credential(
        email: user.email!,
        password: password,
      );

      await user.reauthenticateWithCredential(credential);
      return true;
    } catch (e) {
      debugPrint('Re-authentication failed: $e');
      return false;
    }
  }

  // Archive organization
  Future<bool> archiveOrganization(String reason) async {
    if (_user == null || _organization == null) return false;
    _isLoading = true;
    notifyListeners();

    try {
      final orgId = _organization!.id;
      final payload = {
        'isArchived': true,
        'archivedAt': DateTime.now().toIso8601String(),
        'archivedBy': _user!.id,
        'archiveReason': reason,
      };

      final batch = FirebaseFirestore.instance.batch();
      
      // Update Org document
      batch.update(
        FirebaseFirestore.instance.collection('organizations').doc(orgId),
        payload,
      );

      // Pause subscription billing
      batch.update(
        FirebaseFirestore.instance.collection('subscriptions').doc(orgId),
        {
          'billingPaused': true,
          'pausedAt': DateTime.now().toIso8601String(),
        },
      );

      await batch.commit();

      await _logActivity('Organization Archived', 'Archived organization for: $reason');
      await reloadProfile();

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error archiving organization: $e');
      _errorMessage = 'Failed to archive organization: $e';
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Restore organization
  Future<bool> restoreOrganization() async {
    if (_user == null || _organization == null) return false;
    _isLoading = true;
    notifyListeners();

    try {
      final orgId = _organization!.id;
      final batch = FirebaseFirestore.instance.batch();
      
      // Update Org document
      batch.update(
        FirebaseFirestore.instance.collection('organizations').doc(orgId),
        {
          'isArchived': false,
          'archivedAt': null,
          'archivedBy': null,
          'archiveReason': null,
        },
      );

      // Resume subscription billing
      batch.update(
        FirebaseFirestore.instance.collection('subscriptions').doc(orgId),
        {
          'billingPaused': false,
          'resumedAt': DateTime.now().toIso8601String(),
        },
      );

      await batch.commit();

      await _logActivity('Organization Restored', 'Restored organization');
      await reloadProfile();

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error restoring organization: $e');
      _errorMessage = 'Failed to restore organization: $e';
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Send Password Reset Email
  Future<bool> sendPasswordResetEmail(String email) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
      _isLoading = false;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found' || e.code == 'invalid-email') {
        _errorMessage = 'Please enter a valid registered email address.';
      } else {
        _errorMessage = e.message ?? 'Failed to send password reset email.';
      }
    } catch (e) {
      _errorMessage = 'An unexpected error occurred. Please try again.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Update post-registration onboarding details
  Future<bool> updateOnboardingDetails(String orgId, Map<String, dynamic> onboardingData) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final orgRef = FirebaseFirestore.instance.collection('organizations').doc(orgId);
      await orgRef.update({
        'upi_id': onboardingData['upiId'],
        'contact_person': onboardingData['contactPerson'],
        'address': onboardingData['address'],
        'city': onboardingData['city'],
        'state': onboardingData['state'],
        'pincode': onboardingData['pincode'],
        'registration_number': onboardingData['registrationNumber'],
        'updatedAt': FieldValue.serverTimestamp(),
      });

      await reloadProfile();
      _isLoading = false;
      notifyListeners();
      return true;
    } on FirebaseException catch (e) {
      _errorMessage = 'Failed to update details: [${e.code}] ${e.message}';
    } catch (e) {
      _errorMessage = 'Failed to update details: ${e.toString()}';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
