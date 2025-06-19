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
      'tpins.status': 'pending'
    }).select('name email tpins');
    
    // Format the response
    const pendingRequests = [];
    
    users.forEach(user => {
      const pendingTpins = user.tpins.filter(tpin => tpin.status === 'pending');
      
      pendingTpins.forEach(tpin => {
        pendingRequests.push({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          tpin: tpin
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
      message: 'Error fetching pending TPIN requests',
      error: err.message
    });
  }
};

// Approve TPIN request
exports.approveTpinRequest = async (req, res) => {
  try {
    const { userId, tpinId } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the TPIN by ID or code
    let tpinIndex = user.tpins.findIndex(
      tpin => (tpin._id && tpin._id.toString() === tpinId) || tpin.code === tpinId
    );
    
    // If not found by ID or code, or not pending, return error
    if (tpinIndex === -1 || user.tpins[tpinIndex].status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'No pending TPIN found for this user'
      });
    }
    
    // Update TPIN status
    user.tpins[tpinIndex].status = 'approved';
    user.tpins[tpinIndex].activationDate = Date.now();
    
    await user.save();
    
    // Process MLM matrix income if user already has a referrer
    if (user.referrer) {
      await mlmController.processMatrixIncomeOnTpinActivation(user._id);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'TPIN approved successfully',
      data: {
        tpin: user.tpins[tpinIndex]
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
    const { userId, tpinId, reason } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the TPIN by ID or code
    let tpinIndex = user.tpins.findIndex(
      tpin => (tpin._id && tpin._id.toString() === tpinId) || tpin.code === tpinId
    );
    
    // If not found by ID or code, or not pending, return error
    if (tpinIndex === -1 || user.tpins[tpinIndex].status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'No pending TPIN found for this user'
      });
    }
    
    // Update TPIN status
    user.tpins[tpinIndex].status = 'rejected';
    user.tpins[tpinIndex].rejectionReason = reason || 'TPIN request rejected by admin';
    
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

// Get user with password (for admin use only)
exports.getUserWithPassword = async (req, res) => {
  try {
    // Explicitly select the password field
    const user = await User.findById(req.params.id).select('+password');
    
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
      message: 'Error fetching user with password',
      error: err.message
    });
  }
};

// Get all users with passwords (for admin use only)
exports.getAllUsersWithPasswords = async (req, res) => {
  try {
    // Explicitly select the password field
    const users = await User.find().select('+password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users with passwords',
      error: err.message
    });
  }
};

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    // Find all users with payment details
    const users = await User.find({
      'paymentDetails.0': { $exists: true } // Users with at least one payment
    }).select('name email userId paymentDetails');
    
    // Format the response
    const payments = [];
    
    users.forEach(user => {
      user.paymentDetails.forEach(payment => {
        payments.push({
          _id: payment._id,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userIdCode: user.userId,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          purpose: payment.purpose || 'tpin_purchase',
          status: payment.status,
          screenshot: payment.screenshot,
          screenshotUrl: payment.screenshotUrl,
          date: payment.date,
          rejectionReason: payment.rejectionReason
        });
      });
    });
    
    // Sort payments by date (most recent first)
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching payments',
      error: err.message
    });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const paymentId = req.params.id;
    
    // Find user with the specific payment ID
    const user = await User.findOne({
      'paymentDetails._id': paymentId
    }).select('name email userId paymentDetails');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }
    
    // Find the specific payment
    const payment = user.paymentDetails.find(p => p._id.toString() === paymentId);
    
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }
    
    // Format the response
    const paymentDetails = {
      _id: payment._id,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userIdCode: user.userId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      currency: payment.currency,
      purpose: payment.purpose || 'tpin_purchase',
      status: payment.status,
      screenshot: payment.screenshot,
      screenshotUrl: payment.screenshotUrl,
      date: payment.date,
      rejectionReason: payment.rejectionReason
    };
    
    res.status(200).json({
      status: 'success',
      data: { payment: paymentDetails }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching payment',
      error: err.message
    });
  }
};

// Get payments by user ID
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find the user
    const user = await User.findById(userId).select('name email userId paymentDetails');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Format the response
    const payments = user.paymentDetails.map(payment => ({
      _id: payment._id,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userIdCode: user.userId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      currency: payment.currency,
      purpose: payment.purpose || 'tpin_purchase',
      status: payment.status,
      screenshot: payment.screenshot,
      screenshotUrl: payment.screenshotUrl,
      date: payment.date,
      rejectionReason: payment.rejectionReason
    }));
    
    // Sort payments by date (most recent first)
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user payments',
      error: err.message
    });
  }
};

// Approve payment
exports.approvePayment = async (req, res) => {
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
    
    // Find the payment - try both by MongoDB ObjectId and by paymentId string
    let paymentIndex = user.paymentDetails.findIndex(
      payment => payment._id.toString() === paymentId && payment.status === 'pending'
    );
    
    // If not found by _id, try by paymentId (custom ID string)
    if (paymentIndex === -1) {
      paymentIndex = user.paymentDetails.findIndex(
        payment => payment.paymentId === paymentId && payment.status === 'pending'
      );
    }
    
    if (paymentIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Pending payment not found'
      });
    }
    
    console.log(`Found payment at index ${paymentIndex}:`, user.paymentDetails[paymentIndex]);
    
    // Update payment status
    user.paymentDetails[paymentIndex].status = 'verified';
    
    // Generate TPINs if this was a TPIN purchase
    // const purpose = user.paymentDetails[paymentIndex].purpose || 'tpin_purchase';
    // const generatedTpins = [];
    
    // if (purpose === 'tpin_purchase') {
    //   // Get requested quantity (default to 1)
    //   const requestedQuantity = user.paymentDetails[paymentIndex].quantity || 1;
    //   console.log(`Generating ${requestedQuantity} TPINs`);
      
    //   // Generate TPINs
    //   for (let i = 0; i < requestedQuantity; i++) {
    //     const tpinCode = generateTpinCode();
    //     const newTpin = {
    //       code: tpinCode,
    //       isUsed: false,
    //       purchaseDate: Date.now(),
    //       status: 'approved'
    //     };
        
    //     user.tpins.push(newTpin);
    //     generatedTpins.push(newTpin);
    //   }
    // }
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Payment approved successfully',
      data: {
        payment: user.paymentDetails[paymentIndex],
        // tpins: generatedTpins,
        // generatedCount: generatedTpins.length
      }
    });
  } catch (err) {
    console.error('Error in approvePayment:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error approving payment',
      error: err.message
    });
  }
};

