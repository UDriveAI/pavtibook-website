const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const userRepo = require('../repositories/user.repository');

class CollectorService {
  async getCollectors(orgId) {
    return await userRepo.findCollectorsByOrg(orgId);
  }

  async createCollector(orgId, assignedByUserId, body) {
    const { name, email, mobile, password, prefixCode, targetAmount } = body;

    if (!name || !email || !mobile || !password || !prefixCode) {
      throw new Error('Name, email, mobile, password, and prefixCode are required.');
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Check duplicates
      const exists = await userRepo.checkDuplicate(email, mobile);
      if (exists) {
        throw new Error('A user with this email or mobile already exists.');
      }

      // Check duplicate prefix within org
      const prefixCheck = await client.query(
        'SELECT id FROM collectors WHERE organization_id = $1 AND prefix_code = $2 AND deleted_at IS NULL',
        [orgId, prefixCode.toUpperCase().trim()]
      );
      if (prefixCheck.rowCount > 0) {
        throw new Error(`A collector with prefix code "${prefixCode.toUpperCase().trim()}" already exists in your organization.`);
      }

      // 1. Create User record
      const userId = uuidv4();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await userRepo.create(client, {
        id: userId,
        organizationId: orgId,
        name,
        email,
        mobile,
        passwordHash,
        role: 'collector',
      });

      // 2. Insert into collectors table
      const collectorId = uuidv4();
      const targetAmt = parseFloat(targetAmount) || 0.00;
      const collectorQuery = `
        INSERT INTO collectors (id, user_id, organization_id, status, prefix_code, target_amount, assigned_by)
        VALUES ($1, $2, $3, 'active', $4, $5, $6)
        RETURNING id, status, prefix_code, target_amount
      `;
      const collectorResult = await client.query(collectorQuery, [
        collectorId,
        userId,
        orgId,
        prefixCode.toUpperCase().trim(),
        targetAmt,
        assignedByUserId,
      ]);

      await client.query('COMMIT');

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        collector_status: collectorResult.rows[0].status,
        prefix_code: collectorResult.rows[0].prefix_code,
        target_amount: parseFloat(collectorResult.rows[0].target_amount),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async toggleCollectorStatus(orgId, collectorUserId, isActive) {
    if (isActive === undefined) {
      throw new Error('isActive flag is required.');
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify collector belongs to this organization
      const collectorCheck = await client.query(
        'SELECT user_id FROM collectors WHERE user_id = $1 AND organization_id = $2 AND deleted_at IS NULL',
        [collectorUserId, orgId]
      );

      if (collectorCheck.rowCount === 0) {
        throw new Error('Collector not found in your organization.');
      }

      await userRepo.updateCollectorStatus(client, collectorUserId, orgId, isActive);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new CollectorService();
