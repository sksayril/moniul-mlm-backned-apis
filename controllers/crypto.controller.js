const User = require('../models/user.model');

// Get user's crypto wallet details
exports.getCryptoWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // If crypto wallet doesn't exist yet, initialize it
    if (!user.cryptoWallet) {
      user.cryptoWallet = {
        enabled: false,
        balance: 0,
        coin: 'MLMCoin',
        transactions: [],
        lastUpdated: Date.now()
      };
      await user.save();
    }
    
    // Calculate INR value of current balance
    const coinRate = 499; // 499 coins = 1 INR
    const inrValue = user.cryptoWallet.balance / coinRate;
    
    res.status(200).json({
      status: 'success',
      data: {
        cryptoWallet: {
          enabled: user.cryptoWallet.enabled,
          coin: user.cryptoWallet.coin,
          balance: user.cryptoWallet.balance,
          estimatedInrValue: parseFloat(inrValue.toFixed(2)),
          lastUpdated: user.cryptoWallet.lastUpdated
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching crypto wallet details',
      error: err.message
    });
  }
};

// Get user's crypto wallet transaction history
exports.getCryptoTransactions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // If crypto wallet doesn't exist yet, initialize it
    if (!user.cryptoWallet || !user.cryptoWallet.transactions) {
      return res.status(200).json({
        status: 'success',
        data: {
          transactions: []
        }
      });
    }
    
    // Sort transactions by date (newest first)
    const transactions = user.cryptoWallet.transactions.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        transactions
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching crypto transaction history',
      error: err.message
    });
  }
};

// Request to purchase crypto coins
exports.requestPurchase = async (req, res) => {
  try {
    const { coinValue, quantity } = req.body;
    
    // Validate inputs
    if (!coinValue || !quantity || isNaN(coinValue) || isNaN(quantity)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide valid coinValue and quantity'
      });
    }
    
    const parsedCoinValue = parseFloat(coinValue);
    const parsedQuantity = parseInt(quantity);
    
    // Calculate total amount
    const totalAmount = parsedCoinValue * parsedQuantity;
    
    // Get user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
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
    
    // Create purchase request
    if (!user.cryptoRequests) {
      user.cryptoRequests = [];
    }
    
    const purchaseRequest = {
      type: 'purchase',
      coinValue: parsedCoinValue,
      quantity: parsedQuantity,
      totalAmount: totalAmount,
      status: 'pending',
      createdAt: Date.now()
    };
    
    user.cryptoRequests.push(purchaseRequest);
    await user.save();
    
    res.status(201).json({
      status: 'success',
      message: 'Crypto purchase request submitted for admin approval',
      data: {
        requestId: purchaseRequest._id,
        type: 'purchase',
        coinValue: parsedCoinValue,
        quantity: parsedQuantity,
        totalAmount: totalAmount,
        status: 'pending'
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error submitting crypto purchase request',
      error: err.message
    });
  }
};

// Request to sell crypto coins
exports.requestSell = async (req, res) => {
  try {
    const { coinValue, quantity } = req.body;
    
    // Validate inputs
    if (!coinValue || !quantity || isNaN(coinValue) || isNaN(quantity)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide valid coinValue and quantity'
      });
    }
    
    const parsedCoinValue = parseFloat(coinValue);
    const parsedQuantity = parseInt(quantity);
    
    // Calculate total amount
    const totalAmount = parsedCoinValue * parsedQuantity;
    
    // Get user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has enough coins to sell
    if (!user.cryptoWallet || user.cryptoWallet.balance < parsedQuantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient coins in your wallet'
      });
    }
    
    // Create sell request
    if (!user.cryptoRequests) {
      user.cryptoRequests = [];
    }
    
    const sellRequest = {
      type: 'sell',
      coinValue: parsedCoinValue,
      quantity: parsedQuantity,
      totalAmount: totalAmount,
      status: 'pending',
      createdAt: Date.now()
    };
    
    user.cryptoRequests.push(sellRequest);
    await user.save();
    
    res.status(201).json({
      status: 'success',
      message: 'Crypto sell request submitted for admin approval',
      data: {
        requestId: sellRequest._id,
        type: 'sell',
        coinValue: parsedCoinValue,
        quantity: parsedQuantity,
        totalAmount: totalAmount,
        status: 'pending'
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error submitting crypto sell request',
      error: err.message
    });
  }
};

// Get user's crypto requests
exports.getMyCryptoRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Return empty array if no requests
    if (!user.cryptoRequests) {
      return res.status(200).json({
        status: 'success',
        data: {
          requests: []
        }
      });
    }
    
    // Sort by date (newest first)
    const requests = user.cryptoRequests.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        requests
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching crypto requests',
      error: err.message
    });
  }
};

// Admin endpoint to view overall crypto statistics
exports.getCryptoStats = async (req, res) => {
  try {
    // Ensure user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin only endpoint.'
      });
    }
    
    // Get statistics
    const totalUsers = await User.countDocuments({ 'cryptoWallet.enabled': true });
    
    // Aggregate total coins in circulation
    const totalCoins = await User.aggregate([
      { $match: { 'cryptoWallet.enabled': true } },
      { $group: { _id: null, totalCoins: { $sum: '$cryptoWallet.balance' } } }
    ]);
    
    const coinRate = 499; // 499 coins = 1 INR
    const totalCoinsInCirculation = totalCoins.length > 0 ? totalCoins[0].totalCoins : 0;
    const estimatedInrValue = totalCoinsInCirculation / coinRate;
    
    res.status(200).json({
      status: 'success',
      data: {
        totalEnabledWallets: totalUsers,
        totalCoinsInCirculation: totalCoinsInCirculation,
        estimatedInrValue: parseFloat(estimatedInrValue.toFixed(2)),
        coinRate: coinRate
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching crypto statistics',
      error: err.message
    });
  }
}; 