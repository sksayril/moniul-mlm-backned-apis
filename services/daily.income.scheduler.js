const cron = require('node-cron');
const User = require('../models/user.model');

// Daily income amount - Updated to ₹10 per day for all active users
const DAILY_INCOME_AMOUNT = 10;

// Process daily income for all active users
const processDailyIncome = async () => {
  try {
    console.log('Starting daily income processing...');
    console.log('Current time:', new Date().toISOString());
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    console.log('Today start time:', today.toISOString());
    
    // Find all active users who haven't received daily income today
    const activeUsers = await User.find({
      isActive: true,
      blocked: { $ne: true }
    });

    console.log(`Total active users found: ${activeUsers.length}`);
    
    // Filter users who haven't received daily income today
    const eligibleUsers = activeUsers.filter(user => {
      if (!user.incomeWallet || !user.incomeWallet.lastDailyIncome) {
        return true; // Never received daily income
      }
      
      const lastDailyIncome = new Date(user.incomeWallet.lastDailyIncome);
      const isEligible = lastDailyIncome < today;
      
      console.log(`User ${user.userId}: Last daily income: ${lastDailyIncome.toISOString()}, Eligible: ${isEligible}`);
      return isEligible;
    });

    console.log(`Found ${eligibleUsers.length} users eligible for daily income`);

    let processedCount = 0;
    let errorCount = 0;

    for (const user of eligibleUsers) {
      try {
        console.log(`Processing user: ${user.userId} (${user.name})`);
        
        // Initialize income wallet if not exists
        if (!user.incomeWallet) {
          console.log(`Initializing income wallet for user: ${user.userId}`);
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
            lastUpdated: now
          };
        }

        // Store previous balances for logging
        const previousDailyIncome = user.incomeWallet.dailyIncome || 0;
        const previousBalance = user.incomeWallet.balance || 0;

        // Add daily income
        user.incomeWallet.dailyIncome = (user.incomeWallet.dailyIncome || 0) + DAILY_INCOME_AMOUNT;
        user.incomeWallet.balance = (user.incomeWallet.balance || 0) + DAILY_INCOME_AMOUNT;
        user.incomeWallet.totalEarnings = (user.incomeWallet.totalEarnings || 0) + DAILY_INCOME_AMOUNT;
        user.incomeWallet.lastDailyIncome = now;
        user.incomeWallet.lastUpdated = now;

        // Add transaction record
        if (!user.incomeTransactions) {
          user.incomeTransactions = [];
        }

        user.incomeTransactions.push({
          type: 'daily_income',
          amount: DAILY_INCOME_AMOUNT,
          date: now,
          description: `Daily income reward for active account - ₹${DAILY_INCOME_AMOUNT} per day`
        });

        // Save user
        await user.save();
        processedCount++;

        console.log(`✅ ₹${DAILY_INCOME_AMOUNT} daily income processed for user: ${user.userId} (${user.name})`);
        console.log(`   Previous dailyIncome: ₹${previousDailyIncome} → New dailyIncome: ₹${user.incomeWallet.dailyIncome}`);
        console.log(`   Previous balance: ₹${previousBalance} → New balance: ₹${user.incomeWallet.balance}`);

      } catch (userError) {
        console.error(`❌ Error processing daily income for user ${user.userId}:`, userError.message);
        errorCount++;
      }
    }

    console.log(`Daily income processing completed:`);
    console.log(`- Processed: ${processedCount} users`);
    console.log(`- Errors: ${errorCount} users`);
    console.log(`- Total amount distributed: ₹${processedCount * DAILY_INCOME_AMOUNT}`);

    return {
      success: true,
      processedCount,
      errorCount,
      totalAmount: processedCount * DAILY_INCOME_AMOUNT
    };

  } catch (err) {
    console.error('Error in daily income processing:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

// Get daily income statistics
const getDailyIncomeStats = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count users who received daily income today
    const todayRecipients = await User.countDocuments({
      'incomeWallet.lastDailyIncome': {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Count total active users
    const totalActiveUsers = await User.countDocuments({
      isActive: true,
      blocked: { $ne: true }
    });

    // Calculate total daily income distributed today
    const totalDistributedToday = todayRecipients * DAILY_INCOME_AMOUNT;

    // Get total daily income ever distributed
    const totalDailyIncomeEver = await User.aggregate([
      { $match: { 'incomeWallet.dailyIncome': { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$incomeWallet.dailyIncome' } } }
    ]);

    return {
      todayRecipients,
      totalActiveUsers,
      totalDistributedToday,
      totalDailyIncomeEver: totalDailyIncomeEver[0]?.total || 0,
      pendingUsers: totalActiveUsers - todayRecipients,
      dailyIncomeAmount: DAILY_INCOME_AMOUNT
    };

  } catch (err) {
    console.error('Error getting daily income stats:', err);
    throw err;
  }
};

// Manual trigger for daily income (for testing or emergency)
const triggerDailyIncome = async (req, res) => {
  try {
    const result = await processDailyIncome();
    
    res.status(200).json({
      status: 'success',
      message: 'Daily income processing completed',
      data: result
    });

  } catch (err) {
    console.error('Error triggering daily income:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error processing daily income',
      error: err.message
    });
  }
};

// Get daily income statistics API
const getDailyIncomeStatsAPI = async (req, res) => {
  try {
    const stats = await getDailyIncomeStats();
    
    res.status(200).json({
      status: 'success',
      message: 'Daily income statistics retrieved successfully',
      data: stats
    });

  } catch (err) {
    console.error('Error getting daily income stats:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving daily income statistics',
      error: err.message
    });
  }
};

// Reset daily income eligibility for testing (removes today's lastDailyIncome)
const resetDailyIncomeEligibility = async () => {
  try {
    console.log('🔄 Resetting daily income eligibility for testing...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await User.updateMany(
      { 
        isActive: true,
        blocked: { $ne: true },
        'incomeWallet.lastDailyIncome': { $gte: today }
      },
      { 
        $unset: { 'incomeWallet.lastDailyIncome': 1 }
      }
    );
    
    console.log(`✅ Reset eligibility for ${result.modifiedCount} users`);
    return result.modifiedCount;
    
  } catch (error) {
    console.error('❌ Error resetting daily income eligibility:', error);
    throw error;
  }
};

// Force process daily income for all active users (ignoring lastDailyIncome)
const forceProcessDailyIncome = async () => {
  try {
    console.log('🚀 FORCE Processing daily income for ALL active users...');
    
    const activeUsers = await User.find({
      isActive: true,
      blocked: { $ne: true }
    });

    console.log(`Found ${activeUsers.length} active users for FORCE processing`);

    let processedCount = 0;
    let errorCount = 0;
    const now = new Date();

    for (const user of activeUsers) {
      try {
        console.log(`FORCE Processing user: ${user.userId} (${user.name})`);
        
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
            lastUpdated: now
          };
        }

        const previousDailyIncome = user.incomeWallet.dailyIncome || 0;
        const previousBalance = user.incomeWallet.balance || 0;

        // Add daily income
        user.incomeWallet.dailyIncome = (user.incomeWallet.dailyIncome || 0) + DAILY_INCOME_AMOUNT;
        user.incomeWallet.balance = (user.incomeWallet.balance || 0) + DAILY_INCOME_AMOUNT;
        user.incomeWallet.totalEarnings = (user.incomeWallet.totalEarnings || 0) + DAILY_INCOME_AMOUNT;
        user.incomeWallet.lastDailyIncome = now;
        user.incomeWallet.lastUpdated = now;

        // Add transaction record
        if (!user.incomeTransactions) {
          user.incomeTransactions = [];
        }

        user.incomeTransactions.push({
          type: 'daily_income',
          amount: DAILY_INCOME_AMOUNT,
          date: now,
          description: `FORCE daily income reward - ₹${DAILY_INCOME_AMOUNT} per day`
        });

        await user.save();
        processedCount++;

        console.log(`✅ FORCE ₹${DAILY_INCOME_AMOUNT} daily income processed for: ${user.userId} (${user.name})`);
        console.log(`   Previous dailyIncome: ₹${previousDailyIncome} → New dailyIncome: ₹${user.incomeWallet.dailyIncome}`);
        console.log(`   Previous balance: ₹${previousBalance} → New balance: ₹${user.incomeWallet.balance}`);

      } catch (userError) {
        console.error(`❌ Error FORCE processing user ${user.userId}:`, userError.message);
        errorCount++;
      }
    }

    console.log(`FORCE Daily income processing completed:`);
    console.log(`- Processed: ${processedCount} users`);
    console.log(`- Errors: ${errorCount} users`);
    console.log(`- Total amount distributed: ₹${processedCount * DAILY_INCOME_AMOUNT}`);

    return {
      success: true,
      processedCount,
      errorCount,
      totalAmount: processedCount * DAILY_INCOME_AMOUNT
    };

  } catch (err) {
    console.error('Error in FORCE daily income processing:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

// Start the daily income scheduler
const startDailyIncomeScheduler = () => {
  console.log('Starting Daily Income Scheduler...');
  
  // Schedule to run every day at 12:00 AM (midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Daily Income Scheduler triggered at:', new Date().toISOString());
    await processDailyIncome();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Indian Standard Time
  });

      console.log(`Daily Income Scheduler started successfully - distributes ₹${DAILY_INCOME_AMOUNT} to all active users daily at 12:00 AM IST`);
};

module.exports = {
  startDailyIncomeScheduler,
  processDailyIncome,
  forceProcessDailyIncome,
  resetDailyIncomeEligibility,
  getDailyIncomeStats,
  triggerDailyIncome,
  getDailyIncomeStatsAPI
}; 