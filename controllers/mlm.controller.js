const User = require('../models/user.model');
const crypto = require('crypto');

// Generate a unique referral code for the user
exports.generateReferralCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Only generate if the user has an active subscription and TPIN
    if (!user.subscription.active || !user.tpin.active) {
      return res.status(400).json({
        status: 'error',
        message: 'You need an active subscription and TPIN to generate a referral code'
      });
    }
    
    // Check if user already has a referral code
    if (user.referralCode) {
      return res.status(200).json({
        status: 'success',
        data: {
          referralCode: user.referralCode
        }
      });
    }
    
    // Generate a unique referral code using user ID and random bytes
    const randomBytes = crypto.randomBytes(4).toString('hex');
    const referralCode = `${user.name.substring(0, 3).toUpperCase()}${randomBytes}`.substring(0, 8);
    
    user.referralCode = referralCode;
    await user.save();
    
    // Add self income when activating referral code (only first time)
    user.incomeWallet.selfIncome += 50; // ₹50 self-activation bonus
    user.incomeWallet.balance += 50;
    user.incomeWallet.lastUpdated = Date.now();
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Referral code generated successfully',
      data: {
        referralCode: user.referralCode
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error generating referral code',
      error: err.message
    });
  }
};

// Join using referral code
exports.joinWithReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;
    
    if (!referralCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a referral code'
      });
    }
    
    // Check if referral code exists
    const referrer = await User.findOne({ referralCode });
    
    if (!referrer) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid referral code'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user already has a referrer
    if (user.referrer) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already part of a referral network'
      });
    }
    
    // Only allow joining if user has an active subscription and TPIN
    if (!user.subscription.active || !user.tpin.active) {
      return res.status(400).json({
        status: 'error',
        message: 'You need an active subscription and TPIN to join a referral network'
      });
    }
    
    // Update user with referrer
    user.referrer = referrer._id;
    await user.save();
    
    // Add user to referrer's direct referrals
    referrer.referrals.push(user._id);
    
    // Add direct income to referrer
    referrer.incomeWallet.directIncome += 20; // ₹20 per direct referral
    referrer.incomeWallet.balance += 20;
    referrer.incomeWallet.lastUpdated = Date.now();
    
    // Update team size for the referrer
    referrer.teamSize += 1;
    
    // Update referrer's rank based on team size
    updateUserRank(referrer);
    
    await referrer.save();
    
    // Add user to the upline's downline (for matrix calculations)
    await addUserToUplineDownline(user._id, referrer._id, 1);
    
    res.status(200).json({
      status: 'success',
      message: 'Successfully joined referral network',
      data: {
        referrer: {
          name: referrer.name,
          email: referrer.email
        }
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error joining referral network',
      error: err.message
    });
  }
};

// Get referral dashboard
exports.getReferralDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('referrer', 'name email referralCode')
      .populate('referrals', 'name email createdAt');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Get matrix downline details (levels 1-7)
    const matrixDetails = [];
    for (let level = 1; level <= 7; level++) {
      const levelCount = user.downline.filter(item => item.level === level).length;
      matrixDetails.push({ level, count: levelCount });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        referralCode: user.referralCode || 'Not generated yet',
        referrer: user.referrer || 'Not joined under anyone',
        directReferrals: user.referrals,
        teamSize: user.teamSize,
        matrixDetails,
        rank: user.rank,
        incomeWallet: user.incomeWallet,
        tradingPackage: user.tradingPackage
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching referral dashboard',
      error: err.message
    });
  }
};

