const User = require('../models/user.model');
const path = require('path');
const fs = require('fs');

// Request subscription - upload payment screenshot and payment ID
exports.requestSubscription = async (req, res) => {
  try {
    const { paymentId, amount, currency, plan } = req.body;
    
    // Validate input
    if (!paymentId || !amount || !currency || !plan) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide payment ID, amount, currency, and subscription plan'
      });
    }
    
    // Check if screenshot was uploaded
    if (!req.files || !req.files.screenshot) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload payment screenshot'
      });
    }
    
    const screenshot = req.files.screenshot;
    const timestamp = Date.now();
    const fileName = `${req.user.id}-${timestamp}-${screenshot.name}`;
    const uploadPath = path.join(__dirname, '../public/uploads/payments', fileName);
    
    // Create directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../public/uploads/payments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Save the screenshot
    screenshot.mv(uploadPath, async (err) => {
      if (err) {
        return res.status(500).json({
          status: 'error',
          message: 'Error uploading payment screenshot',
          error: err.message
        });
      }
      
      // Save payment details to user
      const user = await User.findById(req.user.id);
      
      // Create URL path for the screenshot
      const relativePath = `/uploads/payments/${fileName}`;
      
      user.paymentDetails.push({
        paymentId,
        amount,
        currency,
        screenshot: relativePath, // Store properly formatted relative path
        screenshotUrl: `${req.protocol}://${req.get('host')}${relativePath}`, // Store full URL
        date: Date.now()
      });
      
      // Save selected plan in subscription
      user.subscription.plan = plan;
      
      await user.save();
      
      res.status(200).json({
        status: 'success',
        message: 'Subscription request submitted successfully. Please wait for admin approval.',
        data: {
          paymentDetails: user.paymentDetails[user.paymentDetails.length - 1]
        }
      });
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error processing subscription request',
      error: err.message
    });
  }
};

// Request TPIN after subscription is activated
exports.requestTpin = async (req, res) => {
  try {
    // Check if subscription is active
    if (!req.user.subscription.active) {
      return res.status(400).json({
        status: 'error',
        message: 'You must have an active subscription to request a TPIN'
      });
    }
    
    // Check if TPIN request is already pending
    if (req.user.tpin.requestDate && !req.user.tpin.active) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a pending TPIN request'
      });
    }
    
    // Update user with new TPIN request
    const user = await User.findByIdAndUpdate(req.user.id, 
      { 
        'tpin.requestDate': Date.now() 
      },
      { new: true }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'TPIN request submitted successfully. Please wait for admin approval.',
      data: {
        requestDate: user.tpin.requestDate
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error processing TPIN request',
      error: err.message
    });
  }
};

// Get subscription status
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        subscription: user.subscription,
        pendingPayments: user.paymentDetails.filter(payment => payment.status === 'pending')
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching subscription status',
      error: err.message
    });
  }
};

// Get TPIN status
exports.getTpinStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        tpin: {
          active: user.tpin.active,
          requestDate: user.tpin.requestDate,
          value: user.tpin.active ? user.tpin.value : undefined
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching TPIN status',
      error: err.message
    });
  }
};
