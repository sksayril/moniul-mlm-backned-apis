const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

// Auth routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/me', protect, authController.getMe);
router.post('/updateMe', protect, authController.updateMe);
router.get('/tpin-status', protect, authController.checkTPINStatus);
router.post('/activate', protect, authController.activateAccount);

// Account settings routes
router.get('/account', protect, authController.getAccountProfile);
router.get('/users/:userId', protect, authController.getUserProfileById);
router.put('/account/profile', protect, authController.updateAccountProfile);
router.put('/account/payment-methods', protect, authController.updatePaymentMethods);
router.put('/account/change-password', protect, authController.changePassword);

module.exports = router;
