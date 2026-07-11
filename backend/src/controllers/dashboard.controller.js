const dashboardService = require('../services/dashboard.service');

class DashboardController {
  async getStats(req, res) {
    try {
      const stats = await dashboardService.getStats(req.organization_id);
      res.json(stats);
    } catch (error) {
      console.error('Fetch dashboard stats error:', error);
      res.status(500).json({ message: error.message || 'Server error loading stats.' });
    }
  }

  async getCollectorStats(req, res) {
    try {
      const stats = await dashboardService.getCollectorPerformance(req.organization_id);
      res.json(stats);
    } catch (error) {
      console.error('Fetch dashboard collector stats error:', error);
      res.status(500).json({ message: error.message || 'Server error loading collector performance.' });
    }
  }
}

module.exports = new DashboardController();
