const db = require('../config/db');

class PaymentRepository {
  async create(client, paymentData) {
    const query = `
      INSERT INTO payments (id, organization_id, receipt_id, amount, payment_mode, status, qr_code_payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await client.query(query, [
      paymentData.id,
      paymentData.organizationId,
      paymentData.receiptId,
      paymentData.amount,
      paymentData.paymentMode,
      paymentData.status,
      paymentData.qrCodePayload || null,
    ]);
    return res.rows[0];
  }

  async updateStatus(client, receiptId, status, transactionRef, confirmedBy = null, confirmedAt = null) {
    const query = `
      UPDATE payments 
      SET status = $1, transaction_ref = $2, confirmed_by = $3, confirmed_at = $4, updated_at = CURRENT_TIMESTAMP 
      WHERE receipt_id = $5 AND deleted_at IS NULL
      RETURNING *
    `;
    const res = await client.query(query, [
      status, 
      transactionRef || 'MANUAL-RECONCILED', 
      confirmedBy, 
      confirmedAt, 
      receiptId
    ]);
    return res.rows[0] || null;
  }
}

module.exports = new PaymentRepository();
