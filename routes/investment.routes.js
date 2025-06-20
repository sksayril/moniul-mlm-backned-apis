const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investment.controller');
const { protect } = require('../middleware/auth');

// User Investment Wallet Routes

// Recharge investment wallet with payment screenshot
router.post('/recharge', protect, investmentController.rechargeInvestmentWallet);

// Create new investment (invest 5999 from wallet)
router.post('/create', protect, investmentController.createInvestment);

// Get investment wallet details
router.get('/wallet', protect, investmentController.getInvestmentWallet);

// Get investment history
router.get('/history', protect, investmentController.getInvestmentHistory);

module.exports = router; 