const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receipt.controller');
const { authenticateToken, enforceTenant } = require('../middlewares/auth');
const { validate, required, email, mobile, numeric, inEnum } = require('../middlewares/validation');

const receiptRules = {
  donorName: [required()],
  donorMobile: [required(), mobile()],
  donorEmail: [email()],
  amount: [required(), numeric(0)],
  purpose: [required()],
  paymentMode: [required(), inEnum(['cash', 'upi', 'pending'])],
  // idempotencyKey is optional and bypasses validation
};

router.use(authenticateToken);
router.use(enforceTenant);

router.get('/', (req, res) => receiptController.getReceipts(req, res));
router.get('/:id', (req, res) => receiptController.getReceiptById(req, res));
router.post('/', validate(receiptRules), (req, res) => receiptController.createReceipt(req, res));
router.get('/:id/pdf', (req, res) => receiptController.downloadPdf(req, res));
router.post('/:id/deliver', (req, res) => receiptController.deliverReceipt(req, res));

module.exports = router;
