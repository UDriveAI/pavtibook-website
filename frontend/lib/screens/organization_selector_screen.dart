import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../main.dart';

class OrganizationSelectorScreen extends StatefulWidget {
  const OrganizationSelectorScreen({super.key});

  @override
  State<OrganizationSelectorScreen> createState() => _OrganizationSelectorScreenState();
}

class _OrganizationSelectorScreenState extends State<OrganizationSelectorScreen> {
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _userMemberships = [];

  @override
  void initState() {
    super.initState();
    _loadUserOrganizations();
  }

  Future<void> _loadUserOrganizations() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      if (mounted) Navigator.pushReplacementNamed(context, '/login');
      return;
    }

    try {
      // 1. Query organization_members collection for all memberships of current user
      final membersQuery = await FirebaseFirestore.instance
          .collection('organization_members')
          .where('userId', isEqualTo: uid)
          .get();

      List<Map<String, dynamic>> memberships = [];
      Set<String> seenOrgIds = {};

      for (var doc in membersQuery.docs) {
        final data = doc.data();
        final orgId = data['organizationId'];
        if (orgId != null && orgId.toString().isNotEmpty && !seenOrgIds.contains(orgId.toString())) {
          seenOrgIds.add(orgId.toString());
          final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(orgId).get();
          if (orgDoc.exists) {
            final orgData = orgDoc.data()!;
            memberships.add({
              'membershipId': doc.id,
              'organizationId': orgId,
              'organizationName': orgData['name'] ?? orgData['orgName'] ?? 'Organization',
              'role': data['role'] ?? 'member',
              'joinedAt': data['joinedAt'] ?? '',
              'orgData': orgData,
            });
          }
        }
      }

      // Include user's primary default organization if not already in membership results
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(uid).get();
      if (userDoc.exists) {
        final userData = userDoc.data()!;
        final defaultOrgId = userData['lastSelectedOrgId'] ?? userData['organization_id'] ?? userData['organizationId'];
        if (defaultOrgId != null && defaultOrgId.toString().isNotEmpty && !seenOrgIds.contains(defaultOrgId.toString())) {
          seenOrgIds.add(defaultOrgId.toString());
          final orgDoc = await FirebaseFirestore.instance.collection('organizations').doc(defaultOrgId).get();
          if (orgDoc.exists) {
            final orgData = orgDoc.data()!;
            memberships.add({
              'membershipId': uid,
              'organizationId': defaultOrgId,
              'organizationName': orgData['name'] ?? orgData['orgName'] ?? 'Organization',
              'role': userData['role'] ?? 'owner',
              'joinedAt': userData['createdAt'] ?? '',
              'orgData': orgData,
            });
          }
        }
      }

      if (mounted) {
        setState(() {
          _userMemberships = memberships;
          _isLoading = false;
        });

        // Auto-select if only 1 organization exists
        if (_userMemberships.length == 1) {
          _selectOrganization(
            _userMemberships.first['organizationId'],
            _userMemberships.first['organizationName'] ?? 'Organization',
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load organizations: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _selectOrganization(String orgId, String orgName) async {
    setState(() => _isLoading = true);

    // ── STEP 1: Complete state reset before switch ────────────────────────────
    final dash = Provider.of<DashboardProvider>(context, listen: false);
    final rp = Provider.of<ReceiptProvider>(context, listen: false);
    final dp = Provider.of<DonorProvider>(context, listen: false);
    final tp = Provider.of<TemplateProvider>(context, listen: false);

    dash.reset();
    rp.reset();
    dp.reset();
    tp.reset();

    // ── STEP 2: Switch active organization context ────────────────────────────
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.switchOrganization(orgId);

    if (mounted) {
      // ── STEP 3: Initialize real-time streams for new organization ──────────
      dash.initRealtimeDashboard(
        orgId: orgId,
        userRole: auth.activeUserRole,
        uid: auth.user?.id ?? '',
        generation: auth.switchGeneration,
      );

      // ── STEP 4: Navigate directly to Dashboard — NEVER remain on selector screen
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/dashboard',
        (route) => false,
      );

      // ── STEP 5: Show success message toast ────────────────────────────────
      scaffoldMessengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Text('Switched to $orgName'),
          backgroundColor: const Color(0xFF8B1E2D),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Color _getRoleBadgeColor(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
      case 'president':
        return const Color(0xFF8B1E2D); // Primary Maroon
      case 'treasurer':
        return Colors.blue.shade700;
      default:
        return Colors.green.shade700;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF6E8), // Cream Background
      appBar: AppBar(
        title: const Text('Select Organization'),
        backgroundColor: const Color(0xFF8B1E2D),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadUserOrganizations,
            tooltip: 'Refresh Organizations',
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF8B1E2D)),
                ),
              )
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 48, color: Colors.red),
                          const SizedBox(height: 16),
                          Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadUserOrganizations,
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B1E2D)),
                            child: const Text('Retry', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    ),
                  )
                : _userMemberships.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.business, size: 64, color: Colors.grey),
                              const SizedBox(height: 16),
                              const Text(
                                'No Organization Memberships Found',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Register a new organization or ask an administrator to send you an invitation.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey),
                              ),
                              const SizedBox(height: 24),
                              ElevatedButton.icon(
                                onPressed: () => Navigator.pushNamed(context, '/register'),
                                icon: const Icon(Icons.add_business, color: Colors.white),
                                label: const Text('Register Organization', style: TextStyle(color: Colors.white)),
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B1E2D)),
                              ),
                            ],
                          ),
                        ),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16.0),
                            color: Colors.white,
                            child: Row(
                              children: [
                                const Icon(Icons.apartment, color: Color(0xFF8B1E2D)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Your Organizations',
                                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF8B1E2D)),
                                      ),
                                      Text(
                                        'Select an organization to open its dashboard (${_userMemberships.length} found)',
                                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Divider(height: 1),
                          Expanded(
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16.0),
                              itemCount: _userMemberships.length,
                              itemBuilder: (context, index) {
                                final item = _userMemberships[index];
                                final orgName = item['organizationName'] as String;
                                final role = (item['role'] as String).toUpperCase();
                                final orgId = item['organizationId'] as String;
                                final badgeColor = _getRoleBadgeColor(role);

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12.0),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  elevation: 2,
                                  child: InkWell(
                                    onTap: () => _selectOrganization(orgId, orgName),
                                    borderRadius: BorderRadius.circular(16),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16.0),
                                      child: Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 24,
                                            backgroundColor: const Color(0xFF8B1E2D).withOpacity(0.1),
                                            child: const Icon(Icons.account_balance, color: Color(0xFF8B1E2D)),
                                          ),
                                          const SizedBox(width: 16),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  orgName,
                                                  style: const TextStyle(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.bold,
                                                    color: Colors.black87,
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: badgeColor.withOpacity(0.1),
                                                    borderRadius: BorderRadius.circular(6),
                                                    border: Border.all(color: badgeColor.withOpacity(0.4)),
                                                  ),
                                                  child: Text(
                                                    role,
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                      color: badgeColor,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
      ),
    );
  }
}
