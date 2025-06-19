const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Protect all admin routes
router.use(protect);
router.use(restrictTo('admin'));

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUser);
router.get('/users-with-passwords', adminController.getAllUsersWithPasswords);
router.get('/users-with-password/:id', adminController.getUserWithPassword);

// Subscription management routes
router.get('/subscriptions/pending', adminController.getPendingSubscriptions);
router.post('/subscriptions/approve', adminController.approveSubscription);
router.post('/subscriptions/reject', adminController.rejectSubscription);

// TPIN management routes
router.get('/tpin/pending', adminController.getPendingTpinRequests);
router.post('/tpin/approve', adminController.approveTpinRequest);
router.post('/tpin/reject', adminController.rejectTpinRequest);
router.get('/tpins', adminController.getAllTpins);
router.get('/tpins/approved', adminController.getApprovedTpins);
router.get('/tpins/rejected', adminController.getRejectedTpins);
router.get('/tpins/used', adminController.getUsedTpins);
router.get('/tpins/statistics', adminController.getTpinStatistics);
router.get('/users/:userId/tpins', adminController.getUserTpinHistory);

// Payment management routes
router.get('/payments', adminController.getAllPayments);
router.get('/payments/approved', adminController.getApprovedPayments);
router.get('/payments/pending', adminController.getPendingPayments);
router.get('/payments/rejected', adminController.getRejectedPayments);
router.get('/payments/statistics', adminController.getPaymentStatistics);
router.get('/payments/:id', adminController.getPaymentById);
router.get('/users/:userId/payments', adminController.getUserPayments);
router.post('/payments/approve', adminController.approvePayment);
router.post('/payments/reject', adminController.rejectPayment);

// MLM Tree Structure routes
router.get('/mlm/tree/structure', adminController.getMLMTreeStructure);
router.get('/mlm/tree/simple', adminController.getSimpleMLMTreeStructure);
router.get('/mlm/tree/debug', adminController.getMLMDebugInfo);
router.get('/mlm/tree/user/:userId', adminController.getUserDownlineTree);
router.get('/mlm/genealogy/:userId', adminController.getUserGenealogy);
router.get('/mlm/levels', adminController.getMLMLevelBreakdown);

// Withdrawal Management Routes
router.get('/withdrawals', adminController.getAllWithdrawals);
router.get('/withdrawals/statistics', adminController.getWithdrawalStatistics);
router.get('/withdrawals/:status', adminController.getWithdrawalsByStatus);
router.get('/users/:userId/withdrawals', adminController.getUserWithdrawals);
router.post('/withdrawals/approve', adminController.approveWithdrawal);
router.post('/withdrawals/reject', adminController.rejectWithdrawal);

// MLM Overview and Analytics Routes
router.get('/mlm/overview', adminController.getMLMOverview);
router.get('/mlm/top-performers', adminController.getTopPerformers);

module.exports = router;
