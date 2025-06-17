const express = require('express');
const router = express.Router();
const mlmAdminController = require('../controllers/mlm.admin.controller');
const { protect, restrictTo } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Trading package routes
router.get('/trading/pending', mlmAdminController.getPendingTradingPackages);
router.post('/trading/approve', mlmAdminController.approveTradingPackage);
router.post('/trading/reject', mlmAdminController.rejectTradingPackage);

// Withdrawal routes
router.get('/withdrawal/pending', mlmAdminController.getPendingWithdrawals);
router.post('/withdrawal/approve', mlmAdminController.approveWithdrawal);
router.post('/withdrawal/reject', mlmAdminController.rejectWithdrawal);

// MLM metrics for admin dashboard
router.get('/metrics', mlmAdminController.getMlmMetrics);

module.exports = router;
