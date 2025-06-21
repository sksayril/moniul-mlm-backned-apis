const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT secret from environment variable or default
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-in-env-file';

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Generate user ID in format LIFE + sequential number
async function generateUserId() {
  try {
    // Get the last user from database sorted by userId
    const lastUser = await User.findOne().sort({ userId: -1 }).limit(1);
    
    let nextNumber = 10001; // Start with 10001 if no users exist
    
    if (lastUser && lastUser.userId && lastUser.userId.startsWith('LIFE')) {
      // Extract the number part from userId
      const numPart = lastUser.userId.substring(4);
      const lastNumber = parseInt(numPart, 10);
      
      // Increment for the next user
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    return `LIFE${nextNumber}`;
  } catch (err) {
    console.error('Error generating userId:', err);
    throw err;
  }
}

// Register a new user
exports.signup = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;
    
    // Check if user already exists with same email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already in use. Please use a different email address'
      });
    }
    
    // Check referral code if provided
    let referrerId = null;
    if (referralCode) {
      try {
        console.log(`Validating referral code: ${referralCode}`);
        // Use userId as referral code
        const referrer = await User.findOne({ userId: referralCode });
        
        if (!referrer) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid referral code. Please verify and try again.'
          });
        }
        
        console.log(`Found referrer: ${referrer.name} (${referrer._id})`);
        referrerId = referrer._id;
      } catch (refErr) {
        console.error('Error processing referral code:', refErr);
        return res.status(500).json({
          status: 'error',
          message: 'Error processing referral code. Please try again.'
        });
      }
    }
    
    // Generate userId for new user
    const userId = await generateUserId();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user with optional referral
    const userData = {
      name,
      email,
      userId,
      password: hashedPassword,
      originalPassword: password  // ⚠️ SECURITY RISK: Storing plain text password
    };
    
    // Add referrer if referral code was provided
    if (referrerId) {
      userData.referrer = referrerId;
    }
    
    const user = await User.create(userData);
    
    // If user was referred, update referrer's referrals array
    if (referrerId) {
      await User.findByIdAndUpdate(referrerId, {
        $push: { referrals: user._id },
        $inc: { teamSize: 1 }
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(201).json({
      status: 'success',
      token,
      data: { user,referralCode }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating user',
      error: err.message
    });
  }
};

// Login user
exports.signin = async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    // Check if userId and password exist
    if (!userId || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide user ID and password'
      });
    }
    
    // Check if user exists && password is correct
    const user = await User.findOne({ userId }).select('+password');
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect user ID or password'
      });
    }
    
    // Check if user is blocked
    if (user.blocked) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been blocked. Please contact administrator for assistance.',
        blocked: true,
        blockReason: user.blockReason || 'Account blocked by administrator'
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      token,
      data: { user }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error logging in',
      error: err.message
    });
  }
};

// Check TPIN activation status and eligibility
exports.checkTPINStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if account is already active
    if (user.isActive) {
      return res.status(200).json({
        status: 'success',
        data: {
          accountStatus: 'active',
          isActive: true,
          activatedAt: user.activatedAt,
          message: 'Your account is already activated'
        }
      });
    }
    
    // Check available TPINs
    const availableTPINs = user.tpins.filter(tpin => 
      tpin.status === 'approved' && !tpin.isUsed
    );
    
    const pendingTPINs = user.tpins.filter(tpin => 
      tpin.status === 'pending' && !tpin.isUsed
    );
    
    const usedTPINs = user.tpins.filter(tpin => tpin.isUsed);
    
    res.status(200).json({
      status: 'success',
      data: {
        accountStatus: 'inactive',
        isActive: false,
        canActivate: availableTPINs.length > 0,
        tpinSummary: {
          available: availableTPINs.length,
          pending: pendingTPINs.length,
          used: usedTPINs.length,
          total: user.tpins.length
        },
        activationBonus: '₹10 instant bonus on first activation',
        instructions: availableTPINs.length > 0 
          ? 'You have approved TPINs available. Use any TPIN code to activate your account.'
          : 'No approved TPINs available. Please purchase a TPIN and wait for admin approval.'
      }
    });
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error checking TPIN status',
      error: err.message
    });
  }
};

