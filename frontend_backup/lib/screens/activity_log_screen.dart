import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../widgets/profile_photo_widget.dart';

class ActivityLogScreen extends StatefulWidget {
  const ActivityLogScreen({super.key});

  @override
  State<ActivityLogScreen> createState() => _ActivityLogScreenState();
}

class _ActivityLogScreenState extends State<ActivityLogScreen> {
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _error;
  List<QueryDocumentSnapshot<Map<String, dynamic>>> _logs = [];
  DocumentSnapshot? _lastDoc;
  bool _hasMore = true;

  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadLogs();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMoreLogs();
    }
  }

  // Load first batch of logs (max 100) with a 10s timeout
  Future<void> _loadLogs() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
      _logs = [];
      _lastDoc = null;
      _hasMore = true;
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
      final querySnapshot = await FirebaseFirestore.instance
          .collection('activity_logs')
          .where('organizationId', isEqualTo: orgId)
          .orderBy('timestamp', descending: true)
          .limit(100)
          .get()
          .timeout(const Duration(seconds: 10));

      if (mounted) {
        setState(() {
          _logs = querySnapshot.docs;
          if (querySnapshot.docs.isNotEmpty) {
            _lastDoc = querySnapshot.docs.last;
          }
          if (querySnapshot.docs.length < 100) {
            _hasMore = false;
          }
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      debugPrint('Error loading logs: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = "Unable to load data.";
        });
      }
    }
  }

  // Paginated load of older records
  Future<void> _loadMoreLogs() async {
    if (_isLoadingMore || !_hasMore || _lastDoc == null || !mounted) return;

    setState(() {
      _isLoadingMore = true;
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) return;

    try {
      final querySnapshot = await FirebaseFirestore.instance
          .collection('activity_logs')
          .where('organizationId', isEqualTo: orgId)
          .orderBy('timestamp', descending: true)
          .startAfterDocument(_lastDoc!)
          .limit(100)
          .get()
          .timeout(const Duration(seconds: 10));

      if (mounted) {
        setState(() {
          _logs.addAll(querySnapshot.docs);
          if (querySnapshot.docs.isNotEmpty) {
            _lastDoc = querySnapshot.docs.last;
          }
          if (querySnapshot.docs.length < 100) {
            _hasMore = false;
          }
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading more logs: $e');
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
        });
      }
    }
  }

  String _formatTimestamp(String tsStr) {
    if (tsStr.isEmpty) return '';
    try {
      final parsed = DateTime.parse(tsStr);
      return DateFormat('dd MMM yyyy, hh:mm a').format(parsed);
    } catch (_) {
      return tsStr;
    }
  }

  IconData _getActionIcon(String action) {
    final lower = action.toLowerCase();
    if (lower.contains('created')) return Icons.add_circle_outline;
    if (lower.contains('edited') || lower.contains('updated'))
      return Icons.edit_outlined;
    if (lower.contains('confirm') || lower.contains('paid'))
      return Icons.check_circle_outline;
    if (lower.contains('invite')) return Icons.group_add_outlined;
    if (lower.contains('remove') || lower.contains('deactivate'))
      return Icons.remove_circle_outline;
    if (lower.contains('upgrade') ||
        lower.contains('subscribe') ||
        lower.contains('renewed') ||
        lower.contains('activated')) return Icons.star_outline;
    if (lower.contains('transferred'))
      return Icons.admin_panel_settings_outlined;
    if (lower.contains('login')) return Icons.login;
    if (lower.contains('logout')) return Icons.logout;
    return Icons.info_outline;
  }

  Color _getActionColor(String action) {
    final lower = action.toLowerCase();
    if (lower.contains('created')) return Colors.green;
    if (lower.contains('edited') || lower.contains('updated'))
      return Colors.blue;
    if (lower.contains('confirm') || lower.contains('paid')) return Colors.teal;
    if (lower.contains('invite')) return Colors.orange;
    if (lower.contains('remove') || lower.contains('deactivate'))
      return Colors.red;
    if (lower.contains('upgrade') ||
        lower.contains('subscribe') ||
        lower.contains('renewed') ||
        lower.contains('activated')) return Colors.purple;
    if (lower.contains('transferred')) return Colors.deepPurple;
    if (lower.contains('login') || lower.contains('logout'))
      return Colors.blueGrey;
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity Audit Trail'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading activity logs...',
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
              const SizedBox(height: 8),
              const Text('Please check your network and try again.',
                  style: TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _loadLogs,
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

    if (_logs.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadLogs,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(height: MediaQuery.of(context).size.height * 0.25),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.history, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 12),
                  Text(
                    'No activity logs found.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Actions like creating receipts or inviting members will show up here.',
                    style: TextStyle(color: Colors.grey[500], fontSize: 11),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadLogs,
      child: ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        itemCount: _logs.length + (_hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _logs.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16.0),
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final data = _logs[index].data();
          final action = data['action'] ?? 'Unknown Action';
          final details = data['details'] ?? '';
          final timestamp = data['timestamp'] ?? '';
          final userName = data['userName'] ?? 'Unknown User';
          final userRole = data['userRole'] ?? '';

          final icon = _getActionIcon(action);
          final color = _getActionColor(action);

          return Card(
            color: Colors.white,
            elevation: 0.5,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.withOpacity(0.1)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ProfilePhotoWidget(
                    uid: data['userId'] ?? '',
                    url: null,
                    version: 0,
                    name: userName,
                    radius: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                action,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: Color(0xFF2E1C0C),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              userRole.toString().toUpperCase(),
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: color,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          details,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[700],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'By: $userName',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: Colors.grey[600],
                              ),
                            ),
                            Text(
                              _formatTimestamp(timestamp),
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
