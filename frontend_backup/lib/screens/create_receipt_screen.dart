import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';
import '../services/sharing_service.dart';

class CreateReceiptScreen extends StatefulWidget {
  const CreateReceiptScreen({super.key});

  @override
  State<CreateReceiptScreen> createState() => _CreateReceiptScreenState();
}

class _CreateReceiptScreenState extends State<CreateReceiptScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _amountController = TextEditingController();
  final _purposeController = TextEditingController();
  final _nameFocusNode = FocusNode();

  String _paymentMode = 'cash'; // 'cash', 'upi', 'pending'
  String? _collectedBy; // Added for Collected By role selection

  final List<String> _purposes = [
    'Donation (देणगी)',
    'Festival Vargani (वर्गणी)',
    'Aarti Pooja Sponsor (आरती प्रायोजक)',
    'Building & Development Fund (इमारत निधी)',
    'Charity Relief (मदत निधी)',
    'Cultural Program (सांस्कृतिक कार्यक्रम)',
    'Other Contribution',
  ];

  String? _idempotencyKey;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();

    // Load pre-populated values if Collector Mode is active
    final rp = Provider.of<ReceiptProvider>(context, listen: false);
    if (rp.collectorMode && rp.collectorRememberSelections) {
      _paymentMode = rp.lastPaymentMode;
      _collectedBy = rp.lastCollectedBy.isNotEmpty ? rp.lastCollectedBy : null;
      _purposeController.text =
          rp.lastPurpose.isNotEmpty ? rp.lastPurpose : _purposes.first;
    } else {
      _purposeController.text = _purposes.first;
    }

    _idempotencyKey =
        'idemp_${DateTime.now().microsecondsSinceEpoch}_${Random().nextInt(1000000)}';

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final rpProvider = Provider.of<ReceiptProvider>(context, listen: false);
        if (rpProvider.collectorMode) {
          _nameFocusNode.requestFocus();
        }
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _amountController.dispose();
    _purposeController.dispose();
    _nameFocusNode.dispose();
    try {
      Provider.of<DonorProvider>(context, listen: false).clearFoundDonor();
    } catch (_) {}
    super.dispose();
  }

  // Auto-search and autofill donor details if mobile matches
  Future<void> _handleMobileChanged(String mobile) async {
    if (mobile.length == 10) {
      final donorProvider = Provider.of<DonorProvider>(context, listen: false);
      final found = await donorProvider.lookupByMobile(mobile);
      if (found && mounted) {
        final donor = donorProvider.foundDonor!;
        setState(() {
          _nameController.text = donor.name;
          _emailController.text = donor.email ?? '';
          _addressController.text = donor.address ?? '';
        });
      }
    } else {
      Provider.of<DonorProvider>(context, listen: false).clearFoundDonor();
    }
  }

  void _showPremiumUpgradeDialog() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final userRole = auth.user?.role ?? '';
    final isOwner = userRole == 'admin' || userRole == 'owner';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.star, color: Color(0xFFF47C20)),
            SizedBox(width: 8),
            Text('Premium Upgrade Required'),
          ],
        ),
        content: Text(
          isOwner
              ? 'Your organization has reached the receipt limit for the current subscription plan. Upgrade to a premium plan to continue creating receipts.'
              : 'Your organization has reached the receipt limit for the current subscription plan. Please contact your organization administrator to upgrade the plan.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
          if (isOwner)
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pushNamed(context, '/settings/subscription-usage');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B1E2D),
              ),
              child: const Text('Upgrade Plan'),
            ),
        ],
      ),
    );
  }

  Future<void> _submitReceipt() async {
    if (!_formKey.currentState!.validate()) return;
    if (_isSubmitting) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final sub = auth.subscription;
    if (sub != null && sub.receiptsUsed >= sub.receiptLimit) {
      _showPremiumUpgradeDialog();
      return;
    }

    setState(() => _isSubmitting = true);

    final receiptProvider =
        Provider.of<ReceiptProvider>(context, listen: false);

    final receiptData = {
      'donorName': _nameController.text.trim(),
      'donorMobile': _mobileController.text.trim(),
      'donorEmail': _emailController.text.trim(),
      'donorAddress': _addressController.text.trim(),
      'amount': _amountController.text.trim(),
      'purpose': _purposeController.text.trim(),
      'paymentMode': _paymentMode,
      'idempotencyKey': _idempotencyKey,
      'collectorRole': _collectedBy, // Added role selection snapshot
    };

    final result = await receiptProvider.createReceipt(receiptData);

    if (result != null && mounted) {
      final receipt = ReceiptModel.fromJson(result['receipt']);

      // Save preferences for next receipt in Collector Mode
      if (receiptProvider.collectorMode &&
          receiptProvider.collectorRememberSelections) {
        await receiptProvider.saveLastSelections(
          purpose: _purposeController.text,
          paymentMode: _paymentMode,
          collectedBy: _collectedBy ?? '',
        );
      }

      // Auto-generate and upload PDF in the background
      final tempProvider =
          Provider.of<TemplateProvider>(context, listen: false);
      TemplateModel? activeTemplate;
      if (tempProvider.templates.isNotEmpty) {
        activeTemplate = tempProvider.templates.firstWhere(
          (t) => t.id == receipt.templateId,
          orElse: () => tempProvider.templates.firstWhere(
            (t) => t.isDefault,
            orElse: () => tempProvider.templates.first,
          ),
        );
      } else {
        activeTemplate = TemplateModel(
          id: '',
          organizationId: receipt.organizationId,
          name: 'Fallback Classic',
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

      SharingService.uploadReceiptPdfInBackground(
        template: activeTemplate,
        receipt: receipt,
      );

      final upiPayload =
          result['upiPayload'] != null && result['upiPayload'] is Map
              ? (result['upiPayload'] as Map)['qrCode'] as String?
              : null;

      if (_paymentMode == 'upi') {
        // Go to UPI QR payment screen
        Navigator.pushReplacementNamed(
          context,
          '/payment',
          arguments: {
            'receipt': receipt,
            'upiPayload': upiPayload,
          },
        );
      } else {
        // Go directly to receipt success screen (Cash or Pending status)
        Navigator.pushReplacementNamed(
          context,
          '/receipt-success',
          arguments: {
            'receipt': receipt,
            'isNew': true,
          },
        );
      }
    } else if (mounted) {
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                receiptProvider.errorMessage ?? 'Failed to generate receipt.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Donation Receipt'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Collect Donation & Generate Slip',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),

              // Donor details card
              Consumer<DonorProvider>(
                builder: (context, donorProvider, child) {
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Donor Information',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blueGrey),
                          ),
                          const Divider(),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _mobileController,
                            keyboardType: TextInputType.phone,
                            maxLength: 10,
                            decoration: const InputDecoration(
                              labelText: 'Mobile Number *',
                              border: OutlineInputBorder(),
                              prefixText: '+91 ',
                              counterText: '',
                              prefixIcon: Icon(Icons.phone_android),
                            ),
                            validator: (val) => val == null || val.length != 10
                                ? 'Enter a 10-digit number'
                                : null,
                            onChanged: _handleMobileChanged,
                          ),
                          if (donorProvider.isLookingUp) ...[
                            const SizedBox(height: 12),
                            const Center(
                              child: SizedBox(
                                height: 20,
                                width: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          ] else if (donorProvider.foundDonor != null) ...[
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.green[50],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.green[300]!),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.person_pin,
                                      color: Colors.green[800]),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              'Existing Donor',
                                              style: TextStyle(
                                                color: Colors.green[800],
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 6,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.green[100],
                                                borderRadius:
                                                    BorderRadius.circular(10),
                                              ),
                                              child: Text(
                                                'Auto-filled',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  color: Colors.green[900],
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Total: ₹${donorProvider.foundDonorStats['totalDonations'] ?? 0}  •  ${donorProvider.foundDonorStats['donationCount'] ?? 0} previous donation(s)',
                                          style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.green[900]),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _nameController,
                            focusNode: _nameFocusNode,
                            autofocus: true,
                            decoration: const InputDecoration(
                              labelText: 'Donor Name *',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                            validator: (val) => val == null || val.isEmpty
                                ? 'Enter donor name'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'Email Address (Optional)',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.email_outlined),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _addressController,
                            maxLines: 2,
                            decoration: const InputDecoration(
                              labelText: 'Resident Address (Optional)',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.location_on_outlined),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),

              // Donation Details Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Donation Details',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.blueGrey),
                      ),
                      const Divider(),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _amountController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold),
                        decoration: const InputDecoration(
                          labelText: 'Donation Amount (INR) *',
                          border: OutlineInputBorder(),
                          prefixText: '₹ ',
                          prefixIcon: Icon(Icons.currency_rupee),
                        ),
                        validator: (val) {
                          if (val == null || val.isEmpty) return 'Enter amount';
                          final amt = double.tryParse(val);
                          if (amt == null || amt <= 0)
                            return 'Enter a valid amount';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        initialValue: _purposeController.text,
                        decoration: const InputDecoration(
                            labelText: 'Contribution Purpose *',
                            border: OutlineInputBorder()),
                        items: _purposes
                            .map((p) =>
                                DropdownMenuItem(value: p, child: Text(p)))
                            .toList(),
                        onChanged: (val) {
                          if (val != null)
                            setState(() => _purposeController.text = val);
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Collected By Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Collected By',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.blueGrey),
                      ),
                      const Divider(),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _collectedBy,
                        decoration: const InputDecoration(
                          labelText: 'Select Authorized Person *',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.assignment_ind_outlined),
                        ),
                        hint: const Text('Choose role...'),
                        items: const [
                          DropdownMenuItem(
                              value: 'President', child: Text('President')),
                          DropdownMenuItem(
                              value: 'Treasurer', child: Text('Treasurer')),
                          DropdownMenuItem(
                              value: 'Member', child: Text('Member (Sadasya)')),
                        ],
                        validator: (val) => val == null || val.isEmpty
                            ? 'Please select who collected the payment'
                            : null,
                        onChanged: (val) {
                          if (val != null) setState(() => _collectedBy = val);
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Payment options Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Select Payment Mode',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.blueGrey),
                      ),
                      const Divider(),
                      const SizedBox(height: 8),
                      RadioGroup<String>(
                        groupValue: _paymentMode,
                        onChanged: (val) {
                          if (val != null) setState(() => _paymentMode = val);
                        },
                        child: const Column(
                          children: [
                            RadioListTile<String>(
                              title: Text('Cash (रोख रक्कम)'),
                              subtitle: Text('Instantly marks receipt as Paid'),
                              value: 'cash',
                            ),
                            RadioListTile<String>(
                              title: Text('UPI Pay (QR Code scan)'),
                              subtitle: Text('P2P dynamic QR scanner display'),
                              value: 'upi',
                            ),
                            RadioListTile<String>(
                              title: Text('Pay Later (Pending)'),
                              subtitle:
                                  Text('Collect later. Payment link created.'),
                              value: 'pending',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              _isSubmitting
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitReceipt,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                      ),
                      child: const Text('Generate Digital Receipt'),
                    ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
