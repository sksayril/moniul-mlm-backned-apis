const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const adminCryptoController = require('../controllers/admin.crypto.controller');

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Get crypto requests by status
router.get('/requests/pending', adminCryptoController.getPendingRequests);
router.get('/requests/approved', adminCryptoController.getApprovedRequests);
router.get('/requests/rejected', adminCryptoController.getRejectedRequests);

// Approve or reject crypto requests
router.patch('/requests/:userId/:requestId/approve', adminCryptoController.approveRequest);
router.patch('/requests/:userId/:requestId/reject', adminCryptoController.rejectRequest);

module.exports = router; 