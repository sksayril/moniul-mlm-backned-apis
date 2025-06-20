const User = require('../models/user.model');
const crypto = require('crypto');

// Generate a random TPIN code
function generateTPINCode() {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

// Admin generate TPIN for user without payment
exports.generateTpinForUser = async (req, res) => {
  try {
    const { userId, quantity = 1, reason } = req.body;
    
    // Validate input
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide user ID'
      });
    }
    
    const tpinQuantity = parseInt(quantity);
    if (isNaN(tpinQuantity) || tpinQuantity <= 0 || tpinQuantity > 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a number between 1 and 10'
      });
    }
    
    // Find user by userId (not MongoDB _id)
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Initialize tpins array if it doesn't exist
    if (!user.tpins) {
      user.tpins = [];
    }
    
    // Generate TPINs
    const generatedTpins = [];
    for (let i = 0; i < tpinQuantity; i++) {
      const tpinCode = generateTPINCode();
      const newTpin = {
        code: tpinCode,
        isUsed: false,
        purchaseDate: Date.now(),
        activationDate: Date.now(),
        status: 'approved', // Admin-generated TPINs are automatically approved
        usedAt: null,
        rejectionReason: null
      };
      
      user.tpins.push(newTpin);
      generatedTpins.push(newTpin);
    }
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: `Successfully generated ${tpinQuantity} TPIN(s) for user ${user.name}`,
      data: {
        userId: user.userId,
        userName: user.name,
        userEmail: user.email,
        generatedTpins: generatedTpins.map(tpin => ({
          code: tpin.code,
          status: tpin.status,
          purchaseDate: tpin.purchaseDate,
          activationDate: tpin.activationDate
        })),
        totalTpins: user.tpins.length,
        availableTpins: user.tpins.filter(tpin => tpin.status === 'approved' && !tpin.isUsed).length,
        reason: reason || 'Admin generated TPIN',
        generatedBy: req.user.name || req.user.email,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error generating TPIN for user',
      error: err.message
    });
  }
};

// Admin transfer TPIN from one user to another
exports.transferTpinBetweenUsers = async (req, res) => {
  try {
    const { fromUserId, toUserId, tpinCode, reason } = req.body;
    
    // Validate input
    if (!fromUserId || !toUserId || !tpinCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide from user ID, to user ID, and TPIN code'
      });
    }
    
    if (fromUserId === toUserId) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot transfer TPIN to the same user'
      });
    }
    
    // Find both users
    const fromUser = await User.findOne({ userId: fromUserId });
    const toUser = await User.findOne({ userId: toUserId });
    
    if (!fromUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Source user not found'
      });
    }
    
    if (!toUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Destination user not found'
      });
    }
    
    // Find the TPIN to transfer
    const tpinIndex = fromUser.tpins.findIndex(
      tpin => tpin.code === tpinCode && tpin.status === 'approved' && !tpin.isUsed
    );
    
    if (tpinIndex === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'TPIN not found or not available for transfer (already used, pending, or rejected)'
      });
    }
    
    // Get the TPIN to transfer
    const tpinToTransfer = fromUser.tpins[tpinIndex];
    
    // Remove TPIN from source user
    fromUser.tpins.splice(tpinIndex, 1);
    
    // Initialize tpins array for destination user if it doesn't exist
    if (!toUser.tpins) {
      toUser.tpins = [];
    }
    
    // Add TPIN to destination user
    const transferredTpin = {
      code: tpinToTransfer.code,
      isUsed: false,
      purchaseDate: tpinToTransfer.purchaseDate,
      activationDate: Date.now(), // Update activation date for transfer
      status: 'approved',
      usedAt: null,
      rejectionReason: null
    };
    
    toUser.tpins.push(transferredTpin);
    
    // Save both users
    await fromUser.save();
    await toUser.save();
    
    res.status(200).json({
      status: 'success',
      message: `TPIN ${tpinCode} successfully transferred from ${fromUser.name} to ${toUser.name}`,
      data: {
        transferDetails: {
          tpinCode: tpinCode,
          fromUser: {
            userId: fromUser.userId,
            name: fromUser.name,
            email: fromUser.email,
            remainingTpins: fromUser.tpins.filter(tpin => tpin.status === 'approved' && !tpin.isUsed).length
          },
          toUser: {
            userId: toUser.userId,
            name: toUser.name,
            email: toUser.email,
            totalTpins: toUser.tpins.filter(tpin => tpin.status === 'approved' && !tpin.isUsed).length
          },
          reason: reason || 'Admin transfer',
          transferredBy: req.user.name || req.user.email,
          transferredAt: new Date().toISOString()
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error transferring TPIN between users',
      error: err.message
    });
  }
};

