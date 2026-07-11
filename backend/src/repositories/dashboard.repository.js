const db = require('../config/db');

class DashboardRepository {
  async getBasicStats(orgId) {
    const todayQuery = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM receipts 
      WHERE organization_id = $1 AND payment_status = 'paid' AND created_at >= CURRENT_DATE AND deleted_at IS NULL
    `;
    const monthQuery = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM receipts 
      WHERE organization_id = $1 AND payment_status = 'paid' AND created_at >= date_trunc('month', CURRENT_DATE) AND deleted_at IS NULL
    `;
    const yearQuery = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM receipts 
      WHERE organization_id = $1 AND payment_status = 'paid' AND created_at >= date_trunc('year', CURRENT_DATE) AND deleted_at IS NULL
    `;
    const totalQuery = `
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(id) as count 
      FROM receipts 
      WHERE organization_id = $1 AND payment_status = 'paid' AND deleted_at IS NULL
    `;

    const [todayRes, monthRes, yearRes, totalRes] = await Promise.all([
      db.query(todayQuery, [orgId]),
      db.query(monthQuery, [orgId]),
      db.query(yearQuery, [orgId]),
      db.query(totalQuery, [orgId]),
    ]);

    return {
      today: parseFloat(todayRes.rows[0].total),
      month: parseFloat(monthRes.rows[0].total),
      year: parseFloat(yearRes.rows[0].total),
      total: parseFloat(totalRes.rows[0].total),
      count: parseInt(totalRes.rows[0].count),
    };
  }

  async getDonorsCount(orgId) {
    const query = `
      SELECT COUNT(DISTINCT donor_id) as total_donors 
      FROM receipts 
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;
    const res = await db.query(query, [orgId]);
    return parseInt(res.rows[0].total_donors);
  }

  async getBreakdown(orgId) {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' AND payment_status = 'paid' THEN amount ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi' AND payment_status = 'paid' THEN amount ELSE 0 END), 0) as upi,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as pending
      FROM receipts
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;
    const res = await db.query(query, [orgId]);
    const row = res.rows[0];
    return {
      cash: parseFloat(row.cash),
      upi: parseFloat(row.upi),
      pending: parseFloat(row.pending),
    };
  }

  async getDailyChart(orgId) {
    const query = `
      SELECT 
        TO_CHAR(d.day, 'DD Mon') as label,
        COALESCE(SUM(r.amount), 0) as value
      FROM (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) as day
      ) d
      LEFT JOIN receipts r ON r.organization_id = $1 
                           AND r.payment_status = 'paid' 
                           AND r.deleted_at IS NULL
                           AND date_trunc('day', r.created_at) = d.day
      GROUP BY d.day
      ORDER BY d.day ASC
    `;
    const res = await db.query(query, [orgId]);
    return res.rows;
  }

  async getMonthlyChart(orgId) {
    const query = `
      SELECT 
        TO_CHAR(m.month, 'Mon YY') as label,
        COALESCE(SUM(r.amount), 0) as value
      FROM (
        SELECT generate_series(date_trunc('month', CURRENT_DATE - INTERVAL '5 months'), date_trunc('month', CURRENT_DATE), '1 month'::interval) as month
      ) m
      LEFT JOIN receipts r ON r.organization_id = $1 
                           AND r.payment_status = 'paid' 
                           AND r.deleted_at IS NULL
                           AND date_trunc('month', r.created_at) = m.month
      GROUP BY m.month
      ORDER BY m.month ASC
    `;
    const res = await db.query(query, [orgId]);
    return res.rows;
  }

  async getCollectorStats(orgId) {
    const query = `
      SELECT 
        u.id as collector_id,
        u.name as collector_name,
        c.prefix_code,
        c.target_amount,
        COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.amount ELSE 0 END), 0) as total_collected,
        COUNT(r.id) as receipt_count,
        CASE 
          WHEN c.target_amount > 0 THEN 
            ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.amount ELSE 0 END), 0) / c.target_amount) * 100, 2)
          ELSE 0 
        END as target_achievement_percentage
      FROM collectors c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN receipts r ON r.collector_id = u.id AND r.deleted_at IS NULL
      WHERE c.organization_id = $1 AND c.deleted_at IS NULL AND u.deleted_at IS NULL
      GROUP BY u.id, u.name, c.prefix_code, c.target_amount
      ORDER BY total_collected DESC
    `;
    const res = await db.query(query, [orgId]);
    return res.rows.map(row => ({
      collectorId: row.collector_id,
      collectorName: row.collector_name,
      prefixCode: row.prefix_code,
      targetAmount: parseFloat(row.target_amount),
      totalCollected: parseFloat(row.total_collected),
      receiptCount: parseInt(row.receipt_count),
      targetAchievementPercentage: parseFloat(row.target_achievement_percentage)
    }));
  }
}

module.exports = new DashboardRepository();
