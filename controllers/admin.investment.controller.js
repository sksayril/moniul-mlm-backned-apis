const User = require('../models/user.model');

// Get all pending investment wallet recharge requests
exports.getPendingRecharges = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'pending' } = req.query;
    
    const users = await User.find({
      'paymentDetails.purpose': 'investment_wallet',
      'paymentDetails.status': status
    }).populate('paymentDetails');
    
    // Extract relevant payment details
    const pendingRecharges = [];
    users.forEach(user => {
      user.paymentDetails.forEach(payment => {
        if (payment.purpose === 'investment_wallet' && payment.status === status) {
          pendingRecharges.push({
            _id: payment._id,
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            userMobile: user.mobile,
            paymentId: payment.paymentId,
            amount: payment.amount,
            currency: payment.currency,
            screenshot: payment.screenshot,
            screenshotUrl: payment.screenshotUrl,
            status: payment.status,
            date: payment.date,
            rejectionReason: payment.rejectionReason,
            approvedAt: payment.approvedAt,
            approvedBy: payment.approvedBy
          });
        }
      });
    });
    
    // Sort by date (newest first)
    pendingRecharges.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedRecharges = pendingRecharges.slice(startIndex, endIndex);
    
    res.status(200).json({
      status: 'success',
      data: {
        recharges: paginatedRecharges,
        totalCount: pendingRecharges.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(pendingRecharges.length / limit),
        hasNextPage: endIndex < pendingRecharges.length,
        hasPrevPage: startIndex > 0
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending recharges',
      error: err.message
    });
  }
};

