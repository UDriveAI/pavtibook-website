const db = require('../config/db');
const receiptRepo = require('../repositories/receipt.repository');
const paymentRepo = require('../repositories/payment.repository');

class PaymentService {
  async reconcilePayment(receiptId, orgId, transactionRef, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const receipt = await receiptRepo.checkOwnershipWithLock(client, receiptId, orgId);
      if (!receipt) {
        throw new Error('Receipt not found in your organization.');
      }

      if (receipt.payment_status === 'paid') {
        throw new Error('Payment is already marked as paid.');
      }

      if (receipt.payment_status === 'cancelled') {
        throw new Error('Cancelled receipts cannot be reconciled.');
      }

      // 1. Update receipt
      await receiptRepo.updatePaymentStatus(client, receiptId, 'paid');

      // 2. Update payment status
      await paymentRepo.updateStatus(client, receiptId, 'completed', transactionRef, userId, new Date());

      await client.query('COMMIT');
      invalidatePdfCache(receiptId);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelPayment(receiptId, orgId, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const receipt = await receiptRepo.checkOwnershipWithLock(client, receiptId, orgId);
      if (!receipt) {
        throw new Error('Receipt not found in your organization.');
      }

      if (receipt.payment_status === 'paid') {
        throw new Error('Paid receipts cannot be cancelled.');
      }

      if (receipt.payment_status === 'cancelled') {
        throw new Error('Payment is already cancelled.');
      }

      // 1. Update receipt
      await receiptRepo.updatePaymentStatus(client, receiptId, 'cancelled');

      // 2. Update payment status
      await paymentRepo.updateStatus(client, receiptId, 'cancelled', 'CANCELLED', userId, new Date());

      await client.query('COMMIT');
      invalidatePdfCache(receiptId);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function invalidatePdfCache(receiptId) {
  const fs = require('fs');
  const path = require('path');
  const pdfPath = path.join(__dirname, '../../tmp/pdf-cache', `receipt_${receiptId}.pdf`);
  if (fs.existsSync(pdfPath)) {
    try {
      fs.unlinkSync(pdfPath);
      console.log(`[PDF Cache] Invalidated cached PDF for receipt ID: ${receiptId}`);
    } catch (e) {
      console.error(`[PDF Cache] Failed to invalidate cache for receipt ${receiptId}:`, e);
    }
  }
}

module.exports = new PaymentService();