// Get current user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('referrer', 'name userId email')
      .populate('matrixLevels.members.userId', 'name userId email')
      .select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Initialize matrix levels if not exists
    const { initializeMatrixLevels } = require('./matrix.controller');
    await initializeMatrixLevels(user._id);
    
    // Reload user with matrix levels
    const updatedUser = await User.findById(req.user.id)
      .populate('referrer', 'name userId email')
      .populate('matrixLevels.members.userId', 'name userId email')
      .select('-password -__v');

    // Calculate daily income statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyIncomeStats = {
      totalDailyIncome: updatedUser.incomeWallet?.dailyIncome || 0,
      lastDailyIncome: updatedUser.incomeWallet?.lastDailyIncome || null,
      receivedToday: updatedUser.incomeWallet?.lastDailyIncome && 
                    new Date(updatedUser.incomeWallet.lastDailyIncome) >= today,
      dailyIncomeAmount: 5
    };

    // Calculate matrix level statistics
    const matrixStats = {
      totalMatrixIncome: updatedUser.incomeWallet?.matrixIncome || 0,
      matrixLevels: updatedUser.matrixLevels?.map(level => ({
        level: level.level,
        membersCount: level.membersCount,
        requiredMembers: level.requiredMembers,
        rewardAmount: level.rewardAmount,
        isCompleted: level.isCompleted,
        completedAt: level.completedAt,
        progress: `${level.membersCount}/${level.requiredMembers}`,
        progressPercentage: ((level.membersCount / level.requiredMembers) * 100).toFixed(1),
        nextReward: level.isCompleted ? 0 : level.rewardAmount,
        membersNeeded: level.isCompleted ? 0 : (level.requiredMembers - level.membersCount)
      })) || []
    };

    // Get recent income transactions (last 10)
    const recentTransactions = updatedUser.incomeTransactions
      ?.filter(transaction => ['daily_income', 'matrix_income'].includes(transaction.type))
      ?.sort((a, b) => new Date(b.date) - new Date(a.date))
      ?.slice(0, 10) || [];

    // Calculate total income breakdown
    const incomeBreakdown = {
      selfIncome: updatedUser.incomeWallet?.selfIncome || 0,
      directIncome: updatedUser.incomeWallet?.directIncome || 0,
      matrixIncome: updatedUser.incomeWallet?.matrixIncome || 0,
      dailyIncome: updatedUser.incomeWallet?.dailyIncome || 0,
      dailyTeamIncome: updatedUser.incomeWallet?.dailyTeamIncome || 0,
      rankRewards: updatedUser.incomeWallet?.rankRewards || 0,
      fxTradingIncome: updatedUser.incomeWallet?.fxTradingIncome || 0,
      totalBalance: updatedUser.incomeWallet?.balance || 0,
      totalEarnings: updatedUser.incomeWallet?.totalEarnings || 0,
      withdrawnAmount: updatedUser.incomeWallet?.withdrawnAmount || 0
    };

    // Calculate rank progress and rewards
    const directReferrals = await User.countDocuments({
      referrer: updatedUser._id,
      isActive: true
    });

    const rankStructure = [
      { rank: 'BRONZE', members: 25, reward: 500, description: '₹500 + ID Card' },
      { rank: 'SILVER', members: 50, reward: 1000, description: '₹1000 + Bag' },
      { rank: 'GOLD', members: 100, reward: 2500, description: '₹2500 + Mobile Phone' },
      { rank: 'RUBY', members: 200, reward: 10000, description: '₹10000 + Mobile Phone + Tour' },
      { rank: 'DIAMOND', members: 400, reward: 15000, description: '₹15K + India Tour' },
      { rank: 'PLATINUM', members: 800, reward: 25000, description: '₹25K + International Tour' },
      { rank: 'KING', members: 1600, reward: 60000, description: '₹60K + Bike + International Tour' }
    ];

    const currentRank = updatedUser.rank || 'Newcomer';
    const nextRank = rankStructure.find(rank => directReferrals < rank.members);
    
    const rankRewardStats = {
      currentRank,
      directReferrals,
      totalRankRewards: updatedUser.incomeWallet?.rankRewards || 0,
      nextRank: nextRank ? {
        rank: nextRank.rank,
        requiredMembers: nextRank.members,
        reward: nextRank.reward,
        description: nextRank.description,
        membersNeeded: nextRank.members - directReferrals,
        progress: `${directReferrals}/${nextRank.members}`,
        progressPercentage: ((directReferrals / nextRank.members) * 100).toFixed(1)
      } : null,
      achievedRanks: updatedUser.incomeTransactions?.filter(t => 
        t.type === 'rank_reward'
      ).map(t => ({
        rank: t.description.split(' ')[0],
        amount: t.amount,
        date: t.date,
        description: t.description
      })) || []
    };
    
    res.status(200).json({
      status: 'success',
      message: 'User profile retrieved successfully',
      data: { 
        user: updatedUser,
        dailyIncomeStats,
        matrixStats,
        incomeBreakdown,
        rankRewardStats,
        recentTransactions
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile',
      error: err.message
    });
  }
};

