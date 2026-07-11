import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../repositories/payment_repository.dart';

class PaymentService {
  final PaymentRepository _paymentRepository = PaymentRepository();
  late Razorpay _razorpay;

  void init({
    required Function(PaymentSuccessResponse) onSuccess,
    required Function(PaymentFailureResponse) onFailure,
    required Function(ExternalWalletResponse) onExternalWallet,
  }) {
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, onSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, onFailure);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, onExternalWallet);
  }

  void clear() {
    _razorpay.clear();
  }

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
      'amount': (amount * 100).toInt(), // amount in paise
      'name': orgName,
      'description': '${planName.toUpperCase()} Plan Subscription',
      'order_id': orderId,
      'prefill': {
        'contact': prefillContact,
        'email': prefillEmail,
        'name': prefillName,
      },
      'theme': {
        'color': '#8B1E2D', // app primary color
      },
      'retry': {
        'enabled': true,
        'max_count': 1,
      },
    };
    _razorpay.open(options);
  }

  Future<Map<String, dynamic>> verifyPayment({
    required String paymentId,
    required String orderId,
    required String signature,
    required String orgId,
    required String planName,
    required String operatorName,
    required String oldPlan,
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
}
