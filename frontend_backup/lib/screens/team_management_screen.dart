import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../widgets/profile_photo_widget.dart';

class TeamManagementScreen extends StatefulWidget {
  const TeamManagementScreen({super.key});

  @override
  State<TeamManagementScreen> createState() => _TeamManagementScreenState();
}

class _TeamManagementScreenState extends State<TeamManagementScreen> {
  bool _isLoading = true;
  String? _error;
  List<QueryDocumentSnapshot<Map<String, dynamic>>> _members = [];
  List<QueryDocumentSnapshot<Map<String, dynamic>>> _invites = [];

  String _searchQuery = '';
  String _sortBy = 'newest';
  final _searchController = TextEditingController();
  final _nameFocusNode = FocusNode();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadTeamData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _nameFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  String _logAndFormatError({
    required String operation,
    required String collection,
    String? docId,
    String? query,
    required dynamic exception,
    required StackTrace stackTrace,
  }) {
    final currentUser =
        FirebaseAuth.instance.currentUser?.uid ?? 'not_authenticated';
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id ?? 'no_organization';

    String permission = 'Checking authentication & organization...';
    if (currentUser == 'not_authenticated') {
      permission = 'NOT authenticated (Anonymous).';
    } else if (orgId == 'no_organization') {
      permission = 'Authenticated, but NO organizationId linked.';
    } else {
      permission =
          'Authenticated user $currentUser belonging to organization $orgId.';
    }

    debugPrint('==================================================');
    debugPrint('[FIRESTORE_DEBUG] OPERATION: $operation');
    debugPrint('[FIRESTORE_DEBUG] Collection: $collection');
    if (docId != null) debugPrint('[FIRESTORE_DEBUG] Document ID: $docId');
    if (query != null) debugPrint('[FIRESTORE_DEBUG] Query: $query');
    debugPrint('[FIRESTORE_DEBUG] Current User: $currentUser');
    debugPrint('[FIRESTORE_DEBUG] OrganizationId: $orgId');
    debugPrint('[FIRESTORE_DEBUG] Permission Context: $permission');
    debugPrint('[FIRESTORE_DEBUG] Exception: $exception');
    debugPrint('[FIRESTORE_DEBUG] Stack Trace:\n$stackTrace');
    debugPrint('==================================================');

    final errStr = exception.toString().toLowerCase();
    if (errStr.contains('permission-denied') ||
        errStr.contains('permission_denied')) {
      return 'Firestore permission denied. Check security rules.';
    } else if (errStr.contains('unavailable') ||
        errStr.contains('network') ||
        errStr.contains('deadline-exceeded')) {
      return 'Network unavailable. Please check your internet connection.';
    } else if (errStr.contains('timeout')) {
      return 'Request timed out (Network unavailable).';
    } else if (orgId == 'no_organization') {
      return 'Organization not found.';
    } else if (errStr.contains('not-found') || errStr.contains('missing')) {
      return 'Document or configuration missing.';
    }
    return exception.toString().replaceAll(RegExp(r'\[.*\]\s*'), '');
  }

