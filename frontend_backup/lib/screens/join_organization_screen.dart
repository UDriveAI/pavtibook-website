import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/models.dart';

class JoinOrganizationScreen extends StatefulWidget {
  const JoinOrganizationScreen({super.key});

  @override
  State<JoinOrganizationScreen> createState() => _JoinOrganizationScreenState();
}

class _JoinOrganizationScreenState extends State<JoinOrganizationScreen> {
  final _verifyFormKey = GlobalKey<FormState>();
  final _registerFormKey = GlobalKey<FormState>();

  // Controllers for Verification Phase
  final _mobileController = TextEditingController();
  final _otpController = TextEditingController();

  // Controllers for Registration Phase
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isVerifying = false;
  bool _isRegistering = false;
  bool _isInviteVerified = false;

  InviteModel? _verifiedInvite;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _mobileController.dispose();
    _otpController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // Phase 1: Verify Invite mobile and OTP
  Future<void> _verifyInvite() async {
    if (!_verifyFormKey.currentState!.validate()) return;

    setState(() => _isVerifying = true);

    try {
      final mobile = _mobileController.text.trim();
      final otp = _otpController.text.trim();
      final now = DateTime.now();

      // Query database for pending invite
      final query = await FirebaseFirestore.instance
          .collection('organization_invites')
          .where('mobile', isEqualTo: mobile)
          .where('status', isEqualTo: 'pending')
          .get();

      if (query.docs.isEmpty) {
        throw Exception('No pending invitation found for this mobile number.');
      }

      // Filter non-expired invites
      final matches = query.docs.where((doc) {
        final expiresAtStr = doc.data()['expiresAt'] ?? '';
        if (expiresAtStr.isEmpty) return false;
        try {
          final exp = DateTime.parse(expiresAtStr);
          return exp.isAfter(now);
        } catch (_) {
          return false;
        }
      }).toList();

      if (matches.isEmpty) {
        throw Exception(
            'Your invitation has expired. Please request the administrator to resend it.');
      }

      final inviteDoc = matches.first;
      final inviteData = inviteDoc.data();

      if (inviteData['otp'] != otp) {
        throw Exception('Invalid OTP invitation code. Please try again.');
      }

      setState(() {
        _verifiedInvite = InviteModel.fromJson(inviteData);
        _nameController.text = _verifiedInvite!.name;
        _isInviteVerified = true;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Invitation verified for ${_verifiedInvite!.name}! Please complete registration.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll(RegExp(r'\[.*\]\s*'), '')),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isVerifying = false);
    }
  }

