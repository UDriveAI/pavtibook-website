const donorRepo = require('../repositories/donor.repository');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class DonorService {
  async getDonors(orgId, search) {
    return await donorRepo.findAll(orgId, search);
  }

  async getDonorById(id, orgId) {
    const donor = await donorRepo.findById(id, orgId);
    if (!donor) {
      throw new Error('Donor not found.');
    }

    const summaryData = await donorRepo.findStats(id, orgId);
    const history = await donorRepo.findReceiptsTimeline(id, orgId);

    return {
      donor,
      summary: {
        totalDonations: parseFloat(summaryData.total_donations),
        donationCount: parseInt(summaryData.donation_count),
        lastDonationDate: summaryData.last_donation_date,
      },
      history,
    };
  }

  async lookupByMobile(orgId, mobile) {
    // Exact mobile match with running totals — used by receipt creation screen
    const donors = await donorRepo.findAll(orgId, mobile);
    const match = donors.find(d => d.mobile === mobile);
    if (!match) return null;
    return {
      id: match.id,
      name: match.name,
      mobile: match.mobile,
      email: match.email,
      address: match.address,
      totalDonations: parseFloat(match.total_donated || 0),
      donationCount: parseInt(match.donation_count || 0),
    };
  }

  async createDonor(orgId, body) {
    // Enforce mobile as unique identifier — return existing donor instead of creating duplicate
    const existing = await donorRepo.checkDuplicate(body.mobile, orgId);
    if (existing) {
      // Fetch and return the existing donor record
      const donors = await donorRepo.findAll(orgId, body.mobile);
      const match = donors.find(d => d.mobile === body.mobile);
      if (match) return { ...match, is_existing: true };
    }

    const donorId = uuidv4();
    const pool = db.pool;
    const client = await pool.connect();
    try {
      const newDonor = await donorRepo.create(client, {
        id: donorId,
        organizationId: orgId,
        name: body.name,
        mobile: body.mobile,
        email: body.email,
        address: body.address,
      });
      return { ...newDonor, is_existing: false };
    } finally {
      client.release();
    }
  }

  async updateDonor(id, orgId, body) {
    const duplicate = await donorRepo.checkDuplicate(body.mobile, orgId, id);
    if (duplicate) {
      throw new Error('Another donor already has this mobile number.');
    }

    const updated = await donorRepo.update(id, orgId, body);
    if (!updated) {
      throw new Error('Donor not found.');
    }
    return updated;
  }
}

module.exports = new DonorService();
