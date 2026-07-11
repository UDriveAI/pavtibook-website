const receiptService = require('../services/receipt.service');

class PublicController {
  async verifyReceipt(req, res) {
    try {
      const { qr_code_value } = req.params;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await receiptService.verifyReceiptByQrCode(qr_code_value, ip, userAgent);
      res.json(result);
    } catch (error) {
      console.error('Public verification error:', error);
      res.status(500).json({ message: 'Server error during verification.' });
    }
  }

  // --- FUTURE RESERVATION STUBS ---

  async getPublicProfile(req, res) {
    return res.status(501).json({
      status: 501,
      message: 'Feature Reserved: Public profile pages are not yet implemented.',
      slug: req.params.slug
    });
  }

  async initiatePublicDonation(req, res) {
    return res.status(501).json({
      status: 501,
      message: 'Feature Reserved: Online donation initiation is not yet implemented.',
      slug: req.params.slug
    });
  }

  async handlePaymentWebhook(req, res) {
    return res.status(501).json({
      status: 501,
      message: 'Feature Reserved: Online payment webhook handler is not yet implemented.'
    });
  }

  async downloadPublicReceipt(req, res) {
    return res.status(501).json({
      status: 501,
      message: 'Feature Reserved: Public receipt downloads are not yet implemented.',
      receipt_id: req.params.receipt_id
    });
  }
}

module.exports = new PublicController();
