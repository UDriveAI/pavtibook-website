const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken, enforceTenant } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(enforceTenant);

router.get('/stats', (req, res) => dashboardController.getStats(req, res));
router.get('/collectors', (req, res) => dashboardController.getCollectorStats(req, res));

module.exports = router;
