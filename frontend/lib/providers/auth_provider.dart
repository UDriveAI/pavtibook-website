import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:path_provider/path_provider.dart';
import '../models/models.dart';
import '../services/image_processing_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  OrganizationModel? _organization;
  bool _isLoading = false;
  String? _errorMessage;
  SubscriptionModel? _subscription;

  UserModel? get user => _user;
  OrganizationModel? get organization => _organization;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;
  SubscriptionModel? get subscription => _subscription;

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

  Future<void> loadSubscription(String orgId) async {
    try {
      final subDoc = await FirebaseFirestore.instance
          .collection('subscriptions')
          .doc(orgId)
          .get();
      if (subDoc.exists) {
        final data = Map<String, dynamic>.from(subDoc.data()!);
        final isFromCache = subDoc.metadata.isFromCache;
        if (isFromCache && data['plan'] != 'free_trial') {
          // Force fallback to free trial constraints if offline (to prevent cached premium unlocks)
          data['plan'] = 'free_trial';
          data['receiptLimit'] = 10;
          data['usersLimit'] = 1;
        }
        _subscription = SubscriptionModel.fromJson(data);
      } else {
        final defaultSub = {
          'id': orgId,
          'organizationId': orgId,
          'plan': 'free_trial',
          'receiptsUsed': 0,
          'receiptLimit': _subConfig['free_trial_receipts'] ?? 10,
          'usersUsed': 1,
          'usersLimit': 1,
          'renewalDate': DateTime.now()
              .add(Duration(days: _subConfig['trial_valid_days'] ?? 30))
              .toIso8601String(),
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
          _user = UserModel.fromJson(userData);
          final orgId =
              userData['organization_id'] ?? userData['organizationId'];
          if (orgId != null) {
            final orgDoc = await FirebaseFirestore.instance
                .collection('organizations')
                .doc(orgId)
                .get();
            if (orgDoc.exists) {
              var orgData = orgDoc.data()!;
              orgData = await _ensureOwnerFields(orgId, currentUser.uid, userData, orgData);
              _organization = OrganizationModel.fromJson(orgData);
              await fetchSubscriptionConfig();
              await loadSubscription(orgId);
            }
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
      final password = regData['password'];

      // 0. Trial Protection
      final orgName = regData['orgName'] ?? '';
      final city = regData['city'] ?? '';
      final orgMobile = regData['orgMobile'] ?? '';

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

      // 1. Create User in Firebase Auth
      debugPrint(
          '[REGISTER_FLOW] [STEP 1] Attempting FirebaseAuth.createUserWithEmailAndPassword for email: $adminEmail');
      UserCredential authResult;
      try {
        authResult = await FirebaseAuth.instance.createUserWithEmailAndPassword(
          email: adminEmail,
          password: password,
        );
      } on FirebaseAuthException catch (fae, stack) {
        debugPrint('[REGISTER_FLOW] [STEP 1 FAILED] FirebaseAuthException:');
        debugPrint('  File: $fileIdentifier');
        debugPrint('  Line: ~64 (createUserWithEmailAndPassword)');
        debugPrint('  Code: ${fae.code}');
        debugPrint('  Message: ${fae.message}');
        debugPrint('  Stacktrace: $stack');
        rethrow;
      } catch (e, stack) {
        debugPrint('[REGISTER_FLOW] [STEP 1 FAILED] Unknown Exception:');
        debugPrint('  File: $fileIdentifier');
        debugPrint('  Line: ~64 (createUserWithEmailAndPassword)');
        debugPrint('  Error: $e');
        debugPrint('  Stacktrace: $stack');
        rethrow;
      }

      final uid = authResult.user!.uid;
      debugPrint(
          '[REGISTER_FLOW] [STEP 1 SUCCESS] User created in Auth with UID: $uid');

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
        'contact_person': regData['contactPerson'],
        'mobile': regData['orgMobile'],
        'email': regData['orgEmail'],
        'address': regData['address'],
        'city': regData['city'],
        'state': regData['state'],
        'pincode': regData['pincode'],
        'upi_id': regData['upiId'],
        'registration_number': regData['registrationNumber'],
        'logo_url': null,
        'is_verified': false,
        'subscription_plan': 'free',
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
      await fetchSubscriptionConfig();
      final subscriptionRef =
          FirebaseFirestore.instance.collection('subscriptions').doc(orgId);
      final defaultSub = {
        'id': orgId,
        'organizationId': orgId,
        'plan': 'free_trial',
        'receiptsUsed': 0,
        'receiptLimit': _subConfig['free_trial_receipts'] ?? 10,
        'usersUsed': 1,
        'usersLimit': 1,
        'renewalDate':
            DateTime.now().add(const Duration(days: 30)).toIso8601String(),
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };
      await subscriptionRef.set(defaultSub);
      debugPrint('[REGISTER_FLOW] Subscription document written successfully.');

      // 5. Create Member Doc in Firestore
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
      debugPrint('[REGISTER_FLOW] Member document written successfully.');

      // Sign out since we are redirecting the user to log in manually on the Login Screen
      debugPrint(
          '[REGISTER_FLOW] Signing out of Auth session to prepare for manual login redirection...');
      await FirebaseAuth.instance.signOut();

      _user = null;
      _organization = null;
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
        if (e.code == 'email-already-in-use') {
          _errorMessage = 'An account with this email already exists.';
        } else if (e.code == 'weak-password') {
          _errorMessage = 'The password is too weak. Please use a stronger password.';
        } else if (e.code == 'invalid-email') {
          _errorMessage = 'The email address is invalid.';
        } else {
          _errorMessage = e.message ?? 'Registration failed. Please try again.';
        }
      } else if (e is FirebaseException) {
        if (e.code == 'permission-denied') {
          _errorMessage = 'Unable to create account. Please try again.';
        } else {
          _errorMessage = e.message ?? 'Database setup failed. Please try again.';
        }
      } else {
        _errorMessage = 'Unable to complete registration. Please try again.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // Email and Password Login
  Future<bool> loginEmail(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final authResult = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      final uid = authResult.user!.uid;

      final userDoc =
          await FirebaseFirestore.instance.collection('users').doc(uid).get();
      if (userDoc.exists) {
        final userData = userDoc.data()!;
        _user = UserModel.fromJson(userData);
        final orgId = userData['organization_id'] ?? userData['organizationId'];
        if (orgId != null) {
          final orgDoc = await FirebaseFirestore.instance
              .collection('organizations')
              .doc(orgId)
              .get();
          if (orgDoc.exists) {
            _organization = OrganizationModel.fromJson(orgDoc.data()!);
            await fetchSubscriptionConfig();
            await loadSubscription(orgId);

            // Log login activity
            FirebaseFirestore.instance.collection('activity_logs').add({
              'organizationId': orgId,
              'userId': uid,
              'userName': _user?.name ?? 'User',
              'userRole': _user?.role ?? 'member',
              'action': 'Login',
              'details': '${_user?.name} logged in successfully',
              'timestamp': DateTime.now().toIso8601String(),
            }).catchError((_) {});
          }
        }
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'User profile not found.';
      }
    } on FirebaseAuthException catch (e) {
      if (e.code == 'invalid-credential' || e.code == 'wrong-password' || e.code == 'user-not-found' || e.code == 'invalid-email') {
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

  String? _verificationId;

  // Request Mobile OTP login
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
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: phone,
        verificationCompleted: (PhoneAuthCredential credential) async {
          try {
            final authResult = await FirebaseAuth.instance.signInWithCredential(credential);
            final uid = authResult.user!.uid;
            
            final userDoc = await FirebaseFirestore.instance.collection('users').doc(uid).get();
            if (userDoc.exists) {
              final userData = userDoc.data()!;
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
              _isLoading = false;
              notifyListeners();
              if (!completer.isCompleted) completer.complete(true);
            } else {
              _errorMessage = 'User profile not found.';
              _isLoading = false;
              notifyListeners();
              if (!completer.isCompleted) completer.complete(false);
            }
          } catch (e) {
            _errorMessage = e.toString();
            _isLoading = false;
            notifyListeners();
            if (!completer.isCompleted) completer.complete(false);
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          _errorMessage = e.message ?? 'Phone verification failed.';
          _isLoading = false;
          notifyListeners();
          if (!completer.isCompleted) completer.complete(false);
        },
        codeSent: (String verificationId, int? resendToken) {
          _verificationId = verificationId;
          _isLoading = false;
          notifyListeners();
          if (!completer.isCompleted) completer.complete(true);
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          _verificationId = verificationId;
        },
        timeout: const Duration(seconds: 60),
      );
      
      return completer.future;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Verify Mobile OTP code
  Future<bool> verifyOtp(String mobile, String otp) async {
    if (_verificationId == null) {
      _errorMessage = 'Verification session expired. Please request OTP again.';
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _verificationId!,
        smsCode: otp,
      );

      final authResult = await FirebaseAuth.instance.signInWithCredential(credential);
      final uid = authResult.user!.uid;

      final userDoc = await FirebaseFirestore.instance.collection('users').doc(uid).get();
      if (userDoc.exists) {
        final userData = userDoc.data()!;
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
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'User profile not found.';
      }
    } on FirebaseAuthException catch (e) {
      if (e.code == 'invalid-verification-code') {
        _errorMessage = 'Invalid verification code.';
      } else {
        _errorMessage = e.message ?? 'OTP verification failed.';
      }
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
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
          _user = UserModel.fromJson(userData);
          final orgId =
              userData['organization_id'] ?? userData['organizationId'];
          if (orgId != null) {
            final orgDoc = await FirebaseFirestore.instance
                .collection('organizations')
                .doc(orgId)
                .get();
            if (orgDoc.exists) {
              var orgData = orgDoc.data()!;
              orgData = await _ensureOwnerFields(orgId, currentUser.uid, userData, orgData);
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
      await FirebaseAuth.instance.signOut();
    } catch (e) {
      debugPrint('Logout failed: $e');
    }
    _user = null;
    _organization = null;
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

  // Upload profile photo
  Future<bool> uploadProfilePhoto(List<int> photoBytes) async {
    if (_user == null || _organization == null) return false;
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

      // 2. Parallel upload of all three files
      final startUpload = stopwatch.elapsedMilliseconds;
      final metadata = SettableMetadata(contentType: 'image/jpeg');

      final ref512 = FirebaseStorage.instance.ref().child('users').child(uid).child('profile_photo.jpg');
      final ref256 = FirebaseStorage.instance.ref().child('users').child(uid).child('profile_photo_256.jpg');
      final ref128 = FirebaseStorage.instance.ref().child('users').child(uid).child('profile_photo_128.jpg');

      final uploadTasks = [
        ref512.putData(bytes512, metadata).then((_) => ref512.getDownloadURL()),
        ref256.putData(bytes256, metadata).then((_) => ref256.getDownloadURL()),
        ref128.putData(bytes128, metadata).then((_) => ref128.getDownloadURL()),
      ];

      final urls = await Future.wait(uploadTasks);
      final url512 = urls[0];
      final url256 = urls[1];
      final url128 = urls[2];
      final uploadTime = stopwatch.elapsedMilliseconds - startUpload;

      // 3. Firestore update immediately after upload
      final startFirestore = stopwatch.elapsedMilliseconds;
      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .update({
        'profilePhotoUrl': url512,
        'profilePhotoUrl256': url256,
        'profilePhotoUrl128': url128,
        'profilePhotoVersion': newVersion,
      });
      final firestoreTime = stopwatch.elapsedMilliseconds - startFirestore;

      // 4. Cache compressed images locally in background
      ImageProcessingService.cachePhotoLocally(uid, newVersion, bytes512, suffix: '');
      ImageProcessingService.cachePhotoLocally(uid, newVersion, bytes256, suffix: '_256');
      ImageProcessingService.cachePhotoLocally(uid, newVersion, bytes128, suffix: '_128');

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
    if (_user == null || _organization == null) return false;
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
      });

      await ImageProcessingService.clearLocalCache(uid);

      await _logActivity('Profile Photo Deleted', 'Removed profile photo and thumbnails');
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
}