// Purchase FX trading package
exports.purchaseTradingPackage = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if already purchased
    if (user.tradingPackage.purchased) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already purchased a trading package'
      });
    }
    
    // Check requirements: active subscription and TPIN
    if (!user.subscription.active || !user.tpin.active) {
      return res.status(400).json({
        status: 'error',
        message: 'You need an active subscription and TPIN to purchase a trading package'
      });
    }
    
    // Handle payment - use payment details from request
    const { paymentId, screenshot } = req.body;
    
    if (!paymentId || !req.files || !req.files.screenshot) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide payment details and screenshot'
      });
    }
    
    // Save screenshot
    const paymentScreenshot = req.files.screenshot;
    const screenshotPath = `/uploads/payments/${req.user.id}-${Date.now()}-${paymentScreenshot.name}`;
    
    // Move screenshot to upload folder
    paymentScreenshot.mv(`./public${screenshotPath}`, async err => {
      if (err) {
        return res.status(500).json({
          status: 'error',
          message: 'Error uploading payment screenshot',
          error: err.message
        });
      }
      
      // Save payment details
      user.paymentDetails.push({
        paymentId,
        amount: 5999, // ₹5999 for FX Trading package
        currency: 'INR',
        status: 'pending',
        screenshot: screenshotPath,
        date: Date.now()
      });
      
      // Set trading package as pending (admin will approve)
      user.tradingPackage = {
        purchased: false,
        startDate: null,
        expectedReturn: 15000 // ₹15,000 expected return
      };
      
      await user.save();
      
      res.status(200).json({
        status: 'success',
        message: 'Trading package purchase submitted for approval',
        data: {
          paymentId,
          amount: 5999,
          currency: 'INR',
          status: 'pending'
        }
      });
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error purchasing trading package',
      error: err.message
    });
  }
};

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, paymentMethod, upiId, bankDetails } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide withdrawal amount'
      });
    }
    
    // Validate payment method
    if (!paymentMethod || !['upi', 'bank'].includes(paymentMethod)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid payment method (upi or bank)'
      });
    }
    
    // Validate payment details based on method
    if (paymentMethod === 'upi' && !upiId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide UPI ID for UPI payment method'
      });
    }
    
    if (paymentMethod === 'bank' && (!bankDetails || !bankDetails.accountNumber || 
        !bankDetails.ifscCode || !bankDetails.accountHolderName || !bankDetails.bankName)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide complete bank details for bank transfer'
      });
    }
    
    // Minimum withdrawal is ₹150
    if (amount < 150) {
      return res.status(400).json({
        status: 'error',
        message: 'Minimum withdrawal amount is ₹150'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if enough balance
    if (user.incomeWallet.balance < amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient balance for withdrawal'
      });
    }
    
    // Check requirements: active subscription and TPIN
    if (!user.subscription.active || !user.tpin.active) {
      return res.status(400).json({
        status: 'error',
        message: 'You need an active subscription and TPIN to request withdrawal'
      });
    }
    
    // Save payment method to user profile for future use
    if (paymentMethod === 'upi') {
      user.paymentMethods.upiId = upiId;
    } else if (paymentMethod === 'bank') {
      user.paymentMethods.bankDetails = bankDetails;
    }
    
    // Create payment details object based on method
    const paymentDetails = {};
    if (paymentMethod === 'upi') {
      paymentDetails.upiId = upiId;
    } else {
      paymentDetails.bankDetails = bankDetails;
    }
    
    // Add withdrawal request
    user.withdrawals.push({
      amount,
      requestDate: Date.now(),
      status: 'pending',
      paymentMethod,
      paymentDetails
    });
    
    // Deduct from available balance (pending admin approval)
    user.incomeWallet.balance -= amount;
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Withdrawal request submitted successfully',
      data: {
        amount,
        status: 'pending',
        requestDate: new Date(),
        paymentMethod,
        paymentDetails,
        remainingBalance: user.incomeWallet.balance
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error requesting withdrawal',
      error: err.message
    });
  }
};

// Get withdrawal history
exports.getWithdrawalHistory = async (req, res) => {
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
        withdrawals: user.withdrawals
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching withdrawal history',
      error: err.message
    });
  }
};

// HELPER FUNCTIONS

