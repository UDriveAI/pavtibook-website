const db = require('../config/db');
const bcrypt = require('bcryptjs');

class UserRepository {
  async findById(id) {
    const query = `
      SELECT u.id, u.name, u.email, u.mobile, u.role, u.is_active, u.organization_id,
             o.name as org_name, o.type as org_type, o.upi_id, o.is_verified, o.subscription_plan
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1 AND u.deleted_at IS NULL AND (o.deleted_at IS NULL OR o.id IS NULL)
    `;
    const res = await db.query(query, [id]);
    return res.rows[0] || null;
  }

  async findByEmail(email) {
    const query = `
      SELECT u.*, o.name as org_name, o.subscription_plan, o.is_verified 
      FROM users u 
      LEFT JOIN organizations o ON u.organization_id = o.id 
      WHERE u.email = $1 AND u.deleted_at IS NULL AND (o.deleted_at IS NULL OR o.id IS NULL)
    `;
    const res = await db.query(query, [email]);
    return res.rows[0] || null;
  }

  async findByMobile(mobile) {
    const query = `
      SELECT u.*, o.name as org_name, o.subscription_plan, o.is_verified 
      FROM users u 
      LEFT JOIN organizations o ON u.organization_id = o.id 
      WHERE u.mobile = $1 AND u.deleted_at IS NULL AND (o.deleted_at IS NULL OR o.id IS NULL)
    `;
    const res = await db.query(query, [mobile]);
    return res.rows[0] || null;
  }

  async checkDuplicate(email, mobile) {
    const query = `
      SELECT id FROM users 
      WHERE (email = $1 OR mobile = $2) AND deleted_at IS NULL
    `;
    const res = await db.query(query, [email, mobile]);
    return res.rowCount > 0;
  }

  async create(client, userData) {
    const query = `
      INSERT INTO users (id, organization_id, name, email, mobile, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, organization_id, name, email, mobile, role
    `;
    const res = await client.query(query, [
      userData.id,
      userData.organizationId,
      userData.name,
      userData.email,
      userData.mobile,
      userData.passwordHash,
      userData.role,
      userData.isActive ?? true,
    ]);
    return res.rows[0];
  }

  async updateOtp(id, otp, expiry) {
    // Hash OTP before storage — never store plain-text credentials
    const otpHash = await bcrypt.hash(otp, 8);
    const query = `
      UPDATE users 
      SET otp = $1, otp_expiry = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND deleted_at IS NULL
    `;
    await db.query(query, [otpHash, expiry, id]);
  }

  async clearOtp(id) {
    const query = `
      UPDATE users 
      SET otp = NULL, otp_expiry = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await db.query(query, [id]);
  }

  async findCollectorsByOrg(orgId) {
    const query = `
      SELECT u.id, u.name, u.email, u.mobile, u.is_active, c.status as collector_status, c.prefix_code, c.target_amount, c.created_at
      FROM users u
      JOIN collectors c ON u.id = c.user_id
      WHERE u.organization_id = $1 AND u.role = 'collector' AND u.deleted_at IS NULL AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `;
    const res = await db.query(query, [orgId]);
    return res.rows;
  }

  async findPrefixByUserId(orgId, userId) {
    const query = `
      SELECT prefix_code FROM collectors
      WHERE user_id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const res = await db.query(query, [userId, orgId]);
    return res.rows[0]?.prefix_code || null;
  }

  async updateCollectorStatus(client, collectorUserId, orgId, isActive) {
    // 1. Update user
    await client.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL',
      [isActive, collectorUserId, orgId]
    );

    // 2. Update collector status
    const statusText = isActive ? 'active' : 'inactive';
    await client.query(
      'UPDATE collectors SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND organization_id = $3 AND deleted_at IS NULL',
      [statusText, collectorUserId, orgId]
    );
  }
}

module.exports = new UserRepository();