// Admin bulk generate TPINs for multiple users
exports.bulkGenerateTpins = async (req, res) => {
  try {
    const { userIds, quantity = 1, reason } = req.body;
    
    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of user IDs'
      });
    }
    
    if (userIds.length > 50) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot process more than 50 users at once'
      });
    }
    
    const tpinQuantity = parseInt(quantity);
    if (isNaN(tpinQuantity) || tpinQuantity <= 0 || tpinQuantity > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a number between 1 and 5 for bulk generation'
      });
    }
    
    const results = [];
    const errors = [];
    
    // Process each user
    for (const userId of userIds) {
      try {
        const user = await User.findOne({ userId });
        
        if (!user) {
          errors.push({
            userId,
            error: 'User not found'
          });
          continue;
        }
        
        // Initialize tpins array if it doesn't exist
        if (!user.tpins) {
          user.tpins = [];
        }
        
        // Generate TPINs for this user
        const generatedTpins = [];
        for (let i = 0; i < tpinQuantity; i++) {
          const tpinCode = generateTPINCode();
          const newTpin = {
            code: tpinCode,
            isUsed: false,
            purchaseDate: Date.now(),
            activationDate: Date.now(),
            status: 'approved',
            usedAt: null,
            rejectionReason: null
          };
          
          user.tpins.push(newTpin);
          generatedTpins.push(tpinCode);
        }
        
        await user.save();
        
        results.push({
          userId: user.userId,
          userName: user.name,
          userEmail: user.email,
          generatedTpins,
          totalTpins: user.tpins.length,
          availableTpins: user.tpins.filter(tpin => tpin.status === 'approved' && !tpin.isUsed).length
        });
        
      } catch (err) {
        errors.push({
          userId,
          error: err.message
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: `Bulk TPIN generation completed. Successfully processed ${results.length} users.`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          totalUsers: userIds.length,
          successful: results.length,
          failed: errors.length,
          tpinsPerUser: tpinQuantity,
          totalTpinsGenerated: results.length * tpinQuantity
        },
        reason: reason || 'Admin bulk TPIN generation',
        generatedBy: req.user.name || req.user.email,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error in bulk TPIN generation',
      error: err.message
    });
  }
};

// Get TPIN transfer history (for audit purposes)
exports.getTpinTransferHistory = async (req, res) => {
  try {
    // This would require a separate transfer log collection in a real system
    // For now, we'll return a simple response indicating this feature needs implementation
    res.status(200).json({
      status: 'success',
      message: 'TPIN transfer history feature',
      data: {
        note: 'In a production system, TPIN transfers should be logged in a separate audit table',
        suggestion: 'Consider implementing a TpinTransferLog model to track all transfers with timestamps, admin details, and reasons'
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching TPIN transfer history',
      error: err.message
    });
  }
};

// Admin view user's TPIN details
exports.getUserTpinDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user by userId (not MongoDB _id)
    const user = await User.findOne({ userId }).select('name email userId tpins');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Initialize tpins if not exists
    if (!user.tpins) {
      user.tpins = [];
    }
    
    // Categorize TPINs
    const pendingTpins = user.tpins.filter(tpin => tpin.status === 'pending');
    const approvedTpins = user.tpins.filter(tpin => tpin.status === 'approved');
    const rejectedTpins = user.tpins.filter(tpin => tpin.status === 'rejected');
    const usedTpins = user.tpins.filter(tpin => tpin.isUsed);
    const availableTpins = user.tpins.filter(tpin => tpin.status === 'approved' && !tpin.isUsed);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        },
        tpinSummary: {
          total: user.tpins.length,
          pending: pendingTpins.length,
          approved: approvedTpins.length,
          rejected: rejectedTpins.length,
          used: usedTpins.length,
          available: availableTpins.length
        },
        tpins: {
          all: user.tpins.map(tpin => ({
            id: tpin._id,
            code: tpin.code,
            status: tpin.status,
            isUsed: tpin.isUsed,
            purchaseDate: tpin.purchaseDate,
            activationDate: tpin.activationDate,
            usedAt: tpin.usedAt,
            rejectionReason: tpin.rejectionReason
          })),
          available: availableTpins.map(tpin => ({
            id: tpin._id,
            code: tpin.code,
            activationDate: tpin.activationDate
          }))
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user TPIN details',
      error: err.message
    });
  }
}; 