import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:http/http.dart' as http;
import '../providers/auth_provider.dart';
import '../services/subscription_permission_service.dart';

class WhatsAppLogsScreen extends StatefulWidget {
  const WhatsAppLogsScreen({super.key});

  @override
  State<WhatsAppLogsScreen> createState() => _WhatsAppLogsScreenState();
}

class _WhatsAppLogsScreenState extends State<WhatsAppLogsScreen> {
  bool _isActionRunning = false;

  // Index-building state
  bool _indexBuilding = false;
  Timer? _retryTimer;

  @override
  void dispose() {
    _retryTimer?.cancel();
    super.dispose();
  }

  void _scheduleRetry() {
    _retryTimer?.cancel();
    _retryTimer = Timer(const Duration(seconds: 10), () {
      if (mounted) {
        setState(() {
          _indexBuilding = false;
        });
      }
    });
  }

  bool _isIndexBuildingError(Object error) {
    final msg = error.toString().toLowerCase();
    return msg.contains('failed-precondition') ||
        msg.contains('requires an index') ||
        msg.contains('index') && msg.contains('building');
  }

  Future<void> _retryTextMessage(String receiptId) async {
    if (_isActionRunning) return;
    setState(() => _isActionRunning = true);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (cxt) => const AlertDialog(
        content: Row(
          children: [
            CircularProgressIndicator(),
            SizedBox(width: 20),
            Expanded(child: Text("Retrying Text Message...")),
          ],
        ),
      ),
    );

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) throw Exception("User is not authenticated.");
      final idToken = await user.getIdToken();

      final projectId = Firebase.app().options.projectId;
      final url =
          'https://asia-south1-$projectId.cloudfunctions.net/retryWhatsappSend';
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: '{"data": {"receiptId": "$receiptId"}}',
      );

      if (mounted) Navigator.pop(context);

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('WhatsApp text retry triggered successfully!')),
          );
        }
      } else {
        throw Exception(
            'Server returned status code ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Retry failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isActionRunning = false);
      }
    }
  }

  Future<void> _retryMediaMessage(String receiptId) async {
    if (_isActionRunning) return;
    setState(() => _isActionRunning = true);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (cxt) => const AlertDialog(
        content: Row(
          children: [
            CircularProgressIndicator(),
            SizedBox(width: 20),
            Expanded(child: Text("Sending Media Receipt...")),
          ],
        ),
      ),
    );

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) throw Exception("User is not authenticated.");
      final idToken = await user.getIdToken();

      final projectId = Firebase.app().options.projectId;
      final url =
          'https://asia-south1-$projectId.cloudfunctions.net/sendReceiptMediaWhatsapp';
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: '{"data": {"receiptId": "$receiptId"}}',
      );

      if (mounted) Navigator.pop(context);

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content:
                    Text('WhatsApp media delivery triggered successfully!')),
          );
        }
      } else {
        throw Exception(
            'Server returned status code ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Media delivery failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isActionRunning = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isPremium = SubscriptionPermissionService.isPremium(auth.subscription?.plan);

    if (!isPremium) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('WhatsApp Delivery Logs'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_outline, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Upgrade to Premium',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Auto WhatsApp Receipt Sending is available only in the Premium plan.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pushReplacementNamed(context, '/settings/subscription-usage');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('View Subscription Plans'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final orgId = auth.organization?.id;

    if (orgId == null) {
      return const Scaffold(
        body: Center(child: Text('No active organization found.')),
      );
    }

    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('WhatsApp Delivery Logs'),
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Colors.white,
            tabs: [
              Tab(text: 'All'),
              Tab(text: 'Sent'),
              Tab(text: 'Failed'),
              Tab(text: 'Pending'),
            ],
          ),
        ),
        body: _indexBuilding
            ? _buildIndexingState()
            : StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance
                    .collection('whatsapp_logs')
                    .where('organizationId', isEqualTo: orgId)
                    .snapshots(),
                builder: (context, snapshot) {
                  // Handle index-building error gracefully
                  if (snapshot.hasError) {
                    if (_isIndexBuildingError(snapshot.error!)) {
                      // Switch to index-building UI and retry after 10s
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted && !_indexBuilding) {
                          setState(() => _indexBuilding = true);
                          _scheduleRetry();
                        }
                      });
                      return _buildIndexingState();
                    }
                    // Unknown error — show generic message, NOT raw error
                    return _buildErrorState();
                  }

                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final docs = List<QueryDocumentSnapshot>.from(snapshot.data?.docs ?? []);
                  // Sort locally by updatedAt descending to bypass missing compound index
                  docs.sort((a, b) {
                    final aData = a.data() as Map<String, dynamic>?;
                    final bData = b.data() as Map<String, dynamic>?;
                    final aVal = aData?['updatedAt'];
                    final bVal = bData?['updatedAt'];
                    
                    if (aVal == null && bVal == null) return 0;
                    if (aVal == null) return 1;
                    if (bVal == null) return -1;
                    
                    DateTime? aTime;
                    DateTime? bTime;
                    
                    if (aVal is Timestamp) {
                      aTime = aVal.toDate();
                    } else if (aVal is String) {
                      aTime = DateTime.tryParse(aVal);
                    }
                    
                    if (bVal is Timestamp) {
                      bTime = bVal.toDate();
                    } else if (bVal is String) {
                      bTime = DateTime.tryParse(bVal);
                    }
                    
                    if (aTime == null && bTime == null) return 0;
                    if (aTime == null) return 1;
                    if (bTime == null) return -1;
                    
                    return bTime.compareTo(aTime);
                  });

                  if (docs.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.history_toggle_off,
                              size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'No WhatsApp logs found',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    );
                  }

                  return TabBarView(
                    children: [
                      _buildLogsList(docs),
                      _buildLogsList(docs
                          .where(
                              (d) => _isSent(d.data() as Map<String, dynamic>))
                          .toList()),
                      _buildLogsList(docs
                          .where((d) =>
                              _isFailed(d.data() as Map<String, dynamic>))
                          .toList()),
                      _buildLogsList(docs
                          .where((d) =>
                              _isPending(d.data() as Map<String, dynamic>))
                          .toList()),
                    ],
                  );
                },
              ),
      ),
    );
  }

  /// Shown while Firestore index is building
  Widget _buildIndexingState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            const SizedBox(height: 24),
            const Text(
              'Preparing delivery history...',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF2E1C0C),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Setting up search index. This happens only once.\nWill retry automatically in a few seconds.',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  /// Shown for non-index errors
  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off_outlined, size: 56, color: Colors.grey[400]),
            const SizedBox(height: 16),
            const Text(
              'Could not load delivery logs',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Please check your internet connection and try again.',
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () => setState(() {}),
              icon: const Icon(Icons.refresh, size: 18),
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

  bool _isSent(Map<String, dynamic> data) {
    return data['textStatus'] == 'sent' &&
        (data['whatsappMediaStatus'] == 'sent' ||
            data['whatsappMediaStatus'] == null);
  }

  bool _isFailed(Map<String, dynamic> data) {
    return data['textStatus'] == 'failed' ||
        data['whatsappMediaStatus'] == 'failed';
  }

  bool _isPending(Map<String, dynamic> data) {
    return data['textStatus'] == 'processing' ||
        data['whatsappMediaStatus'] == 'processing';
  }

  Widget _buildLogsList(List<DocumentSnapshot> docs) {
    if (docs.isEmpty) {
      return Center(
        child: Text(
          'No records in this tab.',
          style: TextStyle(color: Colors.grey[500], fontSize: 13),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12.0),
      itemCount: docs.length,
      itemBuilder: (context, index) {
        final data = docs[index].data() as Map<String, dynamic>;
        final receiptId = docs[index].id;
        final receiptNumber = data['receiptNumber'] ?? 'Unknown Receipt';
        final recipient = data['recipientMobile'] ?? 'Unknown Phone';

        final textStatus = data['textStatus'] ?? 'pending';
        final mediaStatus = data['whatsappMediaStatus'] ?? 'not_sent';
        final attemptCount = data['attemptCount'] ?? 1;
        final textError = data['textError'] ?? '';
        final mediaError = data['whatsappMediaError'] ?? '';
        final mediaUrl = data['whatsappMediaUrl'] ?? '';

        return Card(
          color: Colors.white,
          margin: const EdgeInsets.only(bottom: 12.0),
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.withValues(alpha: 0.12)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      receiptNumber,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: Color(0xFF8B1E2D)),
                    ),
                    Row(
                      children: [
                        _buildStatusBadge('Text: $textStatus', textStatus),
                        const SizedBox(width: 6),
                        _buildStatusBadge('Media: $mediaStatus', mediaStatus),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Recipient Mobile: $recipient',
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  'Attempts: $attemptCount/3',
                  style: TextStyle(fontSize: 11, color: Colors.grey[650]),
                ),
                if (textError.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8.0),
                    decoration: BoxDecoration(
                      color: Colors.red[50],
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.red[200]!),
                    ),
                    child: Text(
                      'Text Error: $textError',
                      style: TextStyle(fontSize: 11, color: Colors.red[900]),
                    ),
                  ),
                ],
                if (mediaError.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8.0),
                    decoration: BoxDecoration(
                      color: Colors.red[50],
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.red[200]!),
                    ),
                    child: Text(
                      'Media Error: $mediaError',
                      style: TextStyle(fontSize: 11, color: Colors.red[900]),
                    ),
                  ),
                ],
                if (mediaUrl.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Signed URL Generated (Expires in 24h)',
                    style: TextStyle(
                        fontSize: 11,
                        color: Colors.teal,
                        fontWeight: FontWeight.bold),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (textStatus == 'failed' && attemptCount >= 3)
                      OutlinedButton.icon(
                        onPressed: () => _retryTextMessage(receiptId),
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Retry Text',
                            style: TextStyle(fontSize: 11)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFF47C20)),
                          foregroundColor: const Color(0xFFF47C20),
                        ),
                      ),
                    if (textStatus == 'sent' &&
                        (mediaStatus == 'failed' ||
                            mediaStatus == 'not_sent')) ...[
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: () => _retryMediaMessage(receiptId),
                        icon: const Icon(Icons.image_outlined, size: 16),
                        label: const Text('Send Media',
                            style: TextStyle(fontSize: 11)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.teal[800],
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusBadge(String text, String status) {
    Color bg;
    Color fg;

    switch (status) {
      case 'sent':
        bg = Colors.green[50]!;
        fg = Colors.green[800]!;
        break;
      case 'failed':
      case 'permanent_failure':
        bg = Colors.red[50]!;
        fg = Colors.red[800]!;
        break;
      case 'processing':
        bg = Colors.orange[50]!;
        fg = Colors.orange[800]!;
        break;
      case 'disabled':
        bg = Colors.grey[100]!;
        fg = Colors.grey[700]!;
        break;
      default:
        bg = Colors.blue[50]!;
        fg = Colors.blue[800]!;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(color: fg, fontWeight: FontWeight.bold, fontSize: 9),
      ),
    );
  }
}
