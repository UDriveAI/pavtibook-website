import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/data_providers.dart';
import '../providers/auth_provider.dart';
import '../providers/locale_provider.dart';
import '../config/app_localizations.dart';
import '../widgets/shimmer_skeleton.dart';
import '../services/subscription_permission_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _profileFormKey = GlobalKey<FormState>();

  // Profile controllers
  final _nameController = TextEditingController();
  final _upiController = TextEditingController();
  final _contactController = TextEditingController();
  final _mobileController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();

  // Collector controllers
  // final _colFormKey = GlobalKey<FormState>();
  // final _colNameController = TextEditingController();
  // final _colEmailController = TextEditingController();
  // final _colMobileController = TextEditingController();
  // final _colPasswordController = TextEditingController();

  // List<dynamic> _collectors = [];
  // bool _isColLoading = false;
  bool _isProfileUpdating = false;

  bool _collectorMode = false;
  bool _collectorRememberSelections = true;
  bool _collectorAutoNext = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    // Populate profile from auth provider
    final org = Provider.of<AuthProvider>(context, listen: false).organization;
    if (org != null) {
      _nameController.text = org.name;
      _upiController.text = org.upiId;
      _contactController.text = org.contactPerson ?? '';
      _mobileController.text = org.mobile ?? '';
      _emailController.text = org.email ?? '';
      _addressController.text = org.address ?? '';
      _cityController.text = org.city ?? '';
      _stateController.text = org.state ?? '';
      _pincodeController.text = org.pincode ?? '';
    }

    // _loadCollectors();
    _loadCollectorMode();
  }

  Future<void> _loadCollectorMode() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _collectorMode = prefs.getBool('collector_mode') ?? false;
      _collectorRememberSelections =
          prefs.getBool('collector_remember_selections') ?? true;
      _collectorAutoNext = prefs.getBool('collector_auto_next') ?? true;
    });
  }

  // Future<void> _loadCollectors() async {
  //   final auth = Provider.of<AuthProvider>(context, listen: false);
  //   if (auth.user?.role != 'org_admin') return;
  //
  //   setState(() => _isColLoading = true);
  //   try {
  //     final response = await ApiService.get('/collectors');
  //     if (response.statusCode == 200) {
  //       setState(() {
  //         _collectors = jsonDecode(response.body);
  //       });
  //     }
  //   } catch (e) {
  //     debugPrint('Load collectors error: $e');
  //   } finally {
  //     setState(() => _isColLoading = false);
  //   }
  // }

  Future<void> _updateProfile() async {
    if (!_profileFormKey.currentState!.validate()) return;

    setState(() => _isProfileUpdating = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    try {
      final payload = {
        'name': _nameController.text.trim(),
        'type': auth.organization?.type ?? 'Ganesh Mandal',
        'contact_person': _contactController.text.trim(),
        'mobile': _mobileController.text.trim(),
        'email': _emailController.text.trim(),
        'address': _addressController.text.trim(),
        'city': _cityController.text.trim(),
        'state': _stateController.text.trim(),
        'pincode': _pincodeController.text.trim(),
        'upi_id': _upiController.text.trim(),
      };

      try {
        final orgId = auth.organization?.id;
        if (orgId != null) {
          await FirebaseFirestore.instance
              .collection('organizations')
              .doc(orgId)
              .update(payload);
          await auth.reloadProfile();
          if (mounted) {
            Provider.of<ReceiptProvider>(context, listen: false).clearCache();
            Provider.of<TemplateProvider>(context, listen: false).clearCache();
            scaffoldMessenger.showSnackBar(
              const SnackBar(
                  content: Text('Organization Profile updated successfully!')),
            );
          }
        } else {
          throw Exception('No active organization found.');
        }
      } catch (e) {
        if (mounted) {
          scaffoldMessenger.showSnackBar(
            SnackBar(content: Text('Failed to update profile: $e')),
          );
        }
      }
    } catch (e) {
      debugPrint('Profile update error: $e');
    } finally {
      setState(() => _isProfileUpdating = false);
    }
  }

  // Future<void> _addCollector() async {
  //   if (!_colFormKey.currentState!.validate()) return;
  //
  //   try {
  //     final payload = {
  //       'name': _colNameController.text.trim(),
  //       'email': _colEmailController.text.trim(),
  //       'mobile': _colMobileController.text.trim(),
  //       'password': _colPasswordController.text,
  //     };
  //
  //     final response = await ApiService.post('/collectors', payload);
  //
  //     if (response.statusCode == 201) {
  //       ScaffoldMessenger.of(context).showSnackBar(
  //         const SnackBar(content: Text('Collector user added successfully!')),
  //       );
  //       _colNameController.clear();
  //       _colEmailController.clear();
  //       _colMobileController.clear();
  //       _colPasswordController.clear();
  //       _loadCollectors();
  //     } else {
  //       final data = jsonDecode(response.body);
  //       ScaffoldMessenger.of(context).showSnackBar(
  //         SnackBar(content: Text(data['message'] ?? 'Failed to add collector.')),
  //       );
  //     }
  //   } catch (e) {
  //     debugPrint('Add collector error: $e');
  //   }
  // }
  //
  // Future<void> _toggleCollectorStatus(String collectorUserId, bool isActive) async {
  //   try {
  //     final response = await ApiService.put('/collectors/$collectorUserId', {
  //       'isActive': isActive,
  //     });
  //
  //     if (response.statusCode == 200) {
  //       ScaffoldMessenger.of(context).showSnackBar(
  //         SnackBar(content: Text('Collector status updated successfully.')),
  //       );
  //       _loadCollectors();
  //     }
  //   } catch (e) {
  //     debugPrint('Toggle status error: $e');
  //   }
  // }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _upiController.dispose();
    _contactController.dispose();
    _mobileController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    // _colNameController.dispose();
    // _colEmailController.dispose();
    // _colMobileController.dispose();
    // _colPasswordController.dispose();
    super.dispose();
  }

  Future<void> _backupDatabase() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => const AlertDialog(
        content: Row(
          children: [
            ShimmerSkeleton.circular(size: 36),
            SizedBox(width: 20),
            Text("Exporting Backup..."),
          ],
        ),
      ),
    );

    try {
      final orgId = auth.organization?.id;
      if (orgId == null) throw Exception("Organization not found.");

      // 1. Fetch organization details
      final orgDoc = await FirebaseFirestore.instance
          .collection('organizations')
          .doc(orgId)
          .get();
      final orgData = orgDoc.data() ?? {};

      // 2. Fetch donors
      final donorsSnapshot = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .get();
      final donorsList = donorsSnapshot.docs.map((d) => d.data()).toList();

      // 3. Fetch receipts
      final receiptsSnapshot = await FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId)
          .get();
      final receiptsList = receiptsSnapshot.docs.map((r) => r.data()).toList();

      final backupMap = {
        'backupVersion': 1,
        'backupTimestamp': DateTime.now().toIso8601String(),
        'organizationId': orgId,
        'organization': orgData,
        'donors': donorsList,
        'receipts': receiptsList,
      };

      final jsonString = jsonEncode(backupMap);

      if (mounted) {
        navigator.pop(); // Dismiss loading
      }

      // Share JSON backup file
      final tempDir = await getTemporaryDirectory();
      final file = File(
          '${tempDir.path}/pavtibook_backup_${orgId}_${DateTime.now().millisecondsSinceEpoch}.json');
      await file.writeAsString(jsonString);

      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'application/json')],
        text: 'PavtiBook DB Backup for ${auth.organization?.name}',
      );
    } catch (e) {
      if (mounted) {
        navigator.pop(); // Dismiss loading
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('Backup failed: $e')),
        );
      }
    }
  }

  void _restoreDatabaseDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (cxt) => AlertDialog(
        title: const Text('Restore Database'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Paste the database backup JSON text here. Valid backup structure is required.',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: 6,
              decoration: const InputDecoration(
                hintText: '{"backupVersion": 1, ...}',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(cxt),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final jsonStr = controller.text.trim();
              Navigator.pop(cxt);
              if (jsonStr.isEmpty) return;

              _validateAndShowRestoreReport(jsonStr);
            },
            child: const Text('Restore'),
          ),
        ],
      ),
    );
  }

  Future<void> _validateAndShowRestoreReport(String jsonStr) async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => const AlertDialog(
        content: Row(
          children: [
            ShimmerSkeleton.circular(size: 36),
            SizedBox(width: 20),
            Text("Analyzing Backup Data..."),
          ],
        ),
      ),
    );

    try {
      final decoded = jsonDecode(jsonStr);
      if (decoded is! Map)
        throw Exception("Invalid backup format: Must be a JSON object.");
      if (decoded['backupVersion'] == null ||
          decoded['organizationId'] == null) {
        throw Exception(
            "Invalid backup: Missing version or organization ID metadata.");
      }

      final donors = decoded['donors'];
      final receipts = decoded['receipts'];
      final org = decoded['organization'];

      if (donors is! List || receipts is! List || org is! Map) {
        throw Exception(
            "Invalid structure: missing 'donors', 'receipts', or 'organization' maps.");
      }

      final auth = Provider.of<AuthProvider>(context, listen: false);
      final orgId = auth.organization?.id;
      if (orgId == null) throw Exception("No active organization found.");

      if (decoded['organizationId'] != orgId) {
        throw Exception(
            "Mismatched Organization ID. This backup belongs to another organization.");
      }

      // Fetch existing records from Firestore for local safety check
      final dbDonorsSnapshot = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .get();

      final dbReceiptsSnapshot = await FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId)
          .get();

      // Map existing DB records
      final Map<String, Map<String, dynamic>> dbDonorsById = {};
      final Map<String, Map<String, dynamic>> dbDonorsByMobile = {};
      for (var doc in dbDonorsSnapshot.docs) {
        final data = doc.data();
        dbDonorsById[doc.id] = data;
        final mobile = data['mobile'] ?? '';
        if (mobile.isNotEmpty) {
          dbDonorsByMobile[mobile] = data;
        }
      }

      final Map<String, Map<String, dynamic>> dbReceiptsById = {};
      final Map<String, Map<String, dynamic>> dbReceiptsByNumber = {};
      for (var doc in dbReceiptsSnapshot.docs) {
        final data = doc.data();
        dbReceiptsById[doc.id] = data;
        final num = data['receiptNumber'] ?? data['receipt_number'] ?? '';
        if (num.isNotEmpty) {
          dbReceiptsByNumber[num] = data;
        }
      }

      // Classify backup records and detect conflicts
      final List<Map<String, dynamic>> newDonors = [];
      final List<Map<String, dynamic>> existingDonors = [];
      final List<String> donorConflicts = [];

      for (var d in donors) {
        if (d is! Map) continue;
        final id = d['id'] ?? '';
        final mobile = d['mobile'] ?? '';
        if (id.isEmpty) continue;

        if (dbDonorsById.containsKey(id)) {
          final existing = dbDonorsById[id]!;
          final isSame = (existing['name'] == d['name']) &&
              (existing['mobile'] == d['mobile']) &&
              (existing['email'] == d['email']) &&
              (existing['address'] == d['address']);

          if (isSame) {
            existingDonors.add(Map<String, dynamic>.from(d));
          } else {
            donorConflicts.add(
                "Donor Conflict: ID '$id' exists in DB as '${existing['name']}' (${existing['mobile']}), but backup has '${d['name']}' (${d['mobile']}).");
          }
        } else if (dbDonorsByMobile.containsKey(mobile)) {
          final existing = dbDonorsByMobile[mobile]!;
          donorConflicts.add(
              "Donor Mobile Collision: Mobile '$mobile' belongs to ID '${existing['id']}' ('${existing['name']}') in DB, but backup ID is '$id' ('${d['name']}').");
        } else {
          newDonors.add(Map<String, dynamic>.from(d));
        }
      }

      final List<Map<String, dynamic>> newReceipts = [];
      final List<Map<String, dynamic>> existingReceipts = [];
      final List<String> receiptConflicts = [];

      for (var r in receipts) {
        if (r is! Map) continue;
        final id = r['id'] ?? '';
        final number = r['receiptNumber'] ?? r['receipt_number'] ?? '';
        if (id.isEmpty) continue;

        if (dbReceiptsById.containsKey(id)) {
          final existing = dbReceiptsById[id]!;
          final isSame =
              (existing['amount'].toString() == r['amount'].toString()) &&
                  (existing['purpose'] == r['purpose']) &&
                  ((existing['receiptNumber'] ?? existing['receipt_number']) ==
                      number) &&
                  ((existing['paymentStatus'] ?? existing['payment_status']) ==
                      (r['paymentStatus'] ?? r['payment_status'])) &&
                  ((existing['paymentMode'] ?? existing['payment_mode']) ==
                      (r['paymentMode'] ?? r['payment_mode']));

          if (isSame) {
            existingReceipts.add(Map<String, dynamic>.from(r));
          } else {
            receiptConflicts.add(
                "Receipt Conflict: ID '$id' ($number) exists in DB with different details (₹${existing['amount']}), but backup has ₹${r['amount']}.");
          }
        } else if (dbReceiptsByNumber.containsKey(number)) {
          final existing = dbReceiptsByNumber[number]!;
          receiptConflicts.add(
              "Receipt No Collision: Number '$number' belongs to ID '${existing['id']}' in DB, but backup ID is '$id'.");
        } else {
          newReceipts.add(Map<String, dynamic>.from(r));
        }
      }

      if (mounted) {
        Navigator.pop(context); // Dismiss analyzing dialog
        _showValidationReportDialog(
          newDonors: newDonors,
          existingDonors: existingDonors,
          donorConflicts: donorConflicts,
          newReceipts: newReceipts,
          existingReceipts: existingReceipts,
          receiptConflicts: receiptConflicts,
          orgData: Map<String, dynamic>.from(org),
          orgId: orgId,
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Dismiss analyzing dialog
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('Validation failed: $e'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    }
  }

  void _showValidationReportDialog({
    required List<Map<String, dynamic>> newDonors,
    required List<Map<String, dynamic>> existingDonors,
    required List<String> donorConflicts,
    required List<Map<String, dynamic>> newReceipts,
    required List<Map<String, dynamic>> existingReceipts,
    required List<String> receiptConflicts,
    required Map<String, dynamic> orgData,
    required String orgId,
  }) {
    final hasConflicts =
        donorConflicts.isNotEmpty || receiptConflicts.isNotEmpty;
    final totalNew = newDonors.length + newReceipts.length;
    final totalExisting = existingDonors.length + existingReceipts.length;
    final totalConflicts = donorConflicts.length + receiptConflicts.length;

    showDialog(
      context: context,
      builder: (cxt) {
        return AlertDialog(
          title: const Text('Restore Validation Report'),
          content: SizedBox(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Validation summary of backup data against live database:',
                    style: TextStyle(fontSize: 13, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blueGrey[50],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
                        _buildReportRow(
                            'New Records (To Import)',
                            '$totalNew (Donors: ${newDonors.length}, Receipts: ${newReceipts.length})',
                            Colors.green[700]!),
                        const Divider(height: 10),
                        _buildReportRow(
                            'Existing Records (To Skip)',
                            '$totalExisting (Donors: ${existingDonors.length}, Receipts: ${existingReceipts.length})',
                            Colors.blue[700]!),
                        const Divider(height: 10),
                        _buildReportRow(
                            'Conflicts / Collisions',
                            '$totalConflicts',
                            hasConflicts ? Colors.red[700]! : Colors.blueGrey),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (hasConflicts) ...[
                    const Text(
                      '⚠️ Conflicts & Collisions Detected:',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, color: Colors.red),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      constraints: const BoxConstraints(maxHeight: 150),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.red[200]!),
                        borderRadius: BorderRadius.circular(6),
                        color: Colors.red[50]?.withValues(alpha: 0.3),
                      ),
                      child: ListView(
                        shrinkWrap: true,
                        padding: const EdgeInsets.all(8),
                        children: [
                          ...donorConflicts.map((log) => Padding(
                                padding: const EdgeInsets.only(bottom: 6.0),
                                child: Text('• $log',
                                    style: const TextStyle(
                                        color: Colors.red, fontSize: 11)),
                              )),
                          ...receiptConflicts.map((log) => Padding(
                                padding: const EdgeInsets.only(bottom: 6.0),
                                child: Text('• $log',
                                    style: const TextStyle(
                                        color: Colors.red, fontSize: 11)),
                              )),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Note: Restore will ONLY import new clean records. Existing identical records and conflicts will be skipped to protect production data from silent overwrites or duplicate numbers.',
                      style: TextStyle(
                          fontSize: 11,
                          color: Colors.blueGrey,
                          fontStyle: FontStyle.italic),
                    ),
                  ] else ...[
                    const Row(
                      children: [
                        Icon(Icons.check_circle, color: Colors.green),
                        SizedBox(width: 8),
                        Text('No conflicts or collisions found.',
                            style: TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(cxt),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: totalNew == 0
                  ? null
                  : () {
                      Navigator.pop(cxt);
                      _executeRestore(
                        newDonors: newDonors,
                        newReceipts: newReceipts,
                        orgData: orgData,
                        orgId: orgId,
                      );
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    hasConflicts ? Colors.orange[800] : Colors.green[700],
              ),
              child: const Text('Proceed with Restore'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildReportRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        Text(value,
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.bold, color: valueColor)),
      ],
    );
  }

  Future<void> _executeRestore({
    required List<Map<String, dynamic>> newDonors,
    required List<Map<String, dynamic>> newReceipts,
    required Map<String, dynamic> orgData,
    required String orgId,
  }) async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final auth = Provider.of<AuthProvider>(context, listen: false);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => const AlertDialog(
        content: Row(
          children: [
            ShimmerSkeleton.circular(size: 36),
            SizedBox(width: 20),
            Text("Executing Safe Restore..."),
          ],
        ),
      ),
    );

    try {
      final batch = FirebaseFirestore.instance.batch();

      // Update organization details
      final orgRef =
          FirebaseFirestore.instance.collection('organizations').doc(orgId);
      batch.set(
          orgRef, Map<String, dynamic>.from(orgData), SetOptions(merge: true));

      // Restore New Donors only (Skipping conflicts and identical records)
      for (var d in newDonors) {
        final donorRef =
            FirebaseFirestore.instance.collection('donors').doc(d['id']);
        batch.set(donorRef, d, SetOptions(merge: true));
      }

      // Restore New Receipts only (Skipping conflicts and identical records)
      for (var r in newReceipts) {
        final receiptRef =
            FirebaseFirestore.instance.collection('receipts').doc(r['id']);
        batch.set(receiptRef, r, SetOptions(merge: true));
      }

      await batch.commit();

      await auth.reloadProfile();

      if (mounted) {
        navigator.pop(); // Dismiss loading
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(
                'Database successfully restored! Imported ${newDonors.length} donors and ${newReceipts.length} receipts.'),
            backgroundColor: Colors.green[700],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        navigator.pop(); // Dismiss loading
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('Restore failed: $e'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isPremium = SubscriptionPermissionService.isPremium(auth.subscription?.plan);
    final theme = Theme.of(context);
    final userRole = auth.user?.role ?? '';
    final isOwner = userRole == 'admin' || userRole == 'owner';

    return Scaffold(
      appBar: AppBar(
        title: Text(context.translate('settings_title')),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white.withValues(alpha: 0.6),
          tabs: [
            Tab(text: context.translate('profile_section')),
            Tab(text: context.translate('language_label')),
            // MVP V2: Collectors tab
          ],
        ),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: TabBarView(
        controller: _tabController,
        children: [
          // TAB 1: Organization Profile update
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _profileFormKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top Branding Logo
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 20.0, top: 8.0),
                      child: Image.asset(
                        'assets/images/Pavati-Book-Logo.png',
                        height: 48,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  if (isOwner) ...[
                    // Receipt Governance & Customization Options
                    Card(
                      color: Colors.white,
                      elevation: 1,
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Receipt Governance & Customization',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: Color(0xFF8B1E2D)),
                            ),
                            const SizedBox(height: 12),
                            ListTile(
                              leading: const Icon(Icons.palette_outlined,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Receipt Customization',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Logo, symbols, stamps, footer',
                                  style: TextStyle(fontSize: 10)),
                              trailing:
                                  const Icon(Icons.chevron_right, size: 20),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(
                                    context, '/settings/customization');
                              },
                            ),
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(Icons.gesture,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Authorized Signatures',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Manage President, Treasurer & Member (Sadasya) details',
                                  style: TextStyle(fontSize: 10)),
                              trailing:
                                  const Icon(Icons.chevron_right, size: 20),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(
                                    context, '/settings/signatures');
                              },
                            ),
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(Icons.qr_code_scanner,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Payment Settings (UPI QR)',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Configure UPI ID and upload QR code image',
                                  style: TextStyle(fontSize: 10)),
                              trailing:
                                  const Icon(Icons.chevron_right, size: 20),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(
                                    context, '/settings/payment');
                              },
                            ),
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(
                                  Icons.health_and_safety_outlined,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Firebase Consistency Audit',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Verify records integrity and fix mismatches',
                                  style: TextStyle(fontSize: 10)),
                              trailing:
                                  const Icon(Icons.chevron_right, size: 20),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(context, '/settings/audit');
                              },
                            ),
                            if (isPremium) ...[
                              const Divider(height: 1),
                              ListTile(
                                leading: const Icon(Icons.settings_phone,
                                    color: Color(0xFFF47C20)),
                                title: const Text('WhatsApp Settings',
                                    style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold)),
                                subtitle: const Text(
                                    'Enable/disable auto send text, PDF, and reminders',
                                    style: TextStyle(fontSize: 10)),
                                trailing:
                                    const Icon(Icons.chevron_right, size: 20),
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  Navigator.pushNamed(
                                      context, '/settings/whatsapp-settings');
                                },
                              ),
                              const Divider(height: 1),
                              ListTile(
                                leading: const Icon(Icons.history_toggle_off,
                                    color: Color(0xFFF47C20)),
                                title: const Text('WhatsApp Delivery Logs',
                                    style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold)),
                                subtitle: const Text(
                                    'Track sent messages, status, and manual retry',
                                    style: TextStyle(fontSize: 10)),
                                trailing:
                                    const Icon(Icons.chevron_right, size: 20),
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  Navigator.pushNamed(
                                      context, '/settings/whatsapp-logs');
                                },
                              ),
                            ],
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(Icons.group_outlined,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Team Management',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Invite, replace, or remove team members',
                                  style: TextStyle(fontSize: 10)),
                              trailing:
                                  const Icon(Icons.chevron_right, size: 20),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(context, '/settings/team');
                              },
                            ),
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(Icons.star_outline,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Subscription & Billing',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Quota, plan details, upgrade, transactions',
                                  style: TextStyle(fontSize: 10)),
                              trailing:
                                  const Icon(Icons.chevron_right, size: 20),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(
                                    context, '/settings/subscription-usage');
                              },
                            ),
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(Icons.analytics_outlined,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Activity Audit Trail',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Track create, edit, payment actions',
                                  style: TextStyle(fontSize: 10)),
                              trailing:
                                  const Icon(Icons.chevron_right, size: 20),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(
                                    context, '/settings/activity-log');
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Database Operations Card
                    Card(
                      color: Colors.white,
                      elevation: 1,
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Database Operations (Backup & Restore)',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: Color(0xFF8B1E2D)),
                            ),
                            const SizedBox(height: 12),
                            ListTile(
                              leading: const Icon(Icons.cloud_upload_outlined,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Backup Database',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Export all data (Org, Donors, Receipts) to JSON file',
                                  style: TextStyle(fontSize: 10)),
                              trailing: const Icon(Icons.download, size: 20),
                              onTap: () => _backupDatabase(),
                            ),
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(Icons.cloud_download_outlined,
                                  color: Color(0xFFF47C20)),
                              title: const Text('Restore Database',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  'Import Org, Donors, and Receipts from JSON backup',
                                  style: TextStyle(fontSize: 10)),
                              trailing: const Icon(Icons.upload, size: 20),
                              onTap: () => _restoreDatabaseDialog(),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  // General Settings Card (For all roles)
                  Card(
                    color: Colors.white,
                    elevation: 1,
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'General Settings',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Color(0xFF8B1E2D)),
                          ),
                          const SizedBox(height: 12),
                          ListTile(
                            leading: const Icon(Icons.person_outline,
                                color: Color(0xFFF47C20)),
                            title: const Text('My Profile & Security',
                                style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold)),
                            subtitle: const Text(
                                'Manage profile photo, password, and ownership',
                                style: TextStyle(fontSize: 10)),
                            trailing:
                                const Icon(Icons.chevron_right, size: 20),
                            onTap: () {
                              HapticFeedback.lightImpact();
                              Navigator.pushNamed(
                                  context, '/settings/profile');
                            },
                          ),
                          const Divider(height: 1),
                          SwitchListTile(
                            secondary: const Icon(Icons.speed,
                                color: Color(0xFFF47C20)),
                            title: const Text('Collector Mode',
                                style: TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.bold)),
                            subtitle: const Text(
                                'Optimized for festivals and donation drives. Automatically opens the next receipt after successful WhatsApp delivery.',
                                style: TextStyle(fontSize: 10)),
                            value: _collectorMode,
                            activeColor: const Color(0xFF8B1E2D),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 4),
                            onChanged: (val) async {
                              HapticFeedback.lightImpact();
                              final rp = Provider.of<ReceiptProvider>(context,
                                  listen: false);
                              final prefs =
                                  await SharedPreferences.getInstance();
                              await prefs.setBool('collector_mode', val);
                              setState(() {
                                _collectorMode = val;
                              });
                              rp.setCollectorMode(val);
                            },
                          ),
                          if (_collectorMode) ...[
                            Padding(
                              padding: const EdgeInsets.only(left: 32.0),
                              child: SwitchListTile(
                                title: const Text(
                                    'Remember previous selections',
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500)),
                                value: _collectorRememberSelections,
                                activeColor: const Color(0xFF8B1E2D),
                                dense: true,
                                onChanged: (val) async {
                                  HapticFeedback.lightImpact();
                                  final rp = Provider.of<ReceiptProvider>(
                                      context,
                                      listen: false);
                                  final prefs =
                                      await SharedPreferences.getInstance();
                                  await prefs.setBool(
                                      'collector_remember_selections', val);
                                  setState(() {
                                    _collectorRememberSelections = val;
                                  });
                                  rp.setCollectorRememberSelections(val);
                                },
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(left: 32.0),
                              child: SwitchListTile(
                                title: const Text(
                                    'Automatically open next receipt after WhatsApp delivery',
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500)),
                                value: _collectorAutoNext,
                                activeColor: const Color(0xFF8B1E2D),
                                dense: true,
                                onChanged: (val) async {
                                  HapticFeedback.lightImpact();
                                  final rp = Provider.of<ReceiptProvider>(
                                      context,
                                      listen: false);
                                  final prefs =
                                      await SharedPreferences.getInstance();
                                  await prefs.setBool(
                                      'collector_auto_next', val);
                                  setState(() {
                                    _collectorAutoNext = val;
                                  });
                                  rp.setCollectorAutoNext(val);
                                },
                              ),
                            ),
                          ],
                          const Divider(height: 1),
                          ListTile(
                            leading: const Icon(Icons.info_outline,
                                color: Color(0xFFF47C20)),
                            title: const Text('About PavtiBook',
                                style: TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.bold)),
                            subtitle: const Text(
                                'Version, Privacy, Terms, and Support',
                                style: TextStyle(fontSize: 10)),
                            trailing: const Icon(Icons.chevron_right, size: 20),
                            onTap: () {
                              HapticFeedback.lightImpact();
                              Navigator.pushNamed(context, '/about');
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (isOwner) ...[
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                          labelText: 'Organization Name',
                          border: OutlineInputBorder()),
                      validator: (val) =>
                          val == null || val.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _upiController,
                      decoration: const InputDecoration(
                        labelText: 'UPI ID (For dynamic QR donation)',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.qr_code),
                      ),
                      validator: (val) =>
                          val == null || val.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _contactController,
                            decoration: const InputDecoration(
                                labelText: 'Contact Person',
                                border: OutlineInputBorder()),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _mobileController,
                            decoration: const InputDecoration(
                                labelText: 'Mobile Number',
                                border: OutlineInputBorder()),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                          labelText: 'Official Email',
                          border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressController,
                      decoration: const InputDecoration(
                          labelText: 'Address', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _cityController,
                            decoration: const InputDecoration(
                                labelText: 'City',
                                border: OutlineInputBorder()),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: _stateController,
                            decoration: const InputDecoration(
                                labelText: 'State',
                                border: OutlineInputBorder()),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: _pincodeController,
                            decoration: const InputDecoration(
                                labelText: 'Pincode',
                                border: OutlineInputBorder()),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _isProfileUpdating
                        ? const Center(
                            child: ShimmerSkeleton(width: 150, height: 48))
                        : ElevatedButton(
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              _updateProfile();
                            },
                            child: const Text('Update Profile'),
                          ),
                  ],
                ],
              ),
            ),
          ),

          // MVP V2: Collectors Tab (Collector Management)

          // TAB 2 → Language Settings
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Consumer<LocaleProvider>(
                builder: (context, localeProvider, child) {
              final currentLang = localeProvider.locale.languageCode;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.translate('language_label'),
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Every label in PavtiBook supports translation. Select a language to translate receipt books.',
                    style: TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                  const SizedBox(height: 24),
                  _buildLanguageItem(
                      'English',
                      'US english defaults',
                      currentLang == 'en',
                      () => localeProvider.setLocale(const Locale('en'))),
                  const Divider(),
                  _buildLanguageItem(
                      'मराठी (Marathi)',
                      'पारंपारिक मराठी पावती भाषांतर',
                      currentLang == 'mr',
                      () => localeProvider.setLocale(const Locale('mr'))),
                  const Divider(),
                  _buildLanguageItem(
                      'हिंदी (Hindi)',
                      'देवनागरी हिंदी भाषांतर',
                      currentLang == 'hi',
                      () => localeProvider.setLocale(const Locale('hi'))),
                  const Divider(),
                  _buildLanguageItem('Future Ready: Gujarati, Tamil, Telugu...',
                      'Coming soon in future phases', false, null),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageItem(
      String title, String desc, bool active, VoidCallback? onTap) {
    return ListTile(
      title: Text(title,
          style: TextStyle(
              fontWeight: active ? FontWeight.bold : FontWeight.normal)),
      subtitle: Text(desc, style: const TextStyle(fontSize: 11)),
      trailing:
          active ? const Icon(Icons.check_circle, color: Colors.green) : null,
      onTap: onTap,
    );
  }
}