// Reject payment
exports.rejectPayment = async (req, res) => {
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
      payment => payment._id.toString() === paymentId && payment.status === 'pending'
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
      message: 'Payment rejected successfully',
      data: {
        payment: user.paymentDetails[paymentIndex]
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting payment',
      error: err.message
    });
  }
};

// Helper function to generate TPIN code
const generateTpinCode = () => {
  // Generate a random 8-character alphanumeric code
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Get all approved payments
exports.getApprovedPayments = async (req, res) => {
  try {
    // Find all users with verified payment details
    const users = await User.find({
      'paymentDetails.status': 'verified'
    }).select('name email userId paymentDetails');
    
    // Format the response
    const approvedPayments = [];
    
    users.forEach(user => {
      const verifiedPayments = user.paymentDetails.filter(payment => payment.status === 'verified');
      
      verifiedPayments.forEach(payment => {
        approvedPayments.push({
          _id: payment._id,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userIdCode: user.userId,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          purpose: payment.purpose || 'tpin_purchase',
          status: payment.status,
          screenshot: payment.screenshot,
          screenshotUrl: payment.screenshotUrl,
          date: payment.date
        });
      });
    });
    
    // Sort payments by date (most recent first)
    approvedPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({
      status: 'success',
      results: approvedPayments.length,
      data: { approvedPayments }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching approved payments',
      error: err.message
    });
  }
};

// Get all pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    // Find all users with pending payment details
    const users = await User.find({
      'paymentDetails.status': 'pending'
    }).select('name email userId paymentDetails');
    
    // Format the response
    const pendingPayments = [];
    
    users.forEach(user => {
      const awaitingPayments = user.paymentDetails.filter(payment => payment.status === 'pending');
      
      awaitingPayments.forEach(payment => {
        pendingPayments.push({
          _id: payment._id,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userIdCode: user.userId,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          purpose: payment.purpose || 'tpin_purchase',
          status: payment.status,
          screenshot: payment.screenshot,
          screenshotUrl: payment.screenshotUrl,
          date: payment.date,
          quantity: payment.quantity || 1
        });
      });
    });
    
    // Sort payments by date (most recent first)
    pendingPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({
      status: 'success',
      results: pendingPayments.length,
      data: { pendingPayments }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending payments',
      error: err.message
    });
  }
};

// Get all rejected payments
exports.getRejectedPayments = async (req, res) => {
  try {
    // Find all users with rejected payment details
    const users = await User.find({
      'paymentDetails.status': 'rejected'
    }).select('name email userId paymentDetails');
    
    // Format the response
    const rejectedPayments = [];
    
    users.forEach(user => {
      const failedPayments = user.paymentDetails.filter(payment => payment.status === 'rejected');
      
      failedPayments.forEach(payment => {
        rejectedPayments.push({
          _id: payment._id,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userIdCode: user.userId,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          purpose: payment.purpose || 'tpin_purchase',
          status: payment.status,
          screenshot: payment.screenshot,
          screenshotUrl: payment.screenshotUrl,
          date: payment.date,
          rejectionReason: payment.rejectionReason
        });
      });
    });
    
    // Sort payments by date (most recent first)
    rejectedPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({
      status: 'success',
      results: rejectedPayments.length,
      data: { rejectedPayments }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching rejected payments',
      error: err.message
    });
  }
};

// Get payment statistics
exports.getPaymentStatistics = async (req, res) => {
  try {
    // Find all users with payment details
    const users = await User.find({
      'paymentDetails.0': { $exists: true }
    }).select('paymentDetails');
    
    let totalPayments = 0;
    let pendingPaymentsCount = 0;
    let approvedPaymentsCount = 0;
    let rejectedPaymentsCount = 0;
    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let rejectedAmount = 0;
    
    // Calculate statistics
    users.forEach(user => {
      user.paymentDetails.forEach(payment => {
        totalPayments++;
        totalAmount += payment.amount || 0;
        
        if (payment.status === 'pending') {
          pendingPaymentsCount++;
          pendingAmount += payment.amount || 0;
        } else if (payment.status === 'verified') {
          approvedPaymentsCount++;
          approvedAmount += payment.amount || 0;
        } else if (payment.status === 'rejected') {
          rejectedPaymentsCount++;
          rejectedAmount += payment.amount || 0;
        }
      });
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        totalPayments,
        pendingPayments: pendingPaymentsCount,
        approvedPayments: approvedPaymentsCount,
        rejectedPayments: rejectedPaymentsCount,
        totalAmount,
        pendingAmount,
        approvedAmount,
        rejectedAmount,
        currency: 'USD' // Assuming USD is the default currency
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching payment statistics',
      error: err.message
    });
  }
};

