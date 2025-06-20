const express = require('express');
const router = express.Router();
const adminInvestmentController = require('../controllers/admin.investment.controller');
const investmentScheduler = require('../services/investment.scheduler');
const { protect, restrictTo } = require('../middleware/auth');

// Admin Investment Management Routes

// Get all pending investment wallet recharge requests
router.get('/recharges/pending', protect, restrictTo('admin'), adminInvestmentController.getPendingRecharges);

// Get all approved investment wallet recharge requests
router.get('/recharges/approved', protect, restrictTo('admin'), adminInvestmentController.getApprovedRecharges);

// Get all rejected investment wallet recharge requests
router.get('/recharges/rejected', protect, restrictTo('admin'), adminInvestmentController.getRejectedRecharges);

// Get all recharge requests (pending/approved/rejected)
router.get('/recharges', protect, restrictTo('admin'), adminInvestmentController.getPendingRecharges);

// Approve investment wallet recharge
router.post('/recharges/:userId/:paymentId/approve', protect, restrictTo('admin'), adminInvestmentController.approveRecharge);

// Reject investment wallet recharge
router.post('/recharges/:userId/:paymentId/reject', protect, restrictTo('admin'), adminInvestmentController.rejectRecharge);

// Get investment statistics and overview
router.get('/stats', protect, restrictTo('admin'), adminInvestmentController.getInvestmentStats);

// Get all investments (active and matured)
router.get('/investments', protect, restrictTo('admin'), adminInvestmentController.getAllInvestments);

// Manual trigger for investment processing (for testing)
router.post('/process-returns', protect, restrictTo('admin'), async (req, res) => {
  try {
    const result = await investmentScheduler.manualProcessInvestments();
    res.status(200).json({
      status: 'success',
      message: 'Investment processing completed',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error processing investments',
      error: err.message
    });
  }
});

// Get investment processing statistics
router.get('/processing-stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const stats = await investmentScheduler.getProcessingStats();
    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching processing stats',
      error: err.message
    });
  }
});

module.exports = router; 