// Update user profile
exports.updateMe = async (req, res) => {
  try {
    // Don't allow password updates here
    if (req.body.password) {
      return res.status(400).json({
        status: 'error',
        message: 'This route is not for password updates. Please use /updatePassword'
      });
    }
    
    // Don't allow userId updates
    if (req.body.userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID cannot be updated'
      });
    }
    
    // Filter out fields that shouldn't be updated
    const filteredBody = {};
    const allowedFields = ['name'];
    
    Object.keys(req.body).forEach(field => {
      if (allowedFields.includes(field)) {
        filteredBody[field] = req.body[field];
      }
    });
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating user profile',
      error: err.message
    });
  }
};

// Activate account with TPIN
exports.activateAccount = async (req, res) => {
  try {
    const { tpinCode } = req.body;
    
    if (!tpinCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide TPIN code'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Check if account is already active
    if (user.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Account is already activated'
      });
    }
    
    // Validate TPIN code
    const tpinValidation = validateTPINCode(user.tpins, tpinCode);
    
    if (!tpinValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: `TPIN activation failed: ${tpinValidation.reason}`,
        hint: 'Please check your TPIN code or contact admin if the issue persists'
      });
    }
    
    const tpinIndex = tpinValidation.index;
    
    // Mark TPIN as used and account as active
    user.tpins[tpinIndex].isUsed = true;
    user.tpins[tpinIndex].usedAt = Date.now();
    user.tpins[tpinIndex].activationDate = Date.now();
    user.isActive = true;
    user.activatedAt = Date.now();
    user.activationReason = 'TPIN Code Activation';
    
    // Initialize income wallet if not exists
    if (!user.incomeWallet) {
      user.incomeWallet = {
        balance: 0,
        selfIncome: 0,
        directIncome: 0,
        matrixIncome: 0,
        dailyIncome: 0,
        dailyTeamIncome: 0,
        rankRewards: 0,
        fxTradingIncome: 0,
        totalEarnings: 0,
        withdrawnAmount: 0,
        lastUpdated: Date.now()
      };
    }
    
    // Add ₹10 instant activation bonus for first-time TPIN activation
    const ACTIVATION_BONUS = 10;
    user.incomeWallet.selfIncome += ACTIVATION_BONUS;
    user.incomeWallet.dailyIncome += ACTIVATION_BONUS; // Also add to daily income
    user.incomeWallet.balance += ACTIVATION_BONUS;
    user.incomeWallet.totalEarnings += ACTIVATION_BONUS;
    user.incomeWallet.lastDailyIncome = Date.now(); // Mark as received daily income
    user.incomeWallet.lastUpdated = Date.now();
    
    // Add transaction record for activation bonus
    if (!user.incomeTransactions) {
      user.incomeTransactions = [];
    }
    
    user.incomeTransactions.push({
      type: 'self_income',
      amount: ACTIVATION_BONUS,
      date: Date.now(),
      description: 'Account activation bonus for first TPIN activation (added to self-income and daily income)'
    });
    
    // Add random crypto coin (0.20 to 1.00 INR worth) to user's crypto wallet
    if (!user.cryptoWallet) {
      user.cryptoWallet = {
        enabled: true,
        balance: 0,
        coin: 'MLMCoin',
        transactions: [],
        lastUpdated: Date.now()
      };
    }
    
    // Generate random amount between 0.20 and 1.00 INR
    const minValue = 0.20;
    const maxValue = 1.00;
    const randomInrValue = Math.random() * (maxValue - minValue) + minValue;
    const roundedValue = parseFloat(randomInrValue.toFixed(2));
    
    // Assume 499 MLMCoins are worth 1 INR, calculate coin amount
    const coinRate = 499; // 499 coins = 1 INR
    const coinAmount = roundedValue * coinRate;
    const roundedCoinAmount = parseFloat(coinAmount.toFixed(2));
    
    // Add to wallet
    user.cryptoWallet.enabled = true;
    user.cryptoWallet.balance += roundedCoinAmount;
    user.cryptoWallet.transactions.push({
        amount: roundedCoinAmount,
        type: 'activation_bonus',
        description: `Account activation bonus (${roundedValue} INR worth)`,
        inrValue: roundedValue,
        createdAt: Date.now()
    });
    user.cryptoWallet.lastUpdated = Date.now();
    
    await user.save();
    
    // Log successful activation
    console.log(`🎉 Account activated: ${user.name} (${user.userId}) - TPIN: ${tpinCode} - Bonus: ₹${ACTIVATION_BONUS}`);
    
    // Process MLM income if user has a referrer
    if (user.referrer) {
      console.log(`Processing MLM income for referrer chain starting from: ${user.referrer}`);
      await processMLMIncomeOnActivation(user._id, user.referrer);
      
      // Process new matrix income system
      const { processMatrixIncome } = require('./matrix.controller');
      await processMatrixIncome(user._id, user.referrer);
      
      // Process rank rewards for referrer chain
      await processRankRewards(user.referrer);
      
      console.log(`MLM, matrix income, and rank rewards processing completed for: ${user.userId}`);
    } else {
      console.log(`No referrer found for user: ${user.userId} - No MLM income to process`);
    }
    
    res.status(200).json({
      status: 'success',
      message: '🎉 Account activated successfully! ₹10 instant bonus credited to your wallet',
      data: {
        isActive: user.isActive,
        activatedAt: user.activatedAt,
        tpinUsed: tpinCode,
        instantBonus: {
          amount: ACTIVATION_BONUS,
          type: 'Activation Bonus',
          description: 'First-time account activation reward (added to both self-income and daily income)'
        },
        incomeWallet: {
          currentBalance: user.incomeWallet.balance,
          selfIncome: user.incomeWallet.selfIncome,
          dailyIncome: user.incomeWallet.dailyIncome,
          totalEarnings: user.incomeWallet.totalEarnings
        },
        cryptoWallet: {
          enabled: true,
          coin: user.cryptoWallet.coin,
          balance: user.cryptoWallet.balance,
          bonusInrValue: user.cryptoWallet.transactions.find(t => t.type === 'activation_bonus')?.inrValue || 0
        },
        nextSteps: [
          'Start referring friends using your User ID as referral code',
          'Earn ₹50 for each successful referral',
          'Receive ₹10 daily income for active account',
          'Participate in matrix income program'
        ]
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Error activating account',
      error: err.message
    });
  }
};

