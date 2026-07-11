const { v4: uuidv4 } = require('uuid');
const orgRepo = require('../repositories/organization.repository');

class OrganizationService {
  async getProfile(orgId) {
    const org = await orgRepo.findById(orgId);
    if (!org) {
      throw new Error('Organization not found.');
    }
    return org;
  }

  async updateProfile(orgId, body) {
    const {
      name,
      type,
      contact_person,
      mobile,
      email,
      address,
      city,
      state,
      pincode,
      upi_id,
      registration_number,
      logo_url,
    } = body;

    if (!name || !type || !contact_person || !mobile || !email || !address || !city || !state || !pincode || !upi_id) {
      throw new Error('Please fill all required settings.');
    }

    const updated = await orgRepo.update(orgId, {
      name,
      type,
      contact_person,
      mobile,
      email,
      address,
      city,
      state,
      pincode,
      upi_id,
      registration_number,
      logo_url,
    });

    if (!updated) {
      throw new Error('Organization profile not found or could not be updated.');
    }

    return updated;
  }

  async submitVerification(orgId, body) {
    const { document_type, document_url } = body;

    if (!document_type || !document_url) {
      throw new Error('Document type and URL are required.');
    }

    const id = uuidv4();
    const verification = await orgRepo.createVerification(id, orgId, document_type, document_url);
    return verification;
  }

  async getVerificationStatus(orgId) {
    return await orgRepo.findVerificationsByOrg(orgId);
  }
}

module.exports = new OrganizationService();
