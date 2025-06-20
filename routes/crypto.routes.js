const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const cryptoController = require('../controllers/crypto.controller');

// Protected routes - require authentication
router.use(protect);

// User routes for crypto wallet
router.get('/wallet', cryptoController.getCryptoWallet);
router.get('/transactions', cryptoController.getCryptoTransactions);
router.post('/purchase', cryptoController.requestPurchase);
router.post('/sell', cryptoController.requestSell);
router.get('/requests', cryptoController.getMyCryptoRequests);

// Admin routes - restricted to admin role
router.get('/stats', restrictTo('admin'), cryptoController.getCryptoStats);

module.exports = router; 