// Get all TPINs
exports.getAllTpins = async (req, res) => {
  try {
    // Find all users with TPINs
    const users = await User.find({
      'tpins.0': { $exists: true } // Users with at least one TPIN
    }).select('name email userId tpins');
    
    // Format the response
    const tpins = [];
    
    users.forEach(user => {
      user.tpins.forEach(tpin => {
        tpins.push({
          _id: tpin._id,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userIdCode: user.userId,
          tpinCode: tpin.code,
          isUsed: tpin.isUsed,
          status: tpin.status,
          purchaseDate: tpin.purchaseDate,
          activationDate: tpin.activationDate,
          usedAt: tpin.usedAt,
          rejectionReason: tpin.rejectionReason
        });
      });
    });
    
    // Sort TPINs by purchase date (most recent first)
    tpins.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    
    res.status(200).json({
      status: 'success',
      results: tpins.length,
      data: { tpins }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching TPINs',
      error: err.message
    });
  }
};

// Get approved TPINs
exports.getApprovedTpins = async (req, res) => {
  try {
    // Find all users with approved TPINs
    const users = await User.find({
      'tpins.status': 'approved'
    }).select('name email userId tpins');
    
    // Format the response
    const approvedTpins = [];
    
    users.forEach(user => {
      const approved = user.tpins.filter(tpin => tpin.status === 'approved');
      
      approved.forEach(tpin => {
        approvedTpins.push({
          _id: tpin._id,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userIdCode: user.userId,
          tpinCode: tpin.code,
          isUsed: tpin.isUsed,
          purchaseDate: tpin.purchaseDate,
          activationDate: tpin.activationDate,
          usedAt: tpin.usedAt
        });
      });
    });
    
    // Sort TPINs by purchase date (most recent first)
    approvedTpins.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    
    res.status(200).json({
      status: 'success',
      results: approvedTpins.length,
      data: { approvedTpins }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching approved TPINs',
      error: err.message
    });
  }
};

// Get rejected TPINs
exports.getRejectedTpins = async (req, res) => {
  try {
    // Find all users with rejected TPINs
    const users = await User.find({
      'tpins.status': 'rejected'
    }).select('name email userId tpins');
    
    // Format the response
    const rejectedTpins = [];
    
    users.forEach(user => {
      const rejected = user.tpins.filter(tpin => tpin.status === 'rejected');
      
      rejected.forEach(tpin => {
        rejectedTpins.push({
          _id: tpin._id,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userIdCode: user.userId,
          tpinCode: tpin.code,
          purchaseDate: tpin.purchaseDate,
          rejectionReason: tpin.rejectionReason
        });
      });
    });
    
    // Sort TPINs by purchase date (most recent first)
    rejectedTpins.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    
    res.status(200).json({
      status: 'success',
      results: rejectedTpins.length,
      data: { rejectedTpins }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching rejected TPINs',
      error: err.message
    });
  }
};

// Get used TPINs
exports.getUsedTpins = async (req, res) => {
  try {
    // Find all users with used TPINs
    const users = await User.find({
      'tpins.isUsed': true
    }).select('name email userId tpins');
    
    // Format the response
    const usedTpins = [];
    
    users.forEach(user => {
      const used = user.tpins.filter(tpin => tpin.isUsed === true);
      
      used.forEach(tpin => {
        usedTpins.push({
          _id: tpin._id,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userIdCode: user.userId,
          tpinCode: tpin.code,
          purchaseDate: tpin.purchaseDate,
          activationDate: tpin.activationDate,
          usedAt: tpin.usedAt,
          status: tpin.status
        });
      });
    });
    
    // Sort TPINs by used date (most recent first)
    usedTpins.sort((a, b) => {
      const dateA = a.usedAt ? new Date(a.usedAt) : new Date(0);
      const dateB = b.usedAt ? new Date(b.usedAt) : new Date(0);
      return dateB - dateA;
    });
    
    res.status(200).json({
      status: 'success',
      results: usedTpins.length,
      data: { usedTpins }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching used TPINs',
      error: err.message
    });
  }
};

// Get TPIN history for a specific user
exports.getUserTpinHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find the user
    const user = await User.findById(userId).select('name email userId tpins');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Format the response
    const tpins = user.tpins.map(tpin => ({
      _id: tpin._id,
      tpinCode: tpin.code,
      isUsed: tpin.isUsed,
      status: tpin.status,
      purchaseDate: tpin.purchaseDate,
      activationDate: tpin.activationDate,
      usedAt: tpin.usedAt,
      rejectionReason: tpin.rejectionReason
    }));
    
    // Sort TPINs by purchase date (most recent first)
    tpins.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    
    res.status(200).json({
      status: 'success',
      results: tpins.length,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          userId: user.userId
        },
        tpins
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user TPIN history',
      error: err.message
    });
  }
};

// Get TPIN statistics
exports.getTpinStatistics = async (req, res) => {
  try {
    // Find all users with TPINs
    const users = await User.find({
      'tpins.0': { $exists: true }
    }).select('tpins');
    
    let totalTpins = 0;
    let pendingTpins = 0;
    let approvedTpins = 0;
    let rejectedTpins = 0;
    let usedTpins = 0;
    let unusedTpins = 0;
    
    // Calculate statistics
    users.forEach(user => {
      user.tpins.forEach(tpin => {
        totalTpins++;
        
        if (tpin.status === 'pending') {
          pendingTpins++;
        } else if (tpin.status === 'approved') {
          approvedTpins++;
          if (tpin.isUsed) {
            usedTpins++;
          } else {
            unusedTpins++;
          }
        } else if (tpin.status === 'rejected') {
          rejectedTpins++;
        }
      });
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        totalTpins,
        pendingTpins,
        approvedTpins,
        rejectedTpins,
        usedTpins,
        unusedTpins,
        availableTpins: approvedTpins - usedTpins
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching TPIN statistics',
      error: err.message
    });
  }
};

