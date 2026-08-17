import 'package:flutter/material.dart';

class PlanDetails {
  final String id;
  final String displayName;
  final double price;
  final String billingPeriod; // 'lifetime', 'monthly', 'yearly'
  final int usersLimit;
  final int? receiptLimit; // null for unlimited
  final bool isUnlimitedReceipts;
  final int autoWhatsAppLimit;
  final bool canShareNow;
  final String subscriptionStatus; // 'free', 'active'
  final String? googleProductId;
  final String? razorpayPlanId;
  final String badge;
  final bool isPopular;
  final IconData icon;
  final List<String> featureList;

  const PlanDetails({
    required this.id,
    required this.displayName,
    required this.price,
    required this.billingPeriod,
    required this.usersLimit,
    this.receiptLimit,
    required this.isUnlimitedReceipts,
    required this.autoWhatsAppLimit,
    required this.canShareNow,
    required this.subscriptionStatus,
    this.googleProductId,
    this.razorpayPlanId,
    required this.badge,
    this.isPopular = false,
    required this.icon,
    required this.featureList,
  });
}

class SubscriptionPlanConfig {
  static const String planFree = 'free';
  static const String planProfessionalMonthly = 'professional_monthly';
  static const String planProfessionalYearly = 'professional_yearly';
  static const String planPremiumMonthly = 'premium_monthly';
  static const String planPremiumYearly = 'premium_yearly';

  static final Map<String, PlanDetails> plans = {
    planFree: const PlanDetails(
      id: planFree,
      displayName: 'Free Plan',
      price: 0,
      billingPeriod: 'lifetime',
      usersLimit: 1,
      receiptLimit: 10,
      isUnlimitedReceipts: false,
      autoWhatsAppLimit: 0,
      canShareNow: true,
      subscriptionStatus: 'free',
      badge: 'Starter',
      isPopular: false,
      icon: Icons.card_giftcard,
      featureList: [
        '1 User Account',
        '10 Digital Receipts',
        'Manual Share Now (WhatsApp/SMS)',
        'Basic Dashboard & Reports',
      ],
    ),
    planProfessionalMonthly: const PlanDetails(
      id: planProfessionalMonthly,
      displayName: 'Professional Monthly',
      price: 99,
      billingPeriod: 'monthly',
      usersLimit: 3,
      receiptLimit: null,
      isUnlimitedReceipts: true,
      autoWhatsAppLimit: 0,
      canShareNow: true,
      subscriptionStatus: 'active',
      badge: 'Popular',
      isPopular: true,
      icon: Icons.star_border,
      featureList: [
        'Up to 3 Team Members',
        'Unlimited Digital Receipts',
        'Unlimited Manual Share Now',
        'Full Analytics & Export',
        'Standard Support',
      ],
    ),
    planProfessionalYearly: const PlanDetails(
      id: planProfessionalYearly,
      displayName: 'Professional Yearly',
      price: 999,
      billingPeriod: 'yearly',
      usersLimit: 3,
      receiptLimit: null,
      isUnlimitedReceipts: true,
      autoWhatsAppLimit: 0,
      canShareNow: true,
      subscriptionStatus: 'active',
      badge: 'Save 16%',
      isPopular: false,
      icon: Icons.star,
      featureList: [
        'Up to 3 Team Members',
        'Unlimited Digital Receipts',
        'Unlimited Manual Share Now',
        'Full Analytics & Export',
        'Best Value for 1 Year',
      ],
    ),
    planPremiumMonthly: const PlanDetails(
      id: planPremiumMonthly,
      displayName: 'Premium Monthly',
      price: 199,
      billingPeriod: 'monthly',
      usersLimit: 10,
      receiptLimit: null,
      isUnlimitedReceipts: true,
      autoWhatsAppLimit: 1000,
      canShareNow: true,
      subscriptionStatus: 'active',
      badge: 'Pro Tier',
      isPopular: false,
      icon: Icons.workspace_premium_outlined,
      featureList: [
        'Up to 10 Team Members',
        'Unlimited Digital Receipts',
        'Unlimited Manual Share Now',
        '1,000 Auto WhatsApp Sends / Mo',
        'Priority Support & Audit Logs',
      ],
    ),
    planPremiumYearly: const PlanDetails(
      id: planPremiumYearly,
      displayName: 'Premium Yearly',
      price: 1999,
      billingPeriod: 'yearly',
      usersLimit: 10,
      receiptLimit: null,
      isUnlimitedReceipts: true,
      autoWhatsAppLimit: 1000,
      canShareNow: true,
      subscriptionStatus: 'active',
      badge: 'Best Value',
      isPopular: true,
      icon: Icons.workspace_premium,
      featureList: [
        'Up to 10 Team Members',
        'Unlimited Digital Receipts',
        'Unlimited Manual Share Now',
        '1,000 Auto WhatsApp Sends / Mo',
        'Priority Support & Audit Logs',
        'Save Maximum on Annual Plan',
      ],
    ),
  };

  /// Safe lookup for any plan key with fallback to Free plan
  static PlanDetails getPlan(String? planId) {
    if (planId == null) return plans[planFree]!;
    final key = planId.toLowerCase().trim();
    if (plans.containsKey(key)) return plans[key]!;

    // Legacy plan string mapping
    if (key == 'monthly') return plans[planProfessionalMonthly]!;
    if (key == 'yearly') return plans[planProfessionalYearly]!;
    if (key == 'free_trial' || key == 'trial') return plans[planFree]!;

    return plans[planFree]!;
  }
}
