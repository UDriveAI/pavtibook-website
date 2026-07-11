const receiptService = require('../services/receipt.service');

class ReceiptController {
  async getReceipts(req, res) {
    try {
      const { search, payment_mode, payment_status, collector_id, limit, offset } = req.query;
      const receipts = await receiptService.getReceipts(req.organization_id, {
        search,
        payment_mode,
        payment_status,
        collector_id,
        limit,
        offset,
      });
      res.json(receipts);
    } catch (error) {
      console.error('Fetch receipts error:', error);
      res.status(500).json({ message: error.message || 'Server error fetching receipts.' });
    }
  }

  async getReceiptById(req, res) {
    try {
      const { id } = req.params;
      const receipt = await receiptService.getReceiptById(id, req.organization_id);
      res.json(receipt);
    } catch (error) {
      console.error('Fetch receipt detail error:', error);
      res.status(404).json({ message: error.message || 'Receipt not found.' });
    }
  }

  async createReceipt(req, res) {
    try {
      const result = await receiptService.createReceipt(req.organization_id, req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Receipt creation failed:', error);
      res.status(400).json({ message: error.message || 'Server error during receipt generation.' });
    }
  }

  async downloadPdf(req, res) {
    try {
      const { id } = req.params;
      const pdfBuffer = await receiptService.getReceiptPdf(id, req.organization_id);
      
      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="receipt_${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Generate PDF route error:', error);
      res.status(500).json({ message: error.message || 'Server error generating PDF receipt.' });
    }
  }

  async deliverReceipt(req, res) {
    try {
      const { id } = req.params;
      const { channel, recipientAddress, status, shareMethod } = req.body;
      if (!channel || !recipientAddress) {
        return res.status(400).json({ message: 'Sharing channel and recipient details are required.' });
      }

      await receiptService.deliverReceipt(
        id, 
        req.organization_id, 
        channel, 
        recipientAddress, 
        req.user.id, 
        shareMethod, 
        status
      );
      res.json({ message: `Receipt successfully delivered via ${channel}.` });
    } catch (error) {
      console.error('Receipt delivery logging error:', error);
      res.status(500).json({ message: error.message || 'Server error logging delivery.' });
    }
  }
}

module.exports = new ReceiptController();
