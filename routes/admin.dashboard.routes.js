const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/admin.dashboard.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Ensure all routes are protected and require admin privileges
router.use(protect);
router.use(restrictTo('admin'));

// GET dashboard statistics
router.get('/stats', adminDashboardController.getDashboardStats);

module.exports = router;
