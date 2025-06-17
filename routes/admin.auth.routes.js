const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/admin.auth.controller');
const { protect } = require('../middleware/auth');

// Admin auth routes - registration doesn't need token auth
router.post('/register', adminAuthController.registerAdmin);

// Admin login route
router.post('/login', adminAuthController.loginAdmin);

module.exports = router;
