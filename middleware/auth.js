const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this route'
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

// Middleware to check if user has active subscription
exports.requireActiveSubscription = (req, res, next) => {
  if (!req.user.subscription.active) {
    return res.status(403).json({
      status: 'error',
      message: 'This action requires an active subscription'
    });
  }
  
  next();
};

// Middleware to check if user has active TPIN
exports.requireActiveTpin = (req, res, next) => {
  if (!req.user.tpin.active) {
    return res.status(403).json({
      status: 'error',
      message: 'This action requires an active TPIN'
    });
  }
  
  next();
};
