const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { authenticateToken, enforceTenant } = require('../middlewares/auth');

// MVP LOCK: Single default template only.
// POST / (create) and PUT /:id (edit) are disabled — deferred to Version 2.
// Subscription guard removed — no billing in MVP.
// GET routes kept so the app can fetch and display the seeded default template.

router.use(authenticateToken);
router.use(enforceTenant);

router.get('/', (req, res) => templateController.getTemplates(req, res));
router.get('/:id', (req, res) => templateController.getTemplateById(req, res));
// POST /        — DEFERRED: Version 2 (Multiple Templates)
// PUT /:id      — DEFERRED: Version 2 (Template Editor)
router.put('/:id/set-default', (req, res) => templateController.setDefaultTemplate(req, res));

module.exports = router;
