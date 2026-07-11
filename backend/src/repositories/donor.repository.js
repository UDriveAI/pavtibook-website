const db = require('../config/db');

class DonorRepository {
  async findAll(orgId, search) {
    if (search) {
      const searchPattern = `%${search}%`;
      const query = `
        SELECT d.*, 
               COALESCE(SUM(r.amount), 0) as total_donated, 
               COUNT(r.id) as donation_count
        FROM donors d
        LEFT JOIN receipts r ON d.id = r.donor_id AND r.payment_status = 'paid'
        WHERE d.organization_id = $1 AND (d.name ILIKE $2 OR d.mobile ILIKE $2) AND d.deleted_at IS NULL AND (r.deleted_at IS NULL OR r.id IS NULL)
        GROUP BY d.id
        ORDER BY d.name ASC
      `;
      const res = await db.query(query, [orgId, searchPattern]);
      return res.rows;
    } else {
      const query = `
        SELECT d.*, 
               COALESCE(SUM(r.amount), 0) as total_donated, 
               COUNT(r.id) as donation_count
        FROM donors d
        LEFT JOIN receipts r ON d.id = r.donor_id AND r.payment_status = 'paid'
        WHERE d.organization_id = $1 AND d.deleted_at IS NULL AND (r.deleted_at IS NULL OR r.id IS NULL)
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `;
      const res = await db.query(query, [orgId]);
      return res.rows;
    }
  }

  async findById(id, orgId) {
    const query = `
      SELECT * FROM donors 
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const res = await db.query(query, [id, orgId]);
    return res.rows[0] || null;
  }

  async findStats(id, orgId) {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total_donations,
             COUNT(id) as donation_count,
             MAX(created_at) as last_donation_date
      FROM receipts
      WHERE donor_id = $1 AND organization_id = $2 AND payment_status = 'paid' AND deleted_at IS NULL
    `;
    const res = await db.query(query, [id, orgId]);
    return res.rows[0];
  }

  async findReceiptsTimeline(id, orgId) {
    const query = `
      SELECT id, receipt_number, amount, purpose, payment_mode, payment_status, created_at
      FROM receipts
      WHERE donor_id = $1 AND organization_id = $2 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const res = await db.query(query, [id, orgId]);
    return res.rows;
  }

  async findByMobile(client, mobile, orgId) {
    const query = `
      SELECT id, name, email, address FROM donors 
      WHERE mobile = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const res = await client.query(query, [mobile, orgId]);
    return res.rows[0] || null;
  }

  async checkDuplicate(mobile, orgId, excludeId = null) {
    let query, params;
    if (excludeId) {
      query = `
        SELECT id FROM donors 
        WHERE mobile = $1 AND organization_id = $2 AND id != $3 AND deleted_at IS NULL
      `;
      params = [mobile, orgId, excludeId];
    } else {
      query = `
        SELECT id FROM donors 
        WHERE mobile = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      params = [mobile, orgId];
    }
    const res = await db.query(query, params);
    return res.rowCount > 0;
  }

  async create(client, donorData) {
    const query = `
      INSERT INTO donors (id, organization_id, name, mobile, email, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await client.query(query, [
      donorData.id,
      donorData.organizationId,
      donorData.name,
      donorData.mobile,
      donorData.email || null,
      donorData.address || null,
    ]);
    return res.rows[0];
  }

  async update(id, orgId, donorData) {
    const query = `
      UPDATE donors
      SET name = $1, mobile = $2, email = $3, address = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND organization_id = $6 AND deleted_at IS NULL
      RETURNING *
    `;
    const res = await db.query(query, [
      donorData.name,
      donorData.mobile,
      donorData.email || null,
      donorData.address || null,
      id,
      orgId,
    ]);
    return res.rows[0] || null;
  }
}

module.exports = new DonorRepository();
