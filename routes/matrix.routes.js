const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUserMatrixStatus, getMatrixIncomeHistory } = require('../controllers/matrix.controller');

// Protect all routes
router.use(protect);

// Get user's matrix status
router.get('/status', getUserMatrixStatus);

// Get matrix income history
router.get('/history', getMatrixIncomeHistory);

module.exports = router; 