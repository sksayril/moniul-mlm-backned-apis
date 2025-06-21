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
    const { amount, paymentMethod, upiId, bankDetails, cryptoWallet } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide withdrawal amount'
      });
    }
    
    // Validate payment method
    if (!paymentMethod || !['upi', 'bank', 'crypto'].includes(paymentMethod)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid payment method (upi, bank, or crypto)'
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
    
    if (paymentMethod === 'crypto' && (!cryptoWallet || !cryptoWallet.walletAddress || 
        !cryptoWallet.walletType || !cryptoWallet.network)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide complete crypto wallet details (walletAddress, walletType, and network)'
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
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'You need an active account to request withdrawal'
      });
    }
    
    // Save payment method to user profile for future use
    if (paymentMethod === 'upi') {
      user.paymentMethods.upiId = upiId;
    } else if (paymentMethod === 'bank') {
      user.paymentMethods.bankDetails = bankDetails;
    } else if (paymentMethod === 'crypto') {
      user.paymentMethods.cryptoWallet = cryptoWallet;
    }
    
    // Create payment details object based on method
    const paymentDetails = {};
    if (paymentMethod === 'upi') {
      paymentDetails.upiId = upiId;
    } else if (paymentMethod === 'bank') {
      paymentDetails.bankDetails = bankDetails;
    } else if (paymentMethod === 'crypto') {
      paymentDetails.cryptoWallet = cryptoWallet;
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
    const userId = req.user._id;
    
    // Get user with withdrawals
    const user = await User.findById(userId)
      .select('withdrawals incomeWallet.balance incomeWallet.withdrawnAmount');
    
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
    
    // Calculate statistics
    const totalWithdrawn = user.incomeWallet.withdrawnAmount || 0;
    const pendingAmount = sortedWithdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);
    
    const pendingCount = sortedWithdrawals.filter(w => w.status === 'pending').length;
    const approvedCount = sortedWithdrawals.filter(w => w.status === 'approved').length;
    const rejectedCount = sortedWithdrawals.filter(w => w.status === 'rejected').length;
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalWithdrawn,
          pendingAmount,
          availableBalance: user.incomeWallet.balance,
          withdrawals: {
            total: sortedWithdrawals.length,
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount
          }
        },
        withdrawals: sortedWithdrawals
      }
    });
  } catch (err) {
    console.error('Get Withdrawal History Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching withdrawal history',
      error: err.message
    });
  }
};

// Get user's withdrawal history by status
exports.getWithdrawalsByStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.params;
    
    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be pending, approved, or rejected'
      });
    }
    
    // Get user with withdrawals
    const user = await User.findById(userId)
      .select('withdrawals incomeWallet.balance incomeWallet.withdrawnAmount');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Filter withdrawals by status
    const filteredWithdrawals = user.withdrawals
      .filter(w => w.status === status)
      .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    
    // Calculate status-specific statistics
    const totalAmount = filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          status: status,
          count: filteredWithdrawals.length,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          availableBalance: user.incomeWallet.balance || 0
        },
        withdrawals: filteredWithdrawals
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

// Get user's pending withdrawals
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user with withdrawals
    const user = await User.findById(userId)
      .select('withdrawals incomeWallet.balance');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Filter pending withdrawals
    const pendingWithdrawals = user.withdrawals
      .filter(w => w.status === 'pending')
      .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    
    const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          pendingCount: pendingWithdrawals.length,
          totalPendingAmount: parseFloat(totalPendingAmount.toFixed(2)),
          availableBalance: user.incomeWallet.balance || 0
        },
        pendingWithdrawals
      }
    });
  } catch (err) {
    console.error('Get Pending Withdrawals Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending withdrawals',
      error: err.message
    });
  }
};

// Get user's approved withdrawals
exports.getApprovedWithdrawals = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user with withdrawals
    const user = await User.findById(userId)
      .select('withdrawals incomeWallet.withdrawnAmount');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Filter approved withdrawals
    const approvedWithdrawals = user.withdrawals
      .filter(w => w.status === 'approved')
      .sort((a, b) => new Date(b.processedDate || b.requestDate) - new Date(a.processedDate || a.requestDate));
    
    const totalApprovedAmount = approvedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          approvedCount: approvedWithdrawals.length,
          totalApprovedAmount: parseFloat(totalApprovedAmount.toFixed(2)),
          totalWithdrawn: user.incomeWallet.withdrawnAmount || 0
        },
        approvedWithdrawals
      }
    });
  } catch (err) {
    console.error('Get Approved Withdrawals Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching approved withdrawals',
      error: err.message
    });
  }
};

