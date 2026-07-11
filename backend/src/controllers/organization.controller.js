const orgService = require('../services/organization.service');

class OrganizationController {
  async getProfile(req, res) {
    try {
      const org = await orgService.getProfile(req.organization_id);
      res.json(org);
    } catch (error) {
      console.error('Fetch organization profile error:', error);
      res.status(500).json({ message: error.message || 'Server error retrieving organization.' });
    }
  }

  async updateProfile(req, res) {
    try {
      const org = await orgService.updateProfile(req.organization_id, req.body);
      res.json(org);
    } catch (error) {
      console.error('Update organization profile error:', error);
      res.status(400).json({ message: error.message || 'Server error updating organization.' });
    }
  }

  async submitVerification(req, res) {
    try {
      const verification = await orgService.submitVerification(req.organization_id, req.body);
      res.status(201).json({
        message: 'KYC Document submitted successfully. Awaiting admin approval.',
        verification,
      });
    } catch (error) {
      console.error('KYC submission error:', error);
      res.status(400).json({ message: error.message || 'Server error uploading KYC document.' });
    }
  }

  async getVerificationStatus(req, res) {
    try {
      const logs = await orgService.getVerificationStatus(req.organization_id);
      res.json(logs);
    } catch (error) {
      console.error('Fetch verification logs error:', error);
      res.status(500).json({ message: error.message || 'Server error fetching verification list.' });
    }
  }
}

module.exports = new OrganizationController();
