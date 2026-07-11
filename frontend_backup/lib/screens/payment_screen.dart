import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _isReconciling = false;

  Future<void> _reconcilePayment(
      BuildContext context, ReceiptModel receipt) async {
    setState(() => _isReconciling = true);

    final receiptProvider =
        Provider.of<ReceiptProvider>(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    // Simulate transaction verification reference ID
    final mockTxnRef = 'TXN-${DateTime.now().millisecondsSinceEpoch}';
    final success =
        await receiptProvider.reconcilePayment(receipt.id, mockTxnRef);

    setState(() => _isReconciling = false);

    if (success && mounted) {
      final updatedReceipt = receiptProvider.receipts
          .firstWhere((r) => r.id == receipt.id, orElse: () => receipt);

      messenger.showSnackBar(
        const SnackBar(
            content: Text('Payment Confirmed. Receipt marked as PAID.')),
      );

      navigator.pushReplacementNamed(
        '/receipt-success',
        arguments: {
          'receipt': updatedReceipt,
          'isNew': true,
        },
      );
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(
            content:
                Text(receiptProvider.errorMessage ?? 'Reconciliation failed.')),
      );
    }
  }

  void _showConfirmationDialog(BuildContext context, ReceiptModel receipt) {
    showDialog(
      context: context,
      builder: (cxt) => AlertDialog(
        title: const Text('Confirm donor payment?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Receipt:',
                style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                    fontWeight: FontWeight.w500)),
            Text(receipt.receiptNumber,
                style:
                    const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text('Amount:',
                style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                    fontWeight: FontWeight.w500)),
            Text('₹${receipt.amount.toStringAsFixed(0)}',
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.green)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(cxt),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(cxt);
              _reconcilePayment(context, receipt);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green[700]),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  void _keepPending(ReceiptModel receipt) {
    Navigator.pushReplacementNamed(
      context,
      '/receipt-success',
      arguments: {
        'receipt': receipt,
        'isNew': true,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Read args
    final args =
        ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final receipt = args['receipt'] as ReceiptModel;
    final upiPayload = args['upiPayload'] as String?;

    final auth = Provider.of<AuthProvider>(context);
    final org = auth.organization;
    final upiQrImageUrl = org?.upiQrImageUrl;
    final upiMerchantName = org?.upiMerchantName ?? org?.name ?? 'Organization';
    final upiId = org?.upiId ?? '';

    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('UPI Payment QR'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'UPI Donation Transfer',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Scan this QR code to complete transfer directly to organization bank account.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
            const SizedBox(height: 24),

            // QR Card
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Text(
                      receipt.donorName ?? 'Donor',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),

                    // Display UPI ID & Merchant Name
                    Text(
                      'Merchant: $upiMerchantName',
                      style: const TextStyle(
                          fontSize: 13,
                          color: Colors.blueGrey,
                          fontWeight: FontWeight.w600),
                    ),
                    Text(
                      'UPI ID: $upiId',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 12),

                    Text(
                      'Donation Amount: ₹ ${receipt.amount.toStringAsFixed(2)}',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary),
                    ),
                    const SizedBox(height: 20),

                    // Render uploaded QR image or generate dynamic QR code
                    if (upiQrImageUrl != null && upiQrImageUrl.isNotEmpty)
                      Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(8),
                          color: Colors.white,
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: (() {
                            debugPrint(
                                'PaymentScreen rendering QR image URL: $upiQrImageUrl');
                            return Image.network(
                              upiQrImageUrl,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                debugPrint(
                                    'PaymentScreen failed to load QR image: $error');
                                return const Center(
                                  child: Icon(Icons.qr_code,
                                      color: Colors.grey, size: 60),
                                );
                              },
                            );
                          })(),
                        ),
                      )
                    else if (upiPayload != null)
                      QrImageView(
                        data: upiPayload,
                        version: QrVersions.auto,
                        size: 200,
                        gapless: false,
                        errorStateBuilder: (cxt, err) {
                          return const Center(
                              child: Text('QR generation error.'));
                        },
                      )
                    else
                      const SizedBox(
                        height: 200,
                        child: Center(child: Text('No UPI deep link loaded.')),
                      ),

                    const SizedBox(height: 20),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.security, size: 14, color: Colors.blueGrey),
                        SizedBox(width: 6),
                        Text(
                          'Secured Peer-to-Peer Bank Transfer',
                          style:
                              TextStyle(fontSize: 10, color: Colors.blueGrey),
                        ),
                      ],
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            _isReconciling
                ? const Center(child: CircularProgressIndicator())
                : Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _keepPending(receipt),
                          icon: const Icon(Icons.pending_actions),
                          label: const Text('Keep Pending'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.grey[600],
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              _showConfirmationDialog(context, receipt),
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text('Mark Paid'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green[700],
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
