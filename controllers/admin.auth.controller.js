const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
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
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create admin user
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
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
    const { email, password } = req.body;
    
    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }
    
    // Check if user exists & is an admin & password is correct
    const admin = await User.findOne({ email, role: 'admin' }).select('+password');
    
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password, or not an admin account'
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
