import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../repositories/payment_repository.dart';

enum PaymentProviderType { razorpay, googlePlay }

class PaymentConfig {
  static PaymentProviderType get activeProvider {
    if (!kIsWeb && Platform.isAndroid) {
      return PaymentProviderType.googlePlay;
    }
    return PaymentProviderType.razorpay;
  }
}

class PaymentSuccessData {
  final String paymentId;
  final String orderId;
  final String signature;
  final Map<String, dynamic> extraData;

  PaymentSuccessData({
    required this.paymentId,
    required this.orderId,
    required this.signature,
    this.extraData = const {},
  });
}

class PaymentFailureData {
  final int code;
  final String message;

  PaymentFailureData({required this.code, required this.message});
}

abstract class PaymentService {
  factory PaymentService() {
    switch (PaymentConfig.activeProvider) {
      case PaymentProviderType.googlePlay:
        return GooglePlayPaymentService();
      case PaymentProviderType.razorpay:
        return RazorpayPaymentService();
    }
  }

  void init({
    required Function(PaymentSuccessData data) onSuccess,
    required Function(PaymentFailureData data) onFailure,
    Function(ExternalWalletResponse)? onExternalWallet,
  });

  void clear();

  Future<Map<String, dynamic>> createOrder({
    required double amount,
    required String orgId,
    required String planName,
  });

  Future<void> openCheckout({
    required String keyId,
    required String orderId,
    required double amount,
    required String orgName,
    required String planName,
    required String prefillName,
    required String prefillContact,
    required String prefillEmail,
  });

  Future<Map<String, dynamic>> verifyPayment({
    required String paymentId,
    required String orderId,
    required String signature,
    required String orgId,
    required String planName,
    required String operatorName,
    required String oldPlan,
    Map<String, dynamic> extraData = const {},
  });

  Future<void> restorePurchases();
}

class RazorpayPaymentService implements PaymentService {
  final PaymentRepository _paymentRepository = PaymentRepository();
  late Razorpay _razorpay;
  late Function(PaymentSuccessData) _onSuccess;
  late Function(PaymentFailureData) _onFailure;

  @override
  void init({
    required Function(PaymentSuccessData) onSuccess,
    required Function(PaymentFailureData) onFailure,
    Function(ExternalWalletResponse)? onExternalWallet,
  }) {
    _onSuccess = onSuccess;
    _onFailure = onFailure;
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handleRazorpaySuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handleRazorpayFailure);
    if (onExternalWallet != null) {
      _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, onExternalWallet);
    }
  }

  void _handleRazorpaySuccess(PaymentSuccessResponse response) {
    _onSuccess(PaymentSuccessData(
      paymentId: response.paymentId ?? '',
      orderId: response.orderId ?? '',
      signature: response.signature ?? '',
    ));
  }

  void _handleRazorpayFailure(PaymentFailureResponse response) {
    _onFailure(PaymentFailureData(
      code: response.code ?? 0,
      message: response.message ?? 'Payment failed',
    ));
  }

  @override
  void clear() {
    _razorpay.clear();
  }

  @override
  Future<Map<String, dynamic>> createOrder({
    required double amount,
    required String orgId,
    required String planName,
  }) {
    return _paymentRepository.createRazorpayOrder(
      amount: amount,
      orgId: orgId,
      planName: planName,
    );
  }

  @override
  Future<void> openCheckout({
    required String keyId,
    required String orderId,
    required double amount,
    required String orgName,
    required String planName,
    required String prefillName,
    required String prefillContact,
    required String prefillEmail,
  }) async {
    var options = {
      'key': keyId,
      'amount': (amount * 100).toInt(),
      'name': orgName,
      'description': '${planName.toUpperCase()} Plan Subscription',
      'order_id': orderId,
      'prefill': {
        'contact': prefillContact,
        'email': prefillEmail,
        'name': prefillName,
      },
      'theme': {
        'color': '#8B1E2D',
      },
      'retry': {
        'enabled': true,
        'max_count': 1,
      },
    };
    _razorpay.open(options);
  }

  @override
  Future<Map<String, dynamic>> verifyPayment({
    required String paymentId,
    required String orderId,
    required String signature,
    required String orgId,
    required String planName,
    required String operatorName,
    required String oldPlan,
    Map<String, dynamic> extraData = const {},
  }) {
    return _paymentRepository.verifyRazorpayPayment(
      paymentId: paymentId,
      orderId: orderId,
      signature: signature,
      orgId: orgId,
      planName: planName,
      operatorName: operatorName,
      oldPlan: oldPlan,
    );
  }

  @override
  Future<void> restorePurchases() async {
    // Razorpay does not support client-side restore purchases
  }
}

