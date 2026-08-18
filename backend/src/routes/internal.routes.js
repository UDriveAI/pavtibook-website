const express = require('express');
const router = express.Router();
const internalController = require('../controllers/internal.controller');

router.post('/migrate-legacy-receipts', (req, res) => internalController.migrateLegacyReceipts(req, res));

module.exports = router;
