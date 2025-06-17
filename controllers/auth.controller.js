const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Register a new user
exports.signup = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists'
      });
    }
    
    // Check referral code if provided
    let referrerId = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid referral code'
        });
      }
      referrerId = referrer._id;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user with optional referral
    const userData = {
      name,
      email,
      password: hashedPassword
    };
    
    // Add referrer if referral code was provided
    if (referrerId) {
      userData.referrer = referrerId;
    }
    
    const user = await User.create(userData);
    
    // If user was referred, update referrer's referrals array
    if (referrerId) {
      await User.findByIdAndUpdate(referrerId, {
        $push: { referrals: user._id },
        $inc: { teamSize: 1 }
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(201).json({
      status: 'success',
      token,
      data: { user }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating user',
      error: err.message
    });
  }
};

// Login user
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }
    
    // Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      token,
      data: { user }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error logging in',
      error: err.message
    });
  }
};

// Get current user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
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
};

// Update user profile
exports.updateMe = async (req, res) => {
  try {
    // Don't allow password updates here
    if (req.body.password) {
      return res.status(400).json({
        status: 'error',
        message: 'This route is not for password updates. Please use /updatePassword'
      });
    }
    
    // Filter out fields that shouldn't be updated
    const filteredBody = {};
    const allowedFields = ['name'];
    
    Object.keys(req.body).forEach(field => {
      if (allowedFields.includes(field)) {
        filteredBody[field] = req.body[field];
      }
    });
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating user profile',
      error: err.message
    });
  }
};
