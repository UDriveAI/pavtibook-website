const dashboardRepo = require('../repositories/dashboard.repository');

class DashboardService {
  async getStats(orgId) {
    const [basic, totalDonors, breakdown, daily, monthly] = await Promise.all([
      dashboardRepo.getBasicStats(orgId),
      dashboardRepo.getDonorsCount(orgId),
      dashboardRepo.getBreakdown(orgId),
      dashboardRepo.getDailyChart(orgId),
      dashboardRepo.getMonthlyChart(orgId),
    ]);

    return {
      cards: {
        todayCollection: basic.today,
        monthlyCollection: basic.month,
        yearlyCollection: basic.year,
        totalCollection: basic.total,
        totalReceipts: basic.count,
        totalDonors,
      },
      breakdown: {
        cashCollection: breakdown.cash,
        upiCollection: breakdown.upi,
        pendingCollection: breakdown.pending,
      },
      charts: {
        daily,
        monthly,
      },
    };
  }

  async getCollectorPerformance(orgId) {
    return await dashboardRepo.getCollectorStats(orgId);
  }
}

module.exports = new DashboardService();