// Get simplified MLM tree structure for all users
exports.getSimpleMLMTreeStructure = async (req, res) => {
  try {
    // Get all users without population first
    const users = await User.find({})
      .select('name userId email isActive referrer referrals teamSize rank incomeWallet createdAt')
      .lean(); // Use lean() for better performance
    
    // Create user lookup map
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });
    
    // Find root users (users without referrers)
    const rootUsers = users.filter(user => !user.referrer);
    
    // Build tree structure recursively
    const buildSimpleTree = (userId, visited = new Set()) => {
      // Prevent infinite loops
      if (visited.has(userId)) return null;
      visited.add(userId);
      
      const user = userMap.get(userId);
      if (!user) return null;
      
      // Find direct referrals of this user
      const directReferrals = users.filter(u => 
        u.referrer && u.referrer.toString() === userId
      );
      
      return {
        _id: user._id,
        name: user.name,
        userId: user.userId,
        email: user.email,
        isActive: user.isActive || false,
        teamSize: user.teamSize || 0,
        rank: user.rank || 'Newcomer',
        totalEarnings: user.incomeWallet?.totalEarnings || 0,
        balance: user.incomeWallet?.balance || 0,
        directIncome: user.incomeWallet?.directIncome || 0,
        matrixIncome: user.incomeWallet?.matrixIncome || 0,
        joinedAt: user.createdAt,
        directReferralsCount: directReferrals.length,
        directReferrals: directReferrals.map(referral => 
          buildSimpleTree(referral._id.toString(), new Set(visited))
        ).filter(Boolean) // Remove null values
      };
    };
    
    // Build the complete tree structure
    const treeStructure = rootUsers.map(rootUser => 
      buildSimpleTree(rootUser._id.toString())
    ).filter(Boolean);
    
    // Calculate summary statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.isActive).length;
    const usersWithReferrals = users.filter(user => {
      return users.some(u => u.referrer && u.referrer.toString() === user._id.toString());
    }).length;
    
    // Calculate max depth
    const calculateSimpleMaxDepth = (tree, currentDepth = 0) => {
      if (!tree || !Array.isArray(tree) || tree.length === 0) return currentDepth;
      
      let maxDepth = currentDepth;
      tree.forEach(node => {
        if (node && node.directReferrals && node.directReferrals.length > 0) {
          const depth = calculateSimpleMaxDepth(node.directReferrals, currentDepth + 1);
          maxDepth = Math.max(maxDepth, depth);
        }
      });
      
      return maxDepth;
    };
    
    const maxDepth = calculateSimpleMaxDepth(treeStructure);
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalUsers,
          activeUsers,
          totalReferrers: usersWithReferrals,
          rootUsers: rootUsers.length,
          maxTreeDepth: maxDepth
        },
        treeStructure
      }
    });
  } catch (err) {
    console.error('Simple MLM Tree Structure Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching simple MLM tree structure',
      error: err.message
    });
  }
};

// Get MLM tree structure for all users
exports.getMLMTreeStructure = async (req, res) => {
  try {
    // Get all users with their referrer and referrals populated
    const users = await User.find({})
      .select('name userId email isActive referrer referrals teamSize rank incomeWallet createdAt')
      .populate('referrer', 'name userId email')
      .populate('referrals', 'name userId email isActive createdAt');
    
    // Create a map for quick user lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });
    
    // Find root users (users without referrers)
    const rootUsers = users.filter(user => !user.referrer);
    
    // Build tree structure recursively
    const buildTree = (user) => {
      // Ensure referrals is an array
      const referrals = user.referrals || [];
      
      return {
        _id: user._id,
        name: user.name,
        userId: user.userId,
        email: user.email,
        isActive: user.isActive,
        teamSize: user.teamSize || 0,
        rank: user.rank || 'Newcomer',
        totalEarnings: user.incomeWallet?.totalEarnings || 0,
        balance: user.incomeWallet?.balance || 0,
        directIncome: user.incomeWallet?.directIncome || 0,
        matrixIncome: user.incomeWallet?.matrixIncome || 0,
        joinedAt: user.createdAt,
        directReferralsCount: referrals.length,
        directReferrals: referrals.map(referral => {
          // Find the full user data for this referral
          const fullReferralData = userMap.get(referral._id.toString());
          if (fullReferralData) {
            return buildTree(fullReferralData);
          } else {
            // Fallback if referral data is not found
            return {
              _id: referral._id,
              name: referral.name,
              userId: referral.userId,
              email: referral.email,
              isActive: referral.isActive || false,
              teamSize: 0,
              rank: 'Newcomer',
              totalEarnings: 0,
              balance: 0,
              directIncome: 0,
              matrixIncome: 0,
              joinedAt: referral.createdAt,
              directReferralsCount: 0,
              directReferrals: []
            };
          }
        })
      };
    };
    
    // Build the complete tree structure with error handling
    const treeStructure = rootUsers.map(rootUser => {
      try {
        return buildTree(rootUser);
      } catch (err) {
        console.error(`Error building tree for user ${rootUser.userId}:`, err);
        // Return basic user data if tree building fails
        return {
          _id: rootUser._id,
          name: rootUser.name,
          userId: rootUser.userId,
          email: rootUser.email,
          isActive: rootUser.isActive,
          teamSize: rootUser.teamSize || 0,
          rank: rootUser.rank || 'Newcomer',
          totalEarnings: rootUser.incomeWallet?.totalEarnings || 0,
          balance: rootUser.incomeWallet?.balance || 0,
          directIncome: rootUser.incomeWallet?.directIncome || 0,
          matrixIncome: rootUser.incomeWallet?.matrixIncome || 0,
          joinedAt: rootUser.createdAt,
          directReferralsCount: 0,
          directReferrals: []
        };
      }
    });
    
    // Calculate summary statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.isActive).length;
    const totalReferrers = users.filter(user => (user.referrals || []).length > 0).length;
    const maxDepth = calculateMaxDepth(treeStructure);
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalUsers,
          activeUsers,
          totalReferrers,
          rootUsers: rootUsers.length,
          maxTreeDepth: maxDepth
        },
        treeStructure
      }
    });
  } catch (err) {
    console.error('MLM Tree Structure Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching MLM tree structure',
      error: err.message
    });
  }
};

