import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/models.dart';

class SubscriptionService {
  // Upgrade organization plan to monthly (using Firestore transaction)
  static Future<void> upgradeToMonthly({
    required String orgId,
    required double price,
    required int receiptLimit,
    required int usersLimit,
    required String oldPlan,
    required String operatorName,
    String? transactionId,
  }) async {
    final now = DateTime.now();
    final renewalDate = now.add(const Duration(days: 30)).toIso8601String();

    await FirebaseFirestore.instance.runTransaction((transaction) async {
      final subRef =
          FirebaseFirestore.instance.collection('subscriptions').doc(orgId);
      final orgRef =
          FirebaseFirestore.instance.collection('organizations').doc(orgId);
      final historyRef =
          FirebaseFirestore.instance.collection('subscription_history').doc();

      // Read current documents inside the transaction (mandatory first step)
      await transaction.get(subRef);
      await transaction.get(orgRef);

      transaction.set(
          subRef,
          {
            'plan': 'monthly',
            'receiptLimit': receiptLimit,
            'usersLimit': usersLimit,
            'renewalDate': renewalDate,
            'updatedAt': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true));

      transaction.update(orgRef, {
        'subscription_plan': 'monthly',
      });

      transaction.set(historyRef, {
        'id': historyRef.id,
        'organizationId': orgId,
        'oldPlan': oldPlan,
        'newPlan': 'monthly',
        'amountPaid': price,
        'receiptLimit': receiptLimit,
        'usersLimit': usersLimit,
        'activatedAt': now.toIso8601String(),
        'expiresAt': renewalDate,
        'operator': operatorName,
        'status': 'success',
        'razorpayTransactionId':
            transactionId ?? 'rzp_test_${now.millisecondsSinceEpoch}',
      });
    });
  }

  // Upgrade organization plan to yearly (using Firestore transaction)
  static Future<void> upgradeToYearly({
    required String orgId,
    required double price,
    required int receiptLimit,
    required int usersLimit,
    required String oldPlan,
    required String operatorName,
    String? transactionId,
  }) async {
    final now = DateTime.now();
    final renewalDate = now.add(const Duration(days: 365)).toIso8601String();

    await FirebaseFirestore.instance.runTransaction((transaction) async {
      final subRef =
          FirebaseFirestore.instance.collection('subscriptions').doc(orgId);
      final orgRef =
          FirebaseFirestore.instance.collection('organizations').doc(orgId);
      final historyRef =
          FirebaseFirestore.instance.collection('subscription_history').doc();

      // Read current documents inside the transaction (mandatory first step)
      await transaction.get(subRef);
      await transaction.get(orgRef);

      transaction.set(
          subRef,
          {
            'plan': 'yearly',
            'receiptLimit': receiptLimit,
            'usersLimit': usersLimit,
            'renewalDate': renewalDate,
            'updatedAt': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true));

      transaction.update(orgRef, {
        'subscription_plan': 'yearly',
      });

      transaction.set(historyRef, {
        'id': historyRef.id,
        'organizationId': orgId,
        'oldPlan': oldPlan,
        'newPlan': 'yearly',
        'amountPaid': price,
        'receiptLimit': receiptLimit,
        'usersLimit': usersLimit,
        'activatedAt': now.toIso8601String(),
        'expiresAt': renewalDate,
        'operator': operatorName,
        'status': 'success',
        'razorpayTransactionId':
            transactionId ?? 'rzp_test_${now.millisecondsSinceEpoch}',
      });
    });
  }

  // TODO: Add Razorpay SDK checkout integration hook here
  // Example integration structure:
  // Future<void> startRazorpayCheckout({
  //   required double amount,
  //   required String name,
  //   required String description,
  //   required String contact,
  //   required String email,
  // }) async {
  //   var options = {
  //     'key': 'rzp_live_xxxxxxxxxxxxxx',
  //     'amount': amount * 100, // in paisa
  //     'name': name,
  //     'description': description,
  //     'prefill': {'contact': contact, 'email': email},
  //   };
  //   _razorpay.open(options);
  // }

  // Fetch current subscription document
  static Future<SubscriptionModel> fetchCurrentSubscription(
      String orgId) async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection('subscriptions')
          .doc(orgId)
          .get();
      if (doc.exists) {
        return SubscriptionModel.fromJson(doc.data()!);
      } else {
        // Automatically create and return default
        final config = await fetchSubscriptionConfig();
        final defaultSub = {
          'id': orgId,
          'organizationId': orgId,
          'plan': 'free_trial',
          'receiptsUsed': 0,
          'receiptLimit': config['free_trial_receipts'] ?? 10,
          'usersUsed': 1,
          'usersLimit': 1,
          'renewalDate': DateTime.now()
              .add(Duration(days: config['trial_valid_days'] ?? 30))
              .toIso8601String(),
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        };
        await FirebaseFirestore.instance
            .collection('subscriptions')
            .doc(orgId)
            .set(defaultSub);
        return SubscriptionModel.fromJson(defaultSub);
      }
    } catch (e) {
      debugPrint('Error in fetchCurrentSubscription: $e');
      // Safe fallback subscription to prevent crashes
      return SubscriptionModel(
        id: orgId,
        organizationId: orgId,
        plan: 'free_trial',
        receiptsUsed: 0,
        receiptLimit: 10,
        usersUsed: 1,
        usersLimit: 1,
        renewalDate:
            DateTime.now().add(const Duration(days: 30)).toIso8601String(),
        createdAt: DateTime.now().toIso8601String(),
        updatedAt: DateTime.now().toIso8601String(),
      );
    }
  }

  // Fetch subscription configuration or create if missing
  static Future<Map<String, dynamic>> fetchSubscriptionConfig() async {
    final defaultConfig = {
      'monthly_price': 99,
      'yearly_price': 999,
      'monthly_users': 3,
      'yearly_users': 10,
      'monthly_receipts': 150,
      'yearly_receipts': 2000,
      'free_trial_receipts': 10,
      'invite_expiry_days': 7,
      'max_pending_invites': 5,
      'trial_valid_days': 30,
      'subscription_reminder_days': 7,
      'grace_period_days': 7,
    };
    try {
      final doc = await FirebaseFirestore.instance
          .collection('subscription_config')
          .doc('config')
          .get();
      if (doc.exists) {
        return doc.data()!;
      } else {
        await FirebaseFirestore.instance
            .collection('subscription_config')
            .doc('config')
            .set(defaultConfig);
        return defaultConfig;
      }
    } catch (e) {
      debugPrint('Error in fetchSubscriptionConfig: $e');
      return defaultConfig;
    }
  }

  // Helper to fetch details about all plans
  static Map<String, dynamic> getAvailablePlans(Map<String, dynamic> config) {
    return {
      'free_trial': {
        'name': 'Free Trial',
        'price': 0,
        'receiptLimit': config['free_trial_receipts'] ?? 10,
        'usersLimit': 1,
      },
      'monthly': {
        'name': 'Monthly Plan',
        'price': config['monthly_price'] ?? 99,
        'receiptLimit': config['monthly_receipts'] ?? 150,
        'usersLimit': config['monthly_users'] ?? 3,
      },
      'yearly': {
        'name': 'Yearly Plan',
        'price': config['yearly_price'] ?? 999,
        'receiptLimit': config['yearly_receipts'] ?? 2000,
        'usersLimit': config['yearly_users'] ?? 10,
      }
    };
  }
}
