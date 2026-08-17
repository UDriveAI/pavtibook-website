import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import '../providers/auth_provider.dart';

class PaymentHistoryScreen extends StatefulWidget {
  const PaymentHistoryScreen({super.key});

  @override
  State<PaymentHistoryScreen> createState() => _PaymentHistoryScreenState();
}

class _PaymentHistoryScreenState extends State<PaymentHistoryScreen> {
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _history = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final orgId = auth.organization?.id;
      if (orgId == null) throw Exception('No active organization.');

      final snap = await FirebaseFirestore.instance
          .collection('subscription_history')
          .where('organizationId', isEqualTo: orgId)
          .orderBy('activatedAt', descending: true)
          .get();

      setState(() {
        _history = snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load payment history: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF6E8),
      appBar: AppBar(
        title: const Text('Payment History'),
        backgroundColor: const Color(0xFF8B1E2D),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadHistory,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF8B1E2D)),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline,
                          size: 48, color: Colors.red),
                      const SizedBox(height: 12),
                      Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadHistory,
                        style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF8B1E2D)),
                        child: const Text('Retry',
                            style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                )
              : _history.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long_outlined,
                              size: 64,
                              color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'No payment history yet.',
                            style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[600],
                                fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Your subscription invoices will appear here.',
                            style: TextStyle(
                                fontSize: 13, color: Colors.grey[400]),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _history.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final item = _history[index];
                        return _buildHistoryCard(item);
                      },
                    ),
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> item) {
    final plan = item['plan'] ?? 'Unknown Plan';
    final amount = (item['amountPaid'] as num?)?.toDouble() ?? 0.0;
    final provider = item['paymentProvider'] ??
        item['payment_provider'] ??
        'Razorpay';
    final txnId = item['transactionId'] ??
        item['razorpayOrderId'] ??
        item['purchaseToken'] ??
        '—';
    final activatedAt = item['activatedAt'] as String? ?? '';
    final expiresAt = item['expiresAt'] as String? ?? '';
    final status = item['status'] ?? 'active';

    final activatedDate = _parseDate(activatedAt);
    final expiryDate = _parseDate(expiresAt);

    final planLabel = _formatPlanName(plan);
    final providerLabel = provider.toString().toLowerCase() == 'google_play'
        ? 'Google Play'
        : 'Razorpay';
    final providerIcon = provider.toString().toLowerCase() == 'google_play'
        ? Icons.shop_outlined
        : Icons.currency_rupee_outlined;
    final statusColor = status == 'active' ? Colors.green[700]! : Colors.grey;

    return Card(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.06),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2E1C0C),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    planLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: statusColor.withOpacity(0.4)),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '₹${amount.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF2E1C0C),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: Colors.black12),
            const SizedBox(height: 12),

            // Provider
            _infoRow(
              icon: providerIcon,
              label: 'Payment Via',
              value: providerLabel,
            ),

            // Transaction ID
            if (txnId != '—')
              _infoRow(
                icon: Icons.tag_outlined,
                label: 'Transaction ID',
                value: txnId.toString().length > 24
                    ? '${txnId.toString().substring(0, 24)}…'
                    : txnId.toString(),
              ),

            // Activated
            if (activatedDate != null)
              _infoRow(
                icon: Icons.check_circle_outline,
                label: 'Activated',
                value: _formatDisplay(activatedDate),
              ),

            // Expires
            if (expiryDate != null)
              _infoRow(
                icon: Icons.event_outlined,
                label: 'Expires',
                value: _formatDisplay(expiryDate),
              ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 15, color: Colors.grey[500]),
          const SizedBox(width: 8),
          Text(
            '$label:',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF2E1C0C),
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  String _formatPlanName(String plan) {
    switch (plan) {
      case 'free':
        return 'Free Plan';
      case 'free_trial':
        return 'Free Trial';
      case 'professional_monthly':
        return 'Professional Monthly';
      case 'professional_yearly':
        return 'Professional Yearly';
      case 'premium_monthly':
        return 'Premium Monthly';
      case 'premium_yearly':
        return 'Premium Yearly';
      case 'monthly':
        return 'Professional Monthly';
      case 'yearly':
        return 'Professional Yearly';
      default:
        return plan.replaceAll('_', ' ').toUpperCase();
    }
  }

  DateTime? _parseDate(String s) {
    if (s.isEmpty) return null;
    try {
      return DateTime.parse(s);
    } catch (_) {
      return null;
    }
  }

  String _formatDisplay(DateTime d) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }
}
