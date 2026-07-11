const paymentService = require('../services/payment.service');

class PaymentController {
  async reconcile(req, res) {
    try {
      const receiptId = req.params.receipt_id;
      const { transactionRef } = req.body;
      await paymentService.reconcilePayment(
        receiptId, 
        req.organization_id, 
        transactionRef || 'MANUAL-RECONCILED', 
        req.user.id
      );
      res.json({ message: 'Payment status reconciled to PAID successfully.' });
    } catch (error) {
      console.error('Payment reconciliation error:', error);
      res.status(400).json({ message: error.message || 'Server error processing payment update.' });
    }
  }

  async cancel(req, res) {
    try {
      const receiptId = req.params.receipt_id;
      await paymentService.cancelPayment(receiptId, req.organization_id, req.user.id);
      res.json({ message: 'Payment status cancelled successfully.' });
    } catch (error) {
      console.error('Payment cancellation error:', error);
      res.status(400).json({ message: error.message || 'Server error processing payment cancellation.' });
    }
  }
}

module.exports = new PaymentController();