// Helper function to validate TPIN code
const validateTPINCode = (tpins, tpinCode) => {
  const tpinIndex = tpins.findIndex(tpin => 
    tpin.code === tpinCode && 
    tpin.status === 'approved' && 
    !tpin.isUsed
  );
  
  if (tpinIndex === -1) {
    // Check specific reasons for failure
    const matchingTpin = tpins.find(tpin => tpin.code === tpinCode);
    if (!matchingTpin) {
      return { valid: false, reason: 'TPIN code not found' };
    }
    if (matchingTpin.status !== 'approved') {
      return { valid: false, reason: 'TPIN not approved yet' };
    }
    if (matchingTpin.isUsed) {
      return { valid: false, reason: 'TPIN already used' };
    }
  }
  
  return { valid: true, index: tpinIndex };
};

// Process MLM income when user activates TPIN
const processMLMIncomeOnActivation = async (userId, referrerId) => {
  try {
    console.log(`Processing direct referral income for referrer: ${referrerId}`);
    
    // Add direct referral income to immediate referrer (₹50)
    const directReferrer = await User.findById(referrerId);
    if (!directReferrer) {
      console.log(`Referrer not found: ${referrerId}`);
      return;
    }
    
    if (!directReferrer.isActive) {
      console.log(`Referrer ${directReferrer.userId} is not active, skipping direct income`);
      return;
    }
    
    console.log(`Adding ₹50 direct income to referrer: ${directReferrer.name} (${directReferrer.userId})`);
    
    // Initialize income wallet if not exists
    if (!directReferrer.incomeWallet) {
      directReferrer.incomeWallet = {
        balance: 0,
        selfIncome: 0,
        directIncome: 0,
        matrixIncome: 0,
        dailyIncome: 0,
        dailyTeamIncome: 0,
        rankRewards: 0,
        fxTradingIncome: 0,
        totalEarnings: 0,
        withdrawnAmount: 0,
        lastUpdated: Date.now()
      };
    }
    
    // Store previous values for logging
    const previousDirectIncome = directReferrer.incomeWallet.directIncome || 0;
    const previousBalance = directReferrer.incomeWallet.balance || 0;
    const previousTotalEarnings = directReferrer.incomeWallet.totalEarnings || 0;
    
    // Add ₹50 direct referral income
    const DIRECT_REFERRAL_BONUS = 50;
    directReferrer.incomeWallet.directIncome = (directReferrer.incomeWallet.directIncome || 0) + DIRECT_REFERRAL_BONUS;
    directReferrer.incomeWallet.balance = (directReferrer.incomeWallet.balance || 0) + DIRECT_REFERRAL_BONUS;
    directReferrer.incomeWallet.totalEarnings = (directReferrer.incomeWallet.totalEarnings || 0) + DIRECT_REFERRAL_BONUS;
    directReferrer.incomeWallet.lastUpdated = Date.now();
    
    // Add transaction record for direct referral income
    if (!directReferrer.incomeTransactions) {
      directReferrer.incomeTransactions = [];
    }
    
    // Get activated user info for transaction description
    const activatedUser = await User.findById(userId);
    const activatedUserInfo = activatedUser ? `${activatedUser.name} (${activatedUser.userId})` : `User ID: ${userId}`;
    
    directReferrer.incomeTransactions.push({
      type: 'direct_income',
      amount: DIRECT_REFERRAL_BONUS,
      fromUser: userId,
      date: Date.now(),
      description: `Direct referral income from ${activatedUserInfo} account activation`
    });
    
    await directReferrer.save();
    
    console.log(`✅ ₹${DIRECT_REFERRAL_BONUS} direct income processed for referrer: ${directReferrer.userId}`);
    console.log(`   Previous directIncome: ₹${previousDirectIncome} → New directIncome: ₹${directReferrer.incomeWallet.directIncome}`);
    console.log(`   Previous balance: ₹${previousBalance} → New balance: ₹${directReferrer.incomeWallet.balance}`);
    console.log(`   Previous totalEarnings: ₹${previousTotalEarnings} → New totalEarnings: ₹${directReferrer.incomeWallet.totalEarnings}`);
    
    // Process matrix income for up to 7 levels
    await processMatrixIncomeOnActivation(userId, referrerId);
    
  } catch (err) {
    console.error('Error processing MLM income:', err);
  }
};

