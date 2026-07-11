import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../repositories/payment_repository.dart';
import 'subscription_service.dart';

enum PaymentProviderType { razorpay, googlePlay }

class PaymentConfig {
  static const PaymentProviderType activeProvider = PaymentProviderType.googlePlay;
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
  String? _currentPendingPlan;

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
    _currentPendingPlan = planName;

    final bool available = await _iap.isAvailable();
    if (!available) {
      _onFailure(PaymentFailureData(code: 0, message: 'Google Play Billing is not available on this device.'));
      return;
    }

    // Map plan name to Product ID
    String productId = planName;
    if (planName == 'monthly') productId = 'professional_monthly';
    if (planName == 'yearly') productId = 'professional_yearly';

    final ProductDetailsResponse response = await _iap.queryProductDetails({productId});
    if (response.notFoundIDs.contains(productId) || response.productDetails.isEmpty) {
      _onFailure(PaymentFailureData(code: 0, message: 'Product details not found in Google Play Console.'));
      return;
    }

    final ProductDetails productDetails = response.productDetails.first;
    final PurchaseParam purchaseParam = PurchaseParam(productDetails: productDetails);

    // Request purchase
    try {
      await _iap.buyNonConsumable(purchaseParam: purchaseParam);
    } catch (e) {
      _onFailure(PaymentFailureData(code: 0, message: e.toString()));
    }
  }

  void _listenToPurchaseUpdated(List<PurchaseDetails> purchaseDetailsList) {
    for (var purchaseDetails in purchaseDetailsList) {
      if (purchaseDetails.status == PurchaseStatus.pending) {
        // Handle pending purchase
        debugPrint('Purchase is pending for ${purchaseDetails.productID}');
      } else if (purchaseDetails.status == PurchaseStatus.error) {
        _onFailure(PaymentFailureData(code: 0, message: purchaseDetails.error?.message ?? 'Purchase error'));
      } else if (purchaseDetails.status == PurchaseStatus.canceled) {
        _onFailure(PaymentFailureData(code: 0, message: 'Purchase was cancelled.'));
      } else if (purchaseDetails.status == PurchaseStatus.purchased ||
                 purchaseDetails.status == PurchaseStatus.restored) {
        // Handle successful/restored purchase
        _handleSuccessfulPurchase(purchaseDetails);
      }
    }
  }

  void _handleSuccessfulPurchase(PurchaseDetails purchaseDetails) async {
    // Verify purchase token server-side (handled via verifyPayment callback)
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
    _onSuccess(successData);

    // Acknowledge the purchase if required
    if (purchaseDetails.pendingCompletePurchase) {
      await _iap.completePurchase(purchaseDetails);
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
