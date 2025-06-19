const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// JWT secret from environment variable or default
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-in-env-file';

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check if auth token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user with the id in the token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists'
      });
    }
    
    // Add user to request object
    req.user = user;
    // Set userId to the MongoDB _id for convenience
    req.user.userId = user._id;
    next();
  } catch (err) {
    // Provide more specific error messages for debugging
    let message = 'Not authorized to access this route';
    
    if (err.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
    } else if (err.name === 'TokenExpiredError') {
      message = 'Token has expired. Please login again';
    } else if (err.name === 'NotBeforeError') {
      message = 'Token not active yet';
    }
    
    return res.status(401).json({
      status: 'error',
      message: message,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Middleware to restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
};

// Middleware to check if user account is active
exports.requireActiveAccount = (req, res, next) => {
  if (!req.user.isActive) {
    return res.status(403).json({
      status: 'error',
      message: 'This action requires an active account. Please activate your account using a TPIN.'
    });
  }
  
  next();
};

// Middleware to check if user has at least one available TPIN and mark one as used
exports.requireAvailableTPIN = async (req, res, next) => {
  try {
    // Check if user has any approved and unused TPINs
    const availableTpinIndex = req.user.tpins.findIndex(tpin => 
      tpin.status === 'approved' && !tpin.isUsed
    );

    if (availableTpinIndex === -1) {
      return res.status(403).json({
        status: 'error',
        message: 'This action requires at least one available TPIN. Please purchase a TPIN first.'
      });
    }
    
    // Mark the TPIN as used
    req.user.tpins[availableTpinIndex].isUsed = true;
    req.user.tpins[availableTpinIndex].usedAt = Date.now();
    
    // Save the updated user document
    await req.user.save();
    
    // Add the used TPIN to the request for reference
    req.usedTpin = req.user.tpins[availableTpinIndex];
    
    next();
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Error processing TPIN usage',
      error: err.message
    });
  }
};

// Middleware to check if user has sufficient balance for withdrawal
exports.requireSufficientBalance = (req, res, next) => {
  // Get amount from request body
  const { amount } = req.body;
  
  // Check if amount is provided
  if (!amount) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide withdrawal amount'
    });
  }
  
  // Minimum withdrawal is ₹150
  if (amount < 150) {
    return res.status(400).json({
      status: 'error',
      message: 'Minimum withdrawal amount is ₹150'
    });
  }
  
  // Check if user has enough balance
  if (req.user.incomeWallet.balance < amount) {
    return res.status(400).json({
      status: 'error',
      message: 'Insufficient balance for withdrawal'
    });
  }
  
  next();
};