// Process matrix income distribution
const processMatrixIncomeOnActivation = async (newUserId, currentReferrerId, level = 1) => {
  try {
    if (level > 7 || !currentReferrerId) return;
    
    const uplineUser = await User.findById(currentReferrerId);
    if (!uplineUser || !uplineUser.isActive) {
      // If upline user is not active, pass income to next level
      if (uplineUser && uplineUser.referrer) {
        await processMatrixIncomeOnActivation(newUserId, uplineUser.referrer, level + 1);
      }
      return;
    }
    
    // Matrix income amounts for each level (based on provided table)
    const matrixIncomes = {
      1: 50,      // ₹50 for 1st level (5 members)
      2: 125,     // ₹125 for 2nd level (25 members)
      3: 625,     // ₹625 for 3rd level (125 members)
      4: 1875,    // ₹1875 for 4th level (625 members)
      5: 9375,    // ₹9375 for 5th level (3125 members)
      6: 46875,   // ₹46875 for 6th level (15625 members)
      7: 234375   // ₹234375 for 7th level (78125 members)
    };
    
    // Matrix capacity for each level
    const matrixCapacity = {
      1: 5,
      2: 25,
      3: 125,
      4: 625,
      5: 3125,
      6: 15625,
      7: 78125
    };
    
    // Initialize downline if not exists
    if (!uplineUser.downline) {
      uplineUser.downline = [];
    }
    
    // Add user to downline
    const existingDownlineEntry = uplineUser.downline.find(entry => 
      entry.userId.toString() === newUserId.toString() && entry.level === level
    );
    
    if (!existingDownlineEntry) {
      uplineUser.downline.push({
        userId: newUserId,
        level: level,
        addedAt: Date.now()
      });
    }
    
    // Count current level members
    const currentLevelCount = uplineUser.downline.filter(entry => entry.level === level).length;
    
    console.log(`Matrix Level ${level}: User ${uplineUser.userId} has ${currentLevelCount}/${matrixCapacity[level]} members`);
    
    // Check if user has already received this level's matrix income
    const alreadyReceivedThisLevel = uplineUser.incomeTransactions && 
      uplineUser.incomeTransactions.some(transaction => 
        transaction.type === 'matrix_income' && 
        transaction.level === level
      );
    
    // Check if this level is complete and award income (only once per level)
    if (currentLevelCount >= matrixCapacity[level] && !alreadyReceivedThisLevel) {
      console.log(`🎉 Matrix Level ${level} COMPLETED for user ${uplineUser.userId}! Awarding ₹${matrixIncomes[level]}`);
      console.log(`   Achieved: ${currentLevelCount}/${matrixCapacity[level]} members (threshold reached)`);
      
      // Initialize income wallet if not exists
      if (!uplineUser.incomeWallet) {
        uplineUser.incomeWallet = {
          balance: 0,
          selfIncome: 0,
          directIncome: 0,
          matrixIncome: 0,
          dailyIncome: 0,
          dailyTeamIncome: 0,
          rankRewards: 0,
          fxTradingIncome: 0,
          totalEarnings: 0,
          withdrawnAmount: 0,
          lastUpdated: Date.now()
        };
      }
      
      // Store previous values for logging
      const previousMatrixIncome = uplineUser.incomeWallet.matrixIncome || 0;
      const previousBalance = uplineUser.incomeWallet.balance || 0;
      const previousTotalEarnings = uplineUser.incomeWallet.totalEarnings || 0;
      
      const incomeAmount = matrixIncomes[level];
      uplineUser.incomeWallet.matrixIncome = (uplineUser.incomeWallet.matrixIncome || 0) + incomeAmount;
      uplineUser.incomeWallet.balance = (uplineUser.incomeWallet.balance || 0) + incomeAmount;
      uplineUser.incomeWallet.totalEarnings = (uplineUser.incomeWallet.totalEarnings || 0) + incomeAmount;
      uplineUser.incomeWallet.lastUpdated = Date.now();
      
      // Add income transaction record
      if (!uplineUser.incomeTransactions) {
        uplineUser.incomeTransactions = [];
      }
      
      // Get activated user info for transaction description
      const activatedUser = await User.findById(newUserId);
      const activatedUserInfo = activatedUser ? `${activatedUser.name} (${activatedUser.userId})` : `User ID: ${newUserId}`;
      
      uplineUser.incomeTransactions.push({
        type: 'matrix_income',
        amount: incomeAmount,
        level: level,
        fromUser: newUserId,
        date: Date.now(),
        description: `Matrix Level ${level} completion bonus - ${matrixCapacity[level]} members achieved (triggered by ${activatedUserInfo})`
      });
      
      await uplineUser.save();
      
      console.log(`✅ ₹${incomeAmount} matrix income (Level ${level}) processed for user: ${uplineUser.userId}`);
      console.log(`   Previous matrixIncome: ₹${previousMatrixIncome} → New matrixIncome: ₹${uplineUser.incomeWallet.matrixIncome}`);
      console.log(`   Previous balance: ₹${previousBalance} → New balance: ₹${uplineUser.incomeWallet.balance}`);
      console.log(`   Previous totalEarnings: ₹${previousTotalEarnings} → New totalEarnings: ₹${uplineUser.incomeWallet.totalEarnings}`);
    } else if (currentLevelCount < matrixCapacity[level]) {
      const membersNeeded = matrixCapacity[level] - currentLevelCount;
      console.log(`⏳ Matrix Level ${level}: User ${uplineUser.userId} has ${currentLevelCount}/${matrixCapacity[level]} members`);
      console.log(`   Still needs ${membersNeeded} more activations for ₹${matrixIncomes[level]} bonus`);
    } else if (alreadyReceivedThisLevel) {
      console.log(`✅ Matrix Level ${level}: User ${uplineUser.userId} already received ₹${matrixIncomes[level]} bonus for this level`);
    }
    
    // Continue to next level if upline user has a referrer
    if (uplineUser.referrer) {
      await processMatrixIncomeOnActivation(newUserId, uplineUser.referrer, level + 1);
    }
    
  } catch (err) {
    console.error(`Error processing matrix income at level ${level}:`, err);
  }
};

