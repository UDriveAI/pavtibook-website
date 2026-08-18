const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const orgRoutes = require('./organization.routes');
const donorRoutes = require('./donor.routes');
const templateRoutes = require('./template.routes');
const receiptRoutes = require('./receipt.routes');
const dashboardRoutes = require('./dashboard.routes');
const paymentRoutes = require('./payment.routes');
const publicRoutes = require('./public.routes');

// MVP LOCK — Active Routes (Version 1.0)
router.use('/auth', authRoutes);
router.use('/organizations', orgRoutes);
router.use('/donors', donorRoutes);
router.use('/templates', templateRoutes);   // GET-only in MVP (single default template)
router.use('/receipts', receiptRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/payments', paymentRoutes);
router.use('/public', publicRoutes);
router.use('/internal', require('./internal.routes'));

// DEFERRED — Version 2
// router.use('/collectors', collectorRoutes);   // Collector Management → V2
// router.use('/events', eventRoutes);           // Event Management → V2
// router.use('/expenses', expenseRoutes);       // Expense Tracking → V3
// router.use('/accounts', accountRoutes);       // Chart of Accounts → V3
// router.use('/ledger', ledgerRoutes);          // General Ledger → V3

module.exports = router;