class GooglePlayPaymentService implements PaymentService {
  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;
  late Function(PaymentSuccessData) _onSuccess;
  late Function(PaymentFailureData) _onFailure;

  @override
  void init({
    required Function(PaymentSuccessData) onSuccess,
    required Function(PaymentFailureData) onFailure,
    Function(ExternalWalletResponse)? onExternalWallet,
  }) {
    _onSuccess = onSuccess;
    _onFailure = onFailure;

    final Stream<List<PurchaseDetails>> purchaseUpdated = _iap.purchaseStream;
    _subscription = purchaseUpdated.listen(
      _listenToPurchaseUpdated,
      onDone: () => _subscription?.cancel(),
      onError: (error) => _onFailure(PaymentFailureData(code: 0, message: error.toString())),
    );
  }

  @override
  void clear() {
    _subscription?.cancel();
  }

  @override
  Future<Map<String, dynamic>> createOrder({
    required double amount,
    required String orgId,
    required String planName,
  }) async {
    // Google Play Billing does not use server-side Order IDs for initialization.
    // We return a mock success payload to satisfy the caller.
    return {
      'orderId': 'gplay_order_${DateTime.now().millisecondsSinceEpoch}',
      'keyId': 'gplay_key',
    };
  }

  @override
  Future<void> openCheckout({
    required String keyId,
    required String orderId,
    required double amount,
    required String orgName,
    required String planName,
    required String prefillName,
    required String prefillContact,
    required String prefillEmail,
  }) async {
    // ── Step 1: Verify BillingClient is available ──────────────────────────
    debugPrint('[BILLING] [STEP 1] Checking BillingClient availability...');
    final bool available = await _iap.isAvailable();
    debugPrint('[BILLING] [STEP 1] isAvailable: $available');
    if (!available) {
      _onFailure(PaymentFailureData(
        code: -1,
        message: 'Google Play Billing is not available on this device. '
            'Ensure the device has Google Play Services and is signed in to a Google Account.',
      ));
      return;
    }

    // ── Step 2: Map plan name to exact Play Console Product ID ─────────────
    // Product IDs must EXACTLY match what is created in Google Play Console
    // under: Monetize → Products → Subscriptions
    final Map<String, String> planToProductId = {
      'monthly':         'professional_monthly',
      'yearly':          'professional_yearly',
      'premium_monthly': 'premium_monthly',
      'premium_yearly':  'premium_yearly',
    };
    final String? productId = planToProductId[planName];
    if (productId == null) {
      debugPrint('[BILLING] [STEP 2 FAILED] Unknown plan name: "$planName". '
          'Valid values: ${planToProductId.keys.join(', ')}');
      _onFailure(PaymentFailureData(
        code: -2,
        message: 'Unknown plan: "$planName". Please contact support.',
      ));
      return;
    }
    debugPrint('[BILLING] [STEP 2] Plan "$planName" mapped to Product ID: "$productId"');

    // ── Step 3: Query Product Details ──────────────────────────────────────
    // NOTE: InAppPurchaseAndroidPlatform.queryProductDetails() internally
    // queries BOTH ProductType.inapp AND ProductType.subs simultaneously via
    // BillingClient. No additional Android platform addition call is needed.
    debugPrint('[BILLING] [STEP 3] Querying product details for: "$productId"...');

    ProductDetailsResponse response;
    try {
      response = await _iap.queryProductDetails({productId});
    } catch (e, stack) {
      debugPrint('[BILLING] [STEP 3 FAILED] queryProductDetails threw exception: $e');
      debugPrint('[BILLING] [STEP 3 FAILED] Stacktrace:\n$stack');
      _onFailure(PaymentFailureData(
        code: -3,
        message: 'Failed to query product details: $e',
      ));
      return;
    }

    // ── Step 4: Validate query response ────────────────────────────────────
    debugPrint('[BILLING] [STEP 4] Query response:');
    debugPrint('  productDetails.length: ${response.productDetails.length}');
    debugPrint('  notFoundIDs: ${response.notFoundIDs}');
    debugPrint('  error: ${response.error}');
    if (response.error != null) {
      debugPrint('  error.code: ${response.error!.code}');
      debugPrint('  error.message: ${response.error!.message}');
      debugPrint('  error.details: ${response.error!.details}');
    }
    for (final pd in response.productDetails) {
      debugPrint('  found product: id="${pd.id}" title="${pd.title}" price="${pd.price}"');
    }

    if (response.error != null) {
      final errCode = response.error!.code;
      final errMsg = response.error!.message;
      debugPrint('[BILLING] [STEP 4 FAILED] BillingResponse error. Code: $errCode, Message: $errMsg');

      // Translate BillingResponseCode to human-readable message
      final String humanError = _billingErrorToMessage(errCode, errMsg);
      _onFailure(PaymentFailureData(code: int.tryParse(errCode) ?? -4, message: humanError));
      return;
    }

    if (response.notFoundIDs.contains(productId) || response.productDetails.isEmpty) {
      debugPrint('[BILLING] [STEP 4 FAILED] Product "$productId" not found in Play Console.');
      debugPrint('  Checklist:');
      debugPrint('  1. Is "$productId" created in Play Console under Monetize > Products > Subscriptions?');
      debugPrint('  2. Is the subscription ACTIVE (not draft)?');
      debugPrint('  3. Does the subscription have at least one Base Plan that is ACTIVE?');
      debugPrint('  4. Does the Base Plan have at least one Offer?');
      debugPrint('  5. Is this app published to at least Closed Testing track?');
      debugPrint('  6. Is the test Google Account added to the Closed Testing testers list?');
      debugPrint('  7. Has the tester opted in to the testing track via the opt-in URL?');
      debugPrint('  notFoundIDs reported: ${response.notFoundIDs}');

      _onFailure(PaymentFailureData(
        code: -5,
        message: 'Subscription "$productId" not found in Google Play Console.\n\n'
            'Checklist:\n'
            '• Product ID "$productId" must exist under Subscriptions (not one-time products)\n'
            '• Subscription must be ACTIVE with an ACTIVE Base Plan\n'
            '• App must be published to Closed Testing or higher\n'
            '• Your Google Account must be added as a tester and opted-in\n\n'
            'notFoundIDs: ${response.notFoundIDs}',
      ));
      return;
    }

    // ── Step 5: Launch subscription purchase ───────────────────────────────
    final ProductDetails productDetails = response.productDetails.first;
    debugPrint('[BILLING] [STEP 5] Launching subscription purchase for: ${productDetails.id}');

    try {
      // For subscriptions on Android, use GooglePlayPurchaseParam with offerToken.
      // The offerToken is extracted from GooglePlayProductDetails.offerToken getter.
      // buyNonConsumable() on Android internally calls launchBillingFlow() which
      // handles both inapp and subs product types correctly.
      PurchaseParam purchaseParam;

      if (productDetails is GooglePlayProductDetails) {
        final String? offerToken = productDetails.offerToken;
        debugPrint('[BILLING] [STEP 5] GooglePlayProductDetails detected. offerToken: $offerToken');
        debugPrint('[BILLING] [STEP 5] subscriptionIndex: ${productDetails.subscriptionIndex}');
        purchaseParam = GooglePlayPurchaseParam(
          productDetails: productDetails,
          changeSubscriptionParam: null,
          offerToken: offerToken,
        );
      } else {
        debugPrint('[BILLING] [STEP 5] Falling back to base PurchaseParam (non-Android platform)');
        purchaseParam = PurchaseParam(productDetails: productDetails);
      }

      // buyNonConsumable is the correct call for subscriptions on Android
      // (internally calls launchBillingFlow with the product + offerToken).
      await _iap.buyNonConsumable(purchaseParam: purchaseParam);
      debugPrint('[BILLING] [STEP 5] buyNonConsumable() called successfully. Awaiting purchase stream...');
    } catch (e, stack) {
      debugPrint('[BILLING] [STEP 5 FAILED] buyNonConsumable threw: $e');
      debugPrint('[BILLING] [STEP 5 FAILED] Stacktrace:\n$stack');
      _onFailure(PaymentFailureData(
        code: -6,
        message: 'Failed to launch subscription purchase: $e',
      ));
    }
  }