  // Phase 2: Register user and update organization memberships
  Future<void> _registerAndJoin() async {
    if (!_registerFormKey.currentState!.validate()) return;
    if (_verifiedInvite == null) return;

    setState(() => _isRegistering = true);

    try {
      final invite = _verifiedInvite!;
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();
      final name = _nameController.text.trim();

      // 1. Create the user in Firebase Auth
      final authResult =
          await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      final uid = authResult.user!.uid;

      // 2. Perform membership replacements and Firestore updates inside a batch
      final batch = FirebaseFirestore.instance.batch();

      // Look up if we need to replace an existing bearer (President or Treasurer)
      bool isReplacement = false;
      if (invite.role == 'president' || invite.role == 'treasurer') {
        final existingMembersQuery = await FirebaseFirestore.instance
            .collection('organization_members')
            .where('organizationId', isEqualTo: invite.organizationId)
            .where('role', isEqualTo: invite.role)
            .get();

        if (existingMembersQuery.docs.isNotEmpty) {
          isReplacement = true;
          for (var doc in existingMembersQuery.docs) {
            final oldUserId = doc.data()['userId'] ?? '';
            // Delete old member doc
            batch.delete(doc.reference);
            // Deactivate old user profile doc
            if (oldUserId.isNotEmpty) {
              final oldUserRef =
                  FirebaseFirestore.instance.collection('users').doc(oldUserId);
              batch.update(oldUserRef, {
                'is_active': false,
                'isActive': false,
                'organization_id': null,
                'organizationId': null,
              });
            }
          }
        }
      }

      // Create new user profile document
      final userRef = FirebaseFirestore.instance.collection('users').doc(uid);
      batch.set(userRef, {
        'id': uid,
        'organization_id': invite.organizationId,
        'organizationId': invite.organizationId,
        'name': name,
        'email': email,
        'mobile': invite.mobile,
        'role': invite.role,
        'is_active': true,
        'isActive': true,
        'createdAt': FieldValue.serverTimestamp(),
      });

      // Create new organization member document
      final memberRef = FirebaseFirestore.instance
          .collection('organization_members')
          .doc(uid);
      batch.set(memberRef, {
        'id': uid,
        'userId': uid,
        'organizationId': invite.organizationId,
        'name': name,
        'mobile': invite.mobile,
        'role': invite.role,
        'joinedAt': DateTime.now().toIso8601String(),
      });

      // Mark invite as used
      final inviteRef = FirebaseFirestore.instance
          .collection('organization_invites')
          .doc(invite.id);
      batch.update(inviteRef, {
        'status': 'accepted',
        'used': true,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      // Update subscription member count
      if (!isReplacement) {
        final subRef = FirebaseFirestore.instance
            .collection('subscriptions')
            .doc(invite.organizationId);
        batch.update(subRef, {
          'usersUsed': FieldValue.increment(1),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      // Log join activity in activity logs
      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': invite.organizationId,
        'userId': uid,
        'userName': name,
        'userRole': invite.role,
        'action': 'Invite Accepted',
        'details': 'Accepted invitation for mobile ${invite.mobile}',
        'timestamp': DateTime.now().toIso8601String(),
      });

      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': invite.organizationId,
        'userId': uid,
        'userName': name,
        'userRole': invite.role,
        'action': 'Member Added',
        'details': isReplacement
            ? '$name joined and replaced previous ${invite.role.toUpperCase()}'
            : '$name joined organization as ${invite.role.toUpperCase()}',
        'timestamp': DateTime.now().toIso8601String(),
      });

      // Sign out of auth session to let them log in manually
      await FirebaseAuth.instance.signOut();

      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green),
                SizedBox(width: 8),
                Text('Welcome to Team!'),
              ],
            ),
            content: const Text(
              'Your registration is complete. You have successfully joined the organization. Please log in using your email and password.',
            ),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushReplacementNamed(context, '/login');
                },
                style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D)),
                child: const Text('Go to Login'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      // Clean up newly created Firebase Auth account if registration transactions failed
      try {
        final currentUser = FirebaseAuth.instance.currentUser;
        if (currentUser != null) {
          await currentUser.delete();
        }
      } catch (_) {}

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll(RegExp(r'\[.*\]\s*'), '')),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isRegistering = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Join Organization'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 450),
            child: Card(
              color: Colors.white,
              elevation: 2,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: !_isInviteVerified
                    ? _buildVerificationForm()
                    : _buildRegistrationForm(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Widget for Verification form
  Widget _buildVerificationForm() {
    return Form(
      key: _verifyFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Image.asset(
              'assets/images/Pavati-Book-Logo.png',
              height: 52,
              fit: BoxFit.contain,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Enter Invite Code',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF2E1C0C)),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'Verify your mobile number and enter the OTP invite code shared by your organization Owner.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _mobileController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Invited Mobile Number',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.phone_outlined),
              hintText: '10 digit number',
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty)
                return 'Enter mobile number';
              if (val.trim().length != 10) return 'Enter valid 10-digit mobile';
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: '4-Digit OTP Invite Code',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.lock_outline),
              hintText: 'Enter OTP',
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty) return 'Enter invite OTP';
              if (val.trim().length != 4) return 'Enter 4-digit code';
              return null;
            },
          ),
          const SizedBox(height: 24),
          _isVerifying
              ? const Center(child: CircularProgressIndicator())
              : ElevatedButton(
                  onPressed: _verifyInvite,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Verify Invitation'),
                ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () {
              Navigator.pushReplacementNamed(context, '/login');
            },
            child: const Text('Back to Login'),
          ),
        ],
      ),
    );
  }

  // Widget for Registration form
  Widget _buildRegistrationForm() {
    if (_verifiedInvite == null) return const SizedBox.shrink();

    final roleName = _verifiedInvite!.role == 'president'
        ? 'President (Adhyaksha)'
        : _verifiedInvite!.role == 'treasurer'
            ? 'Treasurer (Koshadhyaksha)'
            : 'Member (Sadasya)';

    return Form(
      key: _registerFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Complete Registration',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF2E1C0C)),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'Role Assigned: $roleName',
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Color(0xFFF47C20)),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          TextFormField(
            initialValue: _verifiedInvite!.mobile,
            readOnly: true,
            enabled: false,
            decoration: const InputDecoration(
              labelText: 'Mobile Number (Verified)',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.phone_locked),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Full Name',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.person_outline),
            ),
            validator: (val) =>
                val == null || val.trim().isEmpty ? 'Enter full name' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Login Email Address',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.email_outlined),
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty) return 'Enter email';
              if (!val.contains('@') || !val.contains('.'))
                return 'Enter valid email';
              return null;
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              labelText: 'Password',
              border: const OutlineInputBorder(),
              prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(
                icon: Icon(
                    _obscurePassword ? Icons.visibility : Icons.visibility_off),
                onPressed: () {
                  setState(() => _obscurePassword = !_obscurePassword);
                },
              ),
            ),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Enter password';
              if (val.length < 6)
                return 'Password must be at least 6 characters';
              return null;
            },
          ),
          const SizedBox(height: 24),
          _isRegistering
              ? const Center(child: CircularProgressIndicator())
              : ElevatedButton(
                  onPressed: _registerAndJoin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Register & Join'),
                ),
        ],
      ),
    );
  }
}