// Update user rank based on team size
const updateUserRank = (user) => {
  if (user.teamSize >= 100) {
    user.rank = 'Executive';
  } else if (user.teamSize >= 50) {
    user.rank = 'Director';
  } else if (user.teamSize >= 25) {
    user.rank = 'Manager';
  } else if (user.teamSize >= 10) {
    user.rank = 'Senior';
  } else if (user.teamSize >= 5) {
    user.rank = 'Associate';
  }
  
  // Add rank rewards if rank changed
  addRankRewards(user);
};

// Add rank rewards based on rank
const addRankRewards = (user) => {
  let rankReward = 0;
  
  switch(user.rank) {
    case 'Executive':
      rankReward = 5000;
      break;
    case 'Director':
      rankReward = 2000;
      break;
    case 'Manager':
      rankReward = 1000;
      break;
    case 'Senior':
      rankReward = 500;
      break;
    case 'Associate':
      rankReward = 200;
      break;
  }
  
  if (rankReward > 0) {
    user.incomeWallet.rankRewards += rankReward;
    user.incomeWallet.balance += rankReward;
  }
};

// Recursively add user to upline's downline
const addUserToUplineDownline = async (userId, uplineId, level) => {
  if (level > 7) return; // Only track 7 levels for matrix commission
  
  const upline = await User.findById(uplineId);
  if (!upline) return;
  
  // Add to downline with current level
  upline.downline.push({
    user: userId,
    level
  });
  
  // Add matrix income based on level
  const matrixIncome = getMatrixIncomeForLevel(level);
  upline.incomeWallet.matrixIncome += matrixIncome;
  upline.incomeWallet.balance += matrixIncome;
  
  await upline.save();
  
  // Recursively add to next upline level
  if (upline.referrer) {
    await addUserToUplineDownline(userId, upline.referrer, level + 1);
  }
};

// Helper function to add user to referrers' downline array and distribute matrix income
const addUserToReferrersDownline = async (userId, referrerId, level = 1) => {
  if (!referrerId || level > 7) return;
  
  const referrer = await User.findById(referrerId);
  if (!referrer) return;
  
  // Add to downline with level information
  referrer.downline.push({ user: userId, level });
  
  // Add matrix income for the level
  const matrixIncomeForLevel = getMatrixIncomeForLevel(level);
  referrer.incomeWallet.matrixIncome += matrixIncomeForLevel;
  referrer.incomeWallet.balance += matrixIncomeForLevel;
  referrer.incomeWallet.lastUpdated = Date.now();
  
  await referrer.save();
  
  // Recurse up the referrer tree (if referrer has a referrer)
  if (referrer.referrer) {
    await addUserToReferrersDownline(userId, referrer.referrer, level + 1);
  }
};

// Process matrix income distribution when a user becomes eligible (TPIN activated)
exports.processMatrixIncomeOnTpinActivation = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.referrer) return;
    
    // Only process if user has active TPIN and subscription
    if (!user.tpin.active || !user.subscription.active) return;
    
    // Add direct income to the referrer
    const referrer = await User.findById(user.referrer);
    if (!referrer) return;
    
    // Add direct income to referrer (₹20 per direct referral)
    referrer.incomeWallet.directIncome += 20;
    referrer.incomeWallet.balance += 20;
    referrer.incomeWallet.lastUpdated = Date.now();
    await referrer.save();
    
    // Process matrix income for the entire chain
    await addUserToReferrersDownline(userId, user.referrer);
    
    // Update referrer's rank if needed
    await updateUserRank(user.referrer);
    
    console.log(`Matrix income processed for user: ${userId}`);
  } catch (err) {
    console.error('Error processing matrix income:', err);
  }
};

// Get matrix income for each level
const getMatrixIncomeForLevel = (level) => {
  const incomeByLevel = {
    1: 20,  // Level 1: ₹20
    2: 10,  // Level 2: ₹10
    3: 5,   // Level 3: ₹5
    4: 3,   // Level 4: ₹3
    5: 2,   // Level 5: ₹2
    6: 1,   // Level 6: ₹1
    7: 1    // Level 7: ₹1
  };
  
  return incomeByLevel[level] || 0;
};
