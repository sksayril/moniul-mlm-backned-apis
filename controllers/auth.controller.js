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

// Get current user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
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
    
    // Find the TPIN with matching code
    const tpinIndex = user.tpins.findIndex(tpin => 
      tpin.code === tpinCode && 
      tpin.status === 'approved' && 
      !tpin.isUsed
    );
    
    if (tpinIndex === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or already used TPIN'
      });
    }
    
    // Mark TPIN as used and account as active
    user.tpins[tpinIndex].isUsed = true;
    user.tpins[tpinIndex].usedAt = Date.now();
    user.tpins[tpinIndex].activationDate = Date.now();
    user.isActive = true;
    
    // Add self-income for TPIN activation (₹10)
    if (!user.incomeWallet) {
      user.incomeWallet = {
        balance: 0,
        selfIncome: 0,
        directIncome: 0,
        matrixIncome: 0,
        rankRewards: 0,
        totalEarnings: 0,
        withdrawnAmount: 0,
        lastUpdated: Date.now()
      };
    }
    
    user.incomeWallet.selfIncome += 10;
    user.incomeWallet.balance += 10;
    user.incomeWallet.totalEarnings += 10;
    user.incomeWallet.lastUpdated = Date.now();
    
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
    
    // Process MLM income if user has a referrer
    if (user.referrer) {
      await processMLMIncomeOnActivation(user._id, user.referrer);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Account activated successfully with ₹10 self-income added and crypto coins bonus',
      data: {
        isActive: user.isActive,
        incomeAdded: 10,
        currentBalance: user.incomeWallet.balance,
        cryptoWallet: {
          coin: user.cryptoWallet.coin,
          balance: user.cryptoWallet.balance,
          inrValue: user.cryptoWallet.transactions.find(t => t.type === 'activation_bonus')?.inrValue || 0
        }
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

// Process MLM income when user activates TPIN
const processMLMIncomeOnActivation = async (userId, referrerId) => {
  try {
    // Add direct referral income to immediate referrer (₹20)
    const directReferrer = await User.findById(referrerId);
    if (directReferrer && directReferrer.isActive) {
      if (!directReferrer.incomeWallet) {
        directReferrer.incomeWallet = {
          balance: 0,
          selfIncome: 0,
          directIncome: 0,
          matrixIncome: 0,
          rankRewards: 0,
          totalEarnings: 0,
          withdrawnAmount: 0,
          lastUpdated: Date.now()
        };
      }
      
      directReferrer.incomeWallet.directIncome += 20;
      directReferrer.incomeWallet.balance += 20;
      directReferrer.incomeWallet.totalEarnings += 20;
      directReferrer.incomeWallet.lastUpdated = Date.now();
      await directReferrer.save();
    }
    
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
    
    // Matrix income amounts for each level
    const matrixIncomes = {
      1: 5,   // ₹50 for 1st level (5 members)
      2: 4,  // ₹125 for 2nd level (25 members)
      3: 3,  // ₹625 for 3rd level (125 members)
      4: 2, // ₹1875 for 4th level (625 members)
      5: 2, // ₹9375 for 5th level (3125 members)
      6: 2,    // ₹46875 for 6th level (15625 members)
      7: 2    // ₹234375 for 7th level (78125 members)
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
    
    // Check if this level is complete and award income
    if (currentLevelCount <= matrixCapacity[level]) {
      if (!uplineUser.incomeWallet) {
        uplineUser.incomeWallet = {
          balance: 0,
          selfIncome: 0,
          directIncome: 0,
          matrixIncome: 0,
          rankRewards: 0,
          totalEarnings: 0,
          withdrawnAmount: 0,
          lastUpdated: Date.now()
        };
      }
      
      const incomeAmount = matrixIncomes[level];
      uplineUser.incomeWallet.matrixIncome += incomeAmount;
      uplineUser.incomeWallet.balance += incomeAmount;
      uplineUser.incomeWallet.totalEarnings += incomeAmount;
      uplineUser.incomeWallet.lastUpdated = Date.now();
      
      // Add income transaction record
      if (!uplineUser.incomeTransactions) {
        uplineUser.incomeTransactions = [];
      }
      
      uplineUser.incomeTransactions.push({
        type: 'matrix_income',
        amount: incomeAmount,
        level: level,
        fromUser: newUserId,
        date: Date.now(),
        description: `Matrix Level ${level} income from user activation`
      });
      
      await uplineUser.save();
    }
    
    // Continue to next level if upline user has a referrer
    if (uplineUser.referrer) {
      await processMatrixIncomeOnActivation(newUserId, uplineUser.referrer, level + 1);
    }
    
  } catch (err) {
    console.error(`Error processing matrix income at level ${level}:`, err);
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
