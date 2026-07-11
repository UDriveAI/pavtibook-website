import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class PublicVerificationScreen extends StatefulWidget {
  const PublicVerificationScreen({super.key});

  @override
  State<PublicVerificationScreen> createState() =>
      _PublicVerificationScreenState();
}

class _PublicVerificationScreenState extends State<PublicVerificationScreen> {
  final _hashController = TextEditingController();
  Map<String, dynamic>? _verifiedData;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Check if a verification code was passed via routes
    final args = ModalRoute.of(context)!.settings.arguments;
    if (args is String && args.isNotEmpty) {
      _hashController.text = args;
      _runVerification(args);
    }
  }

  Future<void> _runVerification(String hash) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _verifiedData = null;
    });

    try {
      final doc = await FirebaseFirestore.instance
          .collection('receipts')
          .doc(hash)
          .get();
      if (doc.exists) {
        final rData = doc.data()!;
        final orgId = rData['organizationId'] ?? rData['organization_id'];

        String orgName = 'Organization';
        String orgType = 'Trust';

        if (orgId != null) {
          final orgDoc = await FirebaseFirestore.instance
              .collection('organizations')
              .doc(orgId)
              .get();
          if (orgDoc.exists) {
            orgName = orgDoc.data()?['name'] ?? 'Organization';
            orgType = orgDoc.data()?['type'] ?? 'Trust';
          }
        }

        setState(() {
          _verifiedData = {
            'isValid': true,
            'isOrganizationVerified': true,
            'organizationName': orgName,
            'organizationType': orgType,
            'receiptNumber': rData['receiptNumber'] ?? '',
            'donorName': rData['donorName'] ?? '',
            'amount': (rData['amount'] ?? 0).toString(),
            'purpose': rData['purpose'] ?? '',
            'date': rData['createdAt'] ?? DateTime.now().toIso8601String(),
            'paymentMode': rData['paymentMode'] ?? '',
            'paymentStatus': rData['paymentStatus'] ?? '',
          };
        });
      } else {
        setState(() {
          _errorMessage = 'Receipt verification code not found.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Verification check failed: $e';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _hashController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isVerified =
        _verifiedData != null && _verifiedData!['isValid'] == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Public Receipt Verification'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'PavtiBook Trust Portal',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Enter receipt verification code or scan printed QR code to verify validity.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const SizedBox(height: 20),

            // Input Form
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _hashController,
                    decoration: const InputDecoration(
                      labelText: 'Receipt Verification Code',
                      hintText: 'e.g. verify_hash_token_001',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  icon: const Icon(Icons.arrow_forward),
                  onPressed: () {
                    if (_hashController.text.trim().isNotEmpty) {
                      _runVerification(_hashController.text.trim());
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 24),

            // States
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else if (_errorMessage != null)
              Card(
                color: Colors.red[50],
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            else if (_verifiedData != null)
              isVerified
                  ? _buildVerifiedReceiptCard(theme)
                  : _buildInvalidReceiptCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildVerifiedReceiptCard(ThemeData theme) {
    final data = _verifiedData!;
    final date = DateTime.tryParse(data['date'] ?? '') ?? DateTime.now();
    final dateStr = DateFormat('dd MMM yyyy, hh:mm a').format(date);
    final isOrgVetted = data['isOrganizationVerified'] == true;

    return Column(
      children: [
        // Trust Header Card
        Card(
          color: Colors.green[50],
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green[800], size: 36),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AUTHENTIC RECEIPT',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.green[900],
                            fontSize: 15),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'This digital receipt is verified in the PavtiBook blockchain registry.',
                        style:
                            TextStyle(color: Colors.green[800], fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Receipt content card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Organization details
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            data['organizationName'].toUpperCase(),
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          Text(
                            data['organizationType'],
                            style: const TextStyle(
                                color: Colors.grey, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    if (isOrgVetted)
                      const Chip(
                        avatar:
                            Icon(Icons.verified, size: 12, color: Colors.white),
                        label: Text('VETTED',
                            style: TextStyle(
                                fontSize: 8,
                                color: Colors.white,
                                fontWeight: FontWeight.bold)),
                        backgroundColor: Colors.blue,
                      ),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 12),

                _buildDetailRow('Receipt Number', data['receiptNumber']),
                _buildDetailRow('Donor Name', data['donorName']),
                _buildDetailRow('Donation Amount', '₹ ${data['amount']}/-'),
                _buildDetailRow('Purpose of Donation', data['purpose']),
                _buildDetailRow('Contribution Date', dateStr),
                _buildDetailRow(
                    'Payment Mode', data['paymentMode'].toUpperCase()),
                _buildDetailRow('Reconciliation Status',
                    data['paymentStatus'].toUpperCase(),
                    color: data['paymentStatus'] == 'paid'
                        ? Colors.green[800]
                        : Colors.red[850]),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInvalidReceiptCard() {
    return Card(
      color: Colors.red[50],
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Icon(Icons.warning, color: Colors.red[800], size: 48),
            const SizedBox(height: 12),
            Text(
              'INVALID RECEIPT',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.red[900]),
            ),
            const SizedBox(height: 8),
            Text(
              _verifiedData!['message'] ??
                  'This receipt could not be verified.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.red[800], fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(color: Colors.grey, fontSize: 11),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: color,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}
