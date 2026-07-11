const donorService = require('../services/donor.service');

class DonorController {
  async getDonors(req, res) {
    try {
      const { search } = req.query;
      const donors = await donorService.getDonors(req.organization_id, search);
      res.json(donors);
    } catch (error) {
      console.error('Fetch donors error:', error);
      res.status(500).json({ message: error.message || 'Server error fetching donors.' });
    }
  }

  async lookupByMobile(req, res) {
    try {
      const { mobile } = req.query;
      if (!mobile || mobile.length !== 10) {
        return res.status(400).json({ message: 'Provide a valid 10-digit mobile number.' });
      }
      const result = await donorService.lookupByMobile(req.organization_id, mobile);
      if (!result) {
        return res.status(200).json({ found: false });
      }
      res.json({ found: true, donor: result });
    } catch (error) {
      console.error('Lookup donor error:', error);
      res.status(500).json({ message: error.message || 'Server error.' });
    }
  }

  async getDonorById(req, res) {
    try {
      const { id } = req.params;
      const details = await donorService.getDonorById(id, req.organization_id);
      res.json(details);
    } catch (error) {
      console.error('Fetch donor detail error:', error);
      res.status(404).json({ message: error.message || 'Donor not found.' });
    }
  }

  async createDonor(req, res) {
    try {
      const donor = await donorService.createDonor(req.organization_id, req.body);
      res.status(201).json(donor);
    } catch (error) {
      console.error('Create donor error:', error);
      res.status(400).json({ message: error.message || 'Server error creating donor.' });
    }
  }

  async updateDonor(req, res) {
    try {
      const { id } = req.params;
      const donor = await donorService.updateDonor(id, req.organization_id, req.body);
      res.json(donor);
    } catch (error) {
      console.error('Update donor error:', error);
      res.status(400).json({ message: error.message || 'Server error updating donor.' });
    }
  }
}

module.exports = new DonorController();
