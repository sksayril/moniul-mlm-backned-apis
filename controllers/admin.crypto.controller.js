const User = require('../models/user.model');

// Get all pending crypto requests
exports.getPendingRequests = async (req, res) => {
  try {
    // Find users with pending crypto requests
    const users = await User.find({
      'cryptoRequests.status': 'pending'
    }).select('name userId email cryptoRequests');
    
    // Extract all pending requests
    const pendingRequests = [];
    users.forEach(user => {
      const userRequests = user.cryptoRequests
        .filter(req => req.status === 'pending')
        .map(req => ({
          requestId: req._id,
          userId: user.userId,
          userName: user.name,
          userEmail: user.email,
          type: req.type,
          coinValue: req.coinValue,
          quantity: req.quantity,
          totalAmount: req.totalAmount,
          createdAt: req.createdAt
        }));
      
      pendingRequests.push(...userRequests);
    });
    
    // Sort by date (newest first)
    pendingRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.status(200).json({
      status: 'success',
      data: {
        count: pendingRequests.length,
        requests: pendingRequests
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending crypto requests',
      error: err.message
    });
  }
};

// Get all approved crypto requests
exports.getApprovedRequests = async (req, res) => {
  try {
    // Find users with approved crypto requests
    const users = await User.find({
      'cryptoRequests.status': 'approved'
    }).select('name userId email cryptoRequests');
    
    // Extract all approved requests
    const approvedRequests = [];
    users.forEach(user => {
      const userRequests = user.cryptoRequests
        .filter(req => req.status === 'approved')
        .map(req => ({
          requestId: req._id,
          userId: user.userId,
          userName: user.name,
          userEmail: user.email,
          type: req.type,
          coinValue: req.coinValue,
          quantity: req.quantity,
          totalAmount: req.totalAmount,
          approvedAt: req.updatedAt,
          createdAt: req.createdAt
        }));
      
      approvedRequests.push(...userRequests);
    });
    
    // Sort by date (newest first)
    approvedRequests.sort((a, b) => new Date(b.approvedAt || b.createdAt) - new Date(a.approvedAt || a.createdAt));
    
    res.status(200).json({
      status: 'success',
      data: {
        count: approvedRequests.length,
        requests: approvedRequests
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching approved crypto requests',
      error: err.message
    });
  }
};

// Get all rejected crypto requests
exports.getRejectedRequests = async (req, res) => {
  try {
    // Find users with rejected crypto requests
    const users = await User.find({
      'cryptoRequests.status': 'rejected'
    }).select('name userId email cryptoRequests');
    
    // Extract all rejected requests
    const rejectedRequests = [];
    users.forEach(user => {
      const userRequests = user.cryptoRequests
        .filter(req => req.status === 'rejected')
        .map(req => ({
          requestId: req._id,
          userId: user.userId,
          userName: user.name,
          userEmail: user.email,
          type: req.type,
          coinValue: req.coinValue,
          quantity: req.quantity,
          totalAmount: req.totalAmount,
          rejectedAt: req.updatedAt,
          createdAt: req.createdAt
        }));
      
      rejectedRequests.push(...userRequests);
    });
    
    // Sort by date (newest first)
    rejectedRequests.sort((a, b) => new Date(b.rejectedAt || b.createdAt) - new Date(a.rejectedAt || a.createdAt));
    
    res.status(200).json({
      status: 'success',
      data: {
        count: rejectedRequests.length,
        requests: rejectedRequests
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching rejected crypto requests',
      error: err.message
    });
  }
};

// Approve a crypto request
exports.approveRequest = async (req, res) => {
  try {
    const { userId, requestId } = req.params;
    
    // Find user
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the request
    const requestIndex = user.cryptoRequests.findIndex(
      req => req._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Crypto request not found'
      });
    }
    
    const request = user.cryptoRequests[requestIndex];
    
    // Check if request is already processed
    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `This request has already been ${request.status}`
      });
    }
    
    // Process based on request type
    if (request.type === 'purchase') {
      // Initialize crypto wallet if it doesn't exist
      if (!user.cryptoWallet) {
        user.cryptoWallet = {
          enabled: true,
          balance: 0,
          coin: 'MLMCoin',
          transactions: [],
          lastUpdated: Date.now()
        };
      }
      
      // Add coins to user's wallet
      user.cryptoWallet.balance += request.quantity;
      
      // Add transaction record
      user.cryptoWallet.transactions.push({
        amount: request.quantity,
        type: 'purchase',
        description: `Purchase of ${request.quantity} coins at ${request.coinValue} INR per coin`,
        inrValue: request.totalAmount,
        createdAt: Date.now()
      });
      
      user.cryptoWallet.lastUpdated = Date.now();
    } 
    else if (request.type === 'sell') {
      // Ensure user has enough coins
      if (!user.cryptoWallet || user.cryptoWallet.balance < request.quantity) {
        return res.status(400).json({
          status: 'error',
          message: 'User has insufficient coins for this sell request'
        });
      }
      
      // Deduct coins from user's wallet
      user.cryptoWallet.balance -= request.quantity;
      
      // Add transaction record
      user.cryptoWallet.transactions.push({
        amount: -request.quantity,
        type: 'transfer',
        description: `Sold ${request.quantity} coins at ${request.coinValue} INR per coin`,
        inrValue: request.totalAmount,
        createdAt: Date.now()
      });
      
      user.cryptoWallet.lastUpdated = Date.now();
    }
    
    // Update request status
    user.cryptoRequests[requestIndex].status = 'approved';
    user.cryptoRequests[requestIndex].updatedAt = Date.now();
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: `Crypto ${request.type} request approved successfully`,
      data: {
        userId: user.userId,
        requestId,
        type: request.type,
        quantity: request.quantity,
        totalAmount: request.totalAmount,
        currentBalance: user.cryptoWallet.balance
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error approving crypto request',
      error: err.message
    });
  }
};

// Reject a crypto request
exports.rejectRequest = async (req, res) => {
  try {
    const { userId, requestId } = req.params;
    
    // Find user
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the request
    const requestIndex = user.cryptoRequests.findIndex(
      req => req._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Crypto request not found'
      });
    }
    
    const request = user.cryptoRequests[requestIndex];
    
    // Check if request is already processed
    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `This request has already been ${request.status}`
      });
    }
    
    // Update request status
    user.cryptoRequests[requestIndex].status = 'rejected';
    user.cryptoRequests[requestIndex].updatedAt = Date.now();
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: `Crypto ${request.type} request rejected`,
      data: {
        userId: user.userId,
        requestId,
        type: request.type
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting crypto request',
      error: err.message
    });
  }
}; 