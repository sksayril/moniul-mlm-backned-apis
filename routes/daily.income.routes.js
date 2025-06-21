const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { triggerDailyIncome, getDailyIncomeStatsAPI } = require('../services/daily.income.scheduler');

// Protect all routes
router.use(protect);

// Admin only routes
router.use(restrictTo('admin'));

// Manual trigger for daily income processing
router.post('/trigger', triggerDailyIncome);

// Get daily income statistics
router.get('/stats', getDailyIncomeStatsAPI);

module.exports = router; 