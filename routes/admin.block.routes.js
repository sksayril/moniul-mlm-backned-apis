const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const adminBlockController = require('../controllers/admin.block.controller');

// Protect all routes - require authentication
router.use(protect);

// Restrict all routes to admin only
router.use(restrictTo('admin'));

// Block/Unblock user routes
router.post('/block/:userId', adminBlockController.blockUser);
router.post('/unblock/:userId', adminBlockController.unblockUser);

// Get blocked users list
router.get('/blocked-users', adminBlockController.getBlockedUsers);

// Get user block status
router.get('/user/:userId/status', adminBlockController.getUserBlockStatus);

// Get blocking statistics
router.get('/stats', adminBlockController.getBlockingStats);

module.exports = router; 