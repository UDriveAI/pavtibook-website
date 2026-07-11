import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../providers/auth_provider.dart';

class VerificationUploadScreen extends StatefulWidget {
  const VerificationUploadScreen({super.key});

  @override
  State<VerificationUploadScreen> createState() =>
      _VerificationUploadScreenState();
}

class _VerificationUploadScreenState extends State<VerificationUploadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _urlController = TextEditingController();
  String _selectedDocType = 'Trust Deed';
  List<dynamic> _verificationLogs = [];
  bool _isLogLoading = false;

  final List<String> _docTypes = [
    'Trust Deed',
    'Society Certificate',
    'PAN Card',
    'NGO Certificate',
    'Organization Registration Proof',
  ];

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() => _isLogLoading = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final orgId = auth.organization?.id;
      if (orgId != null) {
        final snapshot = await FirebaseFirestore.instance
            .collection('organizations')
            .doc(orgId)
            .collection('verifications')
            .orderBy('createdAt', descending: true)
            .get();

        final logs = snapshot.docs.map((doc) {
          final data = doc.data();
          final createdAt = data['createdAt'] as Timestamp?;
          return {
            'document_type': data['document_type'] ?? '',
            'document_url': data['document_url'] ?? '',
            'status': data['status'] ?? 'pending',
            'createdAt': createdAt?.toDate().toIso8601String() ??
                DateTime.now().toIso8601String(),
          };
        }).toList();

        setState(() {
          _verificationLogs = logs;
        });
      }
    } catch (e) {
      debugPrint('Load logs error: $e');
    } finally {
      setState(() => _isLogLoading = false);
    }
  }

  Future<void> _submitDocument() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.uploadVerificationDocument(
      _selectedDocType,
      _urlController.text.trim(),
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Document submitted! Awaiting Super Admin review.')),
      );
      _urlController.clear();
      _loadLogs();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to upload document.')),
      );
    }
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final theme = Theme.of(context);
    final isVerified = auth.organization?.isVerified ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Compliance Verification'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Header Card
            Card(
              color: isVerified ? Colors.blue[50] : Colors.amber[50],
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Icon(
                      isVerified ? Icons.verified : Icons.pending,
                      color: isVerified ? Colors.blue[800] : Colors.amber[800],
                      size: 32,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isVerified
                                ? 'VERIFIED PROFILE'
                                : 'UNVERIFIED PROFILE',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: isVerified
                                  ? Colors.blue[900]
                                  : Colors.amber[900],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isVerified
                                ? 'Your organization has been vetted. Trust badges are active on public verification portals and PDF downloads.'
                                : 'Submit legal entity proofs to get the verified badge and increase trust among donors.',
                            style: TextStyle(
                              fontSize: 12,
                              color: isVerified
                                  ? Colors.blue[900]
                                  : Colors.amber[900],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Onboarding Form
            if (!isVerified) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Upload Verification Proofs',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blueGrey),
                        ),
                        const Divider(),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedDocType,
                          decoration: const InputDecoration(
                              labelText: 'Document Type *',
                              border: OutlineInputBorder()),
                          items: _docTypes
                              .map((t) =>
                                  DropdownMenuItem(value: t, child: Text(t)))
                              .toList(),
                          onChanged: (val) {
                            if (val != null)
                              setState(() => _selectedDocType = val);
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _urlController,
                          decoration: const InputDecoration(
                            labelText:
                                'Document URL (Cloudinary link, S3, or GDrive)',
                            border: OutlineInputBorder(),
                            hintText: 'https://...',
                          ),
                          validator: (val) => val == null || val.isEmpty
                              ? 'Please enter document link'
                              : null,
                        ),
                        const SizedBox(height: 16),
                        auth.isLoading
                            ? const Center(child: CircularProgressIndicator())
                            : ElevatedButton(
                                onPressed: _submitDocument,
                                child:
                                    const Text('Submit Document For Approval'),
                              ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // History Timeline Section
            const Text(
              'Compliance Log History',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            _isLogLoading
                ? const Center(child: CircularProgressIndicator())
                : _verificationLogs.isEmpty
                    ? const Card(
                        child: Padding(
                          padding: EdgeInsets.all(24.0),
                          child: Center(
                              child: Text(
                                  'No compliance documents submitted yet.')),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _verificationLogs.length,
                        itemBuilder: (context, index) {
                          final log = _verificationLogs[index];
                          final status = log['status'] as String;
                          final date = DateTime.tryParse(log['created_at']) ??
                              DateTime.now();
                          final dateFormatted =
                              DateFormat('dd MMM yyyy, hh:mm a').format(date);

                          Color statusColor = Colors.orange;
                          IconData statusIcon = Icons.hourglass_empty;
                          if (status == 'approved') {
                            statusColor = Colors.green;
                            statusIcon = Icons.check_circle;
                          } else if (status == 'rejected') {
                            statusColor = Colors.red;
                            statusIcon = Icons.cancel;
                          }

                          return Card(
                            child: ListTile(
                              leading: Icon(statusIcon, color: statusColor),
                              title: Text(log['document_type']),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  SelectableText(
                                    log['document_url'],
                                    style: const TextStyle(
                                        fontSize: 11, color: Colors.blueGrey),
                                  ),
                                  Text(
                                    'Submitted: $dateFormatted',
                                    style: const TextStyle(
                                        fontSize: 9, color: Colors.grey),
                                  ),
                                  if (log['remarks'] != null)
                                    Text(
                                      'Feedback: ${log['remarks']}',
                                      style: const TextStyle(
                                          fontSize: 11,
                                          fontStyle: FontStyle.italic),
                                    ),
                                ],
                              ),
                              trailing: Chip(
                                label: Text(
                                  status.toUpperCase(),
                                  style: const TextStyle(
                                      fontSize: 9,
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold),
                                ),
                                backgroundColor: statusColor,
                              ),
                              isThreeLine: true,
                            ),
                          );
                        },
                      ),
          ],
        ),
      ),
    );
  }
}