  /// Translates a Google Play BillingResponseCode string to a human-readable message.
  String _billingErrorToMessage(String code, String rawMessage) {
    switch (code) {
      case '0':  return 'BillingClient is not ready. Try again in a moment.';
      case '1':  return 'User cancelled the purchase.';
      case '2':  return 'A network error occurred. Check your internet connection and try again.';
      case '3':  return 'Billing unavailable. Update Google Play Store and try again.';
      case '4':  return 'Requested product is not available for purchase.';
      case '5':  return 'Invalid developer payload or arguments.';
      case '6':  return 'A fatal error occurred in Google Play. Restart the app and try again.';
      case '7':  return 'Product already owned. Go to Manage Subscriptions to see your current plan.';
      case '8':  return 'Product not owned. Cannot consume a non-owned product.';
      case '-1': return 'BillingClient service disconnected. Restart the app and try again.';
      case '-2': return 'BillingClient feature not supported on this device or OS version.';
      case '-3': return 'BillingClient not ready. The connection is still being established.';
      default:   return 'Google Play error (code $code): $rawMessage';
    }
  }

  void _listenToPurchaseUpdated(List<PurchaseDetails> purchaseDetailsList) {
    debugPrint('[PURCHASE_FLOW] [STEP 1] BillingClient PurchaseUpdate callback triggered with ${purchaseDetailsList.length} purchases.');
    for (var purchaseDetails in purchaseDetailsList) {
      debugPrint('[PURCHASE_FLOW] [STEP 2] Purchase Object Details:');
      debugPrint('  purchaseState: ${purchaseDetails.status}');
      debugPrint('  purchaseToken (serverVerificationData): ${purchaseDetails.verificationData.serverVerificationData}');
      debugPrint('  orderId (purchaseID): ${purchaseDetails.purchaseID}');
      debugPrint('  acknowledged: ${!purchaseDetails.pendingCompletePurchase}');
      debugPrint('  productID: ${purchaseDetails.productID}');
      if (purchaseDetails.error != null) {
        debugPrint('  responseCode (error.code): ${purchaseDetails.error?.code}');
        debugPrint('  debugMessage (error.message): ${purchaseDetails.error?.message}');
        debugPrint('  errorDetails: ${purchaseDetails.error?.details}');
      }

      if (purchaseDetails.status == PurchaseStatus.pending) {
        debugPrint('[PURCHASE_FLOW] Purchase is pending...');
      } else if (purchaseDetails.status == PurchaseStatus.error) {
        debugPrint('[PURCHASE_FLOW] [STEP 1 FAILED] Purchase status is PurchaseStatus.error.');
        _onFailure(PaymentFailureData(
          code: int.tryParse(purchaseDetails.error?.code ?? '0') ?? 0,
          message: purchaseDetails.error?.message ?? 'Purchase error',
        ));
      } else if (purchaseDetails.status == PurchaseStatus.canceled) {
        debugPrint('[PURCHASE_FLOW] Purchase was cancelled by user.');
        _onFailure(PaymentFailureData(code: 0, message: 'Purchase was cancelled.'));
      } else if (purchaseDetails.status == PurchaseStatus.purchased ||
                 purchaseDetails.status == PurchaseStatus.restored) {
        debugPrint('[PURCHASE_FLOW] Purchase was successfully completed/restored. Processing verification...');
        _handleSuccessfulPurchase(purchaseDetails);
      }
    }
  }

