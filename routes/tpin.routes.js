const express = require('express');
const router = express.Router();
const tpinController = require('../controllers/subscription.controller'); // Keep the existing controller path for now
const { protect } = require('../middleware/auth');

// TPIN routes
router.post('/purchase', protect, tpinController.requestTPINs);
router.get('/status', protect, tpinController.getTpinStatus);
router.get('/payments', protect, tpinController.getPaymentStatus);
router.post('/transfer', protect, tpinController.transferTpin);

module.exports = router;
