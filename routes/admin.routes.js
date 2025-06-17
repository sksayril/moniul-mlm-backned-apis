const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Protect all admin routes
router.use(protect);
router.use(restrictTo('admin'));

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUser);

// Subscription management routes
router.get('/subscriptions/pending', adminController.getPendingSubscriptions);
router.post('/subscriptions/approve', adminController.approveSubscription);
router.post('/subscriptions/reject', adminController.rejectSubscription);

// TPIN management routes
router.get('/tpin/pending', adminController.getPendingTpinRequests);
router.post('/tpin/approve', adminController.approveTpinRequest);
router.post('/tpin/reject', adminController.rejectTpinRequest);

module.exports = router;