// Process rank rewards based on team size
const processRankRewards = async (userId) => {
  try {
    console.log(`Processing rank rewards for user: ${userId}`);
    
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      console.log(`User ${userId} not found or not active, skipping rank rewards`);
      return;
    }
    
    // Count total active referrals (direct team members)
    const activeReferrals = await User.countDocuments({
      referrer: userId,
      isActive: true
    });
    
    console.log(`User ${user.userId} has ${activeReferrals} active referrals`);
    
    // Define rank structure with rewards
    const rankStructure = [
      { 
        rank: 'BRONZE', 
        members: 25, 
        reward: 500, 
        description: '₹500 + ID Card',
        benefits: ['₹500 Cash Reward', 'Official ID Card']
      },
      { 
        rank: 'SILVER', 
        members: 50, 
        reward: 1000, 
        description: '₹1000 + Bag',
        benefits: ['₹1000 Cash Reward', 'Premium Bag']
      },
      { 
        rank: 'GOLD', 
        members: 100, 
        reward: 2500, 
        description: '₹2500 + Mobile Phone',
        benefits: ['₹2500 Cash Reward', 'Mobile Phone']
      },
      { 
        rank: 'RUBY', 
        members: 200, 
        reward: 10000, 
        description: '₹10000 + Mobile Phone + Tour',
        benefits: ['₹10000 Cash Reward', 'Mobile Phone', 'Tour Package']
      },
      { 
        rank: 'DIAMOND', 
        members: 400, 
        reward: 15000, 
        description: '₹15K + India Tour',
        benefits: ['₹15000 Cash Reward', 'India Tour Package']
      },
      { 
        rank: 'PLATINUM', 
        members: 800, 
        reward: 25000, 
        description: '₹25K + International Tour',
        benefits: ['₹25000 Cash Reward', 'International Tour Package']
      },
      { 
        rank: 'KING', 
        members: 1600, 
        reward: 60000, 
        description: '₹60K + Bike + International Tour',
        benefits: ['₹60000 Cash Reward', 'Bike', 'International Tour Package']
      }
    ];
    
    // Initialize income wallet if not exists
    if (!user.incomeWallet) {
      user.incomeWallet = {
        balance: 0,
        selfIncome: 0,
        directIncome: 0,
        matrixIncome: 0,
        dailyIncome: 0,
        dailyTeamIncome: 0,
        rankRewards: 0,
        fxTradingIncome: 0,
        totalEarnings: 0,
        withdrawnAmount: 0,
        lastUpdated: Date.now()
      };
    }
    
    // Initialize income transactions if not exists
    if (!user.incomeTransactions) {
      user.incomeTransactions = [];
    }
    
    // Check which ranks the user qualifies for and hasn't received yet
    for (const rankData of rankStructure) {
      if (activeReferrals >= rankData.members) {
        // Check if user already received this rank reward
        const alreadyReceived = user.incomeTransactions.some(transaction => 
          transaction.type === 'rank_reward' && 
          transaction.description && 
          transaction.description.includes(rankData.rank)
        );
        
        if (!alreadyReceived) {
          console.log(`🏆 User ${user.userId} qualified for ${rankData.rank} rank! Awarding ₹${rankData.reward}`);
          
          // Store previous values for logging
          const previousRankRewards = user.incomeWallet.rankRewards || 0;
          const previousBalance = user.incomeWallet.balance || 0;
          const previousTotalEarnings = user.incomeWallet.totalEarnings || 0;
          
          // Add rank reward
          user.incomeWallet.rankRewards += rankData.reward;
          user.incomeWallet.balance += rankData.reward;
          user.incomeWallet.totalEarnings += rankData.reward;
          user.incomeWallet.lastUpdated = Date.now();
          
          // Update user rank
          user.rank = rankData.rank;
          
          // Add transaction record
          user.incomeTransactions.push({
            type: 'rank_reward',
            amount: rankData.reward,
            date: Date.now(),
            description: `${rankData.rank} Rank Achievement - ${rankData.description} (${activeReferrals} active members)`
          });
          
          await user.save();
          
          console.log(`✅ ₹${rankData.reward} rank reward (${rankData.rank}) processed for user: ${user.userId}`);
          console.log(`   Previous rankRewards: ₹${previousRankRewards} → New rankRewards: ₹${user.incomeWallet.rankRewards}`);
          console.log(`   Previous balance: ₹${previousBalance} → New balance: ₹${user.incomeWallet.balance}`);
          console.log(`   Previous totalEarnings: ₹${previousTotalEarnings} → New totalEarnings: ₹${user.incomeWallet.totalEarnings}`);
          console.log(`   Rank updated to: ${rankData.rank}`);
          console.log(`   Benefits: ${rankData.benefits.join(', ')}`);
        } else {
          console.log(`✅ User ${user.userId} already received ${rankData.rank} rank reward`);
        }
      }
    }
    
    // Continue processing for user's referrer if exists
    if (user.referrer) {
      await processRankRewards(user.referrer);
    }
    
  } catch (err) {
    console.error(`Error processing rank rewards for user ${userId}:`, err);
  }
};