// Get specific user's downline tree
exports.getUserDownlineTree = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find the specific user
    const user = await User.findById(userId)
      .select('name userId email isActive referrer referrals teamSize rank incomeWallet createdAt')
      .populate('referrer', 'name userId email')
      .populate('referrals', 'name userId email isActive createdAt');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Build downline tree recursively
    const buildDownlineTree = async (currentUser, level = 1, maxLevel = 7) => {
      if (level > maxLevel) return null;
      
      // Get direct referrals
      const referrals = await User.find({ referrer: currentUser._id })
        .select('name userId email isActive referrals teamSize rank incomeWallet createdAt')
        .populate('referrals', 'name userId email isActive');
      
      const children = [];
      for (const referral of referrals) {
        const childTree = await buildDownlineTree(referral, level + 1, maxLevel);
        children.push({
          _id: referral._id,
          name: referral.name,
          userId: referral.userId,
          email: referral.email,
          isActive: referral.isActive,
          teamSize: referral.teamSize,
          rank: referral.rank,
          totalEarnings: referral.incomeWallet?.totalEarnings || 0,
          balance: referral.incomeWallet?.balance || 0,
          level: level,
          joinedAt: referral.createdAt,
          children: childTree ? childTree.children : []
        });
      }
      
      return { children };
    };
    
    const downlineTree = await buildDownlineTree(user);
    
    // Calculate downline statistics
    const calculateDownlineStats = (tree, stats = { total: 0, active: 0, byLevel: {} }) => {
      if (tree && tree.children) {
        tree.children.forEach(child => {
          stats.total++;
          if (child.isActive) stats.active++;
          
          if (!stats.byLevel[child.level]) {
            stats.byLevel[child.level] = { total: 0, active: 0 };
          }
          stats.byLevel[child.level].total++;
          if (child.isActive) stats.byLevel[child.level].active++;
          
          calculateDownlineStats({ children: child.children }, stats);
        });
      }
      return stats;
    };
    
    const downlineStats = calculateDownlineStats(downlineTree);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          userId: user.userId,
          email: user.email,
          isActive: user.isActive,
          teamSize: user.teamSize,
          rank: user.rank,
          totalEarnings: user.incomeWallet?.totalEarnings || 0,
          balance: user.incomeWallet?.balance || 0,
          referrer: user.referrer,
          joinedAt: user.createdAt
        },
        downlineStats,
        downlineTree: downlineTree.children || []
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user downline tree',
      error: err.message
    });
  }
};

// Get MLM genealogy (upline and downline for a user)
exports.getUserGenealogy = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find the specific user
    const user = await User.findById(userId)
      .select('name userId email isActive referrer referrals teamSize rank incomeWallet createdAt')
      .populate('referrer', 'name userId email isActive rank')
      .populate('referrals', 'name userId email isActive createdAt teamSize rank');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Build upline chain
    const buildUplineChain = async (currentUser, level = 1) => {
      if (!currentUser.referrer || level > 10) return [];
      
      const referrer = await User.findById(currentUser.referrer._id)
        .select('name userId email isActive referrer teamSize rank incomeWallet createdAt')
        .populate('referrer', 'name userId email isActive');
      
      const uplineUser = {
        _id: referrer._id,
        name: referrer.name,
        userId: referrer.userId,
        email: referrer.email,
        isActive: referrer.isActive,
        teamSize: referrer.teamSize,
        rank: referrer.rank,
        totalEarnings: referrer.incomeWallet?.totalEarnings || 0,
        level: level,
        joinedAt: referrer.createdAt
      };
      
      const furtherUpline = await buildUplineChain(referrer, level + 1);
      return [uplineUser, ...furtherUpline];
    };
    
    // Build direct downline with their stats
    const directDownline = user.referrals.map(referral => ({
      _id: referral._id,
      name: referral.name,
      userId: referral.userId,
      email: referral.email,
      isActive: referral.isActive,
      teamSize: referral.teamSize,
      rank: referral.rank,
      joinedAt: referral.createdAt
    }));
    
    const uplineChain = await buildUplineChain(user);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          userId: user.userId,
          email: user.email,
          isActive: user.isActive,
          teamSize: user.teamSize,
          rank: user.rank,
          totalEarnings: user.incomeWallet?.totalEarnings || 0,
          balance: user.incomeWallet?.balance || 0,
          joinedAt: user.createdAt
        },
        uplineChain,
        directDownline,
        genealogyStats: {
          uplineCount: uplineChain.length,
          directReferrals: directDownline.length,
          activeDirectReferrals: directDownline.filter(ref => ref.isActive).length,
          totalTeamSize: user.teamSize
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user genealogy',
      error: err.message
    });
  }
};

