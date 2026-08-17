import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../config/subscription_config.dart';
import '../models/models.dart';

class SubscriptionService {
  /// Upgrade organization plan using a safe Firestore transaction
  static Future<void> upgradePlan({
    required String orgId,
    required String targetPlanId,
    required String oldPlan,
    required String operatorName,
    String? transactionId,
  }) async {
    final planDetails = SubscriptionPlanConfig.getPlan(targetPlanId);
    final now = DateTime.now();

    String? renewalDate;
    if (planDetails.billingPeriod == 'monthly') {
      renewalDate = now.add(const Duration(days: 30)).toIso8601String();
    } else if (planDetails.billingPeriod == 'yearly') {
      renewalDate = now.add(const Duration(days: 365)).toIso8601String();
    } else {
      renewalDate = null; // Lifetime / Free
    }

    await FirebaseFirestore.instance.runTransaction((transaction) async {
      final subRef =
          FirebaseFirestore.instance.collection('subscriptions').doc(orgId);
      final orgRef =
          FirebaseFirestore.instance.collection('organizations').doc(orgId);
      final historyRef =
          FirebaseFirestore.instance.collection('subscription_history').doc();

      // Read current documents inside transaction (mandatory first step)
      await transaction.get(subRef);
      await transaction.get(orgRef);

      transaction.set(
        subRef,
        {
          'plan': planDetails.id,
          'receiptLimit': planDetails.receiptLimit,
          'usersLimit': planDetails.usersLimit,
          'autoWhatsAppLimit': planDetails.autoWhatsAppLimit,
          'canShareNow': planDetails.canShareNow,
          'status': planDetails.subscriptionStatus,
          'renewalDate': renewalDate,
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true),
      );

      transaction.update(orgRef, {
        'subscription_plan': planDetails.id,
      });

      transaction.set(historyRef, {
        'id': historyRef.id,
        'organizationId': orgId,
        'oldPlan': oldPlan,
        'newPlan': planDetails.id,
        'amountPaid': planDetails.price,
        'receiptLimit': planDetails.receiptLimit,
        'usersLimit': planDetails.usersLimit,
        'autoWhatsAppLimit': planDetails.autoWhatsAppLimit,
        'activatedAt': now.toIso8601String(),
        'expiresAt': renewalDate,
        'operator': operatorName,
        'status': 'success',
        'razorpayTransactionId':
            transactionId ?? 'rzp_test_${now.millisecondsSinceEpoch}',
      });
    });

    // Write audit log entry
    try {
      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': orgId,
        'userId': 'system',
        'userName': operatorName,
        'userRole': 'owner',
        'action': 'Subscription Upgraded',
        'details': 'Upgraded subscription from $oldPlan to ${planDetails.displayName}',
        'timestamp': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      debugPrint('Error writing subscription activity log: $e');
    }
  }

  // Legacy wrappers for backward compatibility
  static Future<void> upgradeToMonthly({
    required String orgId,
    required double price,
    required int receiptLimit,
    required int usersLimit,
    required String oldPlan,
    required String operatorName,
    String? transactionId,
  }) {
    return upgradePlan(
      orgId: orgId,
      targetPlanId: SubscriptionPlanConfig.planProfessionalMonthly,
      oldPlan: oldPlan,
      operatorName: operatorName,
      transactionId: transactionId,
    );
  }

  static Future<void> upgradeToYearly({
    required String orgId,
    required double price,
    required int receiptLimit,
    required int usersLimit,
    required String oldPlan,
    required String operatorName,
    String? transactionId,
  }) {
    return upgradePlan(
      orgId: orgId,
      targetPlanId: SubscriptionPlanConfig.planProfessionalYearly,
      oldPlan: oldPlan,
      operatorName: operatorName,
      transactionId: transactionId,
    );
  }

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
        // Automatically create and return default Free plan
        final defaultSub = {
          'id': orgId,
          'organizationId': orgId,
          'plan': SubscriptionPlanConfig.planFree,
          'receiptsUsed': 0,
          'receiptLimit': 10,
          'usersUsed': 1,
          'usersLimit': 1,
          'autoWhatsAppLimit': 0,
          'canShareNow': true,
          'status': 'free',
          'renewalDate': null,
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
        plan: SubscriptionPlanConfig.planFree,
        receiptsUsed: 0,
        usersUsed: 1,
        renewalDate: null,
        status: 'free',
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
      'yearly_users': 3,
      'premium_monthly_price': 199,
      'premium_yearly_price': 1999,
      'premium_users': 10,
      'free_receipts': 10,
      'invite_expiry_days': 7,
      'max_pending_invites': 5,
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
    return SubscriptionPlanConfig.plans.map(
      (key, plan) => MapEntry(key, {
        'id': plan.id,
        'name': plan.displayName,
        'price': plan.price,
        'receiptLimit': plan.receiptLimit,
        'usersLimit': plan.usersLimit,
        'isUnlimitedReceipts': plan.isUnlimitedReceipts,
        'autoWhatsAppLimit': plan.autoWhatsAppLimit,
        'canShareNow': plan.canShareNow,
      }),
    );
  }
}