// Get user account profile
exports.getAccountProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find by MongoDB _id stored in req.user.userId
    const user = await User.findById(userId)
      .select('-password -__v')
      .populate('referrer', 'name userId email');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          userId: user.userId,
          email: user.email,
          mobile: user.mobile || '',
          aadhaarNumber: user.aadhaarNumber || '',
          panNumber: user.panNumber || '',
          address: user.address || {},
          isActive: user.isActive,
          role: user.role,
          referrer: user.referrer,
          rank: user.rank,
          teamSize: user.teamSize,
          incomeWallet: user.incomeWallet,
          paymentMethods: user.paymentMethods || {},
          createdAt: user.createdAt
        }
      }
    });
  } catch (err) {
    console.error('Get Account Profile Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching account profile',
      error: err.message
    });
  }
};

// Update user profile
exports.updateAccountProfile = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    
    // Find user by MongoDB _id stored in req.user.userId
    const user = await User.findById(loggedInUserId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const { 
      name, 
      email, 
      mobile, 
      aadhaarNumber, 
      panNumber, 
      address 
    } = req.body;
    
    // Validate input
    if (!name && !email && !mobile && !aadhaarNumber && !panNumber && !address) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide at least one field to update'
      });
    }
    
    // Check if email already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already in use'
        });
      }
    }
    
    // Validate mobile number if provided
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        status: 'error',
        message: 'Mobile number must be 10 digits'
      });
    }
    
    // Validate Aadhaar number if provided
    if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        status: 'error',
        message: 'Aadhaar number must be 12 digits'
      });
    }
    
    // Validate PAN number if provided
    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid PAN number format'
      });
    }
    
    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;
    if (aadhaarNumber) updateData.aadhaarNumber = aadhaarNumber;
    if (panNumber) updateData.panNumber = panNumber;
    
    // Handle address update
    if (address) {
      // Only update provided address fields
      updateData.address = user.address || {};
      if (address.street) updateData.address.street = address.street;
      if (address.city) updateData.address.city = address.city;
      if (address.state) updateData.address.state = address.state;
      if (address.pincode) updateData.address.pincode = address.pincode;
      if (address.country) updateData.address.country = address.country;
    }
    
    // Update by _id which is the MongoDB ObjectId
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true }
    ).select('-password -__v');
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile',
      error: err.message
    });
  }
};

