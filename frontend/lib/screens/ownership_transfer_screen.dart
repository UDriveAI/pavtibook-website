import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../providers/auth_provider.dart';
import '../models/models.dart';

class OwnershipTransferScreen extends StatefulWidget {
  const OwnershipTransferScreen({super.key});

  @override
  State<OwnershipTransferScreen> createState() => _OwnershipTransferScreenState();
}

class _OwnershipTransferScreenState extends State<OwnershipTransferScreen> {
  final _searchController = TextEditingController();
  final _passwordController = TextEditingController();
  
  List<UserModel> _teamMembers = [];
  bool _isLoadingMembers = false;
  
  UserModel? _selectedUser;
  bool _isSearching = false;
  String? _validationError;

  bool _isReauthenticating = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadTeamMembers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadTeamMembers() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    setState(() => _isLoadingMembers = true);

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('users')
          .where('organizationId', isEqualTo: orgId)
          .get();

      final members = snapshot.docs
          .map((doc) => UserModel.fromJson(doc.data()))
          .where((m) => m.id != auth.user?.id) // exclude current user
          .toList();

      setState(() {
        _teamMembers = members;
        _isLoadingMembers = false;
      });
    } catch (e) {
      debugPrint('Error loading team members: $e');
      setState(() => _isLoadingMembers = false);
    }
  }

  void _searchUser(String query) {
    if (query.trim().isEmpty) {
      setState(() {
        _selectedUser = null;
        _validationError = null;
      });
      return;
    }

    final q = query.trim().toLowerCase();
    final match = _teamMembers.firstWhere(
      (m) => m.email.toLowerCase() == q || m.mobile == q || m.name.toLowerCase().contains(q),
      orElse: () => UserModel(id: '', name: '', email: '', mobile: '', role: '', isActive: false),
    );

    if (match.id.isEmpty) {
      setState(() {
        _selectedUser = null;
        _validationError = 'No team member found matching "$query".';
      });
    } else {
      _selectUser(match);
    }
  }

  void _selectUser(UserModel user) {
    setState(() {
      _selectedUser = user;
      _searchController.text = user.name;
      _validationError = null;

      // VALIDATE RECEIVER
      if (!user.isActive) {
        _validationError = 'Receiver account is inactive.';
      } else if (user.isSoftwareOwner) {
        _validationError = 'Receiver is already the Software Owner.';
      }
    });
  }

  Future<void> _initiateTransfer() async {
    if (_selectedUser == null || _validationError != null) return;
    
    // Check if organization already has an active transfer
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final org = auth.organization;
    if (org == null) return;

    if (org.activeTransferId != null && org.activeTransferId!.isNotEmpty) {
      showDialog(
        context: context,
        builder: (c) => AlertDialog(
          backgroundColor: const Color(0xFFFFF6E8),
          title: const Text('Transfer in Progress', style: TextStyle(color: Color(0xFF8B1E2D), fontWeight: FontWeight.bold)),
          content: const Text('This organization already has a pending ownership transfer request. Only one active request is allowed at a time. Please cancel the current request before starting a new one.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      return;
    }

    // Trigger re-authentication
    _showReauthModal();
  }

  void _showReauthModal() {
    _passwordController.clear();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8F1E7),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Security Verification',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF8B1E2D)),
              ),
              const SizedBox(height: 8),
              const Text(
                'Please enter your account password to authorize the transfer request. This is a critical security action.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => _verifyAndConfirmTransfer(),
                child: _isReauthenticating
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)))
                    : const Text('Verify & Proceed'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Future<void> _verifyAndConfirmTransfer() async {
    final password = _passwordController.text.trim();
    if (password.isEmpty) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    setState(() => _isReauthenticating = true);

    final verified = await auth.verifyCurrentOwnerPassword(password);
    
    setState(() => _isReauthenticating = false);

    if (!verified) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Invalid password. Re-authentication failed.')),
      );
      return;
    }

    // Dismiss re-auth sheet
    nav.pop();

    // Show Confirmation Dialog
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (cxt) {
        return AlertDialog(
          backgroundColor: const Color(0xFFFFF6E8),
          title: const Text('Confirm Ownership Transfer', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          content: Text(
            'Are you sure you want to initiate ownership transfer to ${_selectedUser!.name}?\n\nOnce they accept, they will become the Software Owner, and you will lose all owner rights. This action CANNOT be undone.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(cxt),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () {
                Navigator.pop(cxt);
                _executeTransferRequest();
              },
              child: const Text('Initiate Transfer'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _executeTransferRequest() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final org = auth.organization;
    final user = auth.user;
    if (org == null || user == null || _selectedUser == null) return;

    setState(() => _isSubmitting = true);
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    try {
      final transferRef = FirebaseFirestore.instance.collection('ownership_transfers').doc();
      final transferId = transferRef.id;

      final transferData = {
        'id': transferId,
        'organizationId': org.id,
        'status': 'pending',
        'requestedBy': {
          'uid': user.id,
          'name': user.name,
          'email': user.email,
          'mobile': user.mobile,
        },
        'requestedTo': {
          'uid': _selectedUser!.id,
          'name': _selectedUser!.name,
          'email': _selectedUser!.email,
          'mobile': _selectedUser!.mobile,
        },
        'requestedAt': DateTime.now().toIso8601String(),
        'acceptedAt': null,
        'completedAt': null,
      };

      // Write in batch to ensure updates are atomic
      final batch = FirebaseFirestore.instance.batch();
      
      batch.set(transferRef, transferData);
      batch.update(
        FirebaseFirestore.instance.collection('organizations').doc(org.id),
        {'activeTransferId': transferId},
      );
      
      // Activity Log entry
      final os = const String.fromEnvironment('os') == 'android' ? 'Android' : 'Web/iOS';
      final logRef = FirebaseFirestore.instance.collection('activity_logs').doc();
      batch.set(logRef, {
        'organizationId': org.id,
        'userId': user.id,
        'userName': user.name,
        'userRole': user.role,
        'action': 'Ownership Requested',
        'details': 'Requested ownership transfer to ${_selectedUser!.name} (Device: $os, Ver: 1.0.0)',
        'timestamp': DateTime.now().toIso8601String(),
        'device': os,
        'appVersion': '1.0.0',
      });

      await batch.commit();
      
      await auth.reloadProfile();

      messenger.showSnackBar(
        const SnackBar(content: Text('Ownership transfer request created successfully!')),
      );
      
      nav.pop(); // Go back to profile page
    } catch (e) {
      debugPrint('Error committing transfer: $e');
      messenger.showSnackBar(
        SnackBar(content: Text('Failed to initiate transfer: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF6E8),
      appBar: AppBar(
        title: const Text('Transfer Ownership'),
        backgroundColor: const Color(0xFF8B1E2D),
      ),
      body: _isSubmitting
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(Color(0xFF8B1E2D))),
                  SizedBox(height: 16),
                  Text('Initiating Ownership Transfer...', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            )
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Search Team Member',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF8B1E2D)),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          decoration: const InputDecoration(
                            hintText: 'Enter name, email, or mobile...',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.search),
                          ),
                          onChanged: (val) {
                            if (val.isEmpty) {
                              setState(() {
                                _selectedUser = null;
                                _validationError = null;
                              });
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () => _searchUser(_searchController.text),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                        ),
                        child: const Text('Find'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // SELECTED USER CARD / VALIDATION
                  if (_selectedUser != null) ...[
                    Card(
                      color: Colors.white,
                      elevation: 1,
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF8B1E2D).withOpacity(0.1),
                          child: Text(_selectedUser!.name.isNotEmpty ? _selectedUser!.name[0].toUpperCase() : '?'),
                        ),
                        title: Text(_selectedUser!.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${_selectedUser!.role.toUpperCase()} • ${_selectedUser!.mobile}'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_validationError != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Colors.red),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _validationError!,
                                style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B1E2D)),
                        onPressed: _initiateTransfer,
                        child: const Text('Transfer Software Ownership'),
                      ),
                    const SizedBox(height: 20),
                  ],

                  // MEMBERS LIST SELECTION
                  const Text(
                    'Or select from Team List',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: _isLoadingMembers
                        ? const Center(child: CircularProgressIndicator())
                        : _teamMembers.isEmpty
                            ? const Center(child: Text('No other active team members in your organization.'))
                            : ListView.builder(
                                itemCount: _teamMembers.length,
                                itemBuilder: (context, index) {
                                  final m = _teamMembers[index];
                                  return Card(
                                    color: Colors.white,
                                    margin: const EdgeInsets.only(bottom: 8),
                                    child: ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: const Color(0xFF8B1E2D).withOpacity(0.1),
                                        child: Text(m.name.isNotEmpty ? m.name[0].toUpperCase() : '?'),
                                      ),
                                      title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                      subtitle: Text('${m.role.toUpperCase()} • ${m.mobile}', style: const TextStyle(fontSize: 11)),
                                      trailing: const Icon(Icons.chevron_right, size: 16),
                                      onTap: () => _selectUser(m),
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
