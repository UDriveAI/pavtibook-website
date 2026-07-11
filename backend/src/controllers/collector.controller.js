const collectorService = require('../services/collector.service');

class CollectorController {
  async getCollectors(req, res) {
    try {
      const collectors = await collectorService.getCollectors(req.organization_id);
      res.json(collectors);
    } catch (error) {
      console.error('Fetch collectors error:', error);
      res.status(500).json({ message: error.message || 'Server error fetching collectors.' });
    }
  }

  async createCollector(req, res) {
    try {
      const collector = await collectorService.createCollector(req.organization_id, req.user.id, req.body);
      res.status(201).json({
        message: 'Collector created successfully.',
        collector,
      });
    } catch (error) {
      console.error('Create collector error:', error);
      res.status(400).json({ message: error.message || 'Server error creating collector.' });
    }
  }

  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      await collectorService.toggleCollectorStatus(req.organization_id, id, isActive);
      res.json({ message: `Collector ${isActive ? 'activated' : 'deactivated'} successfully.` });
    } catch (error) {
      console.error('Update collector status error:', error);
      res.status(400).json({ message: error.message || 'Server error updating collector status.' });
    }
  }
}

module.exports = new CollectorController();
