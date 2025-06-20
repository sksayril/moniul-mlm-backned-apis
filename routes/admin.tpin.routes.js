const express = require('express');
const router = express.Router();
const adminTpinController = require('../controllers/admin.tpin.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Admin TPIN Management Routes

// Generate TPIN for a user without payment
router.post('/generate', protect, restrictTo('admin'), adminTpinController.generateTpinForUser);

// Transfer TPIN from one user to another
router.post('/transfer', protect, restrictTo('admin'), adminTpinController.transferTpinBetweenUsers);

// Bulk generate TPINs for multiple users
router.post('/bulk-generate', protect, restrictTo('admin'), adminTpinController.bulkGenerateTpins);

// Get user's TPIN details
router.get('/user/:userId', protect, restrictTo('admin'), adminTpinController.getUserTpinDetails);

// Get TPIN transfer history (audit trail)
router.get('/transfer-history', protect, restrictTo('admin'), adminTpinController.getTpinTransferHistory);

module.exports = router; 