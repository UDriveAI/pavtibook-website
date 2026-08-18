const { runMigration } = require('../../scripts/migrate_legacy_receipts');

class InternalController {
  async migrateLegacyReceipts(req, res) {
    try {
      const execute = req.body && req.body.execute === true;
      const result = await runMigration({ execute });
      return res.status(200).json({
        success: true,
        report: result
      });
    } catch (error) {
      console.error('Internal migration error:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
        error: error.stack
      });
    }
  }
}

module.exports = new InternalController();