// Get user's rejected withdrawals
exports.getRejectedWithdrawals = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user with withdrawals
    const user = await User.findById(userId)
      .select('withdrawals incomeWallet.balance');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Filter rejected withdrawals
    const rejectedWithdrawals = user.withdrawals
      .filter(w => w.status === 'rejected')
      .sort((a, b) => new Date(b.processedDate || b.requestDate) - new Date(a.processedDate || a.requestDate));
    
    const totalRejectedAmount = rejectedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          rejectedCount: rejectedWithdrawals.length,
          totalRejectedAmount: parseFloat(totalRejectedAmount.toFixed(2)),
          availableBalance: user.incomeWallet.balance || 0
        },
        rejectedWithdrawals
      }
    });
  } catch (err) {
    console.error('Get Rejected Withdrawals Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching rejected withdrawals',
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
  
  // Calculate current count for this level
  const currentLevelCount = upline.downline.filter(item => item.level === level).length;
  
  // Calculate matrix income based on completed cycles
  const newMatrixIncome = calculateMatrixIncome(currentLevelCount, level);
  const previousMatrixIncome = calculateMatrixIncome(currentLevelCount - 1, level);
  const incomeToAdd = newMatrixIncome - previousMatrixIncome;
  
  // Only add income if a new cycle is completed
  if (incomeToAdd > 0) {
    upline.incomeWallet.matrixIncome += incomeToAdd;
    upline.incomeWallet.balance += incomeToAdd;
    
    // Add income transaction record
    upline.incomeTransactions.push({
      type: 'matrix_income',
      amount: incomeToAdd,
      level: level,
      fromUser: userId,
      date: Date.now(),
      description: `Matrix Level ${level} cycle completed - ${currentLevelCount} users`
    });
    
    console.log(`Matrix income of ₹${incomeToAdd} added to user ${upline._id} for Level ${level} completion (${currentLevelCount} users)`);
  }
  
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
  
  // Calculate current count for this level
  const currentLevelCount = referrer.downline.filter(item => item.level === level).length;
  
  // Calculate matrix income based on completed cycles
  const newMatrixIncome = calculateMatrixIncome(currentLevelCount, level);
  const previousMatrixIncome = calculateMatrixIncome(currentLevelCount - 1, level);
  const incomeToAdd = newMatrixIncome - previousMatrixIncome;
  
  // Only add income if a new cycle is completed
  if (incomeToAdd > 0) {
    referrer.incomeWallet.matrixIncome += incomeToAdd;
    referrer.incomeWallet.balance += incomeToAdd;
    
    // Add income transaction record
    referrer.incomeTransactions.push({
      type: 'matrix_income',
      amount: incomeToAdd,
      level: level,
      fromUser: userId,
      date: Date.now(),
      description: `Matrix Level ${level} cycle completed - ${currentLevelCount} users`
    });
    
    console.log(`Matrix income of ₹${incomeToAdd} added to referrer ${referrer._id} for Level ${level} completion (${currentLevelCount} users)`);
  }
  
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

// Get matrix capacity and income for each level
const getMatrixInfo = () => {
  return {
    1: { capacity: 5, totalIncome: 50 },      // 5 users = ₹50
    2: { capacity: 25, totalIncome: 125 },    // 25 users = ₹125 (₹5 per user as user requested)
    3: { capacity: 125, totalIncome: 625 },   // 125 users = ₹625 (₹5 per user)
    4: { capacity: 625, totalIncome: 1875 },  // 625 users = ₹1875 (₹3 per user)
    5: { capacity: 3125, totalIncome: 6250 }, // 3125 users = ₹6250 (₹2 per user)
    6: { capacity: 15625, totalIncome: 15625 }, // 15625 users = ₹15625 (₹1 per user)
    7: { capacity: 78125, totalIncome: 78125 }  // 78125 users = ₹78125 (₹1 per user)
  };
};

// Calculate matrix income based on completed cycles
const calculateMatrixIncome = (currentCount, level) => {
  const matrixInfo = getMatrixInfo();
  const levelInfo = matrixInfo[level];
  
  if (!levelInfo) return 0;
  
  // Calculate how many complete cycles are achieved
  const completedCycles = Math.floor(currentCount / levelInfo.capacity);
  
  // Return income for completed cycles only
  return completedCycles * levelInfo.totalIncome;
};

// Get user's referral link
exports.getReferralLink = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Use userId as referral code if no specific referral code exists
    const referralCode = user.referralCode || user.userId;
    
    res.status(200).json({
      status: 'success',
      data: {
        userId: user.userId,
        referralCode: referralCode,
        referralLink: `https://dashboard.forlifetradingindia.life/register?ref=${referralCode}`
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching referral link',
      error: err.message
    });
  }
};

// Get direct referrals
exports.getDirectReferrals = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Populate direct referrals with necessary information
    await User.populate(user, {
      path: 'referrals',
      select: 'name userId isActive createdAt teamSize'
    });
    
    // Format the response
    const directReferrals = user.referrals.map(referral => ({
      name: referral.name,
      userId: referral.userId,
      isActive: referral.isActive,
      joinDate: referral.createdAt,
      teamSize: referral.teamSize || 0
    }));
    
    res.status(200).json({
      status: 'success',
      results: directReferrals.length,
      data: {
        directReferrals
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching direct referrals',
      error: err.message
    });
  }
};