  Future<void> _autoInitializeOwnerRecord(String orgId) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    try {
      final memberRef = FirebaseFirestore.instance
          .collection('organization_members')
          .doc(uid);
      final memberDoc = await memberRef.get();
      if (!memberDoc.exists) {
        debugPrint(
            '[AUTO_INIT] Member record missing for $uid. Auto-creating Owner record.');
        final userDoc =
            await FirebaseFirestore.instance.collection('users').doc(uid).get();
        final userData = userDoc.data();
        if (userData != null) {
          final role = userData['role'] ?? 'owner';
          await memberRef.set({
            'id': uid,
            'userId': uid,
            'organizationId': orgId,
            'name': userData['name'] ?? 'Owner',
            'mobile': userData['mobile'] ?? '',
            'role': (role == 'admin' || role == 'org_admin') ? 'owner' : role,
            'joinedAt': DateTime.now().toIso8601String(),
          });
          debugPrint(
              '[AUTO_INIT] Successfully created missing owner record in organization_members.');
        } else {
          await memberRef.set({
            'id': uid,
            'userId': uid,
            'organizationId': orgId,
            'name': 'Owner',
            'mobile': '',
            'role': 'owner',
            'joinedAt': DateTime.now().toIso8601String(),
          });
          debugPrint(
              '[AUTO_INIT] Successfully created missing owner record in organization_members (Fallback).');
        }
      }
    } catch (e, stack) {
      debugPrint('[AUTO_INIT] Error during owner auto-initialization: $e');
      debugPrint('$stack');
    }
  }

  // Load team members and invites from Firestore with a 10s timeout
  Future<void> _loadTeamData() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = "Unable to load data. No organization found.";
        });
      }
      return;
    }

    try {
      // Auto-initialize owner record if missing
      await _autoInitializeOwnerRecord(orgId);

      final results = await Future.wait([
        FirebaseFirestore.instance
            .collection('organization_members')
            .where('organizationId', isEqualTo: orgId)
            .get(),
        FirebaseFirestore.instance
            .collection('organization_invites')
            .where('organizationId', isEqualTo: orgId)
            .where('status', isEqualTo: 'pending')
            .get(),
      ]).timeout(const Duration(seconds: 10));

      if (mounted) {
        setState(() {
          _members = results[0].docs;
          _invites = results[1].docs;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e, stack) {
      final formatted = _logAndFormatError(
        operation: 'Load Team Data',
        collection: 'organization_members / organization_invites',
        query: 'where(organizationId == $orgId)',
        exception: e,
        stackTrace: stack,
      );
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = "Unable to load data: $formatted";
        });
      }
    }
  }

  // Generate 4-digit OTP code
  String _generateOtp() {
    final rand = Random();
    return (1000 + rand.nextInt(9000)).toString();
  }

  // Modal invite dialog
  void _showInviteDialog({String? preselectedRole}) {
    final inviteFormKey = GlobalKey<FormState>();
    final inviteNameController = TextEditingController();
    final inviteMobileController = TextEditingController();
    String inviteRole = preselectedRole ?? 'member';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Invite New Member',
                  style: TextStyle(
                      color: Color(0xFF8B1E2D), fontWeight: FontWeight.bold)),
              content: SingleChildScrollView(
                child: Form(
                  key: inviteFormKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: inviteNameController,
                        decoration: const InputDecoration(
                          labelText: 'Full Name',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: (val) => val == null || val.trim().isEmpty
                            ? 'Enter full name'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: inviteMobileController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Mobile Number',
                          prefixIcon: Icon(Icons.phone_outlined),
                          hintText: '10 digit number',
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty)
                            return 'Enter mobile number';
                          if (val.trim().length != 10)
                            return 'Enter valid 10-digit mobile';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: inviteRole,
                        decoration: const InputDecoration(
                          labelText: 'Select Role',
                          prefixIcon: Icon(Icons.security),
                        ),
                        items: const [
                          DropdownMenuItem(
                              value: 'president',
                              child: Text('President (Adhyaksha)')),
                          DropdownMenuItem(
                              value: 'treasurer',
                              child: Text('Treasurer (Koshadhyaksha)')),
                          DropdownMenuItem(
                              value: 'member',
                              child: Text('Member (Sadasya / Collector)')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setDialogState(() => inviteRole = val);
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (!inviteFormKey.currentState!.validate()) return;

                    // Capture messenger before any await — safe across async gaps.
                    final messenger = ScaffoldMessenger.of(context);
                    final auth =
                        Provider.of<AuthProvider>(context, listen: false);
                    final orgId = auth.organization?.id;
                    if (orgId == null) return;

                    final config = auth.subConfig;
                    final maxInvites = config['max_pending_invites'] ?? 5;
                    final usersLimit = auth.subscription?.usersLimit ?? 1;
                    final usersUsed = auth.subscription?.usersUsed ?? 1;

                    // 1. Seat Check
                    if (usersUsed >= usersLimit) {
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text(
                              'Maximum seats reached. Please upgrade your subscription plan.'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      Navigator.pop(ctx);
                      return;
                    }

                    // 2. Pending Invite Check
                    final now = DateTime.now();
                    final expiryDays = config['invite_expiry_days'] ?? 7;
                    final expiresAt =
                        now.add(Duration(days: expiryDays)).toIso8601String();

                    final activeInvites = _invites.where((doc) {
                      final expStr = doc.data()['expiresAt'] ?? '';
                      if (expStr.isEmpty) return false;
                      try {
                        final exp = DateTime.parse(expStr);
                        return exp.isAfter(now);
                      } catch (_) {
                        return false;
                      }
                    }).toList();

                    if (activeInvites.length >= maxInvites) {
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(
                              'Limit of $maxInvites active pending invites reached. Cancel or wait for existing invites to expire.'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      Navigator.pop(ctx);
                      return;
                    }

                    // 3. Duplicate mobile members check
                    final isMemberDup = _members.any((doc) =>
                        doc.data()['mobile'] ==
                        inviteMobileController.text.trim());
                    if (isMemberDup) {
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text(
                              'This mobile number is already a team member.'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }

                    // 4. Duplicate mobile invites check
                    final isInviteDup = activeInvites.any((doc) =>
                        doc.data()['mobile'] ==
                        inviteMobileController.text.trim());
                    if (isInviteDup) {
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text(
                              'An active invitation is already pending for this mobile number.'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }

                    final otp = _generateOtp();

                    try {
                      final inviteRef = FirebaseFirestore.instance
                          .collection('organization_invites')
                          .doc();
                      await inviteRef.set({
                        'id': inviteRef.id,
                        'organizationId': orgId,
                        'name': inviteNameController.text.trim(),
                        'mobile': inviteMobileController.text.trim(),
                        'role': inviteRole,
                        'otp': otp,
                        'status': 'pending',
                        'expiresAt': expiresAt,
                        'isOneTime': true,
                        'used': false,
                        'createdAt': FieldValue.serverTimestamp(),
                      });

                      // Log activity
                      await FirebaseFirestore.instance
                          .collection('activity_logs')
                          .add({
                        'organizationId': orgId,
                        'userId': auth.user?.id ?? '',
                        'userName': auth.user?.name ?? 'Owner',
                        'userRole': auth.user?.role ?? 'owner',
                        'action': 'Invite Sent',
                        'details':
                            'Invited ${inviteNameController.text.trim()} as ${inviteRole.toUpperCase()}',
                        'timestamp': DateTime.now().toIso8601String(),
                      });

                      Navigator.pop(ctx);
                      await _loadTeamData();

                      // messenger is pre-captured — safe to use after awaits.
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(
                              'Invitation Sent Successfully. OTP code: $otp'),
                          backgroundColor: Colors.green,
                          duration: const Duration(seconds: 8),
                          action: SnackBarAction(
                            label: 'COPY OTP',
                            textColor: Colors.white,
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: otp));
                            },
                          ),
                        ),
                      );
                    } catch (e, stack) {
                      final formatted = _logAndFormatError(
                        operation: 'Invite Member',
                        collection: 'organization_invites',
                        exception: e,
                        stackTrace: stack,
                      );
                      messenger.showSnackBar(
                        SnackBar(
                            content: Text('Failed to invite: $formatted'),
                            backgroundColor: Colors.red),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                  ),
                  child: const Text('Send Invitation'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // Resend / Refresh Invitation
  Future<void> _resendInvitation(
      String inviteId, String name, String mobile, String role) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    final config = auth.subConfig;
    final expiryDays = config['invite_expiry_days'] ?? 7;
    final expiresAt =
        DateTime.now().add(Duration(days: expiryDays)).toIso8601String();
    final otp = _generateOtp();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Resend Invitation'),
        content: Text(
            'Are you sure you want to refresh the invitation for $name and generate a new OTP?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B1E2D)),
            child: const Text('Resend'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await FirebaseFirestore.instance
          .collection('organization_invites')
          .doc(inviteId)
          .update({
        'otp': otp,
        'expiresAt': expiresAt,
        'status': 'pending',
        'used': false,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      // Log activity
      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': orgId,
        'userId': auth.user?.id ?? '',
        'userName': auth.user?.name ?? 'Owner',
        'userRole': auth.user?.role ?? 'owner',
        'action': 'Invite Sent',
        'details': 'Resent invitation to $name ($role)',
        'timestamp': DateTime.now().toIso8601String(),
      });

      await _loadTeamData();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Invitation refreshed! New OTP is $otp.'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 8),
            action: SnackBarAction(
              label: 'COPY OTP',
              textColor: Colors.white,
              onPressed: () {
                Clipboard.setData(ClipboardData(text: otp));
              },
            ),
          ),
        );
      }
    } catch (e, stack) {
      final formatted = _logAndFormatError(
        operation: 'Resend Invitation',
        collection: 'organization_invites',
        docId: inviteId,
        exception: e,
        stackTrace: stack,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed to resend: $formatted'),
              backgroundColor: Colors.red),
        );
      }
    }
  }

  // Cancel Invitation
  Future<void> _cancelInvitation(String inviteId, String name) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Invitation'),
        content:
            Text('Are you sure you want to cancel the invitation for $name?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('No')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B1E2D)),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await FirebaseFirestore.instance
          .collection('organization_invites')
          .doc(inviteId)
          .delete();

      // Log activity
      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': orgId,
        'userId': auth.user?.id ?? '',
        'userName': auth.user?.name ?? 'Owner',
        'userRole': auth.user?.role ?? 'owner',
        'action': 'Member Removed',
        'details': 'Cancelled invitation for $name',
        'timestamp': DateTime.now().toIso8601String(),
      });

      await _loadTeamData();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invitation cancelled successfully.'),
            backgroundColor: Colors.blueGrey,
          ),
        );
      }
    } catch (e, stack) {
      final formatted = _logAndFormatError(
        operation: 'Cancel Invitation',
        collection: 'organization_invites',
        docId: inviteId,
        exception: e,
        stackTrace: stack,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed to cancel: $formatted'),
              backgroundColor: Colors.red),
        );
      }
    }
  }

  // Remove Member
  Future<void> _removeMember(
      String memberId, String name, String targetUserId) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    if (targetUserId == auth.user?.id) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You cannot remove yourself from the organization.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Member'),
        content: Text(
            'Are you sure you want to remove $name from the organization? This will deactivate their profile access.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B1E2D)),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);

    try {
      await _removeMemberSilent(orgId, memberId, name, targetUserId);
      await _loadTeamData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Member removed and deactivated.'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e, stack) {
      final formatted = _logAndFormatError(
        operation: 'Remove Member',
        collection: 'organization_members / users',
        docId: memberId,
        exception: e,
        stackTrace: stack,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed to remove: $formatted'),
              backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // silent removal helper (using Firestore transaction)
  Future<void> _removeMemberSilent(
      String orgId, String memberId, String name, String targetUserId) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);

    await FirebaseFirestore.instance.runTransaction((transaction) async {
      final memberRef = FirebaseFirestore.instance
          .collection('organization_members')
          .doc(memberId);
      final userRef =
          FirebaseFirestore.instance.collection('users').doc(targetUserId);
      final subRef =
          FirebaseFirestore.instance.collection('subscriptions').doc(orgId);

      // Read current documents inside transaction (mandatory first step)
      await transaction.get(memberRef);
      await transaction.get(userRef);
      final subSnap = await transaction.get(subRef);

      transaction.delete(memberRef);
      transaction.update(userRef, {
        'is_active': false,
        'isActive': false,
        'organization_id': null,
        'organizationId': null,
      });

      if (subSnap.exists) {
        final int currentUsersUsed = subSnap.data()?['usersUsed'] ?? 1;
        transaction.update(subRef, {
          'usersUsed': max(1, currentUsersUsed - 1),
        });
      }
    });

    // Log activity
    await FirebaseFirestore.instance.collection('activity_logs').add({
      'organizationId': orgId,
      'userId': auth.user?.id ?? '',
      'userName': auth.user?.name ?? 'Owner',
      'userRole': auth.user?.role ?? 'owner',
      'action': 'Member Removed',
      'details': 'Removed $name from organization',
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  // Replace Member
  Future<void> _replaceMember(
      String memberId, String name, String targetUserId, String role) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    if (targetUserId == auth.user?.id) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You cannot replace yourself.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Replace Member'),
        content: Text(
            'Are you sure you want to replace $name? This will remove/deactivate $name and open the Invite Dialog to invite their replacement.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B1E2D)),
            child: const Text('Yes, Replace'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);

    try {
      await _removeMemberSilent(orgId, memberId, name, targetUserId);
      await _loadTeamData();
      if (mounted) {
        _showInviteDialog(preselectedRole: role);
      }
    } catch (e, stack) {
      final formatted = _logAndFormatError(
        operation: 'Replace Member (Removal step)',
        collection: 'organization_members / users',
        docId: memberId,
        exception: e,
        stackTrace: stack,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Replacement failed: $formatted'),
              backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Transfer Ownership (via transaction)
  Future<void> _transferOwnership(
      String targetMemberId, String targetName, String targetUserId) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    final currentOwnerUserId = auth.user?.id;
    if (orgId == null || currentOwnerUserId == null) return;

    if (targetUserId == currentOwnerUserId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You are already the owner.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Transfer Ownership'),
        content: Text(
            'Are you sure you want to transfer organization ownership to $targetName?\n\n'
            'This will downgrade your role to President and set $targetName as the new Owner. This action CANNOT be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B1E2D)),
            child: const Text('Transfer'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);

    try {
      final currentOwnerMembers = await FirebaseFirestore.instance
          .collection('organization_members')
          .where('organizationId', isEqualTo: orgId)
          .where('role', isEqualTo: 'owner')
          .get();

      if (currentOwnerMembers.docs.isEmpty) {
        throw Exception("Current owner record not found in members.");
      }
      final currentOwnerMemberId = currentOwnerMembers.docs.first.id;

      await FirebaseFirestore.instance.runTransaction((transaction) async {
        final targetMemberRef = FirebaseFirestore.instance
            .collection('organization_members')
            .doc(targetMemberId);
        final currentOwnerMemberRef = FirebaseFirestore.instance
            .collection('organization_members')
            .doc(currentOwnerMemberId);
        final targetUserRef =
            FirebaseFirestore.instance.collection('users').doc(targetUserId);
        final currentOwnerUserRef = FirebaseFirestore.instance
            .collection('users')
            .doc(currentOwnerUserId);

        transaction.update(targetMemberRef, {'role': 'owner'});
        transaction.update(currentOwnerMemberRef, {'role': 'president'});

        transaction.update(targetUserRef, {'role': 'owner'});
        transaction.update(currentOwnerUserRef, {'role': 'president'});

        final logRef =
            FirebaseFirestore.instance.collection('activity_logs').doc();
        transaction.set(logRef, {
          'organizationId': orgId,
          'userId': currentOwnerUserId,
          'userName': auth.user?.name ?? 'Owner',
          'userRole': 'owner',
          'action': 'Ownership Transferred',
          'details': 'Transferred organization ownership to $targetName',
          'timestamp': DateTime.now().toIso8601String(),
        });
      });

      await auth.reloadProfile();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Ownership successfully transferred to $targetName! You are now a President.'),
            backgroundColor: Colors.green,
          ),
        );
      }
      await _loadTeamData();
    } catch (e, stack) {
      final formatted = _logAndFormatError(
        operation: 'Transfer Ownership',
        collection: 'organization_members / users / activity_logs',
        docId: targetMemberId,
        exception: e,
        stackTrace: stack,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed to transfer ownership: $formatted'),
              backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Show member activity logs
  Future<void> _showMemberActivityDialog(String userName, String userId) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id ?? '';

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text('Activity for $userName'),
          content: SizedBox(
            width: double.maxFinite,
            height: 350,
            child: FutureBuilder<QuerySnapshot<Map<String, dynamic>>>(
              future: FirebaseFirestore.instance
                  .collection('activity_logs')
                  .where('organizationId', isEqualTo: orgId)
                  .where('userId', isEqualTo: userId)
                  .orderBy('timestamp', descending: true)
                  .limit(100)
                  .get(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Text('Error loading activity: ${snapshot.error}',
                        style: const TextStyle(color: Colors.red)),
                  );
                }
                final docs = snapshot.data?.docs ?? [];
                if (docs.isEmpty) {
                  return const Center(
                      child: Text('No activity logs found for this member.'));
                }

                return ListView.separated(
                  itemCount: docs.length,
                  separatorBuilder: (context, index) => const Divider(),
                  itemBuilder: (context, index) {
                    final data = docs[index].data();
                    final action = data['action'] ?? 'Unknown Action';
                    final details = data['details'] ?? '';
                    final timestampStr = data['timestamp'] ?? '';
                    String formattedTime = '';
                    if (timestampStr.isNotEmpty) {
                      try {
                        formattedTime = DateFormat('dd MMM, hh:mm a')
                            .format(DateTime.parse(timestampStr));
                      } catch (_) {
                        formattedTime = timestampStr;
                      }
                    }

                    return ListTile(
                      dense: true,
                      title: Text(
                        action,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF8B1E2D),
                            fontSize: 12),
                      ),
                      subtitle:
                          Text(details, style: const TextStyle(fontSize: 11)),
                      trailing: Text(
                        formattedTime,
                        style: const TextStyle(fontSize: 9, color: Colors.grey),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  // Fetch Member stats
  Future<Map<String, dynamic>> _getMemberStats(
      String orgId, String userId) async {
    try {
      final querySnapshot = await FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId)
          .where('collectorId', isEqualTo: userId)
          .get();

      int count = querySnapshot.docs.length;
      double totalAmount = 0.0;
      for (var doc in querySnapshot.docs) {
        final amt = doc.data()['amount'];
        if (amt != null) {
          totalAmount += double.tryParse(amt.toString()) ?? 0.0;
        }
      }
      return {'count': count, 'amount': totalAmount};
    } catch (e, stack) {
      _logAndFormatError(
        operation: 'Get Member Stats',
        collection: 'receipts',
        query: 'where(organizationId == $orgId).where(collectorId == $userId)',
        exception: e,
        stackTrace: stack,
      );
      return {'count': 0, 'amount': 0.0};
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final sub = auth.subscription;
    final orgId = auth.organization?.id ?? '';
    final theme = Theme.of(context);

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Team Management')),
        backgroundColor: theme.colorScheme.surface,
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading team members...',
                  style: TextStyle(color: Colors.grey, fontSize: 13)),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Team Management')),
        backgroundColor: theme.colorScheme.surface,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text('Please check your network and try again.',
                    style: TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: _loadTeamData,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final usersLimit = sub?.usersLimit ?? 1;
    final usersUsed = sub?.usersUsed ?? 1;
    final pendingCount = _invites.length;
    final availableSeats = usersLimit - usersUsed;

    final planDisplayName = sub?.plan == 'free_trial'
        ? 'Free Trial'
        : sub?.plan == 'monthly'
            ? 'Monthly Premium'
            : 'Yearly Premium';

    // Local Search & Sort
    List<QueryDocumentSnapshot<Map<String, dynamic>>> filteredMembers =
        _members.where((doc) {
      final data = doc.data();
      final name = (data['name'] ?? '').toString().toLowerCase();
      final mobile = (data['mobile'] ?? '').toString().toLowerCase();
      final role = (data['role'] ?? '').toString().toLowerCase();
      final query = _searchQuery.toLowerCase();
      return name.contains(query) ||
          mobile.contains(query) ||
          role.contains(query);
    }).toList();

    filteredMembers.sort((a, b) {
      final dataA = a.data();
      final dataB = b.data();

      DateTime parseDateTime(dynamic val) {
        if (val == null) return DateTime.fromMillisecondsSinceEpoch(0);
        if (val is Timestamp) return val.toDate();
        if (val is String) {
          try {
            return DateTime.parse(val);
          } catch (_) {}
        }
        return DateTime.fromMillisecondsSinceEpoch(0);
      }

      if (_sortBy == 'newest') {
        final dateA = parseDateTime(dataA['createdAt'] ?? dataA['joinedAt']);
        final dateB = parseDateTime(dataB['createdAt'] ?? dataB['joinedAt']);
        return dateB.compareTo(dateA);
      } else if (_sortBy == 'oldest') {
        final dateA = parseDateTime(dataA['createdAt'] ?? dataA['joinedAt']);
        final dateB = parseDateTime(dataB['createdAt'] ?? dataB['joinedAt']);
        return dateA.compareTo(dateB);
      } else if (_sortBy == 'role') {
        final roleA = (dataA['role'] ?? '').toString();
        final roleB = (dataB['role'] ?? '').toString();
        return roleA.compareTo(roleB);
      } else if (_sortBy == 'alphabetical') {
        final nameA = (dataA['name'] ?? '').toString().toLowerCase();
        final nameB = (dataB['name'] ?? '').toString().toLowerCase();
        return nameA.compareTo(nameB);
      }
      return 0;
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Team Management'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: SingleChildScrollView(
        controller: _scrollController,
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Summary Card
            Card(
              color: Colors.white,
              elevation: 2,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Team Summary',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: Color(0xFF8B1E2D))),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Current Plan:',
                            style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text(planDisplayName,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                    const Divider(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Users:',
                            style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text('$usersUsed / $usersLimit',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                    const Divider(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Pending Invites:',
                            style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text('$pendingCount',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                    const Divider(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Available Seats:',
                            style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text('$availableSeats',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: availableSeats <= 0
                                    ? Colors.red
                                    : Colors.green[800])),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Available Seats Warning Card
            if (availableSeats <= 0) ...[
              Card(
                color: Colors.red[50],
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.red[200]!),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Icon(Icons.warning_amber_rounded,
                          color: Colors.red[700], size: 28),
                      const SizedBox(height: 8),
                      const Text(
                        '⚠ Maximum users reached.',
                        style: TextStyle(
                            color: Color(0xFF8B1E2D),
                            fontWeight: FontWeight.bold,
                            fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Upgrade your plan to add more members.',
                        style: TextStyle(color: Colors.red[850], fontSize: 12),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pushNamed(
                              context, '/settings/subscription-usage');
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8B1E2D),
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Upgrade Plan'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Active Members Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Active Members',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                ElevatedButton.icon(
                  onPressed: () => _showInviteDialog(),
                  icon: const Icon(Icons.person_add_alt_1, size: 16),
                  label: const Text('Invite Member',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Search & Sort bar
            Card(
              color: Colors.white,
              elevation: 1,
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        decoration: const InputDecoration(
                          hintText: 'Search members...',
                          prefixIcon: Icon(Icons.search, size: 20),
                          border: InputBorder.none,
                          hintStyle: TextStyle(fontSize: 13),
                        ),
                        style: const TextStyle(fontSize: 13),
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    DropdownButton<String>(
                      value: _sortBy,
                      underline: const SizedBox(),
                      icon: const Icon(Icons.sort,
                          size: 20, color: Color(0xFF8B1E2D)),
                      items: const [
                        DropdownMenuItem(
                            value: 'newest',
                            child: Text('Newest First',
                                style: TextStyle(fontSize: 12))),
                        DropdownMenuItem(
                            value: 'oldest',
                            child: Text('Oldest First',
                                style: TextStyle(fontSize: 12))),
                        DropdownMenuItem(
                            value: 'role',
                            child: Text('Sort by Role',
                                style: TextStyle(fontSize: 12))),
                        DropdownMenuItem(
                            value: 'alphabetical',
                            child: Text('Alphabetical',
                                style: TextStyle(fontSize: 12))),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _sortBy = val;
                          });
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Members List
            if (filteredMembers.isEmpty)
              Card(
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      Icon(Icons.group_outlined,
                          color: Colors.grey[400], size: 48),
                      const SizedBox(height: 16),
                      const Text(
                        'No team members added yet.',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Get started by inviting members to join your team.',
                        style: TextStyle(color: Colors.grey[600], fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: () => _showInviteDialog(),
                        icon: const Icon(Icons.add),
                        label: const Text('Invite Member'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8B1E2D),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredMembers.length,
                itemBuilder: (context, index) {
                  final mDoc = filteredMembers[index];
                  final mData = mDoc.data();
                  final memberId = mDoc.id;

                  return MemberCard(
                    data: mData,
                    memberId: memberId,
                    orgId: orgId,
                    onRemove: () => _removeMember(
                        memberId, mData['name'] ?? '', mData['userId'] ?? ''),
                    onReplace: () => _replaceMember(
                        memberId,
                        mData['name'] ?? '',
                        mData['userId'] ?? '',
                        mData['role'] ?? 'member'),
                    onTransferOwnership: () => _transferOwnership(
                        memberId, mData['name'] ?? '', mData['userId'] ?? ''),
                    onViewActivity: () => _showMemberActivityDialog(
                        mData['name'] ?? '', mData['userId'] ?? ''),
                    getStats: _getMemberStats,
                  );
                },
              ),

            const SizedBox(height: 24),

            // Pending Invitations Section
            const Text(
              'Pending Invitations',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 8),

            _buildPendingInvitesList(orgId),
          ],
        ),
      ),
    );
  }

  // Pending invites builder
  Widget _buildPendingInvitesList(String orgId) {
    final now = DateTime.now();

    final activeInvites = _invites.where((doc) {
      final expStr = doc.data()['expiresAt'] ?? '';
      if (expStr.isEmpty) return false;
      try {
        final exp = DateTime.parse(expStr);
        return exp.isAfter(now);
      } catch (_) {
        return false;
      }
    }).toList();

    if (activeInvites.isEmpty) {
      return Card(
        color: Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            'No pending invitations.',
            style: TextStyle(color: Colors.grey[600], fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return Card(
      color: Colors.white,
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: activeInvites.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final iDoc = activeInvites[index];
          final data = iDoc.data();
          final inviteId = iDoc.id;
          final name = data['name'] ?? '';
          final mobile = data['mobile'] ?? '';
          final role = data['role'] ?? 'member';
          final otp = data['otp'] ?? '';
          final expiresAtStr = data['expiresAt'] ?? '';

          String formattedExpiry = '';
          if (expiresAtStr.isNotEmpty) {
            try {
              final exp = DateTime.parse(expiresAtStr);
              formattedExpiry = DateFormat('dd MMM, hh:mm a').format(exp);
            } catch (_) {}
          }

          return ListTile(
            isThreeLine: true,
            title: Text(
              name,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$mobile • ${role.toString().toUpperCase()}'),
                const SizedBox(height: 2),
                SelectableText(
                  'OTP Invite Code: $otp',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFF47C20),
                      fontSize: 12),
                ),
                if (formattedExpiry.isNotEmpty)
                  Text(
                    'Expires: $formattedExpiry',
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
              ],
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.refresh, color: Colors.green),
                  tooltip: 'Resend / Refresh Invite Code',
                  onPressed: () =>
                      _resendInvitation(inviteId, name, mobile, role),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.red),
                  tooltip: 'Cancel Invitation',
                  onPressed: () => _cancelInvitation(inviteId, name),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class MemberCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final String memberId;
  final String orgId;
  final VoidCallback onRemove;
  final VoidCallback onReplace;
  final VoidCallback onTransferOwnership;
  final VoidCallback onViewActivity;
  final Future<Map<String, dynamic>> Function(String, String) getStats;

  const MemberCard({
    super.key,
    required this.data,
    required this.memberId,
    required this.orgId,
    required this.onRemove,
    required this.onReplace,
    required this.onTransferOwnership,
    required this.onViewActivity,
    required this.getStats,
  });

  @override
  Widget build(BuildContext context) {
    final name = data['name'] ?? 'Unknown';
    final mobile = data['mobile'] ?? '';
    final role = data['role'] ?? 'member';
    final userId = data['userId'] ?? '';
    final joinedAt = data['createdAt'] ?? data['joinedAt'] ?? '';

    String formattedJoined = 'N/A';
    if (joinedAt != null) {
      try {
        if (joinedAt is Timestamp) {
          formattedJoined = DateFormat('dd MMM yyyy').format(joinedAt.toDate());
        } else if (joinedAt is String && joinedAt.isNotEmpty) {
          formattedJoined =
              DateFormat('dd MMM yyyy').format(DateTime.parse(joinedAt));
        }
      } catch (_) {}
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isCurrentUserOwner = auth.user?.role == 'owner';

    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.withOpacity(0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                ProfilePhotoWidget(
                  uid: memberId,
                  url: data['profilePhotoUrl256'] ?? data['profile_photo_url_256'] ?? data['profilePhotoUrl'] ?? data['profile_photo_url'],
                  version: data['profilePhotoVersion'] ?? data['profile_photo_version'],
                  name: name,
                  radius: 20,
                  suffix: '_256',
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$mobile • ${role.toString().toUpperCase()}',
                        style:
                            const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green[300]!),
                  ),
                  child: Text(
                    'Active',
                    style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Colors.green[800]),
                  ),
                ),
                if (role != 'owner')
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 20),
                    onSelected: (value) {
                      if (value == 'remove') {
                        onRemove();
                      } else if (value == 'replace') {
                        onReplace();
                      } else if (value == 'transfer') {
                        onTransferOwnership();
                      } else if (value == 'activity') {
                        onViewActivity();
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'activity',
                        child: Row(
                          children: [
                            Icon(Icons.history, size: 18, color: Colors.blue),
                            SizedBox(width: 8),
                            Text('View Activity',
                                style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'replace',
                        child: Row(
                          children: [
                            Icon(Icons.swap_horiz,
                                size: 18, color: Colors.orange),
                            SizedBox(width: 8),
                            Text('Replace Member',
                                style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                      if (isCurrentUserOwner)
                        const PopupMenuItem(
                          value: 'transfer',
                          child: Row(
                            children: [
                              Icon(Icons.admin_panel_settings_outlined,
                                  size: 18, color: Colors.purple),
                              SizedBox(width: 8),
                              Text('Transfer Ownership',
                                  style: TextStyle(fontSize: 12)),
                            ],
                          ),
                        ),
                      const PopupMenuItem(
                        value: 'remove',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline,
                                size: 18, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Remove Member',
                                style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const Divider(height: 16),
            FutureBuilder<Map<String, dynamic>>(
              future: getStats(orgId, userId),
              builder: (context, snapshot) {
                final count = snapshot.data?['count'] ?? 0;
                final amount = snapshot.data?['amount'] ?? 0.0;
                final isLoading =
                    snapshot.connectionState == ConnectionState.waiting;

                return Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Joined: $formattedJoined',
                      style: const TextStyle(fontSize: 10, color: Colors.grey),
                    ),
                    Row(
                      children: [
                        Text(
                          'Receipts: ${isLoading ? "..." : count}',
                          style: const TextStyle(
                              fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Amount: ₹${isLoading ? "..." : amount.toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF8B1E2D)),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
