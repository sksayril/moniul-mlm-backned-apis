const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { protect, requireActiveSubscription } = require('../middleware/auth');

// Subscription routes
router.post('/request', protect, subscriptionController.requestSubscription);
router.get('/status', protect, subscriptionController.getSubscriptionStatus);

// TPIN routes
router.post('/tpin/request', protect, requireActiveSubscription, subscriptionController.requestTpin);
router.get('/tpin/status', protect, subscriptionController.getTpinStatus);

module.exports = router;
