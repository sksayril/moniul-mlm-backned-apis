const express = require('express');
const router = express.Router();
const mlmController = require('../controllers/mlm.controller');
const { protect, requireActiveSubscription, requireActiveTpin } = require('../middleware/auth');

// All MLM routes require authentication
router.use(protect);

// Generate referral code - requires active subscription and TPIN
router.post('/referral/generate', requireActiveSubscription, requireActiveTpin, mlmController.generateReferralCode);

// Join using someone's referral code - requires active subscription and TPIN
router.post('/referral/join', requireActiveSubscription, requireActiveTpin, mlmController.joinWithReferral);

// Get referral dashboard
router.get('/dashboard', mlmController.getReferralDashboard);

// Trading package routes - requires active subscription and TPIN
router.post('/trading/purchase', requireActiveSubscription, requireActiveTpin, mlmController.purchaseTradingPackage);

// Withdrawal routes - requires active subscription and TPIN
router.post('/withdrawal/request', requireActiveSubscription, requireActiveTpin, mlmController.requestWithdrawal);
router.get('/withdrawal/history', mlmController.getWithdrawalHistory);

module.exports = router;
