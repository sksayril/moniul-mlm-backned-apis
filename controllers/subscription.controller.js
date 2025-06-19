const User = require('../models/user.model');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Generate a random TPIN code
function generateTPINCode() {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

// Request to purchase TPINs - upload payment screenshot and details
exports.requestTPINs = async (req, res) => {
  try {
    const { paymentId, amount, currency, quantity } = req.body;
    
    // Validate input
    if (!paymentId || !amount || !currency || !quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide payment ID, amount, currency, and TPIN quantity'
      });
    }
    
    // Ensure quantity is a number and greater than 0
    const tpinQuantity = parseInt(quantity);
    if (isNaN(tpinQuantity) || tpinQuantity <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number'
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
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Initialize arrays if they don't exist
      if (!user.paymentDetails) {
        user.paymentDetails = [];
      }
      if (!user.tpins) {
        user.tpins = [];
      }
      
      // Create URL path for the screenshot
      const relativePath = `/uploads/payments/${fileName}`;
      
      user.paymentDetails.push({
        paymentId,
        amount,
        currency,
        screenshot: relativePath,
        screenshotUrl: `${req.protocol}://${req.get('host')}${relativePath}`,
        date: Date.now()
      });
      
      // Create pending TPINs
      for (let i = 0; i < tpinQuantity; i++) {
        const tpinCode = generateTPINCode();
        user.tpins.push({
          code: tpinCode,
          status: 'pending',
          purchaseDate: Date.now()
        });
      }
      
      await user.save();
      
      res.status(200).json({
        status: 'success',
        message: `Request for ${tpinQuantity} TPINs submitted successfully. Please wait for admin approval.`,
        data: {
          paymentDetails: user.paymentDetails[user.paymentDetails.length - 1],
          pendingTpins: user.tpins.filter(tpin => tpin.status === 'pending').length
        }
      });
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error processing TPIN purchase request',
      error: err.message
    });
  }
};

// Get TPINs status
exports.getTpinStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Initialize empty tpins array if user doesn't have any
    if (!user.tpins || user.tpins.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          summary: {
            total: 0,
            pending: 0,
            approved: 0,
            active: 0,
            used: 0,
            rejected: 0,
          },
          tpins: {
            all: [],
            pending: [],
            active: [],
            used: [],
            rejected: []
          },
          payments: {
            pending: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'pending') : [],
            verified: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'verified') : [],
            rejected: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'rejected') : []
          },
          isActive: user.isActive
        }
      });
    }
    
    // Group TPINs by status
    const pendingTpins = user.tpins.filter(tpin => tpin.status === 'pending');
    const approvedTpins = user.tpins.filter(tpin => tpin.status === 'approved');
    const rejectedTpins = user.tpins.filter(tpin => tpin.status === 'rejected');
    
    // Filter approved TPINs based on usage
    const activeTpins = approvedTpins.filter(tpin => !tpin.isUsed);
    const usedTpins = user.tpins.filter(tpin => tpin.isUsed);
    
    // Associate payment details with TPINs where possible
    const paymentsMap = {};
    user.paymentDetails.forEach(payment => {
      paymentsMap[payment.paymentId] = payment;
    });
    
    // Format TPIN data with detailed information
    const formatTpin = (tpin) => {
      return {
        id: tpin._id,
        code: tpin.code,
        status: tpin.status,
        purchaseDate: tpin.purchaseDate,
        activationDate: tpin.activationDate || null,
        isUsed: tpin.isUsed,
        usedAt: tpin.usedAt || null,
        rejectionReason: tpin.rejectionReason || null,
      };
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          total: user.tpins.length,
          pending: pendingTpins.length,
          approved: approvedTpins.length,
          active: activeTpins.length,
          used: usedTpins.length,
          rejected: rejectedTpins.length,
        },
        tpins: {
          all: user.tpins.map(formatTpin),
          pending: pendingTpins.map(formatTpin),
          active: activeTpins.map(formatTpin),
          used: usedTpins.map(formatTpin),
          rejected: rejectedTpins.map(formatTpin)
        },
        payments: {
          pending: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'pending') : [],
          verified: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'verified') : [],
          rejected: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'rejected') : []
        },
        isActive: user.isActive
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

// Get payment status
exports.getPaymentStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        pendingPayments: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'pending') : [],
        verifiedPayments: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'verified') : [],
        rejectedPayments: user.paymentDetails ? user.paymentDetails.filter(payment => payment.status === 'rejected') : []
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching payment status',
      error: err.message
    });
  }
};

// Transfer TPIN to another user
exports.transferTpin = async (req, res) => {
  try {
    const { tpinCode, recipientUserId } = req.body;
    
    if (!tpinCode || !recipientUserId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide TPIN code and recipient user ID'
      });
    }
    
    // Find the sender (current user)
    const sender = await User.findById(req.user.id);
    
    if (!sender) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has TPINs
    if (!sender.tpins || sender.tpins.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'You do not have any TPINs to transfer'
      });
    }
    
    // Find the TPIN to transfer
    const tpinIndex = sender.tpins.findIndex(
      tpin => tpin.code === tpinCode && tpin.status === 'approved' && !tpin.isUsed
    );
    
    if (tpinIndex === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'TPIN is not available for transfer (already used or pending)'
      });
    }
    
    // Find recipient by userId (not MongoDB ID)
    const recipient = await User.findOne({ userId: recipientUserId });
    
    if (!recipient) {
      return res.status(404).json({
        status: 'error',
        message: 'Recipient user not found'
      });
    }
    
    // Remove TPIN from sender
    const tpinToTransfer = sender.tpins[tpinIndex];
    sender.tpins.splice(tpinIndex, 1);
    await sender.save();
    
    // Add TPIN to recipient
    recipient.tpins.push({
      code: tpinToTransfer.code,
      isUsed: false,
      purchaseDate: tpinToTransfer.purchaseDate,
      activationDate: tpinToTransfer.activationDate,
      status: 'approved'
    });
    
    await recipient.save();
    
    res.status(200).json({
      status: 'success',
      message: 'TPIN transferred successfully',
      data: {
        tpin: {
          code: tpinToTransfer.code,
          isUsed: false,
          purchaseDate: tpinToTransfer.purchaseDate,
          status: 'approved'
        },
        recipient: {
          userId: recipient.userId,
          name: recipient.name
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error transferring TPIN',
      error: err.message
    });
  }
};