// Get detailed referral income
exports.getReferralIncome = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Calculate withdrawn amount from completed withdrawals
    const withdrawnAmount = user.withdrawals
      .filter(w => w.status === 'approved')
      .reduce((sum, w) => sum + w.amount, 0);
    
    // Create recent transactions array
    const recentTransactions = [];
    
    // Add recent withdrawals to transactions
    user.withdrawals.slice(0, 5).forEach(withdrawal => {
      recentTransactions.push({
        type: 'withdrawal',
        amount: -withdrawal.amount,
        status: withdrawal.status,
        date: withdrawal.requestDate
      });
    });
    
    // Add more transaction types here if you track them in your system
    
    res.status(200).json({
      status: 'success',
      data: {
        totalEarnings: user.incomeWallet.selfIncome + 
                      user.incomeWallet.directIncome + 
                      user.incomeWallet.matrixIncome + 
                      user.incomeWallet.rankRewards,
        availableBalance: user.incomeWallet.balance,
        withdrawnAmount: withdrawnAmount,
        incomeBreakdown: {
          directIncome: user.incomeWallet.directIncome,
          matrixIncome: user.incomeWallet.matrixIncome,
          rankRewards: user.incomeWallet.rankRewards,
          selfIncome: user.incomeWallet.selfIncome
        },
        recentTransactions: recentTransactions
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching referral income details',
      error: err.message
    });
  }
};

// Get matrix structure and income details
exports.getMatrixStructure = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('downline.userId', 'name userId email isActive')
      .populate('incomeTransactions.fromUser', 'name userId');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Matrix capacity and income for each level
    const matrixInfo = getMatrixInfo();
    
    // Organize downline by levels
    const matrixStructure = {};
    for (let level = 1; level <= 7; level++) {
      const levelMembers = user.downline.filter(member => member.level === level);
      const completedCycles = Math.floor(levelMembers.length / matrixInfo[level].capacity);
      const earnedIncome = completedCycles * matrixInfo[level].totalIncome;
      
      matrixStructure[level] = {
        capacity: matrixInfo[level].capacity,
        currentCount: levelMembers.length,
        completedCycles: completedCycles,
        incomePerCycle: matrixInfo[level].totalIncome,
        earnedIncome: earnedIncome,
        nextCycleProgress: levelMembers.length % matrixInfo[level].capacity,
        nextCycleNeeded: matrixInfo[level].capacity - (levelMembers.length % matrixInfo[level].capacity),
        members: levelMembers.map(member => ({
          userId: member.userId._id,
          name: member.userId.name,
          userIdCode: member.userId.userId,
          email: member.userId.email,
          isActive: member.userId.isActive,
          addedAt: member.addedAt
        }))
      };
    }
    
    // Calculate total matrix income earned
    const matrixIncomeTransactions = user.incomeTransactions.filter(tx => tx.type === 'matrix_income');
    const totalMatrixIncome = matrixIncomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Recent income transactions
    const recentTransactions = user.incomeTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .map(tx => ({
        type: tx.type,
        amount: tx.amount,
        level: tx.level,
        fromUser: tx.fromUser ? {
          name: tx.fromUser.name,
          userId: tx.fromUser.userId
        } : null,
        date: tx.date,
        description: tx.description
      }));
    
    res.status(200).json({
      status: 'success',
      data: {
        userInfo: {
          name: user.name,
          userId: user.userId,
          isActive: user.isActive,
          rank: user.rank,
          teamSize: user.teamSize
        },
        incomeWallet: user.incomeWallet,
        matrixStructure,
        matrixSummary: {
          totalLevels: 7,
          totalMatrixIncome,
          totalDownlineMembers: user.downline.length,
          activationIncome: user.incomeWallet.selfIncome,
          directReferralIncome: user.incomeWallet.directIncome
        },
        recentTransactions
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching matrix structure',
      error: err.message
    });
  }
};

