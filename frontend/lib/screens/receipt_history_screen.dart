import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../widgets/shimmer_skeleton.dart';
import '../widgets/empty_state.dart';
import '../widgets/donor_avatar.dart';
import '../services/sharing_service.dart';

class ReceiptHistoryScreen extends StatefulWidget {
  const ReceiptHistoryScreen({super.key});

  @override
  State<ReceiptHistoryScreen> createState() => _ReceiptHistoryScreenState();
}

class _ReceiptHistoryScreenState extends State<ReceiptHistoryScreen> {
  final _searchController = TextEditingController();
  String _selectedStatus = '';
  String _selectedMode = '';
  String _selectedDate = '';

  @override
  void initState() {
    super.initState();
    Future.delayed(Duration.zero, () {
      if (mounted) {
        _loadHistory();
      }
    });
  }

  void _loadHistory() {
    Provider.of<ReceiptProvider>(context, listen: false).fetchReceipts(
      search: _searchController.text.trim(),
      paymentStatus: _selectedStatus,
      paymentMode: _selectedMode,
      dateFilter: _selectedDate,
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rp = Provider.of<ReceiptProvider>(context);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt History'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: Column(
        children: [
          // Filter Panel
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                // Search Input
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    labelText: 'Search by Receipt No. or Donor...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _loadHistory();
                      },
                    ),
                    border: const OutlineInputBorder(),
                  ),
                  onChanged: (val) => _loadHistory(),
                  onSubmitted: (_) => _loadHistory(),
                ),
                const SizedBox(height: 8),

                // Date Range Selector
                DropdownButtonFormField<String>(
                  initialValue: _selectedDate,
                  decoration: const InputDecoration(
                      labelText: 'Date Range', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All Time')),
                    DropdownMenuItem(value: 'today', child: Text('Today')),
                    DropdownMenuItem(value: 'month', child: Text('This Month')),
                    DropdownMenuItem(value: 'year', child: Text('This Year')),
                  ],
                  onChanged: (val) {
                    HapticFeedback.lightImpact();
                    setState(() => _selectedDate = val ?? '');
                    _loadHistory();
                  },
                ),
                const SizedBox(height: 8),

                // Selectors
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedStatus,
                        decoration: const InputDecoration(
                            labelText: 'Status', border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(
                              value: '', child: Text('All Statuses')),
                          DropdownMenuItem(value: 'paid', child: Text('PAID')),
                          DropdownMenuItem(
                              value: 'pending', child: Text('PENDING')),
                          DropdownMenuItem(
                              value: 'cancelled', child: Text('CANCELLED')),
                        ],
                        onChanged: (val) {
                          HapticFeedback.lightImpact();
                          setState(() => _selectedStatus = val ?? '');
                          _loadHistory();
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedMode,
                        decoration: const InputDecoration(
                            labelText: 'Payment Mode',
                            border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(value: '', child: Text('All Modes')),
                          DropdownMenuItem(value: 'cash', child: Text('Cash')),
                          DropdownMenuItem(
                              value: 'upi', child: Text('UPI Scan')),
                          DropdownMenuItem(
                              value: 'pending', child: Text('Pending Link')),
                        ],
                        onChanged: (val) {
                          HapticFeedback.lightImpact();
                          setState(() => _selectedMode = val ?? '');
                          _loadHistory();
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Receipts List
          Expanded(
            child: rp.isLoading
                ? ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: 6,
                    itemBuilder: (context, index) => Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Row(
                          children: [
                            const ShimmerSkeleton.circular(size: 40),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const ShimmerSkeleton(width: 100, height: 16),
                                  const SizedBox(height: 6),
                                  const ShimmerSkeleton(width: 180, height: 12),
                                  const SizedBox(height: 4),
                                  const ShimmerSkeleton(width: 120, height: 10),
                                ],
                              ),
                            ),
                            const ShimmerSkeleton(width: 50, height: 18),
                          ],
                        ),
                      ),
                    ),
                  )
                : rp.receipts.isEmpty
                    ? const EmptyStateWidget(
                        title: 'No receipts found.',
                        description:
                            'We couldn\'t find any matching receipts. Try adjusting your search query or filters.',
                        icon: Icons.receipt_long,
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: rp.receipts.length,
                        itemBuilder: (context, index) {
                          final receipt = rp.receipts[index];

                          final date = DateTime.tryParse(receipt.createdAt) ??
                              DateTime.now();
                          final dateStr = _formatHistoryDate(date);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: ListTile(
                              leading: DonorAvatar(name: receipt.donorName),
                              title: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    receipt.receiptNumber,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    '₹ ${receipt.amount.toStringAsFixed(0)}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: theme.colorScheme.primary,
                                    ),
                                  ),
                                ],
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(
                                      'Donor: ${receipt.donorName ?? 'Anonymous'}'),
                                  Text(
                                    'Purpose: ${receipt.purpose} | Mode: ${receipt.paymentMode.toUpperCase()}',
                                    style: const TextStyle(fontSize: 11),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Date: $dateStr',
                                        style: const TextStyle(
                                            fontSize: 10, color: Colors.grey),
                                      ),
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
                                ],
                              ),
                              isThreeLine: true,
                              trailing: PopupMenuButton<String>(
                                icon: const Icon(Icons.more_vert),
                                onSelected: (value) {
                                  Navigator.pushNamed(
                                    context,
                                    '/receipt-preview',
                                    arguments: {
                                      'receipt': receipt,
                                      'action': value == 'share_whatsapp' ? 'share_whatsapp' : value,
                                    },
                                  );
                                },
                                itemBuilder: (BuildContext context) =>
                                    <PopupMenuEntry<String>>[
                                  const PopupMenuItem<String>(
                                    value: 'view',
                                    child: ListTile(
                                      leading: Icon(Icons.visibility),
                                      title: Text('View Receipt'),
                                      contentPadding: EdgeInsets.zero,
                                    ),
                                  ),
                                  if (receipt.paymentStatus != 'cancelled') ...[
                                    const PopupMenuItem<String>(
                                      value: 'edit',
                                      child: ListTile(
                                        leading: Icon(Icons.edit),
                                        title: Text('Edit Receipt'),
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                    ),
                                    const PopupMenuItem<String>(
                                      value: 'share_whatsapp',
                                      child: ListTile(
                                        leading: Icon(Icons.share),
                                        title: Text('Share on WhatsApp'),
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                    ),
                                  ],
                                  if (receipt.paymentStatus == 'pending') ...[
                                    const PopupMenuItem<String>(
                                      value: 'confirm_payment',
                                      child: ListTile(
                                        leading:
                                            Icon(Icons.check_circle_outline),
                                        title: Text('Confirm Payment'),
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                    ),
                                    const PopupMenuItem<String>(
                                      value: 'share_request',
                                      child: ListTile(
                                        leading: Icon(Icons.share_outlined),
                                        title: Text('Share Payment Request'),
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(
                                  context,
                                  '/receipt-preview',
                                  arguments: {
                                    'receipt': receipt,
                                    'action': 'view',
                                  },
                                );
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  String _formatHistoryDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final dateToCheck = DateTime(date.year, date.month, date.day);
    final timeStr = DateFormat('hh:mm a').format(date);

    if (dateToCheck == today) {
      return 'Today, $timeStr';
    } else if (dateToCheck == yesterday) {
      return 'Yesterday, $timeStr';
    } else {
      return DateFormat('dd MMM yyyy, hh:mm a').format(date);
    }
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${date.day} ${months[date.month - 1]}';
  }
}
