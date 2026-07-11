const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, enforceTenant } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(enforceTenant);

router.put('/:receipt_id/complete', (req, res) => paymentController.reconcile(req, res));
router.put('/:receipt_id/cancel', (req, res) => paymentController.cancel(req, res));

module.exports = router;
