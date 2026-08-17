import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';
import '../widgets/shimmer_skeleton.dart';
import '../widgets/empty_state.dart';
import '../widgets/profile_photo_widget.dart';
import '../widgets/donor_avatar.dart';
import '../services/payment_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _exportPeriod = 'today';
  bool _subscriptionExpanded = false;

  Future<void> _exportReport(String type, String format) async {
    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (cxt) => const AlertDialog(
        content: Row(
          children: [
            CircularProgressIndicator(),
            SizedBox(width: 20),
            Text("Generating Report..."),
          ],
        ),
      ),
    );

    try {
      final rp = Provider.of<ReceiptProvider>(context, listen: false);
      await rp.fetchReceipts(); // Make sure receipts are loaded
      if (mounted) {
        Navigator.pop(context); // Dismiss loading dialog
      }

      final now = DateTime.now();
      final startOfToday = DateTime(now.year, now.month, now.day);
      final startOfMonth = DateTime(now.year, now.month, 1);
      final startOfYear = DateTime(now.year, 1, 1);

      List<ReceiptModel> filtered =
          rp.receipts.where((r) => r.paymentStatus != 'cancelled').toList();

      if (type == 'today') {
        filtered = filtered.where((r) {
          final d = DateTime.tryParse(r.createdAt);
          return d != null &&
              (d.isAfter(startOfToday) || d.isAtSameMomentAs(startOfToday));
        }).toList();
      } else if (type == 'month') {
        filtered = filtered.where((r) {
          final d = DateTime.tryParse(r.createdAt);
          return d != null &&
              (d.isAfter(startOfMonth) || d.isAtSameMomentAs(startOfMonth));
        }).toList();
      } else if (type == 'year') {
        filtered = filtered.where((r) {
          final d = DateTime.tryParse(r.createdAt);
          return d != null &&
              (d.isAfter(startOfYear) || d.isAtSameMomentAs(startOfYear));
        }).toList();
      }

      // Generate CSV string
      final buffer = StringBuffer();
      // Add UTF-8 BOM for Excel compatibility
      if (format == 'excel') {
        buffer.write('\uFEFF');
      }

      // Headers
      buffer.writeln('Receipt No,Date,Donor,Amount,Mode,Status');

      for (var r in filtered) {
        final date = DateTime.tryParse(r.createdAt);
        final dateStr = date != null
            ? '${date.day}/${date.month}/${date.year}'
            : r.createdAt;
        final cleanDonor = (r.donorName ?? '').replaceAll('"', '""');

        buffer.writeln('"${r.receiptNumber}",'
            '"$dateStr",'
            '"$cleanDonor",'
            '${r.amount},'
            '"${r.paymentMode.toUpperCase()}",'
            '"${r.paymentStatus.toUpperCase()}"');
      }

      final reportContent = buffer.toString();

      // Save to temporary file and share
      final tempDir = await getTemporaryDirectory();
      final filename =
          'report_${type}_${DateTime.now().millisecondsSinceEpoch}.csv';
      final file = File('${tempDir.path}/$filename');
      await file.writeAsString(reportContent, encoding: utf8);

      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'text/csv')],
        text:
            '${type.toUpperCase()} Collection Report (${format.toUpperCase()})',
      );
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Dismiss loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to export report: $e')),
        );
      }
    }
  }

  DocumentSnapshot? _pendingTransfer;
  bool _isLoadingTransfer = false;

  @override
  void initState() {
    super.initState();
    _refreshStats();
    _fetchPendingTransfer();

    // Ensure user organizations list is loaded for multi-org detection
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final uid = auth.user?.id;
    if (uid != null) {
      auth.loadUserOrganizations(uid);
    }
    
    // Automatically query and restore active Google Play purchases silently
    PaymentService().restorePurchases().catchError((e) {
      debugPrint('Silent purchase restore failed: $e');
    });
  }

  Future<void> _fetchPendingTransfer() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.user;
    if (user == null) return;

    if (mounted) {
      setState(() => _isLoadingTransfer = true);
    }
    try {
      final snap = await FirebaseFirestore.instance
          .collection('ownership_transfers')
          .where('requestedTo.uid', isEqualTo: user.id)
          .where('status', isEqualTo: 'pending')
          .limit(1)
          .get();
      if (snap.docs.isNotEmpty) {
        if (mounted) {
          setState(() {
            _pendingTransfer = snap.docs.first;
            _isLoadingTransfer = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _pendingTransfer = null;
            _isLoadingTransfer = false;
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching transfer: $e');
      if (mounted) {
        setState(() => _isLoadingTransfer = false);
      }
    }
  }

  Future<void> _showAcceptConfirmationDialog(BuildContext context, DocumentSnapshot transferDoc) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final data = transferDoc.data() as Map<String, dynamic>;
    final orgId = data['organizationId'];
    final senderName = data['requestedBy']['name'] ?? 'Current Owner';
    final receiverName = data['requestedTo']['name'] ?? 'New Owner';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => const AlertDialog(
        content: Row(
          children: [
            CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(Color(0xFF8B1E2D))),
            SizedBox(width: 20),
            Text("Loading organization stats..."),
          ],
        ),
      ),
    );

    int membersCount = 0;
    int receiptsCount = 0;
    int donorsCount = 0;
    String subscriptionPlan = 'Free Plan';

    try {
      final membersSnap = await FirebaseFirestore.instance
          .collection('users')
          .where('organizationId', isEqualTo: orgId)
          .count()
          .get();
      membersCount = membersSnap.count ?? 0;

      final receiptsSnap = await FirebaseFirestore.instance
          .collection('receipts')
          .where('organizationId', isEqualTo: orgId)
          .count()
          .get();
      receiptsCount = receiptsSnap.count ?? 0;

      final donorsSnap = await FirebaseFirestore.instance
          .collection('donors')
          .where('organizationId', isEqualTo: orgId)
          .count()
          .get();
      donorsCount = donorsSnap.count ?? 0;

      final subSnap = await FirebaseFirestore.instance
          .collection('subscriptions')
          .doc(orgId)
          .get();
      if (subSnap.exists) {
        subscriptionPlan = subSnap.data()?['plan'] ?? 'free';
      }
    } catch (e) {
      debugPrint('Error loading stats: $e');
    }

    if (mounted) {
      Navigator.pop(context); // Dismiss loading
    }

    if (!mounted) return;
    showDialog(
      context: context,
      builder: (c) {
        return AlertDialog(
          backgroundColor: const Color(0xFFFFF6E8),
          title: const Text(
            'Transfer Confirmation',
            style: TextStyle(color: Color(0xFF8B1E2D), fontWeight: FontWeight.bold),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Please review the organization details below before accepting software ownership. This action will transfer full administrative control to you.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                _buildSummaryRow('Organization Name', auth.organization?.name ?? 'PavtiBook Org'),
                _buildSummaryRow('Current Owner', senderName),
                _buildSummaryRow('New Owner', receiverName),
                _buildSummaryRow('Team Members Count', membersCount.toString()),
                _buildSummaryRow('Receipt Count', receiptsCount.toString()),
                _buildSummaryRow('Donor Count', donorsCount.toString()),
                _buildSummaryRow('Active Subscription', subscriptionPlan.toUpperCase()),
                const SizedBox(height: 16),
                const Text(
                  'Do you accept software ownership of this organization?',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(c);
                _acceptTransfer(context, transferDoc);
              },
              child: const Text('Confirm & Accept'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: Colors.grey)),
          ),
          Expanded(
            flex: 6,
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF2E1C0C))),
          ),
        ],
      ),
    );
  }

  Future<void> _acceptTransfer(BuildContext context, DocumentSnapshot transferDoc) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final data = transferDoc.data() as Map<String, dynamic>;
    final transferId = transferDoc.id;
    final orgId = data['organizationId'];
    final receiver = data['requestedTo'] as Map<String, dynamic>;
    final sender = data['requestedBy'] as Map<String, dynamic>;
    final messenger = ScaffoldMessenger.of(context);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => const AlertDialog(
        content: Row(
          children: [
            CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(Color(0xFF8B1E2D))),
            SizedBox(width: 20),
            Text("Accepting ownership..."),
          ],
        ),
      ),
    );

    try {
      final batch = FirebaseFirestore.instance.batch();
      
      batch.update(
        FirebaseFirestore.instance.collection('organizations').doc(orgId),
        {
          'ownerUid': receiver['uid'],
          'ownerName': receiver['name'],
          'ownerEmail': receiver['email'],
          'ownerMobile': receiver['mobile'],
          'activeTransferId': null,
        },
      );

      batch.update(
        FirebaseFirestore.instance.collection('users').doc(sender['uid']),
        {'isSoftwareOwner': false},
      );

      batch.update(
        FirebaseFirestore.instance.collection('users').doc(receiver['uid']),
        {'isSoftwareOwner': true},
      );

      final nowStr = DateTime.now().toIso8601String();
      batch.update(
        FirebaseFirestore.instance.collection('ownership_transfers').doc(transferId),
        {
          'status': 'accepted',
          'acceptedAt': nowStr,
          'completedAt': nowStr,
        },
      );

      final historyRef = FirebaseFirestore.instance.collection('ownership_history').doc();
      batch.set(historyRef, {
        'id': historyRef.id,
        'organizationId': orgId,
        'fromUid': sender['uid'],
        'fromName': sender['name'],
        'toUid': receiver['uid'],
        'toName': receiver['name'],
        'completedAt': nowStr,
      });

      final os = Platform.isAndroid ? 'Android' : 'iOS/Web';
      final log1Ref = FirebaseFirestore.instance.collection('activity_logs').doc();
      batch.set(log1Ref, {
        'organizationId': orgId,
        'userId': receiver['uid'],
        'userName': receiver['name'],
        'userRole': auth.user?.role ?? 'admin',
        'action': 'Ownership Accepted',
        'details': 'Accepted ownership transfer from ${sender['name']} (Device: $os, Ver: 1.0.0)',
        'timestamp': nowStr,
        'device': os,
        'appVersion': '1.0.0',
      });

      final log2Ref = FirebaseFirestore.instance.collection('activity_logs').doc();
      batch.set(log2Ref, {
        'organizationId': orgId,
        'userId': receiver['uid'],
        'userName': receiver['name'],
        'userRole': auth.user?.role ?? 'admin',
        'action': 'Ownership Completed',
        'details': 'Ownership transfer completed from ${sender['name']} to ${receiver['name']}',
        'timestamp': nowStr,
        'device': os,
        'appVersion': '1.0.0',
      });

      await batch.commit();

      if (mounted) {
        Navigator.pop(context);
      }
      
      messenger.showSnackBar(
        const SnackBar(content: Text('Ownership transferred successfully! You are now the Software Owner.')),
      );

      await auth.reloadProfile();
      await _fetchPendingTransfer();
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
      }
      debugPrint('Error accepting transfer: $e');
      messenger.showSnackBar(
        SnackBar(content: Text('Failed to accept transfer: $e')),
      );
    }
  }

  Future<void> _declineTransfer(BuildContext context, DocumentSnapshot transferDoc) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final data = transferDoc.data() as Map<String, dynamic>;
    final transferId = transferDoc.id;
    final orgId = data['organizationId'];
    final receiver = data['requestedTo'] as Map<String, dynamic>;
    final sender = data['requestedBy'] as Map<String, dynamic>;
    final messenger = ScaffoldMessenger.of(context);

    try {
      final batch = FirebaseFirestore.instance.batch();
      
      batch.update(
        FirebaseFirestore.instance.collection('ownership_transfers').doc(transferId),
        {'status': 'declined'},
      );

      batch.update(
        FirebaseFirestore.instance.collection('organizations').doc(orgId),
        {'activeTransferId': null},
      );

      final os = Platform.isAndroid ? 'Android' : 'iOS/Web';
      final logRef = FirebaseFirestore.instance.collection('activity_logs').doc();
      batch.set(logRef, {
        'organizationId': orgId,
        'userId': receiver['uid'],
        'userName': receiver['name'],
        'userRole': auth.user?.role ?? 'admin',
        'action': 'Ownership Declined',
        'details': 'Declined ownership transfer from ${sender['name']} (Device: $os, Ver: 1.0.0)',
        'timestamp': DateTime.now().toIso8601String(),
        'device': os,
        'appVersion': '1.0.0',
      });

      await batch.commit();

      messenger.showSnackBar(
        const SnackBar(content: Text('Ownership transfer declined.')),
      );

      await auth.reloadProfile();
      await _fetchPendingTransfer();
    } catch (e) {
      debugPrint('Error declining transfer: $e');
      messenger.showSnackBar(
        SnackBar(content: Text('Failed to decline transfer: $e')),
      );
    }
  }

  Future<void> _restoreOrganization(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);
    final success = await auth.restoreOrganization();
    if (success) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Organization restored successfully!')),
      );
    } else {
      messenger.showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Failed to restore organization.')),
      );
    }
  }

  Future<void> _refreshStats() async {
    await Future.delayed(Duration.zero);
    if (!mounted) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final dash = Provider.of<DashboardProvider>(context, listen: false);
    final rp = Provider.of<ReceiptProvider>(context, listen: false);

    final orgId = auth.activeOrganizationId ?? auth.organization?.id;
    if (orgId != null) {
      dash.initRealtimeDashboard(
        orgId: orgId,
        userRole: auth.activeUserRole,
        uid: auth.user?.id ?? '',
        generation: auth.switchGeneration,
      );
    } else {
      await dash.fetchStats();
    }
    await rp.fetchReceipts();
  }

  void _showReportsBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFFF8F1E7),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Export Collection Reports',
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF2E1C0C)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Generate CSV or Excel reports for accounting audits.',
                    style: TextStyle(color: Colors.blueGrey, fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  DropdownButtonFormField<String>(
                    value: _exportPeriod,
                    decoration: const InputDecoration(
                      labelText: 'Select Period',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'today', child: Text('Today')),
                      DropdownMenuItem(
                          value: 'month', child: Text('This Month')),
                      DropdownMenuItem(value: 'year', child: Text('This Year')),
                      DropdownMenuItem(
                          value: 'total', child: Text('Total (All Time)')),
                    ],
                    onChanged: (val) {
                      setModalState(() {
                        _exportPeriod = val ?? 'today';
                      });
                      setState(() {});
                    },
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _exportReport(_exportPeriod, 'csv');
                          },
                          icon: const Icon(Icons.description),
                          label: const Text('Export CSV'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                const Color(0xFF8B1E2D), // Primary Maroon
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _exportReport(_exportPeriod, 'excel');
                          },
                          icon: const Icon(Icons.table_chart),
                          label: const Text('Export Excel'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF47C20), // Orange
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildQuickActionTile({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    bool isPendingAccent = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: isPendingAccent
                  ? const Color(0xFFFFF1F1)
                  : const Color(0xFFFFF6E8), // Light red or cream
              shape: BoxShape.circle,
              border: Border.all(
                color: isPendingAccent
                    ? Colors.red[800]!
                    : const Color(0xFF8B1E2D).withOpacity(0.2), // Maroon border
                width: isPendingAccent ? 2.0 : 1.0,
              ),
            ),
            child: Icon(
              icon,
              color:
                  isPendingAccent ? Colors.red[800] : const Color(0xFF8B1E2D),
              size: 22,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11.0,
              fontWeight: isPendingAccent
                  ? FontWeight.bold
                  : const TextStyle(fontWeight: FontWeight.w600).fontWeight,
              color:
                  isPendingAccent ? Colors.red[900] : const Color(0xFF2E1C0C),
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  DateTime? _lastBackPressTime;

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final dash = Provider.of<DashboardProvider>(context);
    final rp = Provider.of<ReceiptProvider>(context);

    final userRole = auth.activeUserRole.toLowerCase();
    final isOwner = userRole == 'admin' || userRole == 'owner' || (auth.organization?.ownerUid == auth.user?.id);
    final isPresident = userRole == 'president';
    final isTreasurer = userRole == 'treasurer';
    final isMember = userRole == 'member' || userRole == 'collector';

    final stats = dash.stats;
    final cards = stats != null;
    final recentReceipts = rp.receipts
        .where((r) => isOwner || isPresident || isTreasurer || r.createdBy == auth.user?.id || r.collectorId == auth.user?.id)
        .take(5)
        .toList();

    // Greeting Header Fallback Safeguard
    final userName = auth.user?.name;
    final greetingText = (userName != null && userName.trim().isNotEmpty)
        ? 'Namaste, $userName'
        : 'Namaste';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
          return;
        }
        final now = DateTime.now();
        if (_lastBackPressTime == null ||
            now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
          _lastBackPressTime = now;
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Press back again to exit'),
              duration: Duration(seconds: 2),
            ),
          );
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
      backgroundColor: const Color(0xFFFFF6E8), // Cream Background
      appBar: AppBar(
        backgroundColor: const Color(0xFF8B1E2D), // Primary Maroon
        elevation: 0,
        centerTitle: true,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white, size: 24),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: Image.asset(
          'assets/images/Pavati-Book-Logo-White-Orange.png',
          height: 32,
          fit: BoxFit.contain,
        ),
        actions: [
          if (auth.hasMultipleOrganizations)
            IconButton(
              icon: const Icon(Icons.swap_horiz, color: Colors.white),
              tooltip: 'Switch Organization',
              onPressed: () {
                Navigator.pushNamed(context, '/org-selector');
              },
            ),
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () => Navigator.pushNamed(context, '/settings'),
              child: Padding(
                padding: const EdgeInsets.all(4.0),
                child: ProfilePhotoWidget(
                  uid: auth.user?.id ?? '',
                  url: auth.user?.profilePhotoUrl128,
                  version: auth.user?.profilePhotoVersion,
                  name: auth.user?.name ?? 'User',
                  radius: 16,
                  suffix: '_128',
                ),
              ),
            ),
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFFFFF6E8), // Cream Background
        child: Column(
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(
                color: Color(0xFFFFF6E8), // Cream Background
                border: Border(
                  bottom: BorderSide(color: Color(0xFF8B1E2D), width: 1.5),
                ),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Image.asset(
                    'assets/images/Pavati-Book-Logo.png',
                    height: 38,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    auth.organization?.name ?? 'PavtiBook Trust',
                    style: const TextStyle(
                      color: Color(0xFF8B1E2D), // Primary Maroon
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    auth.user?.name ?? 'Administrator',
                    style: TextStyle(
                      color: Colors.grey[700],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (isOwner || isPresident)
              ListTile(
                leading: const Icon(Icons.dashboard, color: Color(0xFF8B1E2D)),
                title: const Text('Dashboard',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                selected: true,
                selectedColor: const Color(0xFF8B1E2D),
                onTap: () => Navigator.pop(context),
              ),
            if (isOwner || isPresident || isTreasurer || isMember)
              ListTile(
                leading: const Icon(Icons.add_circle_outline,
                    color: Color(0xFF8B1E2D)),
                title: const Text('New Receipt',
                    style: TextStyle(fontWeight: FontWeight.w500)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/create-receipt');
                },
              ),
            if (isOwner || isPresident || isMember)
              ListTile(
                leading: const Icon(Icons.history, color: Color(0xFF8B1E2D)),
                title: const Text('Receipt History',
                    style: TextStyle(fontWeight: FontWeight.w500)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/receipt-history');
                },
              ),
            if (isOwner || isTreasurer)
              ListTile(
                leading: const Icon(Icons.people_alt_outlined,
                    color: Color(0xFF8B1E2D)),
                title: const Text('Donor Database',
                    style: TextStyle(fontWeight: FontWeight.w500)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/donor-list');
                },
              ),
            if (auth.hasMultipleOrganizations)
              ListTile(
                leading: const Icon(Icons.swap_horiz, color: Color(0xFF8B1E2D)),
                title: const Text('Switch Organization',
                    style: TextStyle(fontWeight: FontWeight.w500)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/org-selector');
                },
              ),
            ListTile(
              leading: const Icon(Icons.settings, color: Color(0xFF8B1E2D)),
              title: const Text('Settings',
                  style: TextStyle(fontWeight: FontWeight.w500)),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/settings');
              },
            ),
            const Spacer(),
            const Divider(),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                children: [
                  ProfilePhotoWidget(
                    uid: auth.user?.id ?? '',
                    url: auth.user?.profilePhotoUrl128,
                    version: auth.user?.profilePhotoVersion,
                    name: auth.user?.name ?? 'User',
                    radius: 18,
                    suffix: '_128',
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          auth.user?.name ?? 'Administrator',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          auth.organization?.name ?? 'PavtiBook',
                          style:
                              TextStyle(color: Colors.grey[600], fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.exit_to_app, color: Colors.red),
              title: const Text('Logout', style: TextStyle(color: Colors.red)),
              onTap: () async {
                final navigator = Navigator.of(context);
                await auth.logout();
                if (mounted) {
                  navigator.pushReplacementNamed('/login');
                }
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
      body: dash.isLoading
          ? _buildDashboardSkeleton(context)
          : RefreshIndicator(
              onRefresh: _refreshStats,
              color: const Color(0xFF8B1E2D),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16.0, vertical: 12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Pending Transfer Card
                    if (_pendingTransfer != null) ...[
                      Card(
                        color: const Color(0xFFF47C20).withOpacity(0.1),
                        elevation: 1,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(color: Color(0xFFF47C20), width: 1.5),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.swap_horiz, color: Color(0xFFF47C20), size: 24),
                                  SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Pending Ownership Transfer Request',
                                      style: TextStyle(
                                          color: Color(0xFF2E1C0C),
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'You have been requested to become the Software Owner of this organization by ${(_pendingTransfer!.data() as Map<String, dynamic>)['requestedBy']['name']}. Please accept or decline below.',
                                style: const TextStyle(fontSize: 12),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  TextButton(
                                    onPressed: () => _declineTransfer(context, _pendingTransfer!),
                                    child: const Text('Decline', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                                  ),
                                  const SizedBox(width: 12),
                                  ElevatedButton(
                                    onPressed: () => _showAcceptConfirmationDialog(context, _pendingTransfer!),
                                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B1E2D)),
                                    child: const Text('Accept & Complete'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],

                    // Archived Banner Card
                    if (auth.organization?.isArchived == true) ...[
                      Card(
                        color: Colors.red[50],
                        elevation: 1,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Colors.red[200]!),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.archive, color: Colors.red, size: 24),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Organization Archived (Read-Only Mode)',
                                      style: TextStyle(
                                          color: Colors.red[900],
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'This organization has been archived by the owner. New receipts cannot be created. All previous receipts, donors, and records remain fully searchable and preserved.',
                                style: TextStyle(color: Colors.red[850], fontSize: 12),
                              ),
                              if (isOwner) ...[
                                const SizedBox(height: 12),
                                ElevatedButton.icon(
                                  onPressed: () => _restoreOrganization(context),
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                  icon: const Icon(Icons.settings_backup_restore),
                                  label: const Text('Restore Organization'),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    // Verified Badge Banner
                    if (auth.organization?.isVerified == true)
                      Card(
                        color: Colors.blue[50],
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: BorderSide(color: Colors.blue[200]!),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          child: Row(
                            children: [
                              Icon(Icons.verified,
                                  color: Colors.blue[800], size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Verified Account: Trust badge active on all receipts.',
                                  style: TextStyle(
                                      color: Colors.blue[900],
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),

                    // Greeting Header
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          vertical: 8.0, horizontal: 4.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            greetingText,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF2E1C0C),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            auth.organization?.name ??
                                'Sarvjanik Krida Mandal, Kamothe.',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    if (auth.subscription != null)
                      _buildSubscriptionExpiryBanner(
                          context, auth.subscription!, auth.subConfig),

                    // HERO ACTION CARD (Large red card)
                    GestureDetector(
                      onTap: auth.organization?.isArchived == true
                          ? () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Organization is archived and read-only. Cannot create receipts.')),
                              );
                            }
                          : () => Navigator.pushNamed(context, '/create-receipt'),
                      child: Card(
                        elevation: 3,
                        shadowColor: const Color(0xFF8B1E2D).withOpacity(0.2),
                        color: const Color(0xFF8B1E2D), // Primary Maroon
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            children: [
                              Container(
                                width: 68,
                                height: 68,
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                      color: const Color(0xFFF2C94C)
                                          .withOpacity(0.6),
                                      width: 1.5), // Gold border
                                ),
                                child: const Icon(
                                  Icons.add,
                                  color: Colors.white,
                                  size: 40,
                                ),
                              ),
                              const SizedBox(width: 20),
                              const Expanded(
                                child: Text(
                                  'Add New\nCollection',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    height: 1.1,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    if (isOwner || isPresident) ...[
                      const SizedBox(height: 16),
                      // COLLECTION SUMMARY CARD
                      Card(
                        color: Colors.white,
                        elevation: 2,
                        shadowColor: Colors.black.withOpacity(0.04),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                              color: Colors.grey.withOpacity(0.12), width: 1),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              InkWell(
                                onTap: () => Navigator.pushNamed(
                                    context, '/collection-details',
                                    arguments: {'type': 'total'}),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Total Collections',
                                          style: TextStyle(
                                            color: Colors.black54,
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '₹ ${cards ? stats.totalCollection.toStringAsFixed(0) : '0'}',
                                          style: const TextStyle(
                                            color: Colors.black,
                                            fontSize: 32,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                    // Orange Wallet Icon
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFF6E8),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Icon(
                                        Icons.account_balance_wallet,
                                        color: Color(0xFFF47C20),
                                        size: 24,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: Colors.black12),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => Navigator.pushNamed(
                                          context, '/collection-details',
                                          arguments: {'type': 'today'}),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.center,
                                        children: [
                                          const Text(
                                            'Today',
                                            style: TextStyle(
                                                color: Colors.grey,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '₹ ${cards ? stats.todayCollection.toStringAsFixed(0) : '0'}',
                                            style: const TextStyle(
                                                color: Colors.black87,
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  Container(
                                      width: 1,
                                      height: 28,
                                      color: Colors.black12),
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => Navigator.pushNamed(
                                          context, '/collection-details',
                                          arguments: {'type': 'month'}),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.center,
                                        children: [
                                          const Text(
                                            'This Month',
                                            style: TextStyle(
                                                color: Colors.grey,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '₹ ${cards ? stats.monthlyCollection.toStringAsFixed(0) : '0'}',
                                            style: const TextStyle(
                                                color: Colors.black87,
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  Container(
                                      width: 1,
                                      height: 28,
                                      color: Colors.black12),
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => Navigator.pushNamed(
                                          context, '/collection-details',
                                          arguments: {'type': 'year'}),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.center,
                                        children: [
                                          const Text(
                                            'This Year',
                                            style: TextStyle(
                                                color: Colors.grey,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '₹ ${cards ? stats.yearlyCollection.toStringAsFixed(0) : '0'}',
                                            style: const TextStyle(
                                                color: Colors.black87,
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (auth.subscription != null) ...[
                        const SizedBox(height: 10),
                        _buildSubscriptionChip(context, auth.subscription!),
                      ],
                      const SizedBox(height: 16),
                      Card(
                        color: Colors.white,
                        elevation: 2,
                        shadowColor: Colors.black.withOpacity(0.04),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                              color: Colors.grey.withOpacity(0.12), width: 1),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.receipt_long,
                                      color: Color(0xFF8B1E2D)),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Digital Receipt Activity',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: Color(0xFF2E1C0C),
                                    ),
                                  ),
                                  const Spacer(),
                                  IconButton(
                                    icon: const Icon(Icons.settings,
                                        size: 18, color: Colors.grey),
                                    onPressed: () {
                                      HapticFeedback.lightImpact();
                                      Navigator.pushNamed(context,
                                          '/settings/whatsapp-settings');
                                    },
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceAround,
                                children: [
                                  _buildActivityItem(
                                    context,
                                    label: 'Today',
                                    count:
                                        cards ? (stats.todayReceiptsCount) : 0,
                                    icon: Icons.today,
                                    color: Colors.blue,
                                  ),
                                  _buildDivider(),
                                  _buildActivityItem(
                                    context,
                                    label: 'Month',
                                    count:
                                        cards ? (stats.monthReceiptsCount) : 0,
                                    icon: Icons.calendar_month,
                                    color: Colors.orange,
                                  ),
                                  _buildDivider(),
                                  _buildActivityItem(
                                    context,
                                    label: 'Delivered',
                                    count: cards
                                        ? (stats.deliveredReceiptsCount)
                                        : 0,
                                    icon: Icons.check_circle_outline,
                                    color: Colors.green,
                                  ),
                                  _buildDivider(),
                                  _buildActivityItem(
                                    context,
                                    label: 'Pending',
                                    count: cards
                                        ? (stats.pendingReceiptsCount)
                                        : 0,
                                    icon: Icons.hourglass_top,
                                    color: Colors.orange,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],

                    // ── MEMBER PERSONAL STATS (non-owner roles only) ──────
                    if (!isOwner && !isPresident && !isTreasurer) ...[ 
                      const SizedBox(height: 16),
                      _buildMemberStatsCard(context, rp.receipts, auth.user?.id ?? ''),
                    ],

                    // ── TEAM PERFORMANCE CARD (owners only) ──────────────
                    if (isOwner || isPresident) ...[ 
                      const SizedBox(height: 16),
                      _buildTeamPerformanceCard(context, rp.receipts),
                    ],

                    const SizedBox(height: 20),

                    // Quick Actions Header
                    const Text(
                      'Quick Actions',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2E1C0C)),
                    ),
                    const SizedBox(height: 12),

                    // Quick Actions Grid (8 items)
                    Card(
                      color: Colors.white,
                      elevation: 2,
                      shadowColor: Colors.black.withOpacity(0.04),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(
                            color: Colors.grey.withOpacity(0.12), width: 1),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            vertical: 16.0, horizontal: 8.0),
                        child: GridView.count(
                          crossAxisCount: 4,
                          crossAxisSpacing: 4,
                          mainAxisSpacing: 16,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          children: [
                            if (isOwner ||
                                isPresident ||
                                isTreasurer ||
                                isMember)
                              _buildQuickActionTile(
                                label: 'Add Receipt',
                                icon: Icons.post_add,
                                color: const Color(0xFF8B1E2D),
                                onTap: () => Navigator.pushNamed(
                                    context, '/create-receipt'),
                              ),
                            if (isOwner || isPresident || isMember)
                              _buildQuickActionTile(
                                label: 'History',
                                icon: Icons.receipt_long,
                                color: const Color(0xFF8B1E2D),
                                onTap: () => Navigator.pushNamed(
                                    context, '/receipt-history'),
                              ),
                            if (isOwner || isTreasurer)
                              _buildQuickActionTile(
                                label: 'Donor List',
                                icon: Icons.people,
                                color: const Color(0xFF8B1E2D),
                                onTap: () =>
                                    Navigator.pushNamed(context, '/donor-list'),
                              ),
                            if (isOwner || isTreasurer || isMember)
                              _buildQuickActionTile(
                                label: 'Pending',
                                icon: Icons.hourglass_empty,
                                color: const Color(0xFFF47C20),
                                onTap: () => Navigator.pushNamed(
                                    context, '/collection-details',
                                    arguments: {'type': 'pending'}),
                                isPendingAccent: true,
                              ),
                            if (isOwner || isPresident)
                              _buildQuickActionTile(
                                label: 'Report',
                                icon: Icons.assessment,
                                color: const Color(0xFF8B1E2D),
                                onTap: _showReportsBottomSheet,
                              ),
                            if (isOwner)
                              _buildQuickActionTile(
                                label: 'Design Receipt',
                                icon: Icons.palette,
                                color: const Color(0xFF8B1E2D),
                                onTap: () => Navigator.pushNamed(
                                    context, '/settings/customization'),
                              ),
                            if (isOwner)
                              _buildQuickActionTile(
                                label: 'Owner Signature',
                                icon: Icons.draw,
                                color: const Color(0xFF8B1E2D),
                                onTap: () => Navigator.pushNamed(
                                    context, '/settings/signatures'),
                              ),
                            if (isOwner)
                              _buildQuickActionTile(
                                label: 'Admin Setting',
                                icon: Icons.settings,
                                color: const Color(0xFF8B1E2D),
                                onTap: () =>
                                    Navigator.pushNamed(context, '/settings'),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Recent Activity Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Recent Receipts',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF2E1C0C)),
                        ),
                        TextButton(
                          onPressed: () =>
                              Navigator.pushNamed(context, '/receipt-history'),
                          child: const Text(
                            'View All',
                            style: TextStyle(
                                color: Color(0xFF8B1E2D),
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (recentReceipts.isEmpty)
                      Card(
                        elevation: 0,
                        color: Colors.white.withValues(alpha: 0.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                              color: Colors.grey.withValues(alpha: 0.2)),
                        ),
                        child: const EmptyStateWidget(
                          title: 'No receipts yet.',
                          description:
                              'Every collection starts with a single step! Create your first receipt using the "Add New Collection" card above.',
                          icon: Icons.receipt_long,
                        ),
                      )
                    else
                      Card(
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16.0, vertical: 8.0),
                          child: ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: recentReceipts.length,
                            separatorBuilder: (context, index) =>
                                const Divider(height: 1, color: Colors.black12),
                            itemBuilder: (context, index) {
                              final receipt = recentReceipts[index];
                              final date = DateTime.tryParse(receipt.createdAt);
                              final dateStr = date != null ? _formatDate(date) : '';

                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: DonorAvatar(name: receipt.donorName),
                                title: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        receipt.donorName ?? "Guest Donor",
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: Color(0xFF2E1C0C),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                subtitle: Padding(
                                  padding: const EdgeInsets.only(top: 4.0),
                                  child: Row(
                                    children: [
                                      Text(
                                        '${receipt.receiptNumber} • $dateStr',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 11.5,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: receipt.paymentStatus == 'paid'
                                              ? Colors.green[50]
                                              : receipt.paymentStatus == 'pending'
                                                  ? Colors.orange[50]
                                                  : Colors.red[50],
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          receipt.paymentStatus.toUpperCase(),
                                          style: TextStyle(
                                            fontSize: 8.5,
                                            fontWeight: FontWeight.bold,
                                            color: receipt.paymentStatus == 'paid'
                                                ? Colors.green[800]
                                                : receipt.paymentStatus ==
                                                        'pending'
                                                    ? Colors.orange[800]
                                                    : Colors.red[800],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      '₹${receipt.amount.toStringAsFixed(0)}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 15.5,
                                          color: Color(0xFF2E1C0C)),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.chevron_right,
                                        size: 16, color: Colors.grey),
                                  ],
                                ),
                                onTap: () {
                                  Navigator.pushNamed(
                                    context,
                                    '/receipt-preview',
                                    arguments: {
                                      'receipt': receipt,
                                      'action': 'view',
                                    },
                                  );
                                },
                              );
                            },
                          ),
                        ),
                      ),
                    const SizedBox(
                        height:
                            100), // space to avoid floating action button overlap

                    // ── RECENT ACTIVITY LOG (owners/presidents only) ──────
                    if (isOwner || isPresident) ...[ 
                      _buildRecentActivitySection(context, auth.organization?.id ?? ''),
                      const SizedBox(height: 100),
                    ],
                  ],
                ),
              ),
          ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MEMBER STATS CARD — Personal performance for non-owner roles
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildMemberStatsCard(
      BuildContext context, List<ReceiptModel> allReceipts, String myUid) {
    final now = DateTime.now();
    final startOfToday = DateTime(now.year, now.month, now.day);
    final startOfMonth = DateTime(now.year, now.month, 1);

    final myReceipts = allReceipts
        .where((r) => r.collectorId == myUid && r.paymentStatus != 'cancelled')
        .toList();

    double todayAmt = 0, monthAmt = 0, totalAmt = 0;
    int pendingCount = 0;
    for (final r in myReceipts) {
      final d = DateTime.tryParse(r.createdAt);
      if (d != null && d.isAfter(startOfToday)) todayAmt += r.amount;
      if (d != null && d.isAfter(startOfMonth)) monthAmt += r.amount;
      if (r.paymentStatus == 'paid') totalAmt += r.amount;
      if (r.paymentStatus == 'pending') pendingCount++;
    }

    return Card(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.04),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.withOpacity(0.12), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.person_outline, color: Color(0xFF8B1E2D), size: 20),
                SizedBox(width: 8),
                Text(
                  'My Performance',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Color(0xFF2E1C0C),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: Colors.black12),
            const SizedBox(height: 12),
            Row(
              children: [
                _memberStatChip('Today', '₹${todayAmt.toStringAsFixed(0)}',
                    Icons.wb_sunny_outlined, Colors.orange),
                const SizedBox(width: 10),
                _memberStatChip('This Month',
                    '₹${monthAmt.toStringAsFixed(0)}', Icons.calendar_month,
                    Colors.blue),
                const SizedBox(width: 10),
                _memberStatChip(
                    'Total', '₹${totalAmt.toStringAsFixed(0)}',
                    Icons.account_balance_wallet_outlined,
                    const Color(0xFF8B1E2D)),
                const SizedBox(width: 10),
                _memberStatChip('Pending', '$pendingCount',
                    Icons.hourglass_empty, Colors.amber[700]!),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _memberStatChip(
      String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.07),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 9, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEAM PERFORMANCE CARD — Per-member breakdown for owners
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildTeamPerformanceCard(
      BuildContext context, List<ReceiptModel> allReceipts) {
    if (allReceipts.isEmpty) return const SizedBox.shrink();

    final now = DateTime.now();
    final startOfToday = DateTime(now.year, now.month, now.day);
    final startOfMonth = DateTime(now.year, now.month, 1);

    // Group by collectorId
    final Map<String, Map<String, dynamic>> byMember = {};
    for (final r in allReceipts) {
      if (r.paymentStatus == 'cancelled') continue;
      final cid = r.collectorId ?? 'unknown';
      byMember.putIfAbsent(cid, () => {
            'name': r.collectorName ?? r.createdByName ?? 'Unknown',
            'role': r.collectorRole ?? r.createdByRole ?? '',
            'total': 0.0,
            'todayAmt': 0.0,
            'monthAmt': 0.0,
            'count': 0,
            'pendingCount': 0,
            'lastReceipt': null,
          });

      final d = DateTime.tryParse(r.createdAt);
      byMember[cid]!['count'] = (byMember[cid]!['count'] as int) + 1;

      if (r.paymentStatus == 'paid') {
        byMember[cid]!['total'] =
            (byMember[cid]!['total'] as double) + r.amount;
        if (d != null && d.isAfter(startOfToday)) {
          byMember[cid]!['todayAmt'] =
              (byMember[cid]!['todayAmt'] as double) + r.amount;
        }
        if (d != null && d.isAfter(startOfMonth)) {
          byMember[cid]!['monthAmt'] =
              (byMember[cid]!['monthAmt'] as double) + r.amount;
        }
      } else if (r.paymentStatus == 'pending') {
        byMember[cid]!['pendingCount'] =
            (byMember[cid]!['pendingCount'] as int) + 1;
      }

      // Track latest receipt time
      if (d != null) {
        final prev = byMember[cid]!['lastReceipt'] as DateTime?;
        if (prev == null || d.isAfter(prev)) {
          byMember[cid]!['lastReceipt'] = d;
        }
      }
    }

    if (byMember.isEmpty) return const SizedBox.shrink();

    // Sort by total amount descending
    final sorted = byMember.entries.toList()
      ..sort((a, b) =>
          (b.value['total'] as double).compareTo(a.value['total'] as double));

    return Card(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.04),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.withOpacity(0.12), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.leaderboard_outlined,
                    color: Color(0xFF8B1E2D), size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Team Performance',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Color(0xFF2E1C0C),
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () =>
                      Navigator.pushNamed(context, '/settings/team'),
                  child: const Text(
                    'Manage',
                    style: TextStyle(
                        color: Color(0xFF8B1E2D),
                        fontSize: 12,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: Colors.black12),
            const SizedBox(height: 4),

            // Header row
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(flex: 3, child: Text('Member', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54))),
                  Expanded(flex: 2, child: Text('Today', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54), textAlign: TextAlign.right)),
                  Expanded(flex: 2, child: Text('Month', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54), textAlign: TextAlign.right)),
                  Expanded(flex: 2, child: Text('Total', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54), textAlign: TextAlign.right)),
                  Expanded(flex: 2, child: Text('Avg', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54), textAlign: TextAlign.right)),
                ],
              ),
            ),
            const Divider(height: 1, color: Colors.black12),

            // Member rows
            ...sorted.asMap().entries.map((entry) {
              final idx = entry.key;
              final e = entry.value;
              final data = e.value;
              final name = (data['name'] as String).trim().split(' ').first;
              final total = data['total'] as double;
              final today = data['todayAmt'] as double;
              final month = data['monthAmt'] as double;
              final count = data['count'] as int;
              final avg = count > 0 ? total / count : 0.0;
              final lastDt = data['lastReceipt'] as DateTime?;
              final isTop = idx == 0 && total > 0;

              return Container(
                decoration: BoxDecoration(
                  color: isTop
                      ? const Color(0xFFFFF6E8)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Row(
                          children: [
                            if (isTop)
                              const Text('🏆 ',
                                  style: TextStyle(fontSize: 11)),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isTop
                                          ? FontWeight.bold
                                          : FontWeight.w500,
                                      color: const Color(0xFF2E1C0C),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (lastDt != null)
                                    Text(
                                      _formatDate(lastDt),
                                      style: TextStyle(
                                          fontSize: 9,
                                          color: Colors.grey[400]),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          '₹${today.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: today > 0
                                ? Colors.green[700]
                                : Colors.grey[400],
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          '₹${month.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF2E1C0C),
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          '₹${total.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF8B1E2D),
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          '₹${avg.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey[600],
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECENT ACTIVITY LOG — Real-time stream from activity_logs
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildRecentActivitySection(BuildContext context, String orgId) {
    if (orgId.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Activity',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2E1C0C)),
            ),
            TextButton(
              onPressed: () =>
                  Navigator.pushNamed(context, '/settings/activity-log'),
              child: const Text(
                'View All',
                style: TextStyle(
                    color: Color(0xFF8B1E2D),
                    fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        StreamBuilder<QuerySnapshot>(
          stream: FirebaseFirestore.instance
              .collection('activity_logs')
              .where('organizationId', isEqualTo: orgId)
              .snapshots(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const ShimmerSkeleton(
                width: double.infinity,
                height: 120,
                borderRadius: BorderRadius.all(Radius.circular(12)),
              );
            }
            if (snapshot.hasError) {
              debugPrint('[FIRESTORE_ACTIVITY_LOG_ERROR] OrganizationId: $orgId | Exception: ${snapshot.error}');
            }

            final rawDocs = snapshot.data?.docs ?? [];
            if (rawDocs.isEmpty) {
              return Card(
                elevation: 0,
                color: Colors.white.withOpacity(0.5),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.withOpacity(0.2)),
                ),
                child: const EmptyStateWidget(
                  title: 'No recent activity.',
                  description: 'Activity such as receipts created, payments confirmed, and member changes will appear here.',
                  icon: Icons.history,
                ),
              );
            }

            // Sort docs in memory by timestamp descending to support all query/index configurations
            final docs = List<QueryDocumentSnapshot>.from(rawDocs);
            docs.sort((a, b) {
              final aData = a.data() as Map<String, dynamic>?;
              final bData = b.data() as Map<String, dynamic>?;
              final aTs = aData?['timestamp'];
              final bTs = bData?['timestamp'];
              DateTime? aTime;
              DateTime? bTime;
              if (aTs is Timestamp) aTime = aTs.toDate();
              else if (aTs is String) aTime = DateTime.tryParse(aTs);

              if (bTs is Timestamp) bTime = bTs.toDate();
              else if (bTs is String) bTime = DateTime.tryParse(bTs);

              if (aTime == null && bTime == null) return 0;
              if (aTime == null) return 1;
              if (bTime == null) return -1;
              return bTime.compareTo(aTime);
            });

            final displayDocs = docs.take(8).toList();

            return Card(
              elevation: 2,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16.0, vertical: 8.0),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: displayDocs.length,
                  separatorBuilder: (_, __) =>
                      const Divider(height: 1, color: Colors.black12),
                  itemBuilder: (context, i) {
                    final data =
                        displayDocs[i].data() as Map<String, dynamic>;
                    final action = data['action'] as String? ?? '';
                    final details = data['details'] as String? ?? '';
                    final userName = data['userName'] as String? ?? '';
                    final ts = data['timestamp'];
                    DateTime? time;
                    if (ts is Timestamp) {
                      time = ts.toDate();
                    } else if (ts is String) {
                      time = DateTime.tryParse(ts);
                    }

                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        radius: 16,
                        backgroundColor:
                            _activityColor(action).withOpacity(0.12),
                        child: Icon(
                          _activityIcon(action),
                          size: 16,
                          color: _activityColor(action),
                        ),
                      ),
                      title: Text(
                        details.isNotEmpty ? details : action,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF2E1C0C),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(
                        time != null
                            ? '$userName · ${_timeAgo(time)}'
                            : userName,
                        style: TextStyle(
                            fontSize: 10, color: Colors.grey[500]),
                      ),
                    );
                  },
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  IconData _activityIcon(String action) {
    switch (action) {
      case 'Receipt Created':
        return Icons.receipt_long;
      case 'Payment Confirmed':
        return Icons.check_circle_outline;
      case 'Receipt Edited':
        return Icons.edit_outlined;
      case 'Organization Switched':
        return Icons.swap_horiz;
      case 'Member Invited':
        return Icons.person_add_outlined;
      case 'Member Removed':
        return Icons.person_remove_outlined;
      case 'Role Changed':
        return Icons.manage_accounts_outlined;
      case 'Subscription Upgraded':
        return Icons.star_outline;
      default:
        return Icons.info_outline;
    }
  }

  Color _activityColor(String action) {
    switch (action) {
      case 'Receipt Created':
        return const Color(0xFF8B1E2D);
      case 'Payment Confirmed':
        return Colors.green;
      case 'Receipt Edited':
        return Colors.orange;
      case 'Member Invited':
      case 'Member Removed':
      case 'Role Changed':
        return Colors.blue;
      case 'Subscription Upgraded':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return _formatDate(dt);
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final dateToCheck = DateTime(date.year, date.month, date.day);

    if (dateToCheck == today) {
      return 'Today';
    } else if (dateToCheck == yesterday) {
      return 'Yesterday';
    } else {
      final months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${date.day} ${months[date.month - 1]}';
    }
  }

  Widget _buildDashboardSkeleton(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 8),
          const ShimmerSkeleton(width: 150, height: 24),
          const SizedBox(height: 6),
          const ShimmerSkeleton(width: 250, height: 16),
          const SizedBox(height: 20),
          const ShimmerSkeleton(
              width: double.infinity,
              height: 100,
              borderRadius: BorderRadius.all(Radius.circular(16))),
          const SizedBox(height: 16),
          const ShimmerSkeleton(
              width: double.infinity,
              height: 140,
              borderRadius: BorderRadius.all(Radius.circular(16))),
          const SizedBox(height: 16),
          const ShimmerSkeleton(
              width: double.infinity,
              height: 130,
              borderRadius: BorderRadius.all(Radius.circular(16))),
          const SizedBox(height: 20),
          const ShimmerSkeleton(width: 120, height: 18),
          const SizedBox(height: 12),
          const ShimmerSkeleton(
              width: double.infinity,
              height: 160,
              borderRadius: BorderRadius.all(Radius.circular(16))),
        ],
      ),
    );
  }

  Widget _buildActivityItem(
    BuildContext context, {
    required String label,
    required int count,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
                color: Colors.grey[600],
                fontSize: 10,
                fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 4),
          AnimatedCountText(
            count: count,
            style: const TextStyle(
              color: Color(0xFF2E1C0C),
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 36,
      color: Colors.grey.withOpacity(0.2),
    );
  }

  Widget _buildSubscriptionExpiryBanner(BuildContext context,
      SubscriptionModel sub, Map<String, dynamic> config) {
    int remainingDays = 0;
    bool isExpired = false;
    if (sub.renewalDate != null && sub.renewalDate!.isNotEmpty) {
      try {
        final renewal = DateTime.parse(sub.renewalDate!);
        remainingDays = renewal.difference(DateTime.now()).inDays;
        if (remainingDays < 0) {
          remainingDays = 0;
          isExpired = true;
        }
      } catch (_) {}
    }

    final reminderDays = config['subscription_reminder_days'] ?? 7;
    if (remainingDays > reminderDays && !isExpired) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isExpired ? Colors.red[50] : Colors.orange[50],
        border: Border.all(
            color: isExpired ? Colors.red[300]! : Colors.orange[300]!),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(
            isExpired
                ? Icons.error_outline
                : Icons.warning_amber_rounded,
            color: isExpired ? Colors.red[700] : Colors.orange[700],
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              isExpired
                  ? 'Subscription expired. Renew to continue.'
                  : 'Expires in $remainingDays days — renew now.',
              style: TextStyle(
                color: isExpired ? Colors.red[900] : Colors.orange[900],
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () =>
                Navigator.pushNamed(context, '/settings/subscription-usage'),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color:
                    isExpired ? Colors.red[700] : Colors.orange[700],
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'Renew',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Compact collapsible subscription chip — ~90px collapsed, full detail expanded.
  void _showUpgradeToPremiumDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFFFFF6E8),
        title: const Row(
          children: [
            Icon(Icons.star, color: Colors.amber),
            SizedBox(width: 8),
            Text(
              'Unlock Premium',
              style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2E1C0C)),
            ),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Auto WhatsApp Send is available only in Premium.',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            SizedBox(height: 12),
            Text(
              'Benefits:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
            SizedBox(height: 6),
            Text('• 1000 Auto WhatsApp Sends per Month', style: TextStyle(fontSize: 12)),
            Text('• Advanced Analytics', style: TextStyle(fontSize: 12)),
            Text('• Priority Support', style: TextStyle(fontSize: 12)),
          ],
        ),
        actions: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushNamed(
                    context,
                    '/settings/subscription-usage',
                    arguments: {'plan': 'premium_monthly'},
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B1E2D),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text(
                  'Upgrade Monthly\n₹199 / Month',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushNamed(
                    context,
                    '/settings/subscription-usage',
                    arguments: {'plan': 'premium_yearly'},
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.amber[700],
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text(
                  'Upgrade Yearly\n₹1999 / Year (Save ₹389)',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 4),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Maybe Later', style: TextStyle(color: Colors.grey)),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildSubscriptionChip(
      BuildContext context, SubscriptionModel sub) {
    final used = sub.receiptsUsed;
    final isUnlimited = sub.isUnlimitedReceipts;
    final limit = sub.receiptLimit ?? 10;
    final ratio = isUnlimited ? 0.0 : (used / limit).clamp(0.0, 1.0);

    final isFree = sub.plan == 'free' || sub.plan == 'free_trial';
    final isPremium = sub.plan.contains('premium');
    final isProfessional = !isFree && !isPremium;

    final teamUsed = sub.usersUsed;
    final teamLimit = sub.usersLimit;
    final teamRatio = teamLimit > 0 ? (teamUsed / teamLimit).clamp(0.0, 1.0) : 0.0;

    int remainingDays = 0;
    String renewalFormatted = 'Lifetime';
    if (sub.renewalDate != null && sub.renewalDate!.isNotEmpty) {
      try {
        final renewal = DateTime.parse(sub.renewalDate!);
        remainingDays = renewal.difference(DateTime.now()).inDays;
        if (remainingDays < 0) remainingDays = 0;
        renewalFormatted =
            '${renewal.day.toString().padLeft(2, '0')}/${renewal.month.toString().padLeft(2, '0')}/${renewal.year}';
      } catch (_) {}
    }

    Color progressColor(double r) {
      if (r < 0.7) return const Color(0xFF2ECC71);
      if (r < 0.9) return const Color(0xFFF47C20);
      return Colors.red;
    }

    final rcColor = progressColor(ratio);
    final usColor = progressColor(teamRatio);

    final planLabel = sub.planDetails.displayName;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.13)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            HapticFeedback.selectionClick();
            setState(() => _subscriptionExpanded = !_subscriptionExpanded);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Collapsed row (always visible) ──────────────────────
                Row(
                  children: [
                    // Plan badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2E1C0C),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        planLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    // Active Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green[50],
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.green[200]!, width: 0.8),
                      ),
                      child: Text(
                        'Active',
                        style: TextStyle(
                          color: Colors.green[800],
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Scrollable middle chips
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        child: Row(
                          children: [
                            // Receipts chip
                            _subChipItem(
                              icon: Icons.receipt_outlined,
                              value: isUnlimited ? 'Unlimited' : '$used/$limit',
                              label: 'Receipts',
                              color: rcColor,
                            ),
                            const SizedBox(width: 8),
                            // Users chip
                            _subChipItem(
                              icon: Icons.people_outline,
                              value: '$teamUsed/$teamLimit',
                              label: 'Users',
                              color: usColor,
                            ),
                            const SizedBox(width: 8),
                            if (isPremium) ...[
                              _subChipItem(
                                icon: Icons.chat_outlined,
                                value: '0/1000',
                                label: 'Auto WA',
                                color: const Color(0xFF2E1C0C),
                              ),
                              const SizedBox(width: 8),
                            ],
                            // Days chip
                            _subChipItem(
                              icon: Icons.schedule_outlined,
                              value: sub.renewalDate == null
                                  ? 'Lifetime'
                                  : '$remainingDays Days Left',
                              label: sub.renewalDate == null ? 'Free' : 'Remaining',
                              color: (sub.renewalDate != null && remainingDays <= 7)
                                  ? Colors.red
                                  : const Color(0xFF2E1C0C),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Upgrade link (hidden for Premium)
                    if (!isPremium)
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          if (isProfessional) {
                            _showUpgradeToPremiumDialog(context);
                          } else {
                            Navigator.pushNamed(
                                context, '/settings/subscription-usage');
                          }
                        },
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Upgrade',
                              style: TextStyle(
                                color: Color(0xFFF47C20),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Icon(Icons.chevron_right,
                                color: Color(0xFFF47C20), size: 15),
                          ],
                        ),
                      ),
                    const SizedBox(width: 4),
                    AnimatedRotation(
                      turns: _subscriptionExpanded ? 0.5 : 0.0,
                      duration: const Duration(milliseconds: 280),
                      child: const Icon(Icons.expand_more,
                          size: 18, color: Colors.black38),
                    ),
                  ],
                ),

                // ── Expanded detail ──────────────────────────────────────
                AnimatedCrossFade(
                  firstChild: const SizedBox.shrink(),
                  secondChild: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 14),
                      const Divider(height: 1, color: Colors.black12),
                      const SizedBox(height: 14),

                      // Receipts status
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Receipts',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey[700]),
                          ),
                          Text(
                            isUnlimited ? 'Unlimited' : '$used / $limit',
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF2E1C0C)),
                          ),
                        ],
                      ),
                      if (!isUnlimited) ...[
                        const SizedBox(height: 5),
                        TweenAnimationBuilder<double>(
                          tween: Tween<double>(begin: 0.0, end: ratio),
                          duration: const Duration(milliseconds: 700),
                          builder: (context, val, _) => ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: val,
                              minHeight: 5,
                              backgroundColor: Colors.grey[200],
                              valueColor: AlwaysStoppedAnimation<Color>(rcColor),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),

                      // Users progress
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Team Members',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey[700]),
                          ),
                          Text(
                            '$teamUsed / $teamLimit',
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF2E1C0C)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      TweenAnimationBuilder<double>(
                        tween: Tween<double>(begin: 0.0, end: teamRatio),
                        duration: const Duration(milliseconds: 700),
                        builder: (context, val, _) => ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: val,
                            minHeight: 5,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(usColor),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Renewal row
                      Row(
                        children: [
                          Icon(Icons.event_outlined,
                              size: 14, color: Colors.grey[500]),
                          const SizedBox(width: 5),
                          Text(
                            sub.renewalDate == null
                                ? 'Plan: Lifetime Free'
                                : 'Renewal: $renewalFormatted',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey[600]),
                          ),
                          const Spacer(),
                          Text(
                            sub.renewalDate == null
                                ? 'Lifetime Free'
                                : 'Expires in $remainingDays Days',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: sub.renewalDate == null
                                  ? Colors.green[700]
                                  : remainingDays <= 7
                                      ? Colors.red[700]
                                      : Colors.green[700],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Manage Subscription button
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            Navigator.pushNamed(
                                context, '/settings/subscription-usage');
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF2E1C0C)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          child: const Text(
                            'Manage Subscription',
                            style: TextStyle(
                              color: Color(0xFF2E1C0C),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  crossFadeState: _subscriptionExpanded
                      ? CrossFadeState.showSecond
                      : CrossFadeState.showFirst,
                  duration: const Duration(milliseconds: 280),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _subChipItem({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 3),
        Text(
          value,
          style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: color),
        ),
        const SizedBox(width: 2),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey[500]),
        ),
      ],
    );
  }
}

extension ColorsExtension on Colors {
  static const emerald = Color(0xFF10B981);
}

class AnimatedCountText extends StatefulWidget {
  final int count;
  final TextStyle? style;

  const AnimatedCountText({super.key, required this.count, this.style});

  @override
  State<AnimatedCountText> createState() => _AnimatedCountTextState();
}

class _AnimatedCountTextState extends State<AnimatedCountText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _animation =
        Tween<double>(begin: 0.0, end: widget.count.toDouble()).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _controller.forward();
  }

  @override
  void didUpdateWidget(covariant AnimatedCountText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.count != widget.count) {
      _animation = Tween<double>(
        begin: _animation.value,
        end: widget.count.toDouble(),
      ).animate(
          CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
      _controller.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Text(
          _animation.value.toStringAsFixed(0),
          style: widget.style,
        );
      },
    );
  }
}
