const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donor.controller');
const { authenticateToken, enforceTenant } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(enforceTenant);

router.get('/', (req, res) => donorController.getDonors(req, res));
router.get('/lookup', (req, res) => donorController.lookupByMobile(req, res)); // Must be before /:id
router.get('/:id', (req, res) => donorController.getDonorById(req, res));
router.post('/', (req, res) => donorController.createDonor(req, res));
router.put('/:id', (req, res) => donorController.updateDonor(req, res));

module.exports = router;