// Get MLM level-wise breakdown
exports.getMLMLevelBreakdown = async (req, res) => {
  try {
    // Get all users with referrer information
    const users = await User.find({})
      .select('name userId email isActive referrer teamSize rank incomeWallet createdAt');
    
    // Create user map for quick lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });
    
    // Calculate level for each user
    const getUserLevel = (user, visited = new Set()) => {
      if (visited.has(user._id.toString())) return 0; // Prevent infinite loops
      visited.add(user._id.toString());
      
      if (!user.referrer) return 1; // Root level
      
      const referrer = userMap.get(user.referrer.toString());
      if (!referrer) return 1;
      
      return getUserLevel(referrer, visited) + 1;
    };
    
    // Group users by level
    const levelBreakdown = {};
    users.forEach(user => {
      const level = getUserLevel(user);
      if (!levelBreakdown[level]) {
        levelBreakdown[level] = {
          level,
          users: [],
          totalUsers: 0,
          activeUsers: 0,
          totalEarnings: 0,
          totalTeamSize: 0
        };
      }
      
      levelBreakdown[level].users.push({
        _id: user._id,
        name: user.name,
        userId: user.userId,
        email: user.email,
        isActive: user.isActive,
        teamSize: user.teamSize,
        rank: user.rank,
        totalEarnings: user.incomeWallet?.totalEarnings || 0,
        joinedAt: user.createdAt
      });
      
      levelBreakdown[level].totalUsers++;
      if (user.isActive) levelBreakdown[level].activeUsers++;
      levelBreakdown[level].totalEarnings += user.incomeWallet?.totalEarnings || 0;
      levelBreakdown[level].totalTeamSize += user.teamSize || 0;
    });
    
    // Convert to array and sort by level
    const levelArray = Object.values(levelBreakdown).sort((a, b) => a.level - b.level);
    
    res.status(200).json({
      status: 'success',
      data: {
        totalLevels: levelArray.length,
        levelBreakdown: levelArray,
        summary: {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length,
          totalEarnings: users.reduce((sum, u) => sum + (u.incomeWallet?.totalEarnings || 0), 0)
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching MLM level breakdown',
      error: err.message
    });
  }
};

// Helper function to calculate maximum tree depth
const calculateMaxDepth = (tree, currentDepth = 0) => {
  if (!tree || !Array.isArray(tree) || tree.length === 0) return currentDepth;
  
  let maxDepth = currentDepth;
  tree.forEach(node => {
    if (node && node.directReferrals && Array.isArray(node.directReferrals) && node.directReferrals.length > 0) {
      const depth = calculateMaxDepth(node.directReferrals, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  });
  
  return maxDepth;
};

// Debug version - Get basic MLM data for troubleshooting
exports.getMLMDebugInfo = async (req, res) => {
  try {
    // Get basic user count
    const totalUsers = await User.countDocuments();
    
    // Get users with referrer count
    const usersWithReferrer = await User.countDocuments({ referrer: { $exists: true, $ne: null } });
    
    // Get users with referrals count  
    const usersWithReferrals = await User.countDocuments({ referrals: { $exists: true, $ne: [] } });
    
    // Get sample users to check data structure
    const sampleUsers = await User.find({})
      .select('name userId email isActive referrer referrals teamSize rank incomeWallet createdAt')
      .limit(5)
      .lean();
    
    // Check referrals field structure
    const referralsFieldCheck = sampleUsers.map(user => ({
      userId: user.userId,
      name: user.name,
      hasReferrer: !!user.referrer,
      referralsExists: !!user.referrals,
      referralsType: Array.isArray(user.referrals) ? 'array' : typeof user.referrals,
      referralsLength: user.referrals ? user.referrals.length : 0,
      incomeWalletExists: !!user.incomeWallet
    }));
    
    // Find root users
    const rootUsersCount = await User.countDocuments({ referrer: { $exists: false } });
    const rootUsersWithNullReferrer = await User.countDocuments({ referrer: null });
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalUsers,
          usersWithReferrer,
          usersWithReferrals,
          rootUsersCount,
          rootUsersWithNullReferrer
        },
        sampleUsers: referralsFieldCheck,
        schemaCheck: {
          message: "Check if referrals field is properly populated and is an array"
        }
      }
    });
  } catch (err) {
    console.error('MLM Debug Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error in debug info',
      error: err.message,
      stack: err.stack
    });
  }
};

// Get all withdrawals
exports.getAllWithdrawals = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find all users with withdrawals
    const users = await User.find({ 'withdrawals.0': { $exists: true } })
      .select('name userId email withdrawals')
      .sort({ 'withdrawals.requestDate': -1 });
    
    // Extract all withdrawals from users
    let allWithdrawals = [];
    users.forEach(user => {
      const userWithdrawals = user.withdrawals.map(withdrawal => ({
        ...withdrawal.toObject(),
        userName: user.name,
        userId: user.userId,
        userEmail: user.email
      }));
      allWithdrawals = [...allWithdrawals, ...userWithdrawals];
    });
    
    // Sort by request date (newest first)
    allWithdrawals.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    
    // Apply pagination
    const paginatedWithdrawals = allWithdrawals.slice(skip, skip + limit);
    
    res.status(200).json({
      status: 'success',
      results: allWithdrawals.length,
      page,
      limit,
      totalPages: Math.ceil(allWithdrawals.length / limit),
      data: {
        withdrawals: paginatedWithdrawals
      }
    });
  } catch (err) {
    console.error('Get All Withdrawals Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching withdrawals',
      error: err.message
    });
  }
};

// Get withdrawals by status
exports.getWithdrawalsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be pending, approved, or rejected'
      });
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find all users with withdrawals of the specified status
    const users = await User.find({ 
      withdrawals: { 
        $elemMatch: { status } 
      } 
    }).select('name userId email withdrawals');
    
    // Extract withdrawals with the specified status
    let filteredWithdrawals = [];
    users.forEach(user => {
      const statusWithdrawals = user.withdrawals
        .filter(w => w.status === status)
        .map(withdrawal => ({
          ...withdrawal.toObject(),
          userName: user.name,
          userId: user.userId,
          userEmail: user.email
        }));
      filteredWithdrawals = [...filteredWithdrawals, ...statusWithdrawals];
    });
    
    // Sort by request date (newest first)
    filteredWithdrawals.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    
    // Apply pagination
    const paginatedWithdrawals = filteredWithdrawals.slice(skip, skip + limit);
    
    res.status(200).json({
      status: 'success',
      results: filteredWithdrawals.length,
      page,
      limit,
      totalPages: Math.ceil(filteredWithdrawals.length / limit),
      data: {
        withdrawals: paginatedWithdrawals
      }
    });
  } catch (err) {
    console.error(`Get ${req.params.status} Withdrawals Error:`, err);
    res.status(500).json({
      status: 'error',
      message: `Error fetching ${req.params.status} withdrawals`,
      error: err.message
    });
  }
};

