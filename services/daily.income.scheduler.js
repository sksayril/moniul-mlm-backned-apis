const cron = require('node-cron');
const User = require('../models/user.model');

// Daily income amount
const DAILY_INCOME_AMOUNT = 5;

// Process daily income for all active users
const processDailyIncome = async () => {
  try {
    console.log('Starting daily income processing...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    // Find all active users who haven't received daily income today
    const activeUsers = await User.find({
      isActive: true,
      blocked: { $ne: true },
      $or: [
        { 'incomeWallet.lastDailyIncome': { $exists: false } },
        { 'incomeWallet.lastDailyIncome': { $lt: today } }
      ]
    });

    console.log(`Found ${activeUsers.length} users eligible for daily income`);

    let processedCount = 0;
    let errorCount = 0;

    for (const user of activeUsers) {
      try {
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

        // Add daily income
        user.incomeWallet.dailyIncome += DAILY_INCOME_AMOUNT;
        user.incomeWallet.balance += DAILY_INCOME_AMOUNT;
        user.incomeWallet.totalEarnings += DAILY_INCOME_AMOUNT;
        user.incomeWallet.lastDailyIncome = new Date();
        user.incomeWallet.lastUpdated = new Date();

        // Add transaction record
        if (!user.incomeTransactions) {
          user.incomeTransactions = [];
        }

        user.incomeTransactions.push({
          type: 'daily_income',
          amount: DAILY_INCOME_AMOUNT,
          date: new Date(),
          description: 'Daily income reward for active account'
        });

        await user.save();
        processedCount++;

        console.log(`Daily income processed for user: ${user.userId} (${user.name})`);

      } catch (userError) {
        console.error(`Error processing daily income for user ${user.userId}:`, userError);
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

  console.log('Daily Income Scheduler started successfully - runs daily at 12:00 AM IST');
};

module.exports = {
  startDailyIncomeScheduler,
  processDailyIncome,
  getDailyIncomeStats,
  triggerDailyIncome,
  getDailyIncomeStatsAPI
}; 