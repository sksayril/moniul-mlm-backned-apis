const User = require('../models/user.model');

// Get all trading package purchase requests
exports.getPendingTradingPackages = async (req, res) => {
  try {
    // Find users with payment details having trading package purchase pending
    const users = await User.find({
      'paymentDetails.amount': 5999,
      'paymentDetails.status': 'pending'
    });
    
    const pendingRequests = users.map(user => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      paymentDetails: user.paymentDetails.filter(
        payment => payment.amount === 5999 && payment.status === 'pending'
      )
    }));
    
    res.status(200).json({
      status: 'success',
      results: pendingRequests.length,
      data: {
        pendingRequests
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending trading package requests',
      error: err.message
    });
  }
};

// Approve trading package purchase
exports.approveTradingPackage = async (req, res) => {
  try {
    const { userId, paymentId } = req.body;
    
    if (!userId || !paymentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide userId and paymentId'
      });
    }
    
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
        message: 'No pending payment found with that ID'
      });
    }
    
    // Update payment status
    user.paymentDetails[paymentIndex].status = 'verified';
    
    // Activate trading package
    user.tradingPackage = {
      purchased: true,
      startDate: Date.now(),
      expectedReturn: 15000 // ₹15,000 expected return in 35 days
    };
    
    await user.save();
    
    // Schedule a task to process FX trading income after 35 days
    // In a production app, this would be a job scheduler like node-cron or agenda
    // For now, we'll log this action
    console.log(`Trading package approved for user ${userId}. 
      Expected return of ₹15,000 scheduled after 35 days`);
    
    res.status(200).json({
      status: 'success',
      message: 'Trading package approved successfully',
      data: {
        tradingPackage: user.tradingPackage
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error approving trading package',
      error: err.message
    });
  }
};

// Reject trading package purchase
exports.rejectTradingPackage = async (req, res) => {
  try {
    const { userId, paymentId, reason } = req.body;
    
    if (!userId || !paymentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide userId, paymentId, and rejection reason'
      });
    }
    
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
        message: 'No pending payment found with that ID'
      });
    }
    
    // Update payment status
    user.paymentDetails[paymentIndex].status = 'rejected';
    user.paymentDetails[paymentIndex].rejectionReason = reason || 'Payment verification failed';
    
    // Reset trading package (if it was in pending state)
    user.tradingPackage = {
      purchased: false
    };
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Trading package rejected successfully',
      data: {
        payment: user.paymentDetails[paymentIndex]
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting trading package',
      error: err.message
    });
  }
};

// Get all pending withdrawal requests
exports.getPendingWithdrawals = async (req, res) => {
  try {
    // Find users with pending withdrawals
    const users = await User.find({
      'withdrawals.status': 'pending'
    });
    
    const pendingWithdrawals = [];
    
    users.forEach(user => {
      user.withdrawals.forEach(withdrawal => {
        if (withdrawal.status === 'pending') {
          pendingWithdrawals.push({
            userId: user._id,
            withdrawalId: withdrawal._id,
            userName: user.name,
            userEmail: user.email,
            amount: withdrawal.amount,
            requestDate: withdrawal.requestDate,
            paymentMethod: withdrawal.paymentMethod,
            paymentDetails: withdrawal.paymentDetails || {},
            // Include fallback payment methods from user profile if not specified in withdrawal
            userPaymentMethods: {
              upiId: user.paymentMethods?.upiId,
              bankDetails: user.paymentMethods?.bankDetails
            }
          });
        }
      });
    });
    
    res.status(200).json({
      status: 'success',
      results: pendingWithdrawals.length,
      data: {
        pendingWithdrawals
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending withdrawals',
      error: err.message
    });
  }
};

// Approve withdrawal request
exports.approveWithdrawal = async (req, res) => {
  try {
    const { userId, withdrawalId, transactionId } = req.body;
    
    if (!userId || !withdrawalId || !transactionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide userId, withdrawalId, and transactionId'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the withdrawal
    const withdrawalIndex = user.withdrawals.findIndex(
      w => w._id.toString() === withdrawalId && w.status === 'pending'
    );
    
    if (withdrawalIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'No pending withdrawal found with that ID'
      });
    }
    
    // Update withdrawal status
    user.withdrawals[withdrawalIndex].status = 'approved';
    user.withdrawals[withdrawalIndex].processedDate = Date.now();
    user.withdrawals[withdrawalIndex].transactionId = transactionId;
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Withdrawal approved successfully',
      data: {
        withdrawal: user.withdrawals[withdrawalIndex]
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error approving withdrawal',
      error: err.message
    });
  }
};

// Reject withdrawal request
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { userId, withdrawalId, reason } = req.body;
    
    if (!userId || !withdrawalId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide userId and withdrawalId'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the withdrawal
    const withdrawalIndex = user.withdrawals.findIndex(
      w => w._id.toString() === withdrawalId && w.status === 'pending'
    );
    
    if (withdrawalIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'No pending withdrawal found with that ID'
      });
    }
    
    // Get withdrawal amount to refund
    const amount = user.withdrawals[withdrawalIndex].amount;
    
    // Update withdrawal status
    user.withdrawals[withdrawalIndex].status = 'rejected';
    user.withdrawals[withdrawalIndex].processedDate = Date.now();
    user.withdrawals[withdrawalIndex].rejectionReason = reason || 'Withdrawal rejected by admin';
    
    // Refund the amount to user's wallet
    user.incomeWallet.balance += amount;
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Withdrawal rejected successfully',
      data: {
        withdrawal: user.withdrawals[withdrawalIndex],
        refundedAmount: amount,
        newBalance: user.incomeWallet.balance
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting withdrawal',
      error: err.message
    });
  }
};

// Get all users with MLM metrics
exports.getMlmMetrics = async (req, res) => {
  try {
    const users = await User.find()
      .select('name email referralCode teamSize rank incomeWallet tradingPackage');
    
    // Calculate system-wide metrics
    const totalUsers = users.length;
    const activeTraders = users.filter(user => user.tradingPackage.purchased).length;
    
    const totalIncome = users.reduce((total, user) => {
      const walletTotal = Object.values(user.incomeWallet).reduce((sum, val) => {
        return typeof val === 'number' ? sum + val : sum;
      }, 0);
      return total + walletTotal;
    }, 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          activeTraders,
          totalIncome
        },
        users
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching MLM metrics',
      error: err.message
    });
  }
};
