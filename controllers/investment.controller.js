const User = require('../models/user.model');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Generate investment ID
function generateInvestmentId() {
  return 'INV-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

// User recharge investment wallet with payment screenshot
exports.rechargeInvestmentWallet = async (req, res) => {
  try {
    const { paymentId, amount, currency = 'INR' } = req.body;
    
    // Validate input
    if (!paymentId || !amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide payment ID and amount'
      });
    }
    
    const rechargeAmount = parseFloat(amount);
    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be a positive number'
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
      
      // Create URL path for the screenshot
      const relativePath = `/uploads/payments/${fileName}`;
      
      user.paymentDetails.push({
        paymentId,
        amount: rechargeAmount,
        currency,
        purpose: 'investment_wallet',
        screenshot: relativePath,
        screenshotUrl: `${req.protocol}://${req.get('host')}${relativePath}`,
        status: 'pending',
        date: Date.now()
      });
      
      await user.save();
      
      res.status(200).json({
        status: 'success',
        message: 'Investment wallet recharge request submitted successfully. Please wait for admin approval.',
        data: {
          paymentDetails: user.paymentDetails[user.paymentDetails.length - 1],
          currentWalletBalance: user.investmentWallet ? user.investmentWallet.balance : 0
        }
      });
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error processing investment wallet recharge',
      error: err.message
    });
  }
};

// Create new investment (user invests 5999 from wallet)
exports.createInvestment = async (req, res) => {
  try {
    const investmentAmount = 5999;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
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
    
    // Check if user has sufficient balance
    if (user.investmentWallet.balance < investmentAmount) {
      return res.status(400).json({
        status: 'error',
        message: `Insufficient investment wallet balance. Required: ₹${investmentAmount}, Available: ₹${user.investmentWallet.balance}`
      });
    }
    
    // Check if user already has an active investment
    if (!user.investments) {
      user.investments = [];
    }
    
    const activeInvestment = user.investments.find(inv => inv.status === 'active');
    if (activeInvestment) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have an active investment. Wait for it to mature before creating a new one.'
      });
    }
    
    // Create new investment
    const investmentId = generateInvestmentId();
    const startDate = new Date();
    const maturityDate = new Date(startDate.getTime() + (35 * 24 * 60 * 60 * 1000)); // 35 days from now
    
    const newInvestment = {
      investmentId,
      amount: investmentAmount,
      startDate,
      maturityDate,
      returnAmount: 15000, // Total return after 35 days
      status: 'active',
      daysCompleted: 0,
      totalDays: 35,
      dailyReturn: Math.round((15000 - investmentAmount) / 35), // Daily profit distribution
      lastProcessed: startDate
    };
    
    // Deduct from investment wallet
    user.investmentWallet.balance -= investmentAmount;
    user.investmentWallet.totalInvested += investmentAmount;
    user.investmentWallet.lastUpdated = Date.now();
    
    // Add investment
    user.investments.push(newInvestment);
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Investment created successfully!',
      data: {
        investment: newInvestment,
        walletBalance: user.investmentWallet.balance,
        expectedReturn: 15000,
        maturityDate: maturityDate
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating investment',
      error: err.message
    });
  }
};

// Get investment wallet details
exports.getInvestmentWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Initialize if not exists
    if (!user.investmentWallet) {
      user.investmentWallet = {
        balance: 0,
        totalInvested: 0,
        totalMatured: 0,
        totalReturns: 0,
        lastUpdated: Date.now()
      };
    }
    
    if (!user.investments) {
      user.investments = [];
    }
    
    // Get pending recharge requests
    const pendingRecharges = user.paymentDetails ? 
      user.paymentDetails.filter(payment => 
        payment.purpose === 'investment_wallet' && payment.status === 'pending'
      ) : [];
    
    // Get active investment
    const activeInvestment = user.investments.find(inv => inv.status === 'active');
    
    // Get matured investments
    const maturedInvestments = user.investments.filter(inv => inv.status === 'matured');
    
    res.status(200).json({
      status: 'success',
      data: {
        wallet: user.investmentWallet,
        activeInvestment: activeInvestment || null,
        maturedInvestments,
        pendingRecharges,
        canInvest: user.investmentWallet.balance >= 5999 && !activeInvestment,
        investmentAmount: 5999,
        expectedReturn: 15000,
        investmentPeriod: 35
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching investment wallet details',
      error: err.message
    });
  }
};

// Get investment history
exports.getInvestmentHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const investments = user.investments || [];
    const rechargeHistory = user.paymentDetails ? 
      user.paymentDetails.filter(payment => payment.purpose === 'investment_wallet') : [];
    
    // Get investment-related income transactions
    const investmentTransactions = user.incomeTransactions ? 
      user.incomeTransactions.filter(transaction => 
        transaction.type === 'investment_return' || transaction.type === 'investment_maturity'
      ) : [];
    
    res.status(200).json({
      status: 'success',
      data: {
        investments,
        rechargeHistory,
        investmentTransactions,
        summary: {
          totalInvestments: investments.length,
          totalInvested: user.investmentWallet ? user.investmentWallet.totalInvested : 0,
          totalReturns: user.investmentWallet ? user.investmentWallet.totalReturns : 0,
          totalMatured: user.investmentWallet ? user.investmentWallet.totalMatured : 0,
          activeInvestments: investments.filter(inv => inv.status === 'active').length,
          maturedInvestments: investments.filter(inv => inv.status === 'matured').length
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching investment history',
      error: err.message
    });
  }
}; 