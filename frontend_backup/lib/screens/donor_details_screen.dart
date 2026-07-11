import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';

class DonorDetailsScreen extends StatefulWidget {
  const DonorDetailsScreen({super.key});

  @override
  State<DonorDetailsScreen> createState() => _DonorDetailsScreenState();
}

class _DonorDetailsScreenState extends State<DonorDetailsScreen> {
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final donorId = ModalRoute.of(context)!.settings.arguments as String;
      Provider.of<DonorProvider>(context, listen: false)
          .fetchDonorDetail(donorId);
      _initialized = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dp = Provider.of<DonorProvider>(context);
    final theme = Theme.of(context);
    final donor = dp.selectedDonor;
    final summary = dp.donorSummary;

    final dateStr = summary['lastDonationDate'] != null
        ? DateFormat('dd MMM yyyy')
            .format(DateTime.parse(summary['lastDonationDate']))
        : 'Never';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Donor Profile'),
        actions: [
          if (donor != null)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () => _showEditBottomSheet(context, donor),
            ),
        ],
      ),
      backgroundColor: theme.colorScheme.surface,
      body: dp.isLoading || donor == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Profile Details Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const CircleAvatar(
                            radius: 36,
                            child: Icon(Icons.person, size: 36),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            donor.name,
                            style: const TextStyle(
                                fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text('Mobile: +91 ${donor.mobile}'),
                          if (donor.email != null && donor.email!.isNotEmpty)
                            Text('Email: ${donor.email}'),
                          if (donor.address != null &&
                              donor.address!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              donor.address!,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: Colors.grey[600], fontSize: 12),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Donation Summary Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Contribution Summary',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blueGrey),
                          ),
                          const Divider(),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildSummaryItem('Total Donations',
                                  '₹ ${summary['totalDonations'] ?? 0}'),
                              _buildSummaryItem('Donation Count',
                                  '${summary['donationCount'] ?? 0} times'),
                              _buildSummaryItem('Last Donation', dateStr),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Donation Timeline Title
                  const Text(
                    'Donation History Timeline',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),

                  // History Timeline List
                  dp.donorHistory.isEmpty
                      ? const Card(
                          child: Padding(
                            padding: EdgeInsets.all(24.0),
                            child: Center(
                                child: Text(
                                    'No contribution history logged yet.')),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: dp.donorHistory.length,
                          itemBuilder: (context, index) {
                            final receipt = dp.donorHistory[index];
                            final isPaid = receipt.paymentStatus == 'paid';
                            final date = DateTime.tryParse(receipt.createdAt) ??
                                DateTime.now();
                            final dateFormatted =
                                DateFormat('dd MMM yyyy').format(date);

                            return Card(
                              child: ListTile(
                                leading: Icon(
                                  isPaid ? Icons.check_circle : Icons.pending,
                                  color: isPaid
                                      ? Colors.green[800]
                                      : Colors.red[800],
                                ),
                                title: Text(
                                  receipt.purpose,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                                subtitle: Text(
                                    'Receipt: ${receipt.receiptNumber} | Mode: ${receipt.paymentMode.toUpperCase()}'),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '₹ ${receipt.amount.toStringAsFixed(0)}',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.primary,
                                      ),
                                    ),
                                    Text(
                                      dateFormatted,
                                      style: const TextStyle(
                                          fontSize: 10, color: Colors.grey),
                                    ),
                                  ],
                                ),
                                onTap: () {
                                  Navigator.pushNamed(
                                    context,
                                    '/receipt-preview',
                                    arguments: receipt,
                                  );
                                },
                              ),
                            );
                          },
                        ),
                ],
              ),
            ),
      floatingActionButton: dp.isLoading || donor == null
          ? null
          : FloatingActionButton(
              onPressed: () => _showEditBottomSheet(context, donor),
              child: const Icon(Icons.edit),
            ),
    );
  }

  Widget _buildSummaryItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Colors.grey),
        ),
      ],
    );
  }

  void _showEditBottomSheet(BuildContext context, DonorModel donor) {
    // Capture the provider reference BEFORE opening the sheet.
    // This is the only safe way to access Provider inside an async bottom-sheet
    // callback — using Provider.of(context) after an await is unsafe because
    // the parent context may have been deactivated by then.
    final donorProvider = Provider.of<DonorProvider>(context, listen: false);

    // Capture ScaffoldMessenger before the async gap (sheet open/close cycle).
    final messenger = ScaffoldMessenger.of(context);

    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController(text: donor.name);
    final emailController = TextEditingController(text: donor.email ?? '');
    final addressController = TextEditingController(text: donor.address ?? '');

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) {
        bool isSaving = false;

        // StatefulBuilder gives us a dedicated setState for the sheet and
        // lets us track whether the sheet is still mounted after awaits.
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 16,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Edit Donor Details',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.of(sheetContext).pop(),
                          ),
                        ],
                      ),
                      const Divider(),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: nameController,
                        decoration: const InputDecoration(
                          labelText: 'Donor Name *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) => val == null || val.trim().isEmpty
                            ? 'Enter donor name'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Email Address (Optional)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: addressController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Resident Address (Optional)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: isSaving
                            ? null
                            : () async {
                                if (!formKey.currentState!.validate()) return;

                                setSheetState(() => isSaving = true);

                                // All Provider and Navigator operations use
                                // pre-captured references — never access
                                // BuildContext after an await boundary.
                                final success =
                                    await donorProvider.updateDonor(donor.id, {
                                  'name': nameController.text.trim(),
                                  'mobile': donor.mobile,
                                  'email': emailController.text.trim(),
                                  'address': addressController.text.trim(),
                                });

                                // updateDonor() already refreshes _selectedDonor
                                // inside the provider — no second fetch needed.

                                // Pop the sheet using its own navigator.
                                // sheetContext is only valid while the sheet
                                // is in the tree; use a local check.
                                final sheetNav = Navigator.of(sheetContext);
                                if (sheetNav.canPop()) {
                                  sheetNav.pop();
                                }

                                // Show result via the pre-captured messenger
                                // (valid as long as the Scaffold is alive).
                                messenger.showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      success
                                          ? 'Donor details updated successfully'
                                          : 'Failed to update donor details',
                                    ),
                                  ),
                                );
                              },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: isSaving
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Save Changes'),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    ).whenComplete(() {
      // Dispose controllers only after the sheet is fully closed —
      // never inside the builder where the TextFields still reference them.
      nameController.dispose();
      emailController.dispose();
      addressController.dispose();
    });
  }
}