// Get all approved investment wallet recharges
exports.getApprovedRecharges = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const users = await User.find({
      'paymentDetails.purpose': 'investment_wallet',
      'paymentDetails.status': 'verified'
    }).populate('paymentDetails');
    
    // Extract relevant payment details
    const approvedRecharges = [];
    users.forEach(user => {
      user.paymentDetails.forEach(payment => {
        if (payment.purpose === 'investment_wallet' && payment.status === 'verified') {
          approvedRecharges.push({
            _id: payment._id,
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            userMobile: user.mobile,
            paymentId: payment.paymentId,
            amount: payment.amount,
            currency: payment.currency,
            screenshot: payment.screenshot,
            screenshotUrl: payment.screenshotUrl,
            status: payment.status,
            date: payment.date,
            approvedAt: payment.approvedAt,
            approvedBy: payment.approvedBy,
            approvedByName: payment.approvedBy ? "Admin" : null // In a real system, you'd fetch admin name
          });
        }
      });
    });
    
    // Sort by approval date (newest first)
    approvedRecharges.sort((a, b) => {
      const dateA = a.approvedAt ? new Date(a.approvedAt) : new Date(a.date);
      const dateB = b.approvedAt ? new Date(b.approvedAt) : new Date(b.date);
      return dateB - dateA;
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedRecharges = approvedRecharges.slice(startIndex, endIndex);
    
    res.status(200).json({
      status: 'success',
      data: {
        recharges: paginatedRecharges,
        totalCount: approvedRecharges.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(approvedRecharges.length / limit),
        hasNextPage: endIndex < approvedRecharges.length,
        hasPrevPage: startIndex > 0,
        summary: {
          totalAmount: approvedRecharges.reduce((sum, recharge) => sum + recharge.amount, 0),
          averageAmount: approvedRecharges.length > 0 
            ? (approvedRecharges.reduce((sum, recharge) => sum + recharge.amount, 0) / approvedRecharges.length).toFixed(2)
            : 0,
          currencyDistribution: approvedRecharges.reduce((acc, recharge) => {
            if (!acc[recharge.currency]) acc[recharge.currency] = 0;
            acc[recharge.currency] += recharge.amount;
            return acc;
          }, {})
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching approved recharges',
      error: err.message
    });
  }
};

// Get all rejected investment wallet recharges
exports.getRejectedRecharges = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const users = await User.find({
      'paymentDetails.purpose': 'investment_wallet',
      'paymentDetails.status': 'rejected'
    }).populate('paymentDetails');
    
    // Extract relevant payment details
    const rejectedRecharges = [];
    users.forEach(user => {
      user.paymentDetails.forEach(payment => {
        if (payment.purpose === 'investment_wallet' && payment.status === 'rejected') {
          rejectedRecharges.push({
            _id: payment._id,
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            userMobile: user.mobile,
            paymentId: payment.paymentId,
            amount: payment.amount,
            currency: payment.currency,
            screenshot: payment.screenshot,
            screenshotUrl: payment.screenshotUrl,
            status: payment.status,
            date: payment.date,
            rejectionReason: payment.rejectionReason,
            approvedAt: payment.approvedAt, // This is when it was rejected (field name is misleading)
            approvedBy: payment.approvedBy, // Admin who rejected it
            rejectedByName: payment.approvedBy ? "Admin" : null // In a real system, you'd fetch admin name
          });
        }
      });
    });
    
    // Sort by rejection date (newest first)
    rejectedRecharges.sort((a, b) => {
      const dateA = a.approvedAt ? new Date(a.approvedAt) : new Date(a.date);
      const dateB = b.approvedAt ? new Date(b.approvedAt) : new Date(b.date);
      return dateB - dateA;
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedRecharges = rejectedRecharges.slice(startIndex, endIndex);
    
    // Get rejection reasons summary
    const rejectionReasons = rejectedRecharges.reduce((acc, recharge) => {
      const reason = recharge.rejectionReason || 'No reason specified';
      if (!acc[reason]) acc[reason] = 0;
      acc[reason]++;
      return acc;
    }, {});
    
    res.status(200).json({
      status: 'success',
      data: {
        recharges: paginatedRecharges,
        totalCount: rejectedRecharges.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(rejectedRecharges.length / limit),
        hasNextPage: endIndex < rejectedRecharges.length,
        hasPrevPage: startIndex > 0,
        summary: {
          totalAmount: rejectedRecharges.reduce((sum, recharge) => sum + recharge.amount, 0),
          rejectionReasons: rejectionReasons,
          mostCommonReason: Object.entries(rejectionReasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching rejected recharges',
      error: err.message
    });
  }
};

// Approve investment wallet recharge
exports.approveRecharge = async (req, res) => {
  try {
    const { userId, paymentId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the payment
    const payment = user.paymentDetails.find(p => 
      p.paymentId === paymentId && p.purpose === 'investment_wallet' && p.status === 'pending'
    );
    
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found or already processed'
      });
    }
    
    // Initialize investment wallet if not exists
    if (!user.investmentWallet) {
      user.investmentWallet = {
        balance: 0,
        totalInvested: 0,
        totalMatured: 0,
        totalReturns: 0,
        lastUpdated: Date.now()
      };
    }
    
    // Update payment status
    payment.status = 'verified';
    payment.approvedAt = Date.now();
    payment.approvedBy = req.user.id;
    
    // Add amount to investment wallet
    user.investmentWallet.balance += payment.amount;
    user.investmentWallet.lastUpdated = Date.now();
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: `Investment wallet recharge of ₹${payment.amount} approved successfully`,
      data: {
        userId: user._id,
        userName: user.name,
        approvedAmount: payment.amount,
        newWalletBalance: user.investmentWallet.balance,
        approvedAt: payment.approvedAt,
        approvedBy: req.user.id
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error approving recharge',
      error: err.message
    });
  }
};

// Reject investment wallet recharge
exports.rejectRecharge = async (req, res) => {
  try {
    const { userId, paymentId } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
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
    const payment = user.paymentDetails.find(p => 
      p.paymentId === paymentId && p.purpose === 'investment_wallet' && p.status === 'pending'
    );
    
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found or already processed'
      });
    }
    
    // Update payment status
    payment.status = 'rejected';
    payment.rejectionReason = rejectionReason;
    payment.approvedAt = Date.now();
    payment.approvedBy = req.user.id;
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: `Investment wallet recharge of ₹${payment.amount} rejected`,
      data: {
        userId: user._id,
        userName: user.name,
        rejectedAmount: payment.amount,
        rejectionReason,
        rejectedAt: payment.approvedAt,
        rejectedBy: req.user.id
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting recharge',
      error: err.message
    });
  }
};

