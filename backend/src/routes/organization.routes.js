const express = require('express');
const router = express.Router();
const orgController = require('../controllers/organization.controller');
const { authenticateToken, enforceTenant, requireRole } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(enforceTenant);

router.get('/profile', (req, res) => orgController.getProfile(req, res));
router.put('/profile', requireRole(['org_admin']), (req, res) => orgController.updateProfile(req, res));
router.post('/verification', requireRole(['org_admin']), (req, res) => orgController.submitVerification(req, res));
router.get('/verification/status', (req, res) => orgController.getVerificationStatus(req, res));

module.exports = router;
