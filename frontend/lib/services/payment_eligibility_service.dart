import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'payment_service.dart';
import '../services/subscription_service.dart';

class PaymentEligibilityService {
  /// Priority: Firestore config → Google Play availability → Country / Locale fallback
  static Future<List<PaymentProviderType>> resolveProviders() async {
    try {
      // 1. Check Firestore config override
      final config = await SubscriptionService.fetchSubscriptionConfig();
      final forceProvider = config['payment_provider_override']; // 'razorpay' | 'google_play' | null

      if (forceProvider == 'razorpay') {
        return [PaymentProviderType.razorpay];
      }
      if (forceProvider == 'google_play') {
        return [PaymentProviderType.googlePlay];
      }

      // 2. Google Play availability check
      bool playAvailable = false;
      try {
        playAvailable = await InAppPurchase.instance.isAvailable();
      } catch (e) {
        debugPrint('Google Play availability check failed: $e');
      }

      // 3. Country / Locale check
      final countryConfig = config['payment_country'];
      String country = 'IN';
      if (countryConfig != null && countryConfig.toString().isNotEmpty) {
        country = countryConfig.toString().toUpperCase();
      } else {
        try {
          country = Platform.localeName.split('_').last.toUpperCase();
        } catch (_) {}
      }

      final isIndia = country == 'IN';

      // 4. Resolve eligible providers
      if (isIndia) {
        return playAvailable
            ? [PaymentProviderType.razorpay, PaymentProviderType.googlePlay]
            : [PaymentProviderType.razorpay];
      }

      return playAvailable
          ? [PaymentProviderType.googlePlay]
          : [PaymentProviderType.razorpay];
    } catch (e) {
      debugPrint('Error resolving payment eligibility: $e');
      return [PaymentProviderType.razorpay];
    }
  }
}
