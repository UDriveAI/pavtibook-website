import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:firebase_core/firebase_core.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';
import '../widgets/traditional_receipt_widget.dart';
import '../widgets/receipt_theme.dart';
import '../services/subscription_service.dart';
import '../services/payment_service.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

// ============================================================================
// 1. RECEIPT CUSTOMIZATION SCREEN
// ============================================================================
class ReceiptCustomizationScreen extends StatefulWidget {
  const ReceiptCustomizationScreen({super.key});

  @override
  State<ReceiptCustomizationScreen> createState() =>
      _ReceiptCustomizationScreenState();
}

class _ReceiptCustomizationScreenState
    extends State<ReceiptCustomizationScreen> {
  final _footerController = TextEditingController();
  bool _isSaving = false;
  final ImagePicker _picker = ImagePicker();
  String? _selectedThemeId;

  @override
  void initState() {
    super.initState();
    final org = Provider.of<AuthProvider>(context, listen: false).organization;
    if (org != null) {
      _footerController.text = org.footerText ?? '';
      _selectedThemeId = org.receiptThemeId ?? 'traditional_saffron';
    }
    Future.delayed(Duration.zero, () {
      if (mounted) {
        Provider.of<TemplateProvider>(context, listen: false).fetchTemplates();
      }
    });
  }

  @override
  void dispose() {
    _footerController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadImage(String fieldName) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    try {
      final XFile? image = await _picker.pickImage(
          source: ImageSource.gallery, imageQuality: 85);
      if (image == null) return;

      setState(() => _isSaving = true);

      // Upload to Firebase Storage
      final file = File(image.path);
      final storage = FirebaseStorage.instance;
      final ref = storage
          .ref()
          .child('organizations')
          .child(orgId)
          .child('$fieldName.png');

      // Before upload logging
      debugPrint(
          'FIREBASE CONFIG PROJECT_ID: ${Firebase.app().options.projectId}');
      debugPrint(
          'FIREBASE CONFIG STORAGE_BUCKET: ${Firebase.app().options.storageBucket}');
      debugPrint('FIREBASE STORAGE IMAGE UPLOAD START:');
      debugPrint('  Bucket: ${storage.bucket}');
      debugPrint('  Target Path: ${ref.fullPath}');
      debugPrint('  Local Source File: ${file.path}');

      final UploadTask uploadTask = ref.putFile(file);
      final TaskSnapshot snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();

      // After upload logging
      debugPrint('FIREBASE STORAGE IMAGE UPLOAD SUCCESS:');
      debugPrint('  Download URL: $downloadUrl');

      // Update Firestore organization details
      await FirebaseFirestore.instance
          .collection('organizations')
          .doc(orgId)
          .update({
        fieldName: downloadUrl,
      });

      await auth.reloadProfile();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  '${fieldName.replaceAll('_', ' ').toUpperCase()} updated successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _saveFooterText() async {
    setState(() => _isSaving = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;

    try {
      if (orgId != null) {
        await FirebaseFirestore.instance
            .collection('organizations')
            .doc(orgId)
            .update({
          'footer_text': _footerController.text.trim(),
        });
        await auth.reloadProfile();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Footer text updated successfully!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save footer: $e')),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _saveReceiptTheme() async {
    setState(() => _isSaving = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;

    try {
      if (orgId != null && _selectedThemeId != null) {
        await FirebaseFirestore.instance
            .collection('organizations')
            .doc(orgId)
            .update({
          'receipt_theme_id': _selectedThemeId,
        });
        await auth.reloadProfile();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Receipt theme saved successfully!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save theme: $e')),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final org = Provider.of<AuthProvider>(context).organization;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt Customization'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: _isSaving
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Customize Receipt Aesthetics',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Upload branding graphics and customize labels to dynamically render on digital and print receipts.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),

                  // Image Upload Cards
                  _buildUploadCard(
                    title: 'Header Logo',
                    subtitle: 'Used at the top center of receipts',
                    imageUrl: org?.logoUrl,
                    onTap: () => _pickAndUploadImage('logo_url'),
                  ),
                  const SizedBox(height: 12),
                  _buildUploadCard(
                    title: 'Left Side Image',
                    subtitle: 'Deity or Trust Logo (Ganpati / Temple)',
                    imageUrl: org?.leftSideImageUrl,
                    onTap: () => _pickAndUploadImage('left_side_image_url'),
                  ),
                  const SizedBox(height: 12),
                  _buildUploadCard(
                    title: 'Right Side Image / Stamp',
                    subtitle: 'Organization Stamp / Bhagwa Flag / Symbol',
                    imageUrl: org?.rightSideImageUrl,
                    onTap: () => _pickAndUploadImage('right_side_image_url'),
                  ),
                  const SizedBox(height: 20),

                  // Footer Text Input
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Footer Text',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _footerController,
                            decoration: const InputDecoration(
                              hintText:
                                  'e.g. Ganpati Bappa Morya / Powered by PavtiBook',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: _saveFooterText,
                            child: const Text('Save Footer Text'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Receipt Theme Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Receipt Theme',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            value: _selectedThemeId,
                            decoration: const InputDecoration(
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 8),
                            ),
                            items: const [
                              DropdownMenuItem(
                                  value: 'traditional_saffron',
                                  child: Text('Traditional Saffron')),
                              DropdownMenuItem(
                                  value: 'royal_blue',
                                  child: Text('Royal Blue')),
                              DropdownMenuItem(
                                  value: 'emerald_green',
                                  child: Text('Emerald Green')),
                              DropdownMenuItem(
                                  value: 'maroon_gold',
                                  child: Text('Maroon Gold')),
                              DropdownMenuItem(
                                  value: 'navy_gold', child: Text('Navy Gold')),
                              DropdownMenuItem(
                                  value: 'brand_theme',
                                  child: Text('Brand Theme')),
                            ],
                            onChanged: (val) {
                              setState(() {
                                _selectedThemeId = val;
                              });
                            },
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: _saveReceiptTheme,
                            child: const Text('Save Theme'),
                          ),
                          const SizedBox(height: 16),
                          (() {
                            final tempProvider =
                                Provider.of<TemplateProvider>(context);
                            TemplateModel? activeTemplate;
                            if (tempProvider.templates.isNotEmpty) {
                              activeTemplate =
                                  tempProvider.templates.firstWhere(
                                (t) => t.isDefault,
                                orElse: () => tempProvider.templates.first,
                              );
                            }
                            final palette = getThemePalette(
                                _selectedThemeId,
                                org ??
                                    OrganizationModel(
                                        id: '',
                                        name: 'Organization',
                                        type: 'trust',
                                        upiId: '',
                                        isVerified: false,
                                        subscriptionPlan: 'free'),
                                activeTemplate);

                            return Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFFBEF),
                                border: Border.all(
                                    color: palette.primary.withOpacity(0.3),
                                    width: 1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const Text(
                                    'Live Theme Preview',
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.blueGrey),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 8),

                                  // Header Preview
                                  Container(
                                    color: palette.primary,
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 6, horizontal: 8),
                                    alignment: Alignment.center,
                                    child: Column(
                                      children: [
                                        Text(
                                          org?.name ?? 'ORGANIZATION NAME',
                                          style: const TextStyle(
                                            color: Color(0xFFFFEE58),
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 1),
                                        const Text(
                                          '॥ श्री गणेश प्रसन्न ॥',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 6.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 10),

                                  // Amount & Signature Row
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      // Amount Box Preview
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 3),
                                        decoration: BoxDecoration(
                                          border: Border.all(
                                              color: palette.primary,
                                              width: 1.5),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                          color: Colors.white,
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.all(1),
                                              decoration: BoxDecoration(
                                                color: palette.primary,
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Text(
                                                '₹',
                                                style: TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 6,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              '1,001/-',
                                              style: TextStyle(
                                                color: palette.primary,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),

                                      // Signature Line Preview
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.center,
                                        children: [
                                          Container(
                                            width: 50,
                                            height: 0.8,
                                            color: palette.accent,
                                          ),
                                          const SizedBox(height: 2),
                                          const Text(
                                            'Signature Accent',
                                            style: TextStyle(
                                              color: Colors.grey,
                                              fontSize: 6,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          })(),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── Preview Receipt Button ──
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              ChangeNotifierProvider<TemplateProvider>.value(
                            value: Provider.of<TemplateProvider>(context,
                                listen: false),
                            child: const ReceiptCustomizationPreviewScreen(),
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.visibility),
                    label: const Text('Preview Receipt'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B1E2D),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      textStyle: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Preview how your receipt will look with current branding settings.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[500], fontSize: 11),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildUploadCard({
    required String title,
    required String subtitle,
    required String? imageUrl,
    required VoidCallback onTap,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(subtitle,
                      style: const TextStyle(color: Colors.grey, fontSize: 11)),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.upload),
                    label: const Text('Upload PNG'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey[300]!),
                borderRadius: BorderRadius.circular(8),
                color: Colors.white,
              ),
              child: imageUrl != null && imageUrl.isNotEmpty
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: (() {
                        debugPrint(
                            'ReceiptCustomizationScreen rendering image URL: $imageUrl');
                        return Image.network(
                          imageUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            debugPrint(
                                'ReceiptCustomizationScreen failed to load image: $error');
                            return const Center(
                              child: Icon(Icons.broken_image,
                                  color: Colors.grey, size: 32),
                            );
                          },
                        );
                      })(),
                    )
                  : const Center(
                      child: Icon(Icons.image, color: Colors.grey, size: 32),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// 2. AUTHORIZED SIGNATURES SCREEN
// ============================================================================
class AuthorizedSignaturesScreen extends StatefulWidget {
  const AuthorizedSignaturesScreen({super.key});

  @override
  State<AuthorizedSignaturesScreen> createState() =>
      _AuthorizedSignaturesScreenState();
}

class _AuthorizedSignaturesScreenState
    extends State<AuthorizedSignaturesScreen> {
  bool _isSaving = false;
  final ImagePicker _picker = ImagePicker();

  final _presidentNameController = TextEditingController();
  final _treasurerNameController = TextEditingController();
  final _memberNameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final org = Provider.of<AuthProvider>(context, listen: false).organization;
    if (org != null) {
      _presidentNameController.text = org.presidentName ?? '';
      _treasurerNameController.text = org.treasurerName ?? '';
      _memberNameController.text = org.memberName ?? '';
    }
  }

  @override
  void dispose() {
    _presidentNameController.dispose();
    _treasurerNameController.dispose();
    _memberNameController.dispose();
    super.dispose();
  }

  Future<void> _saveNames() async {
    setState(() => _isSaving = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    try {
      if (orgId != null) {
        await FirebaseFirestore.instance
            .collection('organizations')
            .doc(orgId)
            .update({
          'president_name': _presidentNameController.text.trim(),
          'treasurer_name': _treasurerNameController.text.trim(),
          'member_name': _memberNameController.text.trim(),
          'president_designation': 'President',
          'treasurer_designation': 'Treasurer',
          'member_designation': 'Member (Sadasya)',
        });
        await auth.reloadProfile();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Authorized person names updated successfully!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save names: $e')),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _pickAndUploadSignature(String fieldName) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    try {
      final XFile? image = await _picker.pickImage(
          source: ImageSource.gallery, imageQuality: 85);
      if (image == null) return;

      setState(() => _isSaving = true);

      // Upload signature
      final file = File(image.path);
      final storage = FirebaseStorage.instance;
      final ref = storage
          .ref()
          .child('organizations')
          .child(orgId)
          .child('$fieldName.png');

      // Before upload logging
      debugPrint('FIREBASE STORAGE SIGNATURE UPLOAD START:');
      debugPrint('  Bucket: ${storage.bucket}');
      debugPrint('  Target Path: ${ref.fullPath}');
      debugPrint('  Local Source File: ${file.path}');

      final UploadTask uploadTask = ref.putFile(file);
      final TaskSnapshot snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();

      // After upload logging
      debugPrint('FIREBASE STORAGE SIGNATURE UPLOAD SUCCESS:');
      debugPrint('  Download URL: $downloadUrl');

      await FirebaseFirestore.instance
          .collection('organizations')
          .doc(orgId)
          .update({
        fieldName: downloadUrl,
      });

      await auth.reloadProfile();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  '${fieldName.replaceAll('_', ' ').toUpperCase()} uploaded successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to upload signature: $e')),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final org = Provider.of<AuthProvider>(context).organization;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Authorized Persons'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: _isSaving
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Manage Authorized Persons',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Manage the names and digital signatures of your office bearers. These are automatically loaded during receipt generation.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  _buildSignatureCard(
                    role: 'President',
                    imageUrl: org?.presidentSignatureUrl,
                    controller: _presidentNameController,
                    onTap: () =>
                        _pickAndUploadSignature('president_signature_url'),
                  ),
                  const SizedBox(height: 12),
                  _buildSignatureCard(
                    role: 'Treasurer',
                    imageUrl: org?.treasurerSignatureUrl,
                    controller: _treasurerNameController,
                    onTap: () =>
                        _pickAndUploadSignature('treasurer_signature_url'),
                  ),
                  const SizedBox(height: 12),
                  _buildSignatureCard(
                    role: 'Member (Sadasya)',
                    imageUrl: org?.agentSignatureUrl,
                    controller: _memberNameController,
                    onTap: () => _pickAndUploadSignature('agent_signature_url'),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _saveNames,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B1E2D),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      textStyle: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    child: const Text('Save Names'),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
    );
  }

  Widget _buildSignatureCard({
    required String role,
    required String? imageUrl,
    required TextEditingController controller,
    required VoidCallback onTap,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(role,
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Color(0xFF8B1E2D))),
            const SizedBox(height: 12),
            TextFormField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Person Name',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Signature Image',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 4),
                      const Text('Upload transparent PNG signature',
                          style: TextStyle(color: Colors.grey, fontSize: 11)),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: onTap,
                        icon: const Icon(Icons.edit),
                        label: const Text('Replace Signature'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Container(
                  width: 120,
                  height: 60,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(4),
                    color: Colors.white,
                  ),
                  child: imageUrl != null && imageUrl.isNotEmpty
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: (() {
                            debugPrint(
                                'AuthorizedSignaturesScreen rendering image URL: $imageUrl');
                            return Image.network(
                              imageUrl,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                debugPrint(
                                    'AuthorizedSignaturesScreen failed to load signature image: $error');
                                return const Center(
                                  child: Icon(Icons.broken_image,
                                      color: Colors.grey, size: 28),
                                );
                              },
                            );
                          })(),
                        )
                      : const Center(
                          child:
                              Icon(Icons.gesture, color: Colors.grey, size: 28),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// 3. UPI PAYMENT SETTINGS SCREEN (QR UPLOAD)
// ============================================================================
class UpiPaymentSettingsScreen extends StatefulWidget {
  const UpiPaymentSettingsScreen({super.key});

  @override
  State<UpiPaymentSettingsScreen> createState() =>
      _UpiPaymentSettingsScreenState();
}

class _UpiPaymentSettingsScreenState extends State<UpiPaymentSettingsScreen> {
  final _upiIdController = TextEditingController();
  final _merchantController = TextEditingController();
  bool _isSaving = false;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final org = Provider.of<AuthProvider>(context, listen: false).organization;
    if (org != null) {
      _upiIdController.text = org.upiId;
      _merchantController.text = org.upiMerchantName ?? org.name;
    }
  }

  @override
  void dispose() {
    _upiIdController.dispose();
    _merchantController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadQr() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    try {
      final XFile? image = await _picker.pickImage(
          source: ImageSource.gallery, imageQuality: 85);
      if (image == null) return;

      setState(() => _isSaving = true);

      // Upload QR Image
      final file = File(image.path);
      final storage = FirebaseStorage.instance;
      final ref = storage
          .ref()
          .child('organizations')
          .child(orgId)
          .child('upi_qr_image.png');

      // Before upload logging
      debugPrint('FIREBASE STORAGE QR UPLOAD START:');
      debugPrint('  Bucket: ${storage.bucket}');
      debugPrint('  Target Path: ${ref.fullPath}');
      debugPrint('  Local Source File: ${file.path}');

      final UploadTask uploadTask = ref.putFile(file);
      final TaskSnapshot snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();

      // After upload logging
      debugPrint('FIREBASE STORAGE QR UPLOAD SUCCESS:');
      debugPrint('  Download URL: $downloadUrl');

      await FirebaseFirestore.instance
          .collection('organizations')
          .doc(orgId)
          .update({
        'upi_qr_image_url': downloadUrl,
      });

      await auth.reloadProfile();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('UPI QR Image uploaded successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('QR Upload failed: $e')),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _saveUpiDetails() async {
    setState(() => _isSaving = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;

    try {
      if (orgId != null) {
        await FirebaseFirestore.instance
            .collection('organizations')
            .doc(orgId)
            .update({
          'upi_id': _upiIdController.text.trim(),
          'upi_merchant_name': _merchantController.text.trim(),
        });
        await auth.reloadProfile();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('UPI configuration saved successfully!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save UPI config: $e')),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final org = Provider.of<AuthProvider>(context).organization;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Settings'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: _isSaving
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'UPI QR Code Configuration',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Configure credentials and upload organization QR code image to receive UPI donations directly.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),

                  // UPI Form Inputs
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('UPI Settings Details',
                              style: TextStyle(fontWeight: FontWeight.bold)),
                          const Divider(),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _upiIdController,
                            decoration: const InputDecoration(
                              labelText: 'UPI ID *',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.account_balance),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _merchantController,
                            decoration: const InputDecoration(
                              labelText: 'Merchant Name *',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.store),
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _saveUpiDetails,
                            child: const Text('Save UPI config'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // QR Image Upload Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Official UPI QR Code Image',
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14)),
                                const SizedBox(height: 4),
                                const Text(
                                    'Displays when donor chooses UPI Pay (QR)',
                                    style: TextStyle(
                                        color: Colors.grey, fontSize: 11)),
                                const SizedBox(height: 12),
                                OutlinedButton.icon(
                                  onPressed: _pickAndUploadQr,
                                  icon: const Icon(Icons.qr_code_2),
                                  label: const Text('Upload QR image'),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey[300]!),
                              borderRadius: BorderRadius.circular(8),
                              color: Colors.white,
                            ),
                            child: org?.upiQrImageUrl != null &&
                                    org!.upiQrImageUrl!.isNotEmpty
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: (() {
                                      final qrUrl = org.upiQrImageUrl!;
                                      debugPrint(
                                          'UpiPaymentSettingsScreen rendering QR image URL: $qrUrl');
                                      return Image.network(
                                        qrUrl,
                                        fit: BoxFit.contain,
                                        errorBuilder:
                                            (context, error, stackTrace) {
                                          debugPrint(
                                              'UpiPaymentSettingsScreen failed to load QR image: $error');
                                          return const Center(
                                            child: Icon(Icons.broken_image,
                                                color: Colors.grey, size: 40),
                                          );
                                        },
                                      );
                                    })(),
                                  )
                                : const Center(
                                    child: Icon(Icons.qr_code,
                                        color: Colors.grey, size: 40),
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

// ============================================================================
// 4. FIREBASE DATA INTEGRITY AUDIT SCREEN
// ============================================================================
class AuditResult {
  final String title;
  final String description;
  final String status; // 'PASS', 'WARNING', 'ERROR'
  final int count;
  final List<String> details;

  AuditResult({
    required this.title,
    required this.description,
    required this.status,
    required this.count,
    required this.details,
  });
}

class FirebaseAuditScreen extends StatefulWidget {
  const FirebaseAuditScreen({super.key});

  @override
  State<FirebaseAuditScreen> createState() => _FirebaseAuditScreenState();
}

class _FirebaseAuditScreenState extends State<FirebaseAuditScreen> {
  bool _isLoading = false;
  int _totalReceipts = 0;
  int _totalDonors = 0;
  List<AuditResult> _auditResults = [];
  bool _hasMismatches = false;

  Future<void> _runAudit() async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _isLoading = true);
    _auditResults.clear();
    _hasMismatches = false;

    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final orgId = auth.organization?.id;
      if (orgId == null) throw Exception("Organization not found.");

      // Fetch organization
      final orgDoc = await FirebaseFirestore.instance
          .collection('organizations')
          .doc(orgId)
          .get();
      final orgExists = orgDoc.exists;

      // Fetch all receipts
      final receiptsSnapshot = await FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId)
          .get();

      // Fetch all donors
      final donorsSnapshot = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .get();

      _totalReceipts = receiptsSnapshot.docs.length;
      _totalDonors = donorsSnapshot.docs.length;

      // 1. Duplicate Receipt Numbers
      final Map<String, int> receiptNumCounts = {};
      final List<String> duplicateDetails = [];
      for (var doc in receiptsSnapshot.docs) {
        final num =
            doc.data()['receiptNumber'] ?? doc.data()['receipt_number'] ?? '';
        if (num.isNotEmpty) {
          receiptNumCounts[num] = (receiptNumCounts[num] ?? 0) + 1;
        }
      }
      receiptNumCounts.forEach((rNumVal, countVal) {
        if (countVal > 1) {
          duplicateDetails
              .add('Receipt Number "$rNumVal" is duplicated $countVal times.');
        }
      });

      // 2. Missing Donor References
      final Set<String> donorIds = donorsSnapshot.docs.map((d) => d.id).toSet();
      final List<String> missingDonorDetails = [];
      for (var doc in receiptsSnapshot.docs) {
        final dId = doc.data()['donorId'] ?? doc.data()['donor_id'] ?? '';
        final rNum = doc.data()['receiptNumber'] ??
            doc.data()['receipt_number'] ??
            'N/A';
        if (dId.isEmpty) {
          missingDonorDetails
              .add('Receipt $rNum has an empty donor reference.');
        } else if (!donorIds.contains(dId)) {
          missingDonorDetails.add(
              'Receipt $rNum references donor ID "$dId" which does not exist.');
        }
      }

      // 3. Missing Organization References
      final List<String> missingOrgDetails = [];
      if (!orgExists) {
        missingOrgDetails.add(
            'Active organization profile document not found in /organizations collection.');
      }
      for (var doc in receiptsSnapshot.docs) {
        final oId =
            doc.data()['organizationId'] ?? doc.data()['organization_id'] ?? '';
        final rNum = doc.data()['receiptNumber'] ??
            doc.data()['receipt_number'] ??
            'N/A';
        if (oId.isEmpty) {
          missingOrgDetails
              .add('Receipt $rNum has an empty organization reference.');
        } else if (oId != orgId) {
          missingOrgDetails.add(
              'Receipt $rNum references organization ID "$oId" (mismatched).');
        }
      }
      for (var doc in donorsSnapshot.docs) {
        final oId =
            doc.data()['organizationId'] ?? doc.data()['organizationId'] ?? '';
        final name = doc.data()['name'] ?? 'Donor';
        if (oId.isEmpty) {
          missingOrgDetails
              .add('Donor "$name" has an empty organization reference.');
        } else if (oId != orgId) {
          missingOrgDetails.add(
              'Donor "$name" references organization ID "$oId" (mismatched).');
        }
      }

      // 4. Receipt Amount Mismatch
      final List<String> amountMismatchDetails = [];
      final Map<String, List<double>> donorPaidReceipts = {};
      for (var doc in receiptsSnapshot.docs) {
        final dId = doc.data()['donorId'] ?? doc.data()['donor_id'] ?? '';
        final status =
            doc.data()['paymentStatus'] ?? doc.data()['payment_status'] ?? '';
        final amount = (doc.data()['amount'] is num)
            ? (doc.data()['amount'] as num).toDouble()
            : 0.0;
        final rNum = doc.data()['receiptNumber'] ??
            doc.data()['receipt_number'] ??
            'N/A';

        if (amount <= 0.0) {
          amountMismatchDetails
              .add('Receipt $rNum contains an invalid amount: ₹$amount');
        }

        if (status == 'paid' && dId.isNotEmpty) {
          donorPaidReceipts.putIfAbsent(dId, () => []).add(amount);
        }
      }
      for (var doc in donorsSnapshot.docs) {
        final data = doc.data();
        final name = data['name'] ?? 'Donor';
        final recordedTotal = (data['totalDonated'] is num)
            ? (data['totalDonated'] as num).toDouble()
            : 0.0;
        final recordedCount = data['donationCount'] ?? 0;

        final receipts = donorPaidReceipts[doc.id] ?? [];
        final double calculatedTotal =
            receipts.fold(0, (prev, element) => prev + element);
        final calculatedCount = receipts.length;

        if (recordedTotal != calculatedTotal ||
            recordedCount != calculatedCount) {
          amountMismatchDetails.add(
              'Donor "$name": DB shows ₹$recordedTotal (${recordedCount}x paid), but receipts calculate to ₹$calculatedTotal (${calculatedCount}x paid)');
        }
      }
      if (amountMismatchDetails.isNotEmpty) {
        _hasMismatches = true;
      }

      // 5. Pending Balance Mismatch
      final List<String> pendingMismatchDetails = [];
      for (var doc in receiptsSnapshot.docs) {
        final status =
            doc.data()['paymentStatus'] ?? doc.data()['payment_status'] ?? '';
        final amount = (doc.data()['amount'] is num)
            ? (doc.data()['amount'] as num).toDouble()
            : 0.0;
        final rNum = doc.data()['receiptNumber'] ??
            doc.data()['receipt_number'] ??
            'N/A';
        final hasTxnRef = doc.data()['transactionRef'] != null &&
            doc.data()['transactionRef'].toString().isNotEmpty;
        final hasReconciled = doc.data()['reconciledAt'] != null;

        if (status == 'pending') {
          if (amount <= 0.0) {
            pendingMismatchDetails.add(
                'Pending receipt $rNum contains an invalid pending amount: ₹$amount');
          }
          if (hasTxnRef || hasReconciled) {
            pendingMismatchDetails.add(
                'Pending receipt $rNum exhibits paid markers (has transaction ref or reconciled timestamp).');
          }
        }
      }

      // 6. Orphan Records
      final List<String> orphanDetails = [];
      for (var doc in donorsSnapshot.docs) {
        final data = doc.data();
        final name = data['name'] ?? 'Donor';
        final recordedTotal = (data['totalDonated'] is num)
            ? (data['totalDonated'] as num).toDouble()
            : 0.0;
        final recordedCount = data['donationCount'] ?? 0;

        final receipts = donorPaidReceipts[doc.id] ?? [];
        if (receipts.isEmpty && (recordedTotal > 0 || recordedCount > 0)) {
          orphanDetails.add(
              'Donor "$name" has no receipts in database, but has recorded total ₹$recordedTotal (${recordedCount}x).');
        }
      }
      for (var doc in receiptsSnapshot.docs) {
        final cId =
            doc.data()['collectorId'] ?? doc.data()['collector_id'] ?? '';
        final rNum = doc.data()['receiptNumber'] ??
            doc.data()['receipt_number'] ??
            'N/A';
        if (cId.isEmpty) {
          orphanDetails.add('Receipt $rNum has an empty collectorId.');
        }
      }

      _auditResults = [
        AuditResult(
          title: 'Duplicate Receipt Numbers',
          description:
              'Checks for receipt documents sharing the same receipt number.',
          status: duplicateDetails.isNotEmpty ? 'ERROR' : 'PASS',
          count: duplicateDetails.length,
          details: duplicateDetails,
        ),
        AuditResult(
          title: 'Missing Donor References',
          description:
              'Checks for receipts with empty donor references or invalid references pointing to non-existent donors.',
          status: missingDonorDetails.isNotEmpty ? 'ERROR' : 'PASS',
          count: missingDonorDetails.length,
          details: missingDonorDetails,
        ),
        AuditResult(
          title: 'Missing Organization References',
          description:
              'Checks for missing organization profile documents or mismatched organization references in child records.',
          status: missingOrgDetails.isNotEmpty ? 'ERROR' : 'PASS',
          count: missingOrgDetails.length,
          details: missingOrgDetails,
        ),
        AuditResult(
          title: 'Receipt Amount Mismatch',
          description:
              'Checks for invalid receipt amounts or discrepancies between donor summaries and actual receipt totals.',
          status: amountMismatchDetails.isNotEmpty ? 'ERROR' : 'PASS',
          count: amountMismatchDetails.length,
          details: amountMismatchDetails,
        ),
        AuditResult(
          title: 'Pending Balance Mismatch',
          description:
              'Checks for pending receipts with invalid amounts or inconsistent payment status markers.',
          status: pendingMismatchDetails.isNotEmpty ? 'WARNING' : 'PASS',
          count: pendingMismatchDetails.length,
          details: pendingMismatchDetails,
        ),
        AuditResult(
          title: 'Orphan Records',
          description:
              'Checks for donors with no receipts but positive balances, or receipts missing collector references.',
          status: orphanDetails.isNotEmpty ? 'WARNING' : 'PASS',
          count: orphanDetails.length,
          details: orphanDetails,
        ),
      ];
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('Audit failed: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _fixMismatches() async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _isLoading = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final orgId = auth.organization?.id;
      if (orgId == null) throw Exception("Organization not found.");

      final receiptsSnapshot = await FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId)
          .get();

      final donorsSnapshot = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .get();

      final Map<String, List<double>> donorPaidReceipts = {};
      for (var doc in receiptsSnapshot.docs) {
        final dId = doc.data()['donorId'] ?? doc.data()['donor_id'] ?? '';
        final status =
            doc.data()['paymentStatus'] ?? doc.data()['payment_status'] ?? '';
        final amount = (doc.data()['amount'] is num)
            ? (doc.data()['amount'] as num).toDouble()
            : 0.0;

        if (status == 'paid' && dId.isNotEmpty) {
          donorPaidReceipts.putIfAbsent(dId, () => []).add(amount);
        }
      }

      final batch = FirebaseFirestore.instance.batch();
      int updateCount = 0;

      for (var doc in donorsSnapshot.docs) {
        final data = doc.data();
        final recordedTotal = (data['totalDonated'] is num)
            ? (data['totalDonated'] as num).toDouble()
            : 0.0;
        final recordedCount = data['donationCount'] ?? 0;

        final receipts = donorPaidReceipts[doc.id] ?? [];
        final double calculatedTotal =
            receipts.fold(0, (prev, element) => prev + element);
        final calculatedCount = receipts.length;

        if (recordedTotal != calculatedTotal ||
            recordedCount != calculatedCount) {
          batch.update(doc.reference, {
            'totalDonated': calculatedTotal,
            'donationCount': calculatedCount,
          });
          updateCount++;
        }
      }

      if (updateCount > 0) {
        await batch.commit();
        messenger.showSnackBar(
          SnackBar(
              content:
                  Text('Successfully reconciled $updateCount donor profiles!')),
        );
        await _runAudit();
      } else {
        messenger.showSnackBar(
          const SnackBar(content: Text('No mismatches to reconcile.')),
        );
      }
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('Failed to reconcile: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Firebase Consistency Audit'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Firestore Data Integrity Audit',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Run verification scans across receipts, donors, and organizations database to identify and reconcile duplicate records or calculations.',
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _runAudit,
                    icon: const Icon(Icons.health_and_safety_outlined),
                    label: const Text('Run Audit Scan'),
                  ),
                ),
                if (_hasMismatches) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isLoading ? null : _fixMismatches,
                      icon: const Icon(Icons.build_outlined),
                      label: const Text('Reconcile Balances'),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.green),
                        foregroundColor: Colors.green,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 20),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Totals Card
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceAround,
                                children: [
                                  _buildAuditMetric(
                                      'Receipts Checked', '$_totalReceipts'),
                                  _buildAuditMetric(
                                      'Donors Checked', '$_totalDonors'),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          if (_auditResults.isEmpty)
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(vertical: 40.0),
                              child: Center(
                                child: Text(
                                  'No audit scan performed yet. Click "Run Audit Scan" above.',
                                  style: TextStyle(
                                      color: Colors.grey[600],
                                      fontStyle: FontStyle.italic),
                                ),
                              ),
                            )
                          else
                            ..._auditResults.map((result) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12.0),
                                  child: _buildAuditResultCard(result),
                                )),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAuditMetric(String label, String value) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ],
    );
  }

  Widget _buildAuditResultCard(AuditResult result) {
    final isPass = result.status == 'PASS';
    final isWarning = result.status == 'WARNING';

    final Color badgeColor = isPass
        ? Colors.green
        : isWarning
            ? Colors.orange[800]!
            : Colors.red;

    final Color badgeBg = isPass
        ? Colors.green[50]!
        : isWarning
            ? Colors.orange[50]!
            : Colors.red[50]!;

    final IconData icon = isPass
        ? Icons.check_circle_outline
        : isWarning
            ? Icons.warning_amber_outlined
            : Icons.error_outline;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: badgeColor, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    result.title,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    result.status,
                    style: TextStyle(
                      color: badgeColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              result.description,
              style: TextStyle(color: Colors.grey[600], fontSize: 11),
            ),
            const Divider(),
            const SizedBox(height: 4),
            if (isPass)
              const Text(
                'Audit completed. No integrity issues found.',
                style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontStyle: FontStyle.italic),
              )
            else ...[
              Text(
                'Found ${result.count} issue(s):',
                style: TextStyle(
                    color: badgeColor,
                    fontSize: 12,
                    fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: result.details
                    .map((detail) => Padding(
                          padding: const EdgeInsets.only(bottom: 6.0),
                          child: Text(
                            '• $detail',
                            style: const TextStyle(
                                fontSize: 11, color: Colors.black87),
                          ),
                        ))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// 5. RECEIPT CUSTOMIZATION PREVIEW SCREEN
// ============================================================================
class ReceiptCustomizationPreviewScreen extends StatelessWidget {
  const ReceiptCustomizationPreviewScreen({super.key});

  /// Builds a sample ReceiptModel using current org snapshot fields.
  ReceiptModel _buildSampleReceipt(OrganizationModel org) {
    return ReceiptModel(
      id: 'preview-sample-id',
      organizationId: org.id,
      templateId: null,
      donorId: 'preview-donor-id',
      collectorId: null,
      receiptNumber: 'PB-2026-999999',
      amount: 1001,
      purpose: 'Sample Donation',
      paymentMode: 'cash',
      paymentStatus: 'paid',
      qrCodeValue: 'preview-qr-sample',
      createdAt: DateTime.now().toIso8601String(),
      donorName: 'Sample Donor',
      donorMobile: '9999999999',
      collectorName: 'Admin',
      donorAddress: 'Sample Address, City',
      // Snapshot all current org branding
      headerLogoUrl: org.logoUrl,
      leftSideImageUrl: org.leftSideImageUrl,
      rightSideImageUrl: org.rightSideImageUrl,
      customStampUrl: org.customStampUrl,
      footerText: org.footerText,
      signatureUrl: org.treasurerSignatureUrl,
      collectorRole: 'Treasurer',
      organizationName: org.name,
      organizationLogoUrl: org.logoUrl,
      leftImageUrl: org.leftSideImageUrl,
      rightImageUrl: org.rightSideImageUrl,
      stampUrl: org.customStampUrl,
      collectorSignatureUrl: org.treasurerSignatureUrl,
      editedAt: null,
      editedBy: null,
    );
  }

  TemplateModel _buildPreviewTemplate(
      OrganizationModel org, TemplateModel? activeTemplate) {
    if (activeTemplate != null) return activeTemplate;
    return TemplateModel(
      id: 'preview-template',
      organizationId: org.id,
      name: 'Preview Template',
      type: 'traditional',
      bgColor: '#FFFDD0',
      borderStyle: 'double',
      borderColor: '#E65100',
      fontFamily: 'Poppins',
      fontColor: '#3E2723',
      logoVisible: true,
      godImagePosition: 'left',
      watermarkOpacity: 0.08,
      signatureLabel: 'Treasurer',
      isDefault: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final tempProvider = Provider.of<TemplateProvider>(context);
    final org = auth.organization;

    if (org == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final sampleReceipt = _buildSampleReceipt(org);

    TemplateModel? activeTemplate;
    if (tempProvider.templates.isNotEmpty) {
      activeTemplate = tempProvider.templates.firstWhere(
        (t) => t.isDefault,
        orElse: () => tempProvider.templates.first,
      );
    }
    final template = _buildPreviewTemplate(org, activeTemplate);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt Preview'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.amber[100],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber[700]!),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.visibility, size: 14, color: Colors.amber[900]),
                const SizedBox(width: 4),
                Text(
                  'PREVIEW ONLY',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.amber[900],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info Banner
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue[700], size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'This is a read-only design preview using sample data. No receipt is being created. Changes in customization are reflected here immediately.',
                      style: TextStyle(fontSize: 12, color: Colors.blue[900]),
                    ),
                  ),
                ],
              ),
            ),

            // Sample Data Badge
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _buildSampleBadge('Donor: Sample Donor'),
                _buildSampleBadge('Receipt: PB-2026-999999'),
                _buildSampleBadge('Amount: ₹1,001'),
                _buildSampleBadge('Purpose: Sample Donation'),
              ],
            ),
            const SizedBox(height: 16),

            // The Receipt Preview
            TraditionalReceiptWidget(
              receipt: sampleReceipt,
              organization: org,
              template: template,
            ),

            const SizedBox(height: 24),

            // Active branding assets list
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Active Branding Assets',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 12),
                    _buildAssetRow('Header Logo', org.logoUrl),
                    _buildAssetRow('Left Image', org.leftSideImageUrl),
                    _buildAssetRow(
                        'Right Image / Stamp', org.rightSideImageUrl),
                    _buildAssetRow('Custom Stamp', org.customStampUrl),
                    _buildAssetRow(
                        'Treasurer Signature', org.treasurerSignatureUrl),
                    _buildAssetRow('Footer Text', org.footerText, isText: true),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildSampleBadge(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E0),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE65100)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: Color(0xFF8B1E2D),
        ),
      ),
    );
  }

  Widget _buildAssetRow(String label, String? value, {bool isText = false}) {
    final isSet = value != null && value.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            isSet ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 16,
            color: isSet ? Colors.green[700] : Colors.grey,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              isSet ? (isText ? value : 'Uploaded ✓') : 'Not set',
              style: TextStyle(
                fontSize: 11,
                color: isSet ? Colors.green[800] : Colors.grey,
                fontStyle: isSet ? FontStyle.normal : FontStyle.italic,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// 7. SUBSCRIPTION USAGE SCREEN
// ============================================================================
class SubscriptionUsageScreen extends StatefulWidget {
  const SubscriptionUsageScreen({super.key});

  @override
  State<SubscriptionUsageScreen> createState() =>
      _SubscriptionUsageScreenState();
}

class _SubscriptionUsageScreenState extends State<SubscriptionUsageScreen> {
  bool _isLoading = true;
  String? _error;
  SubscriptionModel? _sub;
  Map<String, dynamic>? _config;
  bool _isUpgrading = false;

  final PaymentService _paymentService = PaymentService();
  String? _pendingPlanType;
  bool _isPaymentProcessing = false;
  bool _checkedArguments = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_checkedArguments) {
      _checkedArguments = true;
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        final plan = args['plan'] as String?;
        if (plan != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _handleUpgrade(plan);
          });
        }
      }
    }
  }

  @override
  void initState() {
    super.initState();

    _paymentService.init(
      onSuccess: _handlePaymentSuccess,
      onFailure: _handlePaymentFailure,
      onExternalWallet: _handleExternalWallet,
    );

    _loadData();
  }

  @override
  void dispose() {
    _paymentService.clear();
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

  // Load subscription information from SubscriptionService with 10s timeout
  Future<void> _loadData() async {
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
          _error =
              "Unable to load subscription information: No organization found.";
        });
      }
      return;
    }

    try {
      // 10 second timeout on fetching config & subscription
      final results = await Future.wait([
        SubscriptionService.fetchSubscriptionConfig(),
        SubscriptionService.fetchCurrentSubscription(orgId),
      ]).timeout(const Duration(seconds: 10));

      final config = results[0] as Map<String, dynamic>;
      final subscription = results[1] as SubscriptionModel;

      // Reload global profile state so it has the latest plan/sub
      await auth
          .reloadProfile()
          .timeout(const Duration(seconds: 5))
          .catchError((_) {});

      if (mounted) {
        setState(() {
          _config = config;
          _sub = subscription;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e, stack) {
      final formatted = _logAndFormatError(
        operation: 'Load Subscription Screen Data',
        collection: 'subscriptions / subscription_config',
        docId: orgId,
        exception: e,
        stackTrace: stack,
      );
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = "Unable to load subscription information: $formatted";
        });
      }
    }
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessData response) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null || _pendingPlanType == null) return;

    setState(() {
      _isPaymentProcessing = true;
    });

    final operatorName = auth.user?.name ?? 'Owner';
    final oldPlan = _sub?.plan ?? 'free_trial';

    String? errorReason;
    try {
      final verificationResult = await _paymentService.verifyPayment(
        paymentId: response.paymentId,
        orderId: response.orderId,
        signature: response.signature,
        orgId: orgId,
        planName: _pendingPlanType!,
        operatorName: operatorName,
        oldPlan: oldPlan,
        extraData: response.extraData,
      );

      if (verificationResult['success'] != true) {
        errorReason = 'Verification failed on server.';
      }
    } catch (e, stack) {
      errorReason = _logAndFormatError(
        operation: 'Verify Payment ($_pendingPlanType)',
        collection: 'subscriptions',
        docId: orgId,
        exception: e,
        stackTrace: stack,
      );
    }

    if (mounted) {
      setState(() {
        _isPaymentProcessing = false;
      });
    }

    if (errorReason == null) {
      try {
        await auth
            .reloadProfile()
            .timeout(const Duration(seconds: 5))
            .catchError((_) {});
        await _loadData();
      } catch (_) {}

      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('✅ Payment Successful'),
            content: const Text('Subscription Activated'),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.of(context)
                      .pushNamedAndRemoveUntil('/dashboard', (route) => false);
                },
                child: const Text('Return to Dashboard'),
              ),
            ],
          ),
        );
      }
    } else {
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Payment Verification Failed'),
            content: Text(
                'Your payment was received but could not be verified: $errorReason. Please contact support.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    }
  }

  void _handlePaymentFailure(PaymentFailureData response) {
    debugPrint('Payment failed: ${response.code} - ${response.message}');
    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Payment Failed'),
          content: const Text('Please try again.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    debugPrint('External wallet: ${response.walletName}');
  }

  Future<void> _handleUpgrade(String planType) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null || _config == null) return;

    final config = _config!;
    final double price = planType == 'monthly'
        ? (config['monthly_price'] ?? 99).toDouble()
        : planType == 'yearly'
            ? (config['yearly_price'] ?? 999).toDouble()
            : planType == 'premium_monthly'
                ? (config['premium_monthly_price'] ?? 199).toDouble()
                : (config['premium_yearly_price'] ?? 1999).toDouble();

    final int usersLimit = planType.contains('premium')
        ? (config['premium_users'] ?? 10)
        : (config['monthly_users'] ?? 3);

    final int savings = planType.contains('premium')
        ? ((config['premium_monthly_price'] ?? 199) * 12) - price.toInt()
        : ((config['monthly_price'] ?? 99) * 12) - price.toInt();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(planType.contains('yearly')
            ? 'Upgrade & Save ₹$savings'
            : 'Upgrade Plan'),
        content: Text(
            'Are you sure you want to switch to the ${planType.contains('premium') ? 'Premium' : 'Professional'} ${planType.contains('monthly') ? 'Monthly Plan' : 'Yearly Plan'} for ₹${price.toStringAsFixed(0)}?\n\n'
            'This plan includes unlimited receipt generation and supports up to $usersLimit team members.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B1E2D),
            ),
            child: const Text('Upgrade'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isUpgrading = true);
    try {
      final orderResult = await _paymentService.createOrder(
        amount: price,
        orgId: orgId,
        planName: planType,
      );

      final orderId = orderResult['orderId'];
      final keyId = orderResult['keyId'];

      if (orderId == null || keyId == null) {
        throw Exception('Server failed to initialize payment order.');
      }

      _pendingPlanType = planType;

      setState(() {
        _isUpgrading = false;
      });

      final orgName = auth.organization?.name ?? 'PavtiBook';
      final ownerName =
          auth.organization?.contactPerson ?? auth.user?.name ?? 'Owner';
      final ownerMobile =
          auth.organization?.mobile ?? auth.user?.mobile ?? '9999999999';
      final ownerEmail = auth.organization?.email ??
          auth.user?.email ??
          'support@pavtibook.online';

      await _paymentService.openCheckout(
        keyId: keyId,
        orderId: orderId,
        amount: price,
        orgName: orgName,
        planName: planType,
        prefillName: ownerName,
        prefillContact: ownerMobile,
        prefillEmail: ownerEmail,
      );
    } catch (e, stack) {
      final errorReason = _logAndFormatError(
        operation: 'Create Razorpay Order ($planType)',
        collection: 'orders',
        exception: e,
        stackTrace: stack,
      );
      if (!mounted) return;
      setState(() => _isUpgrading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Checkout initialization failed: $errorReason'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscription & Quota'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isUpgrading || _isPaymentProcessing) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              _isPaymentProcessing
                  ? 'Verifying Payment on Server...'
                  : 'Preparing Checkout...',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }

    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading subscription details...',
                style: TextStyle(color: Colors.grey, fontSize: 13)),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                _error!,
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _loadData,
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
      );
    }

    final sub = _sub!;
    final config = _config!;

    final planDisplayName = sub.plan == 'free_trial'
        ? 'Free Trial'
        : (sub.plan == 'monthly' || sub.plan == 'professional_monthly')
            ? 'Professional Monthly'
            : (sub.plan == 'yearly' || sub.plan == 'professional_yearly')
                ? 'Professional Yearly'
                : sub.plan == 'premium_monthly'
                    ? 'Premium Monthly'
                    : sub.plan == 'premium_yearly'
                        ? 'Premium Yearly'
                        : sub.plan.toUpperCase();

    final used = sub.receiptsUsed;
    final limit = sub.receiptLimit;
    final ratio = limit > 0 ? (used / limit).clamp(0.0, 1.0) : 0.0;

    final teamUsed = sub.usersUsed;
    final teamLimit = sub.usersLimit;
    final teamRatio =
        teamLimit > 0 ? (teamUsed / teamLimit).clamp(0.0, 1.0) : 0.0;

    int remainingDays = 0;
    if (sub.renewalDate.isNotEmpty) {
      try {
        final renewal = DateTime.parse(sub.renewalDate);
        remainingDays = renewal.difference(DateTime.now()).inDays;
        if (remainingDays < 0) remainingDays = 0;
      } catch (_) {}
    }

    Color getProgressColor(double r) {
      if (r < 0.7) return Colors.green;
      if (r < 0.9) return Colors.orange;
      return Colors.red;
    }

    final receiptsColor = getProgressColor(ratio);
    final usersColor = getProgressColor(teamRatio);

    Widget? warningWidget;
    if (ratio >= 0.9) {
      warningWidget = const Text(
        '🔴 Only few receipts remaining.',
        style: TextStyle(
            color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold),
      );
    } else if (ratio >= 0.7) {
      warningWidget = const Text(
        '⚠ You\'re approaching your receipt limit.',
        style: TextStyle(
            color: Colors.orangeAccent,
            fontSize: 11,
            fontWeight: FontWeight.bold),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Active Plan Card
          Card(
            elevation: 3,
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey.withOpacity(0.1)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            planDisplayName,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF2E1C0C),
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green[300]!),
                        ),
                        child: Text(
                          'Active',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.green[800],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Receipts Used:',
                          style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text(sub.plan == 'free_trial' ? '$used / $limit' : '$used / Unlimited',
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  if (sub.plan == 'free_trial') ...[
                    const SizedBox(height: 6),
                    TweenAnimationBuilder<double>(
                      tween: Tween<double>(begin: 0.0, end: ratio),
                      duration: const Duration(milliseconds: 1000),
                      builder: (context, val, child) {
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: val,
                            minHeight: 10,
                            backgroundColor: Colors.grey[200],
                            valueColor:
                                AlwaysStoppedAnimation<Color>(receiptsColor),
                          ),
                        );
                      },
                    ),
                    if (warningWidget != null) ...[
                      const SizedBox(height: 4),
                      warningWidget,
                    ],
                  ],
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Users:',
                          style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('$teamUsed / $teamLimit',
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  TweenAnimationBuilder<double>(
                    tween: Tween<double>(begin: 0.0, end: teamRatio),
                    duration: const Duration(milliseconds: 1000),
                    builder: (context, val, child) {
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: val,
                          minHeight: 10,
                          backgroundColor: Colors.grey[200],
                          valueColor: AlwaysStoppedAnimation<Color>(usersColor),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        sub.plan == 'free_trial'
                            ? 'Remaining Trial Days:'
                            : 'Remaining Days:',
                        style:
                            const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      Text(
                        '$remainingDays Days',
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF8B1E2D)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Available Plans',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _buildProfessionalPlanCard(context, sub, config),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildPremiumPlanCard(context, sub, config),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Text(
            'Plan Feature Comparison',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildComparisonTable(),
          const SizedBox(height: 24),
          const Text(
            'Subscription History',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          FutureBuilder<QuerySnapshot<Map<String, dynamic>>>(
            future: FirebaseFirestore.instance
                .collection('subscription_history')
                .where('organizationId', isEqualTo: _sub?.organizationId)
                .orderBy('activatedAt', descending: true)
                .get(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return Card(
                  color: Colors.white,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(
                      'No transactions found.',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                  ),
                );
              }

              final docs = snapshot.data!.docs;
              return Card(
                color: Colors.white,
                elevation: 1,
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: docs.length,
                  separatorBuilder: (context, index) =>
                      const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final data = docs[index].data();
                    final oldPlan = data['oldPlan'] ?? 'N/A';
                    final newPlan = data['newPlan'] ?? data['plan'] ?? 'N/A';
                    final amount = data['amountPaid'] ?? 0.0;
                    final date = _parseDate(data['activatedAt']);
                    final operator = data['operator'] ?? 'System';
                    final status = data['status'] ?? 'Success';
                    final txId = data['razorpayTransactionId'] ?? 'N/A';

                    return ListTile(
                      dense: true,
                      title: Text(
                        '${oldPlan.toString().toUpperCase()} → ${newPlan.toString().toUpperCase()}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text(
                          'Date: $date\nOperator: $operator • Status: $status\nTxID: $txId'),
                      isThreeLine: true,
                      trailing: Text(
                        '₹$amount',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF8B1E2D)),
                      ),
                    );
                  },
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          const Text(
            'Future Payment History',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Card(
            color: Colors.white,
            elevation: 1,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  Icon(Icons.payment_outlined,
                      color: Colors.grey[400], size: 28),
                  const SizedBox(height: 8),
                  Text(
                    remainingDays > 0
                        ? 'No future payments scheduled. Next renewal check on ${DateFormat('dd MMM yyyy').format(DateTime.now().add(Duration(days: remainingDays)))}.'
                        : 'No future payments scheduled.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: TextButton.icon(
              onPressed: () async {
                setState(() => _isPaymentProcessing = true);
                try {
                  await _paymentService.restorePurchases();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Purchase restore check triggered.')),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Restore failed: $e')),
                    );
                  }
                } finally {
                  if (mounted) {
                    setState(() => _isPaymentProcessing = false);
                  }
                }
              },
              icon: const Icon(Icons.restore, color: Color(0xFF8B1E2D)),
              label: const Text(
                'Restore Google Play Purchases',
                style: TextStyle(
                  color: Color(0xFF8B1E2D),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildProfessionalPlanCard(BuildContext context, SubscriptionModel sub,
      Map<String, dynamic> config) {
    final isMonthlyActive = sub.plan == 'monthly' || sub.plan == 'professional_monthly';
    final isYearlyActive = sub.plan == 'yearly' || sub.plan == 'professional_yearly';
    final isProfessionalActive = isMonthlyActive || isYearlyActive;
    final isPremiumActive = sub.plan == 'premium_monthly' || sub.plan == 'premium_yearly';

    final monthlyPrice = config['monthly_price'] ?? 99;
    final yearlyPrice = config['yearly_price'] ?? 999;
    final savings = (monthlyPrice * 12) - yearlyPrice;

    return Card(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isProfessionalActive ? const Color(0xFF8B1E2D) : Colors.grey.withOpacity(0.15),
          width: isProfessionalActive ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Professional',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Color(0xFF2E1C0C)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            _buildPlanFeature(Icons.receipt_long_outlined, 'Unlimited Receipt Generation'),
            const SizedBox(height: 6),
            _buildPlanFeature(Icons.download_outlined, 'Unlimited PDF & JPG Downloads'),
            const SizedBox(height: 6),
            _buildPlanFeature(Icons.people_alt_outlined, 'Donor Management'),
            const SizedBox(height: 6),
            _buildPlanFeature(Icons.file_download_outlined, 'CSV Export'),
            const SizedBox(height: 6),
            _buildPlanFeature(Icons.share_outlined, 'Unlimited WhatsApp Share Now'),
            const SizedBox(height: 6),
            _buildPlanFeature(Icons.sync_outlined, 'Multi Device Access'),
            const SizedBox(height: 6),
            _buildPlanFeature(Icons.edit_note_outlined, 'Custom Branding & Signatures'),
            const Divider(height: 24),
            
            // Monthly Billing Option
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Monthly Billing', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    Text('₹$monthlyPrice / Month', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
                if (isMonthlyActive)
                  _buildActiveBadge()
                else if (isPremiumActive)
                  const SizedBox()
                else
                  ElevatedButton(
                    onPressed: () => _handleUpgrade('monthly'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B1E2D),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    child: const Text('Choose', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Yearly Billing Option
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('Yearly Billing', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(color: Colors.green[100], borderRadius: BorderRadius.circular(4)),
                          child: Text('Save ₹$savings', style: TextStyle(fontSize: 7, fontWeight: FontWeight.bold, color: Colors.green[800])),
                        ),
                      ],
                    ),
                    Text('₹$yearlyPrice / Year', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
                if (isYearlyActive)
                  _buildActiveBadge()
                else if (isPremiumActive)
                  const SizedBox()
                else
                  ElevatedButton(
                    onPressed: () => _handleUpgrade('yearly'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B1E2D),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    child: const Text('Choose', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPremiumPlanCard(BuildContext context, SubscriptionModel sub,
      Map<String, dynamic> config) {
    final isMonthlyActive = sub.plan == 'premium_monthly';
    final isYearlyActive = sub.plan == 'premium_yearly';
    final isPremiumActive = isMonthlyActive || isYearlyActive;
    final monthlyPrice = config['premium_monthly_price'] ?? 199;
    final yearlyPrice = config['premium_yearly_price'] ?? 1999;
    final savings = (monthlyPrice * 12) - yearlyPrice;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.amber.withOpacity(isPremiumActive ? 0.35 : 0.15),
            blurRadius: isPremiumActive ? 12 : 6,
            spreadRadius: isPremiumActive ? 2 : 0,
          )
        ],
      ),
      child: Card(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isPremiumActive ? Colors.green : Colors.amber[600]!,
            width: 2.2,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber[700],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      '⭐ MOST POPULAR',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Premium',
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Color(0xFF2E1C0C)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              _buildPlanFeature(Icons.star_outline, 'Everything in Professional'),
              const SizedBox(height: 6),
              _buildPlanFeature(Icons.bolt, 'Auto WhatsApp Send'),
              const SizedBox(height: 6),
              _buildPlanFeature(Icons.chat_bubble_outline, '1000 Auto Sends per Month'),
              const SizedBox(height: 6),
              _buildPlanFeature(Icons.analytics_outlined, 'Advanced Analytics'),
              const SizedBox(height: 6),
              _buildPlanFeature(Icons.support_agent_outlined, 'Priority Support'),
              const Divider(height: 24),
              
              // Monthly Billing Option
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Monthly Billing', style: TextStyle(fontSize: 10, color: Colors.grey)),
                      Text('₹$monthlyPrice / Month', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  if (isMonthlyActive)
                    _buildActiveBadge()
                  else
                    ElevatedButton(
                      onPressed: () => _handleUpgrade('premium_monthly'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber[700],
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      ),
                      child: const Text('Choose', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Yearly Billing Option
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text('Yearly Billing', style: TextStyle(fontSize: 10, color: Colors.grey)),
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(color: Colors.green[100], borderRadius: BorderRadius.circular(4)),
                            child: Text('Save ₹$savings', style: TextStyle(fontSize: 7, fontWeight: FontWeight.bold, color: Colors.green[800])),
                          ),
                        ],
                      ),
                      Text('₹$yearlyPrice / Year', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  if (isYearlyActive)
                    _buildActiveBadge()
                  else
                    ElevatedButton(
                      onPressed: () => _handleUpgrade('premium_yearly'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber[700],
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      ),
                      child: const Text('Choose', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green[50],
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.green[200]!, width: 0.8),
      ),
      child: Text(
        'Active',
        style: TextStyle(
            color: Colors.green[800],
            fontSize: 10,
            fontWeight: FontWeight.bold),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildPlanFeature(IconData icon, String text, {bool isAvailable = true}) {
    return Row(
      children: [
        Icon(
          isAvailable ? icon : Icons.close,
          size: 12,
          color: isAvailable ? const Color(0xFFF47C20) : Colors.red,
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 9,
              color: isAvailable ? const Color(0xFF2E1C0C) : Colors.grey,
              decoration: isAvailable ? null : TextDecoration.lineThrough,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  TableCell _buildTableCell(String text, {Color? color, bool bold = false}) {
    return TableCell(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(
            text,
            style: TextStyle(
              fontSize: 10, 
              fontWeight: bold ? FontWeight.bold : FontWeight.normal,
              color: color,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }

  TableCell _buildIconCell(bool available, {String? extraText}) {
    return TableCell(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                available ? Icons.check : Icons.close,
                size: 14,
                color: available ? Colors.green[800] : Colors.red,
              ),
              if (extraText != null && available) ...[
                const SizedBox(width: 2),
                Text(extraText, style: TextStyle(fontSize: 8, color: Colors.green[800], fontWeight: FontWeight.bold)),
              ]
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildComparisonTable() {
    return Card(
      color: Colors.white,
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Table(
          border: TableBorder.symmetric(
              inside: BorderSide(color: Colors.grey.withOpacity(0.15))),
          columnWidths: const {
            0: FlexColumnWidth(1.4),
            1: FlexColumnWidth(0.6),
            2: FlexColumnWidth(1.0),
            3: FlexColumnWidth(1.0),
          },
          children: [
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Feature', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                  ),
                ),
                _buildTableCell('Trial', bold: true),
                _buildTableCell('Professional', bold: true),
                _buildTableCell('Premium', bold: true),
              ],
            ),
            // Users
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Users', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildTableCell('1'),
                _buildTableCell('3'),
                _buildTableCell('10'),
              ],
            ),
            // Receipt Generation
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Receipt Generation', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildTableCell('10'),
                _buildTableCell('Unlimited'),
                _buildTableCell('Unlimited'),
              ],
            ),
            // PDF & JPG Download
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('PDF & JPG Download', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildIconCell(true),
                _buildIconCell(true),
                _buildIconCell(true),
              ],
            ),
            // WhatsApp Share Now
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('WhatsApp Share Now', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildIconCell(true),
                _buildIconCell(true),
                _buildIconCell(true),
              ],
            ),
            // Auto WhatsApp Send
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Auto WhatsApp Send', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildIconCell(false),
                _buildIconCell(false),
                _buildIconCell(true, extraText: '(1000/mo)'),
              ],
            ),
            // CSV Export
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('CSV Export', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildIconCell(false),
                _buildIconCell(true),
                _buildIconCell(true),
              ],
            ),
            // Multi Device
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Multi Device', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildIconCell(false),
                _buildIconCell(true),
                _buildIconCell(true),
              ],
            ),
            // Team Management
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Team Management', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildIconCell(false),
                _buildIconCell(true),
                _buildIconCell(true),
              ],
            ),
            // Analytics
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Analytics', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildIconCell(false),
                _buildTableCell('Basic'),
                _buildTableCell('Advanced', bold: true, color: Colors.amber[850]),
              ],
            ),
            // Priority Support
            TableRow(
              children: [
                const TableCell(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Priority Support', style: TextStyle(fontSize: 10)),
                  ),
                ),
                _buildIconCell(false),
                _buildTableCell('Standard'),
                _buildTableCell('Priority', bold: true, color: Colors.amber[850]),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _parseDate(dynamic val) {
    if (val == null) return '';
    try {
      if (val is String) {
        final parsed = DateTime.parse(val);
        return DateFormat('dd MMM yyyy, hh:mm a').format(parsed);
      }
      if (val is Timestamp) {
        return DateFormat('dd MMM yyyy, hh:mm a').format(val.toDate());
      }
    } catch (_) {}
    return val.toString();
  }
}