  void _handleSuccessfulPurchase(PurchaseDetails purchaseDetails) async {
    final successData = PaymentSuccessData(
      paymentId: purchaseDetails.purchaseID ?? '',
      orderId: purchaseDetails.verificationData.serverVerificationData, // Purchase Token
      signature: '',
      extraData: {
        'productId': purchaseDetails.productID,
        'purchaseState': purchaseDetails.status.name,
      },
    );

    // Call success handler
    debugPrint('[PURCHASE_FLOW] Forwarding successful purchase to _onSuccess handler...');
    _onSuccess(successData);

    // Acknowledge the purchase if required
    if (purchaseDetails.pendingCompletePurchase) {
      debugPrint('[PURCHASE_FLOW] [STEP 6] Acknowledging purchase with Google Play...');
      try {
        await _iap.completePurchase(purchaseDetails);
        debugPrint('[PURCHASE_FLOW] [STEP 6 SUCCESS] Acknowledged purchase successfully.');
      } catch (e, stack) {
        debugPrint('[PURCHASE_FLOW] [STEP 6 FAILED] Failed to acknowledge purchase: $e');
        debugPrint('  Stacktrace: $stack');
      }
    } else {
      debugPrint('[PURCHASE_FLOW] [STEP 6] Purchase was already acknowledged.');
    }
  }

  @override
  Future<Map<String, dynamic>> verifyPayment({
    required String paymentId,
    required String orderId,
    required String signature,
    required String orgId,
    required String planName,
    required String operatorName,
    required String oldPlan,
    Map<String, dynamic> extraData = const {},
  }) async {
    final PaymentRepository paymentRepository = PaymentRepository();
    final productId = extraData['productId'] ?? (planName == 'monthly' ? 'professional_monthly' : 'professional_yearly');

    return paymentRepository.verifyGooglePlayPurchase(
      purchaseToken: orderId,
      productId: productId,
      orgId: orgId,
      planName: planName,
      operatorName: operatorName,
      oldPlan: oldPlan,
    );
  }

  @override
  Future<void> restorePurchases() async {
    final bool available = await _iap.isAvailable();
    if (!available) return;
    try {
      await _iap.restorePurchases();
    } catch (e) {
      debugPrint('Restore purchases failed: $e');
    }
  }
}
