const cron = require('node-cron');
const User = require('../models/user.model');

// Matrix configuration
const matrixCapacity = {
  1: 5,
  2: 25,
  3: 125,
  4: 625,
  5: 3125,
  6: 15625,
  7: 78125
};

const matrixIncomes = {
  1: 5,
  2: 4,
  3: 3,
  4: 2,
  5: 2,
  6: 2,
  7: 2
};

// Function to count active users at each level for a user
const countActiveUsersAtLevel = async (userId, targetLevel, visitedUsers = new Set()) => {
  try {
    // Prevent infinite loops
    if (visitedUsers.has(userId.toString())) {
      return 0;
    }
    visitedUsers.add(userId.toString());

    if (targetLevel === 1) {
      // Level 1: Direct referrals
      const directReferrals = await User.countDocuments({
        referrer: userId,
        isActive: true
      });
      return directReferrals;
    } else {
      // Higher levels: Count recursively
      const directReferrals = await User.find({
        referrer: userId,
        isActive: true
      }).select('_id');

      let totalCount = 0;
      for (const referral of directReferrals) {
        const count = await countActiveUsersAtLevel(referral._id, targetLevel - 1, new Set(visitedUsers));
        totalCount += count;
      }
      return totalCount;
    }
  } catch (error) {
    console.error(`Error counting users at level ${targetLevel} for user ${userId}:`, error);
    return 0;
  }
};

// Function to check if user already received matrix income TODAY for a specific level
const hasReceivedMatrixIncomeToday = (user, level) => {
  if (!user.incomeTransactions) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  return user.incomeTransactions.some(transaction => 
    transaction.type === 'daily_matrix_income' && 
    transaction.level === level &&
    new Date(transaction.date) >= today
  );
};

// Function to process matrix income for all users
const processMatrixIncomeScheduler = async () => {
  try {
    console.log('\n🎯 Starting Daily Matrix Income Scheduler');
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    console.log('==========================================');

    // Get all active users
    const users = await User.find({ isActive: true })
      .populate('referrer', 'userId name')
      .sort({ createdAt: 1 });

    if (users.length === 0) {
      console.log('❌ No active users found');
      return;
    }

    console.log(`📊 Processing ${users.length} active users for matrix income...`);

    let totalIncomeAwarded = 0;
    let totalUsersRewarded = 0;

    for (const user of users) {
      console.log(`\n👤 Checking user: ${user.name} (${user.userId})`);
      
      let userTotalIncome = 0;
      const completedLevels = [];

      // Check each matrix level (1-7)
      for (let level = 1; level <= 7; level++) {
        const requiredCount = matrixCapacity[level];
        const rewardAmount = matrixIncomes[level];

        // Check if user already received this level's income TODAY
        if (hasReceivedMatrixIncomeToday(user, level)) {
          console.log(`   ✅ Level ${level}: Already received ₹${rewardAmount} today (skipping)`);
          continue;
        }

        // Count active users at this level
        const activeCount = await countActiveUsersAtLevel(user._id, level);
        
        console.log(`   📈 Level ${level}: ${activeCount}/${requiredCount} active users`);

        // Award daily income if threshold is met
        if (activeCount >= requiredCount) {
          console.log(`   🎉 Level ${level} QUALIFIED! Awarding daily ₹${rewardAmount} to dailyTeamIncome`);

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

          // Update dailyTeamIncome wallet
          const previousDailyTeamIncome = user.incomeWallet.dailyTeamIncome || 0;
          const previousTotalEarnings = user.incomeWallet.totalEarnings || 0;

          user.incomeWallet.dailyTeamIncome += rewardAmount;
          user.incomeWallet.totalEarnings += rewardAmount;
          user.incomeWallet.lastUpdated = Date.now();

          // Add transaction record
          if (!user.incomeTransactions) {
            user.incomeTransactions = [];
          }

          user.incomeTransactions.push({
            type: 'daily_matrix_income',
            amount: rewardAmount,
            level: level,
            date: Date.now(),
            description: `Daily Matrix Level ${level} income - ${requiredCount}+ active users maintained (${activeCount} total)`
          });

          await user.save();

          console.log(`   ✅ Daily ₹${rewardAmount} added to dailyTeamIncome`);
          console.log(`   💰 dailyTeamIncome: ₹${previousDailyTeamIncome} → ₹${user.incomeWallet.dailyTeamIncome}`);
          console.log(`   💰 totalEarnings: ₹${previousTotalEarnings} → ₹${user.incomeWallet.totalEarnings}`);

          userTotalIncome += rewardAmount;
          completedLevels.push(level);
          totalIncomeAwarded += rewardAmount;
        } else {
          const needed = requiredCount - activeCount;
          console.log(`   ⏳ Level ${level}: Needs ${needed} more active users for ₹${rewardAmount}`);
        }
      }

      if (userTotalIncome > 0) {
        totalUsersRewarded++;
        console.log(`   🎊 Daily total awarded to ${user.userId}: ₹${userTotalIncome} (Levels: ${completedLevels.join(', ')})`);
      } else {
        console.log(`   📊 No matrix income qualified today for ${user.userId}`);
      }
    }

    console.log('\n📋 Daily Matrix Income Summary:');
    console.log('===============================');
    console.log(`👥 Users processed: ${users.length}`);
    console.log(`🏆 Users rewarded: ${totalUsersRewarded}`);
    console.log(`💰 Total income awarded: ₹${totalIncomeAwarded}`);
    console.log(`⏰ Completed at: ${new Date().toLocaleString()}`);
    console.log('===============================\n');

  } catch (error) {
    console.error('❌ Error in matrix income scheduler:', error);
  }
};

