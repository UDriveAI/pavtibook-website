const db = require('../config/db');

class OrganizationRepository {
  async findById(id) {
    const query = `
      SELECT * FROM organizations 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const res = await db.query(query, [id]);
    return res.rows[0] || null;
  }

  async update(id, orgData) {
    const query = `
      UPDATE organizations
      SET name = $1, type = $2, contact_person = $3, mobile = $4, email = $5, 
          address = $6, city = $7, state = $8, pincode = $9, upi_id = $10,
          registration_number = $11, logo_url = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND deleted_at IS NULL
      RETURNING *
    `;
    const res = await db.query(query, [
      orgData.name,
      orgData.type,
      orgData.contact_person,
      orgData.mobile,
      orgData.email,
      orgData.address,
      orgData.city,
      orgData.state,
      orgData.pincode,
      orgData.upi_id,
      orgData.registration_number || null,
      orgData.logo_url || null,
      id
    ]);
    return res.rows[0] || null;
  }

  async createVerification(id, organizationId, docType, docUrl) {
    const query = `
      INSERT INTO organization_verifications (id, organization_id, document_type, document_url, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const res = await db.query(query, [id, organizationId, docType, docUrl]);
    return res.rows[0];
  }

  async findVerificationsByOrg(orgId) {
    const query = `
      SELECT * FROM organization_verifications 
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const res = await db.query(query, [orgId]);
    return res.rows;
  }
}

module.exports = new OrganizationRepository();