// Get investment statistics
exports.getInvestmentStats = async (req, res) => {
  try {
    const users = await User.find({});
    
    let totalInvestmentWalletBalance = 0;
    let totalInvested = 0;
    let totalReturns = 0;
    let activeInvestments = 0;
    let maturedInvestments = 0;
    let pendingRecharges = 0;
    let totalRechargeAmount = 0;
    
    const investmentDetails = [];
    
    users.forEach(user => {
      if (user.investmentWallet) {
        totalInvestmentWalletBalance += user.investmentWallet.balance || 0;
        totalInvested += user.investmentWallet.totalInvested || 0;
        totalReturns += user.investmentWallet.totalReturns || 0;
      }
      
      if (user.investments) {
        const userActiveInvestments = user.investments.filter(inv => inv.status === 'active');
        const userMaturedInvestments = user.investments.filter(inv => inv.status === 'matured');
        
        activeInvestments += userActiveInvestments.length;
        maturedInvestments += userMaturedInvestments.length;
        
        // Add to detailed view
        userActiveInvestments.forEach(inv => {
          investmentDetails.push({
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            investmentId: inv.investmentId,
            amount: inv.amount,
            startDate: inv.startDate,
            maturityDate: inv.maturityDate,
            daysCompleted: inv.daysCompleted,
            totalDays: inv.totalDays,
            status: inv.status,
            expectedReturn: inv.returnAmount
          });
        });
      }
      
      if (user.paymentDetails) {
        const userPendingRecharges = user.paymentDetails.filter(p => 
          p.purpose === 'investment_wallet' && p.status === 'pending'
        );
        pendingRecharges += userPendingRecharges.length;
        totalRechargeAmount += userPendingRecharges.reduce((sum, p) => sum + p.amount, 0);
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalUsers: users.length,
          totalInvestmentWalletBalance,
          totalInvested,
          totalReturns,
          activeInvestments,
          maturedInvestments,
          pendingRecharges,
          totalRechargeAmount
        },
        activeInvestmentDetails: investmentDetails,
        pendingRechargesSummary: {
          count: pendingRecharges,
          totalAmount: totalRechargeAmount
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching investment statistics',
      error: err.message
    });
  }
};

// Get all investments (active and matured)
exports.getAllInvestments = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    
    const users = await User.find({ investments: { $exists: true, $ne: [] } });
    
    const allInvestments = [];
    
    users.forEach(user => {
      if (user.investments) {
        user.investments.forEach(investment => {
          if (status === 'all' || investment.status === status) {
            allInvestments.push({
              userId: user._id,
              userName: user.name,
              userEmail: user.email,
              userMobile: user.mobile,
              investmentId: investment.investmentId,
              amount: investment.amount,
              startDate: investment.startDate,
              maturityDate: investment.maturityDate,
              returnAmount: investment.returnAmount,
              status: investment.status,
              daysCompleted: investment.daysCompleted,
              totalDays: investment.totalDays,
              dailyReturn: investment.dailyReturn,
              maturedAt: investment.maturedAt,
              lastProcessed: investment.lastProcessed
            });
          }
        });
      }
    });
    
    // Sort by start date (newest first)
    allInvestments.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedInvestments = allInvestments.slice(startIndex, endIndex);
    
    res.status(200).json({
      status: 'success',
      data: {
        investments: paginatedInvestments,
        totalCount: allInvestments.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(allInvestments.length / limit),
        hasNextPage: endIndex < allInvestments.length,
        hasPrevPage: startIndex > 0,
        summary: {
          totalInvestments: allInvestments.length,
          activeInvestments: allInvestments.filter(inv => inv.status === 'active').length,
          maturedInvestments: allInvestments.filter(inv => inv.status === 'matured').length,
          totalInvestedAmount: allInvestments.reduce((sum, inv) => sum + inv.amount, 0),
          totalReturnAmount: allInvestments.reduce((sum, inv) => sum + inv.returnAmount, 0)
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching investments',
      error: err.message
    });
  }
}; 