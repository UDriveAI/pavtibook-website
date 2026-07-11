const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const { verifyLimiter } = require('../middlewares/rateLimiter');

// Receipt Verification (Active)
router.get('/verify/:qr_code_value', verifyLimiter, (req, res) => publicController.verifyReceipt(req, res));

// --- FUTURE PUBLIC DONATION RESERVATIONS ---

// 1. Fetch organization public profile and page settings
// router.get('/organizations/:slug', (req, res) => publicController.getPublicProfile(req, res));

// 2. Initiate online donation payment session
// router.post('/organizations/:slug/donate', (req, res) => publicController.initiatePublicDonation(req, res));

// 3. Payment gateway callback/webhook
// router.post('/payments/webhook', (req, res) => publicController.handlePaymentWebhook(req, res));

// 4. Download receipt PDF for visitors
// router.get('/receipts/:receipt_id/download', (req, res) => publicController.downloadPublicReceipt(req, res));

module.exports = router;
