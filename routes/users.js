const express = require('express');
const router = express.Router();
const { protect, requireActiveSubscription, requireActiveTpin } = require('../middleware/auth');
const User = require('../models/user.model');

// Protect all routes in this router
router.use(protect);

/* GET current user profile */
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    res.json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile',
      error: err.message
    });
  }
});

/* GET subscription status */
router.get('/subscription', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('subscription paymentDetails');
    
    res.json({
      status: 'success',
      data: {
        subscription: user.subscription,
        payments: user.paymentDetails
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching subscription info',
      error: err.message
    });
  }
});

/* GET TPIN status */
router.get('/tpin', requireActiveSubscription, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('tpin');
    
    res.json({
      status: 'success',
      data: {
        tpin: {
          active: user.tpin.active,
          requestDate: user.tpin.requestDate,
          // Only send TPIN value if it's active
          value: user.tpin.active ? user.tpin.value : undefined
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching TPIN info',
      error: err.message
    });
  }
});

/* Access premium content - requires active TPIN */
router.get('/premium-content', requireActiveSubscription, requireActiveTpin, (req, res) => {
  res.json({
    status: 'success',
    message: 'You have successfully accessed premium content',
    data: {
      content: 'This is exclusive premium content only available to users with active subscriptions and TPINs'
    }
  });
});

module.exports = router;
