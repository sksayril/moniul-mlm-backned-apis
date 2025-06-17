const User = require('../models/user.model');
const crypto = require('crypto');
const mlmController = require('./mlm.controller');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
      error: err.message
    });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user',
      error: err.message
    });
  }
};

// Get all pending subscription requests
exports.getPendingSubscriptions = async (req, res) => {
  try {
    // Find users with pending payment details
    const users = await User.find({
      'paymentDetails.status': 'pending'
    }).select('name email paymentDetails subscription');
    
    // Format the response
    const pendingRequests = [];
    
    users.forEach(user => {
      const pendingPayments = user.paymentDetails.filter(payment => payment.status === 'pending');
      
      pendingPayments.forEach(payment => {
        pendingRequests.push({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          paymentId: payment.paymentId,
          paymentDetails: payment,
          screenshotPath: payment.screenshot, // Explicitly include the screenshot path
          screenshotUrl: payment.screenshotUrl, // Include the full URL to the screenshot
          subscriptionPlan: user.subscription.plan
        });
      });
    });
    
    res.status(200).json({
      status: 'success',
      results: pendingRequests.length,
      data: { pendingRequests }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending subscription requests',
      error: err.message
    });
  }
};

// Approve subscription
exports.approveSubscription = async (req, res) => {
  try {
    const { userId, paymentId } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the payment
    const paymentIndex = user.paymentDetails.findIndex(
      payment => payment.paymentId === paymentId && payment.status === 'pending'
    );
    
    if (paymentIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Pending payment not found'
      });
    }
    
    // Update payment status
    user.paymentDetails[paymentIndex].status = 'verified';
    
    // Activate subscription
    user.subscription.active = true;
    
    // Set expiry date (1 year from now by default)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    user.subscription.expiryDate = expiryDate;
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Subscription approved successfully',
      data: {
        subscription: user.subscription,
        payment: user.paymentDetails[paymentIndex]
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error approving subscription',
      error: err.message
    });
  }
};

// Reject subscription
exports.rejectSubscription = async (req, res) => {
  try {
    const { userId, paymentId, reason } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the payment
    const paymentIndex = user.paymentDetails.findIndex(
      payment => payment.paymentId === paymentId && payment.status === 'pending'
    );
    
    if (paymentIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Pending payment not found'
      });
    }
    
    // Update payment status
    user.paymentDetails[paymentIndex].status = 'rejected';
    user.paymentDetails[paymentIndex].rejectionReason = reason || 'Payment rejected by admin';
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Subscription rejected successfully',
      data: {
        payment: user.paymentDetails[paymentIndex]
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting subscription',
      error: err.message
    });
  }
};

// Get all pending TPIN requests
exports.getPendingTpinRequests = async (req, res) => {
  try {
    // Find users with pending TPIN requests
    const users = await User.find({
      'tpin.requestDate': { $ne: null },
      'tpin.active': false,
      'subscription.active': true
    }).select('name email tpin subscription');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { pendingRequests: users }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending TPIN requests',
      error: err.message
    });
  }
};

// Approve TPIN request
exports.approveTpinRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has an active subscription
    if (!user.subscription.active) {
      return res.status(400).json({
        status: 'error',
        message: 'User does not have an active subscription'
      });
    }
    
    // Check if TPIN request exists
    if (!user.tpin.requestDate) {
      return res.status(400).json({
        status: 'error',
        message: 'No TPIN request found for this user'
      });
    }
    
    // Generate a 6-digit TPIN
    const tpin = crypto.randomInt(100000, 999999).toString();
    
    // Update user with new TPIN
    user.tpin.value = tpin;
    user.tpin.active = true;
    
    await user.save();
    
    // Process MLM matrix income if user already has a referrer
    // This will distribute income to upline if user joined via signup with referral code
    if (user.referrer) {
      await mlmController.processMatrixIncomeOnTpinActivation(user._id);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'TPIN generated and assigned successfully',
      data: {
        tpin: user.tpin
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error approving TPIN request',
      error: err.message
    });
  }
};

// Reject TPIN request
exports.rejectTpinRequest = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if TPIN request exists
    if (!user.tpin.requestDate) {
      return res.status(400).json({
        status: 'error',
        message: 'No TPIN request found for this user'
      });
    }
    
    // Reset TPIN request
    user.tpin.requestDate = null;
    user.tpin.rejectionReason = reason || 'TPIN request rejected by admin';
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'TPIN request rejected successfully'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting TPIN request',
      error: err.message
    });
  }
};
