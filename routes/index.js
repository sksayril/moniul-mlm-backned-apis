const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/* GET home page - API status and info */
router.get('/', function(req, res) {
  res.json({
    status: 'success',
    message: 'API is running',
    api_version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      subscription: '/api/subscription',
      admin: '/api/admin'
    }
  });
});

/* System status check - for health monitoring */
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'System is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime() + ' seconds'
  });
});

/* Protected endpoint example */
router.get('/protected', protect, (req, res) => {
  res.json({
    status: 'success',
    message: 'You have access to this protected route',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    }
  });
});

module.exports = router;
