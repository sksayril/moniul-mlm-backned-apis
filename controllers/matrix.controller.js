const User = require('../models/user.model');
const mongoose = require('mongoose');

// Matrix level configuration
const MATRIX_CONFIG = {
  1: { requiredMembers: 5, rewardAmount: 50 },
  2: { requiredMembers: 25, rewardAmount: 125 }
};

// Initialize matrix levels for a user
const initializeMatrixLevels = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Initialize matrix levels if not exists
    if (!user.matrixLevels || user.matrixLevels.length === 0) {
      user.matrixLevels = [
        {
          level: 1,
          membersCount: 0,
          requiredMembers: MATRIX_CONFIG[1].requiredMembers,
          rewardAmount: MATRIX_CONFIG[1].rewardAmount,
          isCompleted: false,
          members: []
        },
        {
          level: 2,
          membersCount: 0,
          requiredMembers: MATRIX_CONFIG[2].requiredMembers,
          rewardAmount: MATRIX_CONFIG[2].rewardAmount,
          isCompleted: false,
          members: []
        }
      ];
      await user.save();
    }
  } catch (err) {
    console.error('Error initializing matrix levels:', err);
  }
};

// Process matrix income when a new user joins
const processMatrixIncome = async (newUserId, referrerId) => {
  try {
    if (!referrerId) return;

    // Start processing from immediate referrer
    await processMatrixLevel(newUserId, referrerId, 1);
    
  } catch (err) {
    console.error('Error processing matrix income:', err);
  }
};

// Process specific matrix level
const processMatrixLevel = async (newUserId, currentUserId, level) => {
  try {
    if (level > 2 || !currentUserId) return;

    const currentUser = await User.findById(currentUserId);
    if (!currentUser || !currentUser.isActive) {
      // If user is not active, skip to next level
      if (currentUser && currentUser.referrer) {
        await processMatrixLevel(newUserId, currentUser.referrer, level + 1);
      }
      return;
    }

    // Initialize matrix levels if needed
    await initializeMatrixLevels(currentUserId);
    
    // Reload user to get updated matrix levels
    const updatedUser = await User.findById(currentUserId);
    
    // Find the current level configuration
    const matrixLevel = updatedUser.matrixLevels.find(ml => ml.level === level);
    if (!matrixLevel) return;

    // Check if level is already completed
    if (matrixLevel.isCompleted) {
      // Move to next level
      if (updatedUser.referrer) {
        await processMatrixLevel(newUserId, updatedUser.referrer, level + 1);
      }
      return;
    }

    // Add new user to this level
    const existingMember = matrixLevel.members.find(m => 
      m.userId.toString() === newUserId.toString()
    );

    if (!existingMember) {
      matrixLevel.members.push({
        userId: newUserId,
        addedAt: new Date()
      });
      matrixLevel.membersCount = matrixLevel.members.length;

      // Check if level is now complete
      if (matrixLevel.membersCount >= matrixLevel.requiredMembers) {
        matrixLevel.isCompleted = true;
        matrixLevel.completedAt = new Date();

        // Award matrix income
        if (!updatedUser.incomeWallet) {
          updatedUser.incomeWallet = {
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

        const rewardAmount = matrixLevel.rewardAmount;
        updatedUser.incomeWallet.matrixIncome += rewardAmount;
        updatedUser.incomeWallet.balance += rewardAmount;
        updatedUser.incomeWallet.totalEarnings += rewardAmount;
        updatedUser.incomeWallet.lastUpdated = new Date();

        // Add transaction record
        if (!updatedUser.incomeTransactions) {
          updatedUser.incomeTransactions = [];
        }

        updatedUser.incomeTransactions.push({
          type: 'matrix_income',
          amount: rewardAmount,
          level: level,
          fromUser: newUserId,
          date: new Date(),
          description: `Matrix Level ${level} completed - ${matrixLevel.requiredMembers} members achieved`
        });

        console.log(`Matrix Level ${level} completed for user ${updatedUser.userId} - Reward: ₹${rewardAmount}`);
      }

      await updatedUser.save();
    }

    // Continue to next level regardless
    if (updatedUser.referrer) {
      await processMatrixLevel(newUserId, updatedUser.referrer, level + 1);
    }

  } catch (err) {
    console.error(`Error processing matrix level ${level}:`, err);
  }
};

// Get user's matrix status
const getUserMatrixStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('matrixLevels.members.userId', 'name userId email')
      .select('name userId matrixLevels incomeWallet');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Initialize matrix levels if not exists
    await initializeMatrixLevels(user._id);
    
    // Reload user with matrix levels
    const updatedUser = await User.findById(req.user.id)
      .populate('matrixLevels.members.userId', 'name userId email')
      .select('name userId matrixLevels incomeWallet');

    res.status(200).json({
      status: 'success',
      message: 'Matrix status retrieved successfully',
      data: {
        user: {
          name: updatedUser.name,
          userId: updatedUser.userId,
          matrixIncome: updatedUser.incomeWallet?.matrixIncome || 0
        },
        matrixLevels: updatedUser.matrixLevels.map(level => ({
          level: level.level,
          membersCount: level.membersCount,
          requiredMembers: level.requiredMembers,
          rewardAmount: level.rewardAmount,
          isCompleted: level.isCompleted,
          completedAt: level.completedAt,
          progress: `${level.membersCount}/${level.requiredMembers}`,
          progressPercentage: ((level.membersCount / level.requiredMembers) * 100).toFixed(1),
          members: level.members.map(member => ({
            name: member.userId?.name || 'Unknown',
            userId: member.userId?.userId || 'Unknown',
            addedAt: member.addedAt
          }))
        }))
      }
    });

  } catch (err) {
    console.error('Error getting matrix status:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving matrix status',
      error: err.message
    });
  }
};

// Get matrix income history
const getMatrixIncomeHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Filter matrix income transactions
    const matrixTransactions = user.incomeTransactions
      .filter(transaction => transaction.type === 'matrix_income')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(skip, skip + limit);

    // Populate fromUser details
    await User.populate(matrixTransactions, {
      path: 'fromUser',
      select: 'name userId email'
    });

    const totalMatrixTransactions = user.incomeTransactions
      .filter(transaction => transaction.type === 'matrix_income').length;
    
    const totalPages = Math.ceil(totalMatrixTransactions / limit);

    res.status(200).json({
      status: 'success',
      message: 'Matrix income history retrieved successfully',
      data: {
        transactions: matrixTransactions,
        summary: {
          totalMatrixIncome: user.incomeWallet?.matrixIncome || 0,
          totalTransactions: totalMatrixTransactions
        },
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalTransactions: totalMatrixTransactions,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (err) {
    console.error('Error getting matrix income history:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving matrix income history',
      error: err.message
    });
  }
};

module.exports = {
  processMatrixIncome,
  initializeMatrixLevels,
  getUserMatrixStatus,
  getMatrixIncomeHistory
}; 