// Update payment methods
exports.updatePaymentMethods = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    
    // Find user by MongoDB _id
    const user = await User.findById(loggedInUserId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const { upiId, bankDetails } = req.body;
    
    // Validate input
    if (!upiId && !bankDetails) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide at least one payment method'
      });
    }
    
    // Validate bank details if provided
    if (bankDetails) {
      const { accountNumber, ifscCode, accountHolderName, bankName } = bankDetails;
      if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide all bank details'
        });
      }
    }
    
    // Update payment methods
    const updateData = { paymentMethods: user.paymentMethods || {} };
    if (upiId) updateData.paymentMethods.upiId = upiId;
    if (bankDetails) updateData.paymentMethods.bankDetails = bankDetails;
    
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true }
    ).select('-password -__v');
    
    res.status(200).json({
      status: 'success',
      message: 'Payment methods updated successfully',
      data: {
        paymentMethods: updatedUser.paymentMethods
      }
    });
  } catch (err) {
    console.error('Update Payment Methods Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error updating payment methods',
      error: err.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide current and new password'
      });
    }
    
    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Get user with password
    const user = await User.findById(loggedInUserId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    user.originalPassword = newPassword;  // ⚠️ SECURITY RISK: Storing plain text password
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Change Password Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error changing password',
      error: err.message
    });
  }
};

// Get user profile by userId
exports.getUserProfileById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Find by userId field, not MongoDB _id
    const user = await User.findOne({ userId })
      .select('-password -__v')
      .populate('referrer', 'name userId email');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if the requester is an admin or the user themselves
    const isAdmin = req.user.role === 'admin';
    const isSelfProfile = req.user.userId === userId;
    
    // Create response object with basic info
    const userProfile = {
      _id: user._id,
      name: user.name,
      userId: user.userId,
      email: user.email,
      mobile: user.mobile || '',
      isActive: user.isActive,
      rank: user.rank,
      teamSize: user.teamSize,
      referrer: user.referrer,
      createdAt: user.createdAt
    };
    
    // Add sensitive information only if admin or self
    if (isAdmin || isSelfProfile) {
      userProfile.aadhaarNumber = user.aadhaarNumber || '';
      userProfile.panNumber = user.panNumber || '';
      userProfile.address = user.address || {};
      userProfile.incomeWallet = user.incomeWallet;
      userProfile.paymentMethods = user.paymentMethods || {};
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: userProfile
      }
    });
  } catch (err) {
    console.error('Get User Profile Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile',
      error: err.message
    });
  }
};