// Get withdrawal statistics
exports.getWithdrawalStatistics = async (req, res) => {
  try {
    // Find all users with withdrawals
    const users = await User.find({ 'withdrawals.0': { $exists: true } })
      .select('withdrawals');
    
    let totalWithdrawals = 0;
    let pendingWithdrawals = 0;
    let approvedWithdrawals = 0;
    let rejectedWithdrawals = 0;
    
    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let rejectedAmount = 0;
    
    // Calculate statistics
    users.forEach(user => {
      user.withdrawals.forEach(withdrawal => {
        totalWithdrawals++;
        totalAmount += withdrawal.amount;
        
        if (withdrawal.status === 'pending') {
          pendingWithdrawals++;
          pendingAmount += withdrawal.amount;
        } else if (withdrawal.status === 'approved') {
          approvedWithdrawals++;
          approvedAmount += withdrawal.amount;
        } else if (withdrawal.status === 'rejected') {
          rejectedWithdrawals++;
          rejectedAmount += withdrawal.amount;
        }
      });
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        counts: {
          total: totalWithdrawals,
          pending: pendingWithdrawals,
          approved: approvedWithdrawals,
          rejected: rejectedWithdrawals
        },
        amounts: {
          total: totalAmount,
          pending: pendingAmount,
          approved: approvedAmount,
          rejected: rejectedAmount
        },
        currencyConversion: {
          INR: {
            total: totalAmount,
            pending: pendingAmount,
            approved: approvedAmount,
            rejected: rejectedAmount
          },
          USD: {
            total: (totalAmount / 83.5).toFixed(2),
            pending: (pendingAmount / 83.5).toFixed(2),
            approved: (approvedAmount / 83.5).toFixed(2),
            rejected: (rejectedAmount / 83.5).toFixed(2)
          }
        }
      }
    });
  } catch (err) {
    console.error('Get Withdrawal Statistics Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching withdrawal statistics',
      error: err.message
    });
  }
};

// Get user's withdrawals
exports.getUserWithdrawals = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user by userId
    const user = await User.findOne({ userId })
      .select('name userId email withdrawals');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Sort withdrawals by request date (newest first)
    const sortedWithdrawals = user.withdrawals.sort(
      (a, b) => new Date(b.requestDate) - new Date(a.requestDate)
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          name: user.name,
          userId: user.userId,
          email: user.email
        },
        withdrawals: sortedWithdrawals
      }
    });
  } catch (err) {
    console.error('Get User Withdrawals Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user withdrawals',
      error: err.message
    });
  }
};

// Approve withdrawal
exports.approveWithdrawal = async (req, res) => {
  try {
    const { userId, withdrawalId, transactionId } = req.body;
    
    // Validate input
    if (!userId || !withdrawalId || !transactionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide userId, withdrawalId, and transactionId'
      });
    }
    
    // Find user by userId
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find withdrawal by id
    const withdrawalIndex = user.withdrawals.findIndex(
      w => w._id.toString() === withdrawalId
    );
    
    if (withdrawalIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Withdrawal not found'
      });
    }
    
    // Check if withdrawal is already processed
    if (user.withdrawals[withdrawalIndex].status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Withdrawal is already ${user.withdrawals[withdrawalIndex].status}`
      });
    }
    
    // Update withdrawal status
    user.withdrawals[withdrawalIndex].status = 'approved';
    user.withdrawals[withdrawalIndex].processedDate = Date.now();
    user.withdrawals[withdrawalIndex].transactionId = transactionId;
    
    // Save user
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Withdrawal approved successfully',
      data: {
        withdrawal: user.withdrawals[withdrawalIndex]
      }
    });
  } catch (err) {
    console.error('Approve Withdrawal Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error approving withdrawal',
      error: err.message
    });
  }
};

// Reject withdrawal
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { userId, withdrawalId, rejectionReason } = req.body;
    
    // Validate input
    if (!userId || !withdrawalId || !rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide userId, withdrawalId, and rejectionReason'
      });
    }
    
    // Find user by userId
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find withdrawal by id
    const withdrawalIndex = user.withdrawals.findIndex(
      w => w._id.toString() === withdrawalId
    );
    
    if (withdrawalIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Withdrawal not found'
      });
    }
    
    // Check if withdrawal is already processed
    if (user.withdrawals[withdrawalIndex].status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Withdrawal is already ${user.withdrawals[withdrawalIndex].status}`
      });
    }
    
    // Get withdrawal amount
    const withdrawalAmount = user.withdrawals[withdrawalIndex].amount;
    
    // Update withdrawal status
    user.withdrawals[withdrawalIndex].status = 'rejected';
    user.withdrawals[withdrawalIndex].processedDate = Date.now();
    user.withdrawals[withdrawalIndex].rejectionReason = rejectionReason;
    
    // Refund the amount to user's wallet
    user.incomeWallet.balance += withdrawalAmount;
    
    // Add a transaction record for the refund
    user.incomeTransactions.push({
      type: 'withdrawal',
      amount: withdrawalAmount,
      date: Date.now(),
      description: `Withdrawal rejected: ${rejectionReason}. Amount refunded to wallet.`
    });
    
    // Save user
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Withdrawal rejected and amount refunded to wallet',
      data: {
        withdrawal: user.withdrawals[withdrawalIndex],
        refundedAmount: withdrawalAmount,
        newBalance: user.incomeWallet.balance
      }
    });
  } catch (err) {
    console.error('Reject Withdrawal Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting withdrawal',
      error: err.message
    });
  }
};

