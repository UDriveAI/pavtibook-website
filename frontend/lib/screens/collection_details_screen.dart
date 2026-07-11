import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';

class CollectionDetailsScreen extends StatefulWidget {
  const CollectionDetailsScreen({super.key});

  @override
  State<CollectionDetailsScreen> createState() =>
      _CollectionDetailsScreenState();
}

class _CollectionDetailsScreenState extends State<CollectionDetailsScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(Duration.zero, () {
      if (mounted) {
        _loadData();
      }
    });
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    await Provider.of<ReceiptProvider>(context, listen: false).fetchReceipts();
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final args =
        ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final String type = args['type'] ?? 'total';

    final rp = Provider.of<ReceiptProvider>(context);
    final theme = Theme.of(context);

    String title = 'Collection Report';
    if (type == 'today') title = "Today's Collection Details";
    if (type == 'month') title = 'Day-wise Month Collection';
    if (type == 'year') title = 'Month-wise Year Collection';
    if (type == 'total') title = 'All Receipts Log';
    if (type == 'cash') title = 'Cash Collection Report';
    if (type == 'upi') title = 'UPI Collection Report';
    if (type == 'pending') title = 'Pending Collection Report';

    // Grouping / filtering logic in memory
    final allReceipts =
        rp.receipts.where((r) => r.paymentStatus != 'cancelled').toList();
    final now = DateTime.now();
    final startOfToday = DateTime(now.year, now.month, now.day);
    final startOfMonth = DateTime(now.year, now.month, 1);
    final startOfYear = DateTime(now.year, 1, 1);

    List<ReceiptModel> filteredReceipts = [];
    double totalAmount = 0.0;

    // For Month/Year groupings
    Map<String, double> groupedData = {};

    if (type == 'today') {
      filteredReceipts = allReceipts.where((r) {
        final date = DateTime.tryParse(r.createdAt);
        return r.paymentStatus == 'paid' &&
            date != null &&
            date.isAfter(startOfToday);
      }).toList();
      totalAmount = filteredReceipts.fold(0.0, (sum, r) => sum + r.amount);
    } else if (type == 'month') {
      final monthReceipts = allReceipts.where((r) {
        final date = DateTime.tryParse(r.createdAt);
        return r.paymentStatus == 'paid' &&
            date != null &&
            date.isAfter(startOfMonth);
      }).toList();

      for (var r in monthReceipts) {
        final date = DateTime.tryParse(r.createdAt);
        if (date != null) {
          final dayStr = DateFormat('dd MMM').format(date);
          groupedData[dayStr] = (groupedData[dayStr] ?? 0.0) + r.amount;
        }
      }
      totalAmount = monthReceipts.fold(0.0, (sum, r) => sum + r.amount);
    } else if (type == 'year') {
      final yearReceipts = allReceipts.where((r) {
        final date = DateTime.tryParse(r.createdAt);
        return r.paymentStatus == 'paid' &&
            date != null &&
            date.isAfter(startOfYear);
      }).toList();

      for (var r in yearReceipts) {
        final date = DateTime.tryParse(r.createdAt);
        if (date != null) {
          final monthStr = DateFormat('MMMM yyyy').format(date);
          groupedData[monthStr] = (groupedData[monthStr] ?? 0.0) + r.amount;
        }
      }
      totalAmount = yearReceipts.fold(0.0, (sum, r) => sum + r.amount);
    } else if (type == 'total') {
      filteredReceipts = rp.receipts; // include cancelled as well
      totalAmount = allReceipts
          .where((r) => r.paymentStatus == 'paid')
          .fold(0.0, (sum, r) => sum + r.amount);
    } else if (type == 'cash') {
      filteredReceipts = allReceipts
          .where((r) => r.paymentStatus == 'paid' && r.paymentMode == 'cash')
          .toList();
      totalAmount = filteredReceipts.fold(0.0, (sum, r) => sum + r.amount);
    } else if (type == 'upi') {
      filteredReceipts = allReceipts
          .where((r) => r.paymentStatus == 'paid' && r.paymentMode == 'upi')
          .toList();
      totalAmount = filteredReceipts.fold(0.0, (sum, r) => sum + r.amount);
    } else if (type == 'pending') {
      filteredReceipts =
          allReceipts.where((r) => r.paymentStatus == 'pending').toList();
      totalAmount = filteredReceipts.fold(0.0, (sum, r) => sum + r.amount);
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  child: type == 'month' || type == 'year'
                      ? _buildGroupedList(groupedData, theme)
                      : _buildDetailedList(filteredReceipts, type, theme),
                ),
                // Footer Total
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border(
                        top: BorderSide(color: Colors.grey[300]!, width: 1)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        type == 'pending'
                            ? 'Total Pending Due:'
                            : 'Total Collection:',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        '₹ ${totalAmount.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildGroupedList(Map<String, double> data, ThemeData theme) {
    if (data.isEmpty) {
      return const Center(child: Text('No collections logged in this period.'));
    }
    final sortedKeys = data.keys.toList();
    // Sort keys chronologically if day-wise, or reverse if needed. Let's keep it sorted.
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: sortedKeys.length,
      itemBuilder: (context, index) {
        final key = sortedKeys[index];
        final val = data[key]!;
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.1),
              child:
                  Icon(Icons.calendar_today, color: theme.colorScheme.primary),
            ),
            title:
                Text(key, style: const TextStyle(fontWeight: FontWeight.bold)),
            trailing: Text(
              '₹ ${val.toStringAsFixed(0)}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: theme.colorScheme.primary,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailedList(
      List<ReceiptModel> list, String type, ThemeData theme) {
    if (list.isEmpty) {
      return const Center(child: Text('No receipt records match this filter.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final r = list[index];
        final date = DateTime.tryParse(r.createdAt) ?? DateTime.now();
        final timeStr = DateFormat('hh:mm a').format(date);
        final dateStr = DateFormat('dd MMM yyyy, hh:mm a').format(date);

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(r.receiptNumber,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  '₹ ${r.amount.toStringAsFixed(0)}',
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary),
                ),
              ],
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text('Donor: ${r.donorName ?? 'Anonymous'}'),
                if (type == 'pending') ...[
                  Text('Mobile: ${r.donorMobile ?? 'N/A'}',
                      style: const TextStyle(fontSize: 11)),
                  Text('Amount Due: ₹ ${r.amount.toStringAsFixed(0)}',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary)),
                  Text('Created Date: $dateStr',
                      style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ] else ...[
                  Text(
                    'Mode: ${r.paymentMode.toUpperCase()} | Time: $timeStr',
                    style: const TextStyle(fontSize: 11),
                  ),
                ],
                if (type == 'total') ...[
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: r.paymentStatus == 'paid'
                          ? Colors.green[50]
                          : r.paymentStatus == 'cancelled'
                              ? Colors.grey[200]
                              : Colors.orange[50],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      r.paymentStatus.toUpperCase(),
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: r.paymentStatus == 'paid'
                            ? Colors.green[800]
                            : r.paymentStatus == 'cancelled'
                                ? Colors.grey[700]
                                : Colors.orange[800],
                      ),
                    ),
                  ),
                ]
              ],
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.pushNamed(
                context,
                '/receipt-preview',
                arguments: r,
              );
            },
          ),
        );
      },
    );
  }
}
