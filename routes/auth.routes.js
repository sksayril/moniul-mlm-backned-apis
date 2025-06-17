const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

// Auth routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/me', protect, authController.getMe);
router.post('/updateMe', protect, authController.updateMe);

module.exports = router;
