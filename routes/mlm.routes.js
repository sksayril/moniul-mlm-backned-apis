const express = require('express');
const router = express.Router();
const mlmController = require('../controllers/mlm.controller');
const { protect, requireActiveAccount, requireAvailableTPIN, requireSufficientBalance } = require('../middleware/auth');

// All MLM routes require authentication
router.use(protect);

// Referral routes
router.get('/referral/link', mlmController.getReferralLink);
router.get('/referral/direct', mlmController.getDirectReferrals);
router.get('/referral/income', mlmController.getReferralIncome);

// Generate referral code - requires active subscription and TPIN
router.post('/referral/generate', requireActiveAccount, requireAvailableTPIN, mlmController.generateReferralCode);

// Join using someone's referral code - requires active subscription and TPIN
router.post('/referral/join', requireActiveAccount, requireAvailableTPIN, mlmController.joinWithReferral);

// Get referral dashboard
router.get('/dashboard', mlmController.getReferralDashboard);

// Trading package routes - requires active subscription and TPIN
router.post('/trading/purchase', requireActiveAccount, requireAvailableTPIN, mlmController.purchaseTradingPackage);

// Withdrawal routes - requires active account and sufficient balance
router.post('/withdrawal/request', requireActiveAccount, requireSufficientBalance, mlmController.requestWithdrawal);
router.get('/withdrawal/history', mlmController.getWithdrawalHistory);
router.get('/withdrawal/:status', mlmController.getWithdrawalsByStatus);
router.get('/withdrawal/pending/list', mlmController.getPendingWithdrawals);
router.get('/withdrawal/approved/list', mlmController.getApprovedWithdrawals);
router.get('/withdrawal/rejected/list', mlmController.getRejectedWithdrawals);

// Matrix structure and income routes
router.get('/matrix/structure', mlmController.getMatrixStructure);
router.get('/income/breakdown', mlmController.getIncomeBreakdown);

module.exports = router;