// Force process matrix income (for testing)
const forceProcessMatrixIncome = async () => {
  console.log('🚀 FORCE PROCESSING Matrix Income (Manual Trigger)');
  await processMatrixIncomeScheduler();
};

// Get matrix income statistics
const getMatrixIncomeStats = async () => {
  try {
    console.log('\n📊 Matrix Income Statistics');
    console.log('===========================');

    const users = await User.find({ isActive: true });
    
    let totalDailyTeamIncome = 0;
    let usersWithMatrixIncome = 0;
    const levelCompletions = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

    for (const user of users) {
      const dailyTeamIncome = user.incomeWallet?.dailyTeamIncome || 0;
      if (dailyTeamIncome > 0) {
        totalDailyTeamIncome += dailyTeamIncome;
        usersWithMatrixIncome++;
      }

      // Count level completions
      if (user.incomeTransactions) {
        user.incomeTransactions.forEach(transaction => {
          if (transaction.type === 'daily_matrix_income' && transaction.level) {
            levelCompletions[transaction.level]++;
          }
        });
      }
    }

    console.log(`👥 Total active users: ${users.length}`);
    console.log(`🏆 Users with matrix income: ${usersWithMatrixIncome}`);
    console.log(`💰 Total dailyTeamIncome distributed: ₹${totalDailyTeamIncome}`);
    console.log('\n🎯 Level Completions:');
    
    for (let level = 1; level <= 7; level++) {
      console.log(`   Level ${level}: ${levelCompletions[level]} users completed (₹${matrixIncomes[level]} each)`);
    }

  } catch (error) {
    console.error('❌ Error getting matrix income stats:', error);
  }
};

// Schedule to run every day at 12:00 PM
const startMatrixIncomeScheduler = () => {
  console.log('🎯 Matrix Income Scheduler initialized');
  console.log('⏰ Scheduled to run daily at 12:00 PM');
  
  // Schedule: Run at 12:00 PM every day
  cron.schedule('0 12 * * *', async () => {
    console.log('\n⏰ Daily Matrix Income Scheduler triggered at 12:00 PM');
    await processMatrixIncomeScheduler();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Adjust timezone as needed
  });
};

module.exports = {
  startMatrixIncomeScheduler,
  processMatrixIncomeScheduler,
  forceProcessMatrixIncome,
  getMatrixIncomeStats
}; 