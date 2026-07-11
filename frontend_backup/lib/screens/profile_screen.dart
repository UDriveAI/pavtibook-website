import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import '../providers/auth_provider.dart';
import '../widgets/profile_photo_widget.dart';
import '../services/image_processing_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isProcessingPhoto = false;

  Future<void> _pickAndUploadPhoto(ImageSource source) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    setState(() => _isProcessingPhoto = true);

    try {
      final pickedFile = await ImageProcessingService.pickImage(source);
      if (pickedFile != null) {
        final bytes = await pickedFile.readAsBytes();
        final croppedBytes = await ImageProcessingService.cropAndResizeImage(bytes, 512);
        if (croppedBytes != null) {
          final success = await auth.uploadProfilePhoto(croppedBytes);
          if (success) {
            scaffoldMessenger.showSnackBar(
              const SnackBar(content: Text('Profile photo updated successfully!')),
            );
          } else {
            scaffoldMessenger.showSnackBar(
              SnackBar(content: Text(auth.errorMessage ?? 'Failed to upload profile photo.')),
            );
          }
        } else {
          scaffoldMessenger.showSnackBar(
            const SnackBar(content: Text('Failed to crop and resize photo.')),
          );
        }
      }
    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessingPhoto = false);
      }
    }
  }

  void _showPhotoOptions() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final hasPhoto = auth.user?.profilePhotoUrl != null;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFFF8F1E7),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: Color(0xFF8B1E2D)),
                title: const Text('Capture from Camera', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(context);
                  _pickAndUploadPhoto(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: Color(0xFF8B1E2D)),
                title: const Text('Select from Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(context);
                  _pickAndUploadPhoto(ImageSource.gallery);
                },
              ),
              if (hasPhoto)
                ListTile(
                  leading: const Icon(Icons.delete_outline, color: Colors.red),
                  title: const Text('Remove Photo', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
                  onTap: () async {
                    Navigator.pop(context);
                    final messenger = ScaffoldMessenger.of(context);
                    setState(() => _isProcessingPhoto = true);
                    final success = await auth.deleteProfilePhoto();
                    if (mounted) {
                      setState(() => _isProcessingPhoto = false);
                    }
                    if (success) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Profile photo removed.')),
                      );
                    } else {
                      messenger.showSnackBar(
                        SnackBar(content: Text(auth.errorMessage ?? 'Failed to remove profile photo.')),
                      );
                    }
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  void _showEditProfileDialog() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final nameController = TextEditingController(text: auth.user?.name);
    final mobileController = TextEditingController(text: auth.user?.mobile);
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFFFFF6E8),
          title: const Text(
            'Edit Profile Info',
            style: TextStyle(color: Color(0xFF8B1E2D), fontWeight: FontWeight.bold),
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    border: OutlineInputBorder(),
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: mobileController,
                  decoration: const InputDecoration(
                    labelText: 'Mobile Number',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.phone,
                  validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final messenger = ScaffoldMessenger.of(context);
                final nav = Navigator.of(context);
                
                final success = await auth.updateProfileDetails(
                  nameController.text.trim(),
                  mobileController.text.trim(),
                );
                
                nav.pop();
                if (success) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Profile details updated successfully!')),
                  );
                } else {
                  messenger.showSnackBar(
                    SnackBar(content: Text(auth.errorMessage ?? 'Failed to update details.')),
                  );
                }
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  void _showChangePasswordDialog() {
    final auth = Provider.of<AuthProvider>(context, listen: false);

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFFFFF6E8),
          title: const Text(
            'Change Password',
            style: TextStyle(color: Color(0xFF8B1E2D), fontWeight: FontWeight.bold),
          ),
          content: Text(
            'We will send a password reset link to your email address:\n${auth.user?.email}\n\nYou will be logged out to securely update your password.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B1E2D)),
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                final nav = Navigator.of(context);
                
                try {
                  await FirebaseAuth.instance.sendPasswordResetEmail(email: auth.user!.email);
                  nav.pop();
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Password reset link sent! Logging out...')),
                  );
                  await Future.delayed(const Duration(seconds: 2));
                  await auth.logout();
                  if (mounted) {
                    Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                  }
                } catch (e) {
                  nav.pop();
                  messenger.showSnackBar(
                    SnackBar(content: Text('Failed to send reset link: $e')),
                  );
                }
              },
              child: const Text('Send Reset Email'),
            ),
          ],
        );
      },
    );
  }

  void _showArchiveDialog() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final reasonController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFFFFF6E8),
          title: const Text(
            'Archive Organization',
            style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'WARNING: Archiving will put the organization into READ-ONLY mode. Nobody will be able to create new receipts or modify details until restored.\n\nAll existing data (receipts, donors, members) remains safe.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: reasonController,
                  decoration: const InputDecoration(
                    labelText: 'Archive Reason',
                    border: OutlineInputBorder(),
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'Please state a reason' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final messenger = ScaffoldMessenger.of(context);
                final nav = Navigator.of(context);

                final success = await auth.archiveOrganization(reasonController.text.trim());
                nav.pop();
                
                if (success) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Organization archived successfully.')),
                  );
                } else {
                  messenger.showSnackBar(
                    SnackBar(content: Text(auth.errorMessage ?? 'Failed to archive organization.')),
                  );
                }
              },
              child: const Text('Archive Organization'),
            ),
          ],
        );
      },
    );
  }

  void _showRestoreDialog() {
    final auth = Provider.of<AuthProvider>(context, listen: false);

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFFFFF6E8),
          title: const Text(
            'Restore Organization',
            style: TextStyle(color: Color(0xFF8B1E2D), fontWeight: FontWeight.bold),
          ),
          content: const Text(
            'Are you sure you want to restore this organization? It will return to normal operation, allowing new receipt creations and setting edits.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                final nav = Navigator.of(context);

                final success = await auth.restoreOrganization();
                nav.pop();
                
                if (success) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Organization restored successfully!')),
                  );
                } else {
                  messenger.showSnackBar(
                    SnackBar(content: Text(auth.errorMessage ?? 'Failed to restore organization.')),
                  );
                }
              },
              child: const Text('Restore'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final org = auth.organization;

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final isOwner = user.isSoftwareOwner || (org != null && org.ownerUid == user.id);
    final String businessRole;
    if (isOwner) {
      businessRole = 'Organization Owner';
    } else {
      final roleLower = user.role.toLowerCase();
      if (roleLower == 'owner') {
        businessRole = 'Organization Owner';
      } else if (roleLower == 'admin') {
        if (org?.presidentName == user.name) {
          businessRole = 'President';
        } else if (org?.treasurerName == user.name) {
          businessRole = 'Treasurer';
        } else {
          businessRole = 'Administrator';
        }
      } else if (roleLower == 'president') {
        businessRole = 'President';
      } else if (roleLower == 'treasurer') {
        businessRole = 'Treasurer';
      } else if (roleLower == 'secretary') {
        businessRole = 'Secretary';
      } else if (roleLower == 'member') {
        businessRole = 'Member';
      } else {
        businessRole = user.role.isEmpty
            ? 'Member'
            : user.role[0].toUpperCase() + user.role.substring(1).toLowerCase();
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFFF6E8),
      appBar: AppBar(
        title: const Text('My Profile & Account'),
        backgroundColor: const Color(0xFF8B1E2D),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // PROFILE CARD
            Card(
              color: Colors.white,
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Center(
                      child: Stack(
                        children: [
                          ProfilePhotoWidget(
                            uid: user.id,
                            url: user.profilePhotoUrl,
                            version: user.profilePhotoVersion,
                            name: user.name,
                            radius: 48,
                          ),
                          if (_isProcessingPhoto)
                            Positioned.fill(
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.black26,
                                  borderRadius: BorderRadius.circular(48),
                                ),
                                child: const Center(
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation(Colors.white),
                                  ),
                                ),
                              ),
                            ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: CircleAvatar(
                              radius: 16,
                              backgroundColor: const Color(0xFF8B1E2D),
                              child: IconButton(
                                icon: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                                onPressed: _isProcessingPhoto ? null : _showPhotoOptions,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      user.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                    ),
                    if (org != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        org.name,
                        style: const TextStyle(color: Color(0xFF8B1E2D), fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                    ],
                    Text(
                      user.email,
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isOwner ? const Color(0xFF8B1E2D).withOpacity(0.1) : Colors.grey[200],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${isOwner ? "👑 " : ""}$businessRole',
                        style: TextStyle(
                          color: isOwner ? const Color(0xFF8B1E2D) : Colors.grey[700],
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // PERSONAL DETAIL SECTION
            Card(
              color: Colors.white,
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Personal Details',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF8B1E2D)),
                    ),
                    const Divider(height: 20),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Mobile Number', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      subtitle: Text(user.mobile, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Email Address', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      subtitle: Text(user.email, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      trailing: const Icon(Icons.lock_outline, size: 16, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // ORGANIZATION SECTION
            if (org != null)
              Card(
                color: Colors.white,
                elevation: 1,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Organization Details',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF8B1E2D)),
                          ),
                          if (org.isArchived)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.red.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'ARCHIVED',
                                style: TextStyle(color: Colors.red, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                        ],
                      ),
                      const Divider(height: 20),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Organization Name', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        subtitle: Text(org.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Organization ID', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        subtitle: Text(org.id, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        trailing: IconButton(
                          icon: const Icon(Icons.copy, size: 16, color: Color(0xFF8B1E2D)),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: org.id));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Organization ID copied to clipboard!')),
                            );
                          },
                        ),
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Role', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              subtitle: Text(user.role.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                          ),
                          Expanded(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Designation', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              subtitle: Text(businessRole, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Subscription', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              subtitle: Text(org.subscriptionPlan.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                          ),
                          Expanded(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Owner Badge', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              subtitle: Text(businessRole.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),

            // ACCOUNT OPTIONS
            Card(
              color: Colors.white,
              elevation: 1,
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.edit_outlined, color: Color(0xFFF47C20)),
                    title: const Text('Edit Profile Details', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: _showEditProfileDialog,
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.lock_outline, color: Color(0xFFF47C20)),
                    title: const Text('Change Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: _showChangePasswordDialog,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // SECURITY SECTION
            if (isOwner)
              Card(
                color: Colors.white,
                elevation: 1,
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.swap_horiz, color: Color(0xFF8B1E2D)),
                      title: const Text('Transfer Ownership', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF8B1E2D))),
                      subtitle: const Text('Transfer Organization Owner rights securely', style: TextStyle(fontSize: 9)),
                      trailing: const Icon(Icons.chevron_right, color: Color(0xFF8B1E2D)),
                      onTap: () {
                        HapticFeedback.lightImpact();
                        Navigator.pushNamed(context, '/settings/ownership-transfer');
                      },
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 12),

            // DANGER ZONE
            Card(
              color: Colors.white,
              elevation: 1,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: 16.0, top: 12.0),
                    child: Text(
                      'Danger Zone',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.red[800]),
                    ),
                  ),
                  const Divider(height: 16),
                  if (isOwner && org != null) ...[
                    ListTile(
                      leading: Icon(org.isArchived ? Icons.settings_backup_restore : Icons.archive_outlined, color: Colors.red),
                      title: Text(
                        org.isArchived ? 'Restore Organization' : 'Archive Organization',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.red),
                      ),
                      subtitle: Text(
                        org.isArchived
                            ? 'Restore organization to normal writable state'
                            : 'Set organization read-only. Safe backup.',
                        style: const TextStyle(fontSize: 9),
                      ),
                      onTap: org.isArchived ? _showRestoreDialog : _showArchiveDialog,
                    ),
                    const Divider(height: 1),
                  ],
                  ListTile(
                    leading: const Icon(Icons.logout, color: Colors.red),
                    title: const Text(
                      'Logout',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.red),
                    ),
                    onTap: () async {
                      await auth.logout();
                      if (mounted) {
                        Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
