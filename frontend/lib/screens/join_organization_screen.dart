import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';

class JoinOrganizationScreen extends StatefulWidget {
  const JoinOrganizationScreen({super.key});

  @override
  State<JoinOrganizationScreen> createState() => _JoinOrganizationScreenState();
}

class _JoinOrganizationScreenState extends State<JoinOrganizationScreen> {
  final _verifyFormKey = GlobalKey<FormState>();
  final _activateFormKey = GlobalKey<FormState>();

  // Controllers for Verification Phase
  final _mobileController = TextEditingController();
  final _activationCodeController = TextEditingController(); // 6-digit activation code or token

  // Controllers for Activation Phase
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isVerifying = false;
  bool _isActivating = false;
  bool _isInviteVerified = false;
  bool _obscurePassword = true;

  InviteModel? _verifiedInvite;
  DocumentSnapshot? _verifiedInviteDoc;

  @override
  void dispose() {
    _mobileController.dispose();
    _activationCodeController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // Phase 1: Validate Invitation Code & Mobile
  Future<void> _verifyInvitation() async {
    if (!_verifyFormKey.currentState!.validate()) return;

    setState(() => _isVerifying = true);

    final mobileInput = _mobileController.text.trim();
    final codeInput = _activationCodeController.text.trim().toUpperCase();

    final cleanMobile = mobileInput.replaceAll(RegExp(r'\D'), '');
    final tenDigit = cleanMobile.length >= 10 ? cleanMobile.substring(cleanMobile.length - 10) : cleanMobile;
    final formattedWithPlus = '+91$tenDigit';

    debugPrint('==================================================');
    debugPrint('[ACTIVATION_DEBUG] Operation: QUERY');
    debugPrint('[ACTIVATION_DEBUG] Collection: organization_invites');
    debugPrint('[ACTIVATION_DEBUG] Params: mobile in [$tenDigit, $formattedWithPlus, $mobileInput], status == pending');
    debugPrint('[ACTIVATION_DEBUG] CodeInput: $codeInput');
    debugPrint('==================================================');

    try {
      // 1. Query pending invitations by mobile number and status = 'pending'
      final querySnap = await FirebaseFirestore.instance
          .collection('organization_invites')
          .where('status', isEqualTo: 'pending')
          .where('mobile', whereIn: [tenDigit, formattedWithPlus, mobileInput])
          .get();

      List<DocumentSnapshot> candidateDocs = querySnap.docs;

      if (candidateDocs.isEmpty) {
        debugPrint('[ACTIVATION_DEBUG] Mobile query returned 0 docs. Trying activationCode query with status == pending...');
        // 2. Fallback query by activationCode and status = 'pending'
        final tokenQuery = await FirebaseFirestore.instance
            .collection('organization_invites')
            .where('status', isEqualTo: 'pending')
            .where('activationCode', isEqualTo: codeInput)
            .get();

        candidateDocs = tokenQuery.docs;
      }

      if (candidateDocs.isEmpty) {
        throw Exception('No pending invitation found for the provided details. Please check the code or contact your administrator.');
      }

      // Filter matching invite by activationCode, activationToken or legacy OTP
      final matchingDocs = candidateDocs.where((doc) {
        final data = doc.data() as Map<String, dynamic>;
        final code = (data['activationCode'] ?? data['activationToken'] ?? data['otp'] ?? '').toString().toUpperCase();
        return code == codeInput;
      }).toList();

      if (matchingDocs.isEmpty) {
        throw Exception('Invalid 6-character Activation Code. Please check the invitation details.');
      }

      await _processInviteDoc(matchingDocs.first, codeInput);
    } catch (e) {
      debugPrint('[ACTIVATION_ERROR] Exception in _verifyInvitation: $e');
      _showValidationError(e.toString());
    }
  }

  Future<void> _processInviteDoc(DocumentSnapshot inviteDoc, String codeInput) async {
    final inviteData = inviteDoc.data() as Map<String, dynamic>;
    final now = DateTime.now();

    // 1. Check Status & One-Time Use
    final status = (inviteData['status'] ?? 'pending').toString().toLowerCase();
    final isUsed = inviteData['used'] == true || inviteData['usedAt'] != null;

    if (status == 'accepted' || status == 'activated' || isUsed) {
      throw Exception('Invitation already used');
    } else if (status == 'cancelled' || status == 'revoked') {
      throw Exception('This invitation has been cancelled. Please request a new invite from your administrator.');
    } else if (status != 'pending') {
      throw Exception('Invitation is no longer active. Please ask your administrator for a new invite.');
    }

    // 2. Check Expiration
    final expiresAtStr = inviteData['expiresAt'] ?? '';
    if (expiresAtStr.isNotEmpty) {
      try {
        final exp = DateTime.parse(expiresAtStr);
        if (now.isAfter(exp)) {
          try {
            await inviteDoc.reference.update({'status': 'expired'});
          } catch (_) {}
          throw Exception('Invitation has expired. Please ask the organization owner to generate a new invitation.');
        }
      } catch (e) {
        if (e.toString().contains('expired')) rethrow;
      }
    }

    final inviteModel = InviteModel.fromJson(inviteData);

    setState(() {
      _verifiedInvite = inviteModel;
      _verifiedInviteDoc = inviteDoc;
      _nameController.text = inviteModel.name;
      _emailController.text = inviteData['email'] ?? '';
      _isInviteVerified = true;
      _isVerifying = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Invitation verified for ${inviteModel.name}! Please set up your password to activate your account.'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _showValidationError(String message) {
    setState(() => _isVerifying = false);

    debugPrint('[ACTIVATION_STEP1_ERROR] $message');

    String clean = message
        .replaceAll(RegExp(r'\[.*\]\s*'), '')
        .replaceAll(RegExp(r'Exception:\s*'), '')
        .trim();

    if (clean.contains('permission-denied') ||
        clean.contains('permission') ||
        clean.contains('caller does not have permission')) {
      clean = 'Unable to validate invitation. Please try again.';
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(clean),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showActivationError(dynamic exception) {
    setState(() => _isActivating = false);

    debugPrint('==================================================');
    debugPrint('[ACTIVATION_STEP2_ERROR] Exception: $exception');
    if (exception is FirebaseAuthException) {
      debugPrint('[ACTIVATION_STEP2_ERROR] Code: ${exception.code}, Message: ${exception.message}');
    } else if (exception is FirebaseException) {
      debugPrint('[ACTIVATION_STEP2_ERROR] Code: ${exception.code}, Message: ${exception.message}, Plugin: ${exception.plugin}');
    }
    debugPrint('==================================================');

    String userMessage = 'Unable to create account. Please try again.';

    if (exception is FirebaseAuthException) {
      switch (exception.code) {
        case 'email-already-in-use':
          userMessage = 'An account with this email already exists. Please enter your existing password to join this organization.';
          break;
        case 'wrong-password':
        case 'invalid-credential':
          userMessage = 'Incorrect password for existing account. Please enter your valid account password to join.';
          break;
        case 'weak-password':
          userMessage = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'invalid-email':
          userMessage = 'Invalid email address.';
          break;
        default:
          userMessage = exception.message ?? 'Authentication error. Please try again.';
      }
    } else if (exception is FirebaseException) {
      if (exception.code == 'permission-denied') {
        userMessage = 'Permission denied while creating member account. Please contact support.';
      } else {
        userMessage = exception.message ?? 'Database error. Please try again.';
      }
    } else if (exception != null) {
      final msg = exception.toString().replaceAll(RegExp(r'Exception:\s*'), '');
      if (msg.contains('expired')) {
        userMessage = 'Invitation has expired. Please ask the organization owner to generate a new invitation.';
      } else if (msg.contains('used')) {
        userMessage = 'Invitation already used.';
      } else {
        userMessage = msg;
      }
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(userMessage),
        backgroundColor: Colors.red,
      ),
    );
  }

  // Phase 2: Create Account / Link Account and Activate Member
  Future<void> _activateMemberAccount() async {
    if (!_activateFormKey.currentState!.validate()) return;
    if (_verifiedInvite == null || _verifiedInviteDoc == null) {
      _showActivationError('No verified invitation found in session.');
      return;
    }

    setState(() => _isActivating = true);

    final invite = _verifiedInvite!;
    final email = _emailController.text.trim();
    final name = _nameController.text.trim();
    final password = _passwordController.text.trim();

    debugPrint('==================================================');
    debugPrint('[ACTIVATION_FLOW] STEP 2 START');
    debugPrint('[ACTIVATION_FLOW] Verified Invite ID: ${invite.id}');
    debugPrint('[ACTIVATION_FLOW] Target OrgId: ${invite.organizationId}');
    debugPrint('[ACTIVATION_FLOW] Target Email: $email');
    debugPrint('[ACTIVATION_FLOW] Target Name: $name');
    debugPrint('==================================================');

    String uid;

    // 2A: Create or Authenticate Firebase Auth Account
    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser != null && currentUser.email == email) {
        uid = currentUser.uid;
        debugPrint('[ACTIVATION_FLOW] Step 2A: Reusing existing signed-in Auth User: $uid -> PASS');
      } else {
        try {
          final authResult = await FirebaseAuth.instance.createUserWithEmailAndPassword(
            email: email,
            password: password,
          );
          uid = authResult.user!.uid;
          debugPrint('[ACTIVATION_FLOW] Step 2A: Created new Firebase Auth User: $uid -> PASS');
        } on FirebaseAuthException catch (fae) {
          if (fae.code == 'email-already-in-use') {
            debugPrint('[ACTIVATION_FLOW] Step 2A: Email in use, attempting signInWithEmailAndPassword for multi-org account linking...');
            try {
              final authResult = await FirebaseAuth.instance.signInWithEmailAndPassword(
                email: email,
                password: password,
              );
              uid = authResult.user!.uid;
              debugPrint('[ACTIVATION_FLOW] Step 2A: Authenticated existing user: $uid for multi-org linking -> PASS');
            } on FirebaseAuthException catch (signInError) {
              if (signInError.code == 'wrong-password' || signInError.code == 'invalid-credential') {
                throw Exception('An account with this email already exists. Please enter your existing password to join this organization.');
              }
              rethrow;
            }
          } else {
            debugPrint('[ACTIVATION_FLOW] Step 2A FAIL: FirebaseAuthException ${fae.code}');
            _showActivationError(fae);
            return;
          }
        }
      }
    } catch (authError) {
      debugPrint('[ACTIVATION_FLOW] Step 2A FAIL: $authError');
      _showActivationError(authError);
      return;
    }

    // 2B: Check if user is ALREADY an active member of this organization
    try {
      final membershipId = '${uid}_${invite.organizationId}';
      final existingMemberDoc = await FirebaseFirestore.instance
          .collection('organization_members')
          .doc(membershipId)
          .get();

      if (existingMemberDoc.exists && existingMemberDoc.data()?['status'] == 'active') {
        throw Exception('You are already an active member of this organization. Please log in directly.');
      }
    } catch (checkError) {
      if (checkError.toString().contains('already an active member')) {
        _showActivationError(checkError);
        return;
      }
      // Non-blocking if doc doesn't exist
    }

    // 2B: Prepare Batch Write
    try {
      final batch = FirebaseFirestore.instance.batch();

      // Item 1: User Profile
      final userRef = FirebaseFirestore.instance.collection('users').doc(uid);
      debugPrint('[ACTIVATION_FLOW] Step 2B: Staging User Profile write: users/$uid');
      batch.set(userRef, {
        'id': uid,
        'email': email,
        'mobile': invite.mobile,
        'name': name,
        'lastSelectedOrgId': invite.organizationId,
        'is_active': true,
        'isActive': true,
        'updatedAt': DateTime.now().toIso8601String(),
        'createdAt': DateTime.now().toIso8601String(),
      }, SetOptions(merge: true));

      // Item 2: Organization Member Document
      final membershipId = '${uid}_${invite.organizationId}';
      final memberRef = FirebaseFirestore.instance.collection('organization_members').doc(membershipId);
      debugPrint('[ACTIVATION_FLOW] Step 2C: Staging Org Member write: organization_members/$membershipId');
      batch.set(memberRef, {
        'id': membershipId,
        'userId': uid,
        'organizationId': invite.organizationId,
        'name': name,
        'email': email,
        'mobile': invite.mobile,
        'role': invite.role,
        'status': 'active',
        'joinedAt': DateTime.now().toIso8601String(),
      });

      // Item 3: Update Invitation Status to Accepted
      debugPrint('[ACTIVATION_FLOW] Step 2D: Staging Invite update: organization_invites/${_verifiedInviteDoc!.id}');
      batch.update(_verifiedInviteDoc!.reference, {
        'status': 'accepted',
        'used': true,
        'usedAt': FieldValue.serverTimestamp(),
        'activatedAt': DateTime.now().toIso8601String(),
        'activatedByUid': uid,
      });

      // Item 4: Add Audit Log
      final logRef = FirebaseFirestore.instance.collection('activity_logs').doc();
      debugPrint('[ACTIVATION_FLOW] Step 2E: Staging Activity Log write: activity_logs/${logRef.id}');
      batch.set(logRef, {
        'id': logRef.id,
        'organizationId': invite.organizationId,
        'userId': uid,
        'userName': name,
        'userRole': invite.role,
        'action': 'Member Activated',
        'details': 'Member $name ($email) activated account as ${invite.role.toUpperCase()}',
        'timestamp': DateTime.now().toIso8601String(),
      });

      // 2F: Commit Batch Write
      debugPrint('[ACTIVATION_FLOW] Step 2F: Committing Batch Write...');
      await batch.commit();
      debugPrint('[ACTIVATION_FLOW] Step 2F: Batch Commit -> PASS');

      // 2G: Update AuthProvider state for smooth navigation
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (invite.organizationId.isNotEmpty) {
        await auth.switchOrganization(invite.organizationId);
      }

      setState(() => _isActivating = false);

      if (mounted) {
        debugPrint('[ACTIVATION_FLOW] Step 2G: Navigation to /dashboard -> PASS');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Account activated successfully! Welcome to PavtiBook.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pushNamedAndRemoveUntil(context, '/dashboard', (route) => false);
      }
    } catch (e) {
      debugPrint('[ACTIVATION_FLOW] Step 2 FAIL: Exception during batch commit / activation: $e');
      _showActivationError(e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final borderStyle = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Color(0xFFD4B282), width: 1.0),
    );

    final focusedBorderStyle = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Color(0xFF8B1E2D), width: 1.5),
    );

    return Scaffold(
      backgroundColor: const Color(0xFFFFF6E8), // Cream Background
      appBar: AppBar(
        title: const Text('Activate Account & Join'),
        backgroundColor: const Color(0xFF8B1E2D),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Card(
            color: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 3,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: !_isInviteVerified ? _buildVerifyStep(borderStyle, focusedBorderStyle) : _buildActivateStep(borderStyle, focusedBorderStyle),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVerifyStep(OutlineInputBorder borderStyle, OutlineInputBorder focusedBorderStyle) {
    return Form(
      key: _verifyFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Step 1: Enter Invitation Details',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF8B1E2D)),
          ),
          const SizedBox(height: 4),
          const Text(
            'Enter your registered Mobile Number and the 6-character Activation Code received from your organization.',
            style: TextStyle(fontSize: 12, color: Colors.blueGrey),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _mobileController,
            enabled: !_isVerifying,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              labelText: 'Mobile Number *',
              hintText: '10 digit mobile number',
              prefixIcon: const Icon(Icons.phone_outlined, color: Color(0xFF8B1E2D)),
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().length < 10 ? 'Enter a valid 10-digit mobile number' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _activationCodeController,
            enabled: !_isVerifying,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              labelText: '6-character Activation Code *',
              hintText: 'e.g. A7B9K2',
              prefixIcon: const Icon(Icons.key_outlined, color: Color(0xFF8B1E2D)),
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().length != 6 ? 'Enter valid 6-character activation code' : null,
          ),
          const SizedBox(height: 24),
          _isVerifying
              ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF8B1E2D))))
              : ElevatedButton(
                  onPressed: _verifyInvitation,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Validate Invitation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
        ],
      ),
    );
  }

  Widget _buildActivateStep(OutlineInputBorder borderStyle, OutlineInputBorder focusedBorderStyle) {
    return Form(
      key: _activateFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Step 2: Activate Your Account',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF8B1E2D)),
          ),
          const SizedBox(height: 4),
          Text(
            'Joining ${_verifiedInvite?.organizationName ?? 'Organization'} as ${_verifiedInvite?.role.toUpperCase() ?? 'MEMBER'}',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.blueGrey),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _nameController,
            enabled: !_isActivating,
            decoration: InputDecoration(
              labelText: 'Full Name *',
              prefixIcon: const Icon(Icons.person_outline, color: Color(0xFF8B1E2D)),
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().isEmpty ? 'Enter your full name' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _emailController,
            enabled: !_isActivating,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: 'Email Address *',
              hintText: 'member@example.com',
              prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF8B1E2D)),
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || !val.contains('@') ? 'Enter a valid email address' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            enabled: !_isActivating,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              labelText: 'Set Account Password *',
              prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF8B1E2D)),
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: Colors.grey[600]),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.length < 6 ? 'Password must be at least 6 characters' : null,
          ),
          const SizedBox(height: 24),
          _isActivating
              ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF8B1E2D))))
              : ElevatedButton(
                  onPressed: _activateMemberAccount,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Activate Account & Log In', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
        ],
      ),
    );
  }
}