// Get MLM overview statistics
exports.getMLMOverview = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get active users in network (users with referrer or referrals)
    const activeInNetwork = await User.countDocuments({
      $or: [
        { referrer: { $exists: true, $ne: null } },
        { referrals: { $exists: true, $ne: [] } }
      ]
    });
    
    // Get all users with income data
    const usersWithIncome = await User.find({})
      .select('incomeWallet withdrawals');
    
    let totalEarningsDistributed = 0;
    let pendingWithdrawals = 0;
    let totalWithdrawals = 0;
    let directCommissionsPaid = 0;
    let matrixCommissionsPaid = 0;
    let rankBonusesPaid = 0;
    
    // Calculate earnings and withdrawals
    usersWithIncome.forEach(user => {
      if (user.incomeWallet) {
        totalEarningsDistributed += user.incomeWallet.totalEarnings || 0;
        directCommissionsPaid += (user.incomeWallet.directIncome || 0) + (user.incomeWallet.selfIncome || 0);
        matrixCommissionsPaid += user.incomeWallet.matrixIncome || 0;
        rankBonusesPaid += user.incomeWallet.rankRewards || 0;
      }
      
      // Calculate withdrawals
      if (user.withdrawals && user.withdrawals.length > 0) {
        user.withdrawals.forEach(withdrawal => {
          if (withdrawal.status === 'pending') {
            pendingWithdrawals += withdrawal.amount;
          } else if (withdrawal.status === 'approved') {
            totalWithdrawals += withdrawal.amount;
          }
        });
      }
    });
    
    // Calculate network depth by finding the maximum levels in MLM tree
    const usersWithDownline = await User.find({ 'downline.0': { $exists: true } })
      .select('downline');
    
    let networkDepth = 0;
    usersWithDownline.forEach(user => {
      if (user.downline && user.downline.length > 0) {
        const maxLevel = Math.max(...user.downline.map(d => d.level || 0));
        networkDepth = Math.max(networkDepth, maxLevel);
      }
    });
    
    // If no downline data, calculate depth from referral structure
    if (networkDepth === 0) {
      const calculateDepth = async (userId, currentDepth = 0) => {
        const referrals = await User.find({ referrer: userId }).select('_id');
        if (referrals.length === 0) return currentDepth;
        
        let maxDepth = currentDepth;
        for (const referral of referrals) {
          const depth = await calculateDepth(referral._id, currentDepth + 1);
          maxDepth = Math.max(maxDepth, depth);
        }
        return maxDepth;
      };
      
      const rootUsers = await User.find({ 
        referrer: { $exists: false } 
      }).select('_id').limit(5); // Limit to avoid timeout
      
      for (const rootUser of rootUsers) {
        const depth = await calculateDepth(rootUser._id);
        networkDepth = Math.max(networkDepth, depth);
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        activeInNetwork,
        totalEarningsDistributed: parseFloat(totalEarningsDistributed.toFixed(2)),
        pendingWithdrawals: parseFloat(pendingWithdrawals.toFixed(2)),
        totalWithdrawals: parseFloat(totalWithdrawals.toFixed(2)),
        networkDepth,
        directCommissionsPaid: parseFloat(directCommissionsPaid.toFixed(2)),
        matrixCommissionsPaid: parseFloat(matrixCommissionsPaid.toFixed(2)),
        rankBonusesPaid: parseFloat(rankBonusesPaid.toFixed(2))
      }
    });
  } catch (err) {
    console.error('Get MLM Overview Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching MLM overview',
      error: err.message
    });
  }
};

// Get top performers in MLM network
exports.getTopPerformers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'totalEarnings'; // totalEarnings, teamSize, directReferrals
    
    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case 'teamSize':
        sortCriteria = { teamSize: -1 };
        break;
      case 'directReferrals':
        sortCriteria = { 'referrals': -1 }; // Sort by referrals array length
        break;
      case 'totalEarnings':
      default:
        sortCriteria = { 'incomeWallet.totalEarnings': -1 };
        break;
    }
    
    // Get top performers based on criteria
    let topPerformers;
    
    if (sortBy === 'directReferrals') {
      // For direct referrals, we need to use aggregation
      topPerformers = await User.aggregate([
        {
          $addFields: {
            directReferralsCount: { $size: { $ifNull: ['$referrals', []] } }
          }
        },
        {
          $sort: { directReferralsCount: -1, 'incomeWallet.totalEarnings': -1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            name: 1,
            userId: 1,
            email: 1,
            rank: 1,
            teamSize: 1,
            directReferrals: '$directReferralsCount',
            totalEarnings: '$incomeWallet.totalEarnings',
            createdAt: 1,
            isActive: 1
          }
        }
      ]);
    } else {
      // For other criteria, use regular find
      topPerformers = await User.find({})
        .select('name userId email rank teamSize incomeWallet createdAt isActive')
        .sort(sortCriteria)
        .limit(limit)
        .lean();
      
      // Add directReferrals count manually
      for (let performer of topPerformers) {
        const referralsCount = await User.countDocuments({ referrer: performer._id });
        performer.directReferrals = referralsCount;
        performer.totalEarnings = performer.incomeWallet?.totalEarnings || 0;
      }
    }
    
    // Format the response
    const formattedPerformers = topPerformers.map((performer, index) => ({
      rank: index + 1,
      userId: performer.userId,
      name: performer.name,
      email: performer.email,
      rank: performer.rank || 'Newcomer',
      teamSize: performer.teamSize || 0,
      directReferrals: performer.directReferrals || 0,
      totalEarnings: parseFloat((performer.totalEarnings || 0).toFixed(2)),
      isActive: performer.isActive || false,
      joinDate: performer.createdAt
    }));
    
    res.status(200).json({
      status: 'success',
      results: formattedPerformers.length,
      sortedBy: sortBy,
      data: {
        topPerformers: formattedPerformers
      }
    });
  } catch (err) {
    console.error('Get Top Performers Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching top performers',
      error: err.message
    });
  }
};
