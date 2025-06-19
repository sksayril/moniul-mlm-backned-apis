const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT secret from environment variable or default
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-in-env-file';

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Register admin user (protected by admin creation token)
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, adminToken } = req.body;
    
    // Verify admin token
    if (!adminToken || adminToken !== process.env.ADMIN_CREATION_TOKEN) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid admin creation token'
      });
    }
    
    // Check if admin already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists'
      });
    }
    
    // Generate admin userId with format ADMIN + random numbers
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const userId = `ADMIN${randomNumber}`;
    
    // Check if userId already exists
    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return res.status(400).json({
        status: 'error',
        message: 'Generated userId already exists. Please try again.'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create admin user
    const admin = await User.create({
      name,
      email,
      userId,
      password: hashedPassword,
      originalPassword: password,  // ⚠️ SECURITY RISK: Storing plain text password
      role: 'admin'
    });
    
    // Generate token
    const token = generateToken(admin._id);
    
    // Remove password from output
    admin.password = undefined;
    
    res.status(201).json({
      status: 'success',
      token,
      data: { admin }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating admin user',
      error: err.message
    });
  }
};

// Login admin
exports.loginAdmin = async (req, res) => {
  try {
    const { email, userId, password } = req.body;
    
    // Check if email/userId and password exist
    if ((!email && !userId) || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email/userId and password'
      });
    }
    
    // Find admin by email or userId
    const query = {};
    if (email) {
      query.email = email;
    } else if (userId) {
      query.userId = userId;
    }
    query.role = 'admin';
    
    // Check if user exists & is an admin & password is correct
    const admin = await User.findOne(query).select('+password');
    
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect credentials or not an admin account'
      });
    }
    
    // Generate token
    const token = generateToken(admin._id);
    
    // Remove password from output
    admin.password = undefined;
    
    res.status(200).json({
      status: 'success',
      token,
      data: { admin }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error logging in',
      error: err.message
    });
  }
};
