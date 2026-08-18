const db = require('../config/db');

class ReceiptRepository {
  async findAll(orgId, filters) {
    console.log('receiptRepo.findAll filters:', filters);
    const { search, payment_mode, payment_status, collector_id, limit, offset } = filters;
    const parsedLimit = parseInt(limit) || 50;
    const parsedOffset = parseInt(offset) || 0;

    let query = `
      SELECT r.*, d.name as donor_name, d.mobile as donor_mobile, u.name as collector_name
      FROM receipts r
      JOIN donors d ON r.donor_id = d.id
      LEFT JOIN users u ON r.collector_id = u.id
      WHERE r.organization_id = $1 AND r.deleted_at IS NULL AND d.deleted_at IS NULL
    `;
    const params = [orgId];
    let paramIndex = 2;

    if (search) {
      query += ` AND (d.name ILIKE $${paramIndex} OR d.mobile ILIKE $${paramIndex} OR r.receipt_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (payment_mode) {
      query += ` AND r.payment_mode = $${paramIndex}`;
      params.push(payment_mode);
      paramIndex++;
    }

    if (payment_status) {
      query += ` AND r.payment_status = $${paramIndex}`;
      params.push(payment_status);
      paramIndex++;
    }

    if (collector_id) {
      query += ` AND r.collector_id = $${paramIndex}`;
      params.push(collector_id);
      paramIndex++;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parsedLimit, parsedOffset);

    const res = await db.query(query, params);
    return res.rows;
  }

  async findById(id, orgId) {
    const query = `
      SELECT * FROM receipts 
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const res = await db.query(query, [id, orgId]);
    return res.rows[0] || null;
  }

  async findWithRelations(id, orgId) {
    const query = `
      SELECT r.*, d.name as donor_name, d.mobile as donor_mobile, d.email as donor_email, d.address as donor_address,
             u.name as collector_name, t.name as template_name
      FROM receipts r
      JOIN donors d ON r.donor_id = d.id
      LEFT JOIN users u ON r.collector_id = u.id
      LEFT JOIN templates t ON r.template_id = t.id
      WHERE r.id = $1 AND r.organization_id = $2 AND r.deleted_at IS NULL AND d.deleted_at IS NULL
    `;
    const res = await db.query(query, [id, orgId]);
    return res.rows[0] || null;
  }

  async findLatestSequence(client, orgId, prefix) {
    const query = `
      SELECT receipt_number FROM receipts 
      WHERE organization_id = $1 AND receipt_number LIKE $2 AND deleted_at IS NULL
      ORDER BY receipt_number DESC LIMIT 1
    `;
    const res = await client.query(query, [orgId, `${prefix}%`]);
    return res.rows[0] || null;
  }

  async findByIdempotencyKey(client, idempotencyKey, orgId) {
    const connection = client || db;
    const query = `
      SELECT * FROM receipts 
      WHERE idempotency_key = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const res = await connection.query(query, [idempotencyKey, orgId]);
    return res.rows[0] || null;
  }

  async create(client, receiptData) {
    const query = `
      INSERT INTO receipts (
        id, organization_id, template_id, donor_id, collector_id,
        receipt_number, amount, purpose, payment_mode, payment_status, qr_code_value, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const res = await client.query(query, [
      receiptData.id,
      receiptData.organizationId,
      receiptData.templateId || null,
      receiptData.donorId,
      receiptData.collectorId,
      receiptData.receiptNumber,
      receiptData.amount,
      receiptData.purpose,
      receiptData.paymentMode,
      receiptData.paymentStatus,
      receiptData.qrCodeValue,
      receiptData.idempotencyKey || null,
    ]);
    return res.rows[0];
  }

  async updatePaymentStatus(client, id, status) {
    const query = `
      UPDATE receipts 
      SET payment_status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    const res = await client.query(query, [status, id]);
    return res.rows[0] || null;
  }

  async checkOwnership(id, orgId) {
    const query = `
      SELECT id, payment_status, amount FROM receipts 
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const res = await db.query(query, [id, orgId]);
    return res.rows[0] || null;
  }

  async checkOwnershipWithLock(client, id, orgId) {
    const query = `
      SELECT id, payment_status, amount FROM receipts 
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      FOR UPDATE
    `;
    const res = await client.query(query, [id, orgId]);
    return res.rows[0] || null;
  }

  async verifyByQrCode(token) {
    // Tier 1: Exact cryptographic QR token match (Highest Priority)
    const exactQuery = `
      SELECT r.id as receipt_id, r.receipt_number, r.amount, r.purpose, r.payment_mode, r.payment_status, r.created_at,
             d.name as donor_name, d.mobile as donor_mobile,
             o.name as organization_name, o.is_verified as organization_verified, o.type as organization_type
      FROM receipts r
      JOIN donors d ON r.donor_id = d.id
      JOIN organizations o ON r.organization_id = o.id
      WHERE r.qr_code_value = $1 AND r.deleted_at IS NULL AND d.deleted_at IS NULL AND o.deleted_at IS NULL
      LIMIT 1
    `;
    const exactRes = await db.query(exactQuery, [token]);
    if (exactRes.rows && exactRes.rows.length > 0) {
      return exactRes.rows[0];
    }

    // Tier 2: Legacy receipt_number fallback (For printed legacy receipts without tokens)
    const legacyQuery = `
      SELECT r.id as receipt_id, r.receipt_number, r.amount, r.purpose, r.payment_mode, r.payment_status, r.created_at,
             d.name as donor_name, d.mobile as donor_mobile,
             o.name as organization_name, o.is_verified as organization_verified, o.type as organization_type
      FROM receipts r
      JOIN donors d ON r.donor_id = d.id
      JOIN organizations o ON r.organization_id = o.id
      WHERE r.receipt_number = $1 AND r.deleted_at IS NULL AND d.deleted_at IS NULL AND o.deleted_at IS NULL
    `;
    const legacyRes = await db.query(legacyQuery, [token]);
    
    // Strict unambiguous match: exactly 1 active global match permitted
    if (legacyRes.rows && legacyRes.rows.length === 1) {
      return legacyRes.rows[0];
    }

    // Ambiguous (multiple matches) or 0 matches: safely fail
    return null;
  }

  async createVerificationLog(id, receiptId, ip, userAgent) {
    const query = `
      INSERT INTO receipt_verification_logs (id, receipt_id, scanned_by_ip, user_agent, status)
      VALUES ($1, $2, $3, $4, 'valid')
      RETURNING *
    `;
    const res = await db.query(query, [id, receiptId, ip, userAgent]);
    return res.rows[0];
  }
}

module.exports = new ReceiptRepository();