// Get matrix income status and cycles for debugging
exports.getMatrixIncomeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const matrixInfo = getMatrixInfo();
    const matrixStatus = {};
    
    // Calculate status for each level
    for (let level = 1; level <= 7; level++) {
      const levelMembers = user.downline.filter(member => member.level === level);
      const currentCount = levelMembers.length;
      const capacity = matrixInfo[level].capacity;
      const completedCycles = Math.floor(currentCount / capacity);
      const earnedIncome = calculateMatrixIncome(currentCount, level);
      const progressInCurrentCycle = currentCount % capacity;
      const neededForNextCycle = capacity - progressInCurrentCycle;
      
      matrixStatus[level] = {
        capacity,
        currentCount,
        completedCycles,
        earnedIncome,
        incomePerCycle: matrixInfo[level].totalIncome,
        progressInCurrentCycle,
        neededForNextCycle: neededForNextCycle === capacity ? 0 : neededForNextCycle,
        completionPercentage: ((progressInCurrentCycle / capacity) * 100).toFixed(2)
      };
    }
    
    // Calculate total matrix income earned
    const totalMatrixIncome = user.incomeWallet.matrixIncome || 0;
    
    res.status(200).json({
      status: 'success',
      data: {
        userInfo: {
          name: user.name,
          userId: user.userId,
          isActive: user.isActive
        },
        totalMatrixIncome,
        currentBalance: user.incomeWallet.balance,
        matrixStatus,
        summary: {
          totalDownlineMembers: user.downline.length,
          totalCompletedCycles: Object.values(matrixStatus).reduce((sum, level) => sum + level.completedCycles, 0),
          potentialNextIncome: Math.min(...Object.values(matrixStatus).map(level => 
            level.neededForNextCycle === 0 ? Infinity : level.incomePerCycle
          ))
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching matrix income status',
      error: err.message
    });
  }
};

// Get income summary with breakdown
exports.getIncomeBreakdown = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Group income transactions by type
    const incomeByType = {};
    const incomeByLevel = {};
    
    user.incomeTransactions.forEach(tx => {
      // Group by transaction type
      if (!incomeByType[tx.type]) {
        incomeByType[tx.type] = {
          totalAmount: 0,
          count: 0,
          transactions: []
        };
      }
      incomeByType[tx.type].totalAmount += tx.amount;
      incomeByType[tx.type].count += 1;
      incomeByType[tx.type].transactions.push(tx);
      
      // Group matrix income by level
      if (tx.type === 'matrix_income' && tx.level) {
        if (!incomeByLevel[tx.level]) {
          incomeByLevel[tx.level] = {
            totalAmount: 0,
            count: 0
          };
        }
        incomeByLevel[tx.level].totalAmount += tx.amount;
        incomeByLevel[tx.level].count += 1;
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        totalEarnings: user.incomeWallet.totalEarnings,
        currentBalance: user.incomeWallet.balance,
        withdrawnAmount: user.incomeWallet.withdrawnAmount,
        incomeBreakdown: {
          selfIncome: user.incomeWallet.selfIncome,
          directIncome: user.incomeWallet.directIncome,
          matrixIncome: user.incomeWallet.matrixIncome,
          rankRewards: user.incomeWallet.rankRewards,
          fxTradingIncome: user.incomeWallet.fxTradingIncome
        },
        incomeByType,
        matrixIncomeByLevel: incomeByLevel,
        lastUpdated: user.incomeWallet.lastUpdated
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching income breakdown',
      error: err.message
    });
  }
};
