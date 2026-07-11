const express = require('express');
const router = express.Router();
const collectorController = require('../controllers/collector.controller');
const { authenticateToken, enforceTenant, requireRole } = require('../middlewares/auth');

// MVP LOCK: Collector Management removed from MVP scope.
// POST /collectors (create) is disabled — deferred to Version 2.
// Subscription guard removed — no billing in MVP.

router.use(authenticateToken);
router.use(enforceTenant);
router.use(requireRole(['org_admin']));

router.get('/', (req, res) => collectorController.getCollectors(req, res));
// POST / — DEFERRED: Version 2 (Collector Management)
router.put('/:id', (req, res) => collectorController.toggleStatus(req, res));

module.exports = router;
