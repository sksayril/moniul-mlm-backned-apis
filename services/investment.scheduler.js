const User = require('../models/user.model');
const cron = require('node-cron');

// Calculate days between two dates
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  
  return Math.round(Math.abs((firstDate - secondDate) / oneDay));
}

// Process daily investment returns
async function processInvestmentReturns() {
  console.log('🚀 Starting daily investment processing...');
  
  try {
    // Find all users with active investments
    const users = await User.find({
      'investments.status': 'active'
    });
    
    let processedInvestments = 0;
    let maturedInvestments = 0;
    let totalReturnsProcessed = 0;
    
    for (const user of users) {
      let userUpdated = false;
      
      // Initialize arrays if they don't exist
      if (!user.incomeTransactions) {
        user.incomeTransactions = [];
      }
      
      // Initialize income wallet if not exists
      if (!user.incomeWallet) {
        user.incomeWallet = {
          balance: 0,
          selfIncome: 0,
          directIncome: 0,
          matrixIncome: 0,
          dailyTeamIncome: 0,
          rankRewards: 0,
          fxTradingIncome: 0,
          totalEarnings: 0,
          withdrawnAmount: 0,
          lastUpdated: Date.now()
        };
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
      
      for (const investment of user.investments) {
        if (investment.status !== 'active') continue;
        
        const currentDate = new Date();
        const startDate = new Date(investment.startDate);
        const daysCompleted = daysBetween(startDate, currentDate);
        
        // Update days completed
        investment.daysCompleted = daysCompleted;
        
        // Check if investment has matured (35 days completed)
        if (daysCompleted >= 35) {
          // Investment has matured - transfer full return to income wallet
          investment.status = 'matured';
          investment.maturedAt = currentDate;
          
          const finalReturnAmount = 15000; // Total return amount
          
          // Add to income wallet
          user.incomeWallet.balance += finalReturnAmount;
          user.incomeWallet.totalEarnings += finalReturnAmount;
          user.incomeWallet.lastUpdated = currentDate;
          
          // Update investment wallet stats
          user.investmentWallet.totalMatured += investment.amount;
          user.investmentWallet.totalReturns += finalReturnAmount;
          user.investmentWallet.lastUpdated = currentDate;
          
          // Add transaction record
          user.incomeTransactions.push({
            type: 'investment_maturity',
            amount: finalReturnAmount,
            investmentId: investment.investmentId,
            date: currentDate,
            description: `Investment ${investment.investmentId} matured after 35 days. Return: ₹${finalReturnAmount}`
          });
          
          maturedInvestments++;
          totalReturnsProcessed += finalReturnAmount;
          userUpdated = true;
          
          console.log(`✅ Investment ${investment.investmentId} matured for user ${user.name} (${user.email}). Return: ₹${finalReturnAmount}`);
        } else {
          // Investment is still active - process daily return if needed
          const lastProcessedDate = new Date(investment.lastProcessed);
          const daysSinceLastProcessed = daysBetween(lastProcessedDate, currentDate);
          
          // Only process if at least 1 day has passed since last processing
          if (daysSinceLastProcessed >= 1 && daysCompleted > 0) {
            // Calculate daily return (distribute the profit over 35 days)
            const totalProfit = 15000 - 5999; // 9001 profit
            const dailyReturn = Math.round(totalProfit / 35);
            
            // Add daily return to income wallet
            user.incomeWallet.balance += dailyReturn;
            user.incomeWallet.totalEarnings += dailyReturn;
            user.incomeWallet.lastUpdated = currentDate;
            
            // Update investment wallet stats
            user.investmentWallet.totalReturns += dailyReturn;
            user.investmentWallet.lastUpdated = currentDate;
            
            // Update last processed date
            investment.lastProcessed = currentDate;
            
            // Add transaction record
            user.incomeTransactions.push({
              type: 'investment_return',
              amount: dailyReturn,
              investmentId: investment.investmentId,
              date: currentDate,
              description: `Daily return for investment ${investment.investmentId}. Day ${daysCompleted} of 35`
            });
            
            totalReturnsProcessed += dailyReturn;
            userUpdated = true;
            
            console.log(`💰 Daily return processed for user ${user.name}: ₹${dailyReturn} (Day ${daysCompleted})`);
          }
        }
        
        processedInvestments++;
      }
      
      // Save user if updated
      if (userUpdated) {
        await user.save();
      }
    }
    
    console.log(`✅ Investment processing completed:`);
    console.log(`   - Processed investments: ${processedInvestments}`);
    console.log(`   - Matured investments: ${maturedInvestments}`);
    console.log(`   - Total returns processed: ₹${totalReturnsProcessed}`);
    
    return {
      success: true,
      processedInvestments,
      maturedInvestments,
      totalReturnsProcessed
    };
    
  } catch (error) {
    console.error('❌ Error processing investment returns:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Manual trigger for investment processing (for testing)
async function manualProcessInvestments() {
  console.log('🔧 Manual investment processing triggered...');
  return await processInvestmentReturns();
}

// Schedule daily investment processing at 6:00 AM every day
function startInvestmentScheduler() {
  console.log('📅 Starting investment scheduler...');
  
  // Run every day at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('⏰ Scheduled investment processing started at', new Date().toISOString());
    await processInvestmentReturns();
  }, {
    timezone: "Asia/Kolkata"
  });
  
  // Also run every 4 hours for more frequent processing (optional)
  cron.schedule('0 */4 * * *', async () => {
    console.log('⏰ Hourly investment check started at', new Date().toISOString());
    await processInvestmentReturns();
  }, {
    timezone: "Asia/Kolkata"
  });
  
  console.log('✅ Investment scheduler started successfully');
  console.log('   - Daily processing: 6:00 AM IST');
  console.log('   - Hourly checks: Every 4 hours');
}

// Get investment processing statistics
async function getProcessingStats() {
  try {
    const users = await User.find({ investments: { $exists: true, $ne: [] } });
    
    let totalActiveInvestments = 0;
    let totalMaturedInvestments = 0;
    let totalDueForMaturity = 0;
    let investmentStats = [];
    
    for (const user of users) {
      for (const investment of user.investments) {
        const daysCompleted = daysBetween(new Date(investment.startDate), new Date());
        
        const investmentData = {
          userId: user._id,
          userName: user.name,
          investmentId: investment.investmentId,
          amount: investment.amount,
          daysCompleted,
          status: investment.status,
          maturityDate: investment.maturityDate,
          isDueForMaturity: daysCompleted >= 35 && investment.status === 'active'
        };
        
        investmentStats.push(investmentData);
        
        if (investment.status === 'active') {
          totalActiveInvestments++;
          if (daysCompleted >= 35) {
            totalDueForMaturity++;
          }
        } else if (investment.status === 'matured') {
          totalMaturedInvestments++;
        }
      }
    }
    
    return {
      totalActiveInvestments,
      totalMaturedInvestments,
      totalDueForMaturity,
      investmentStats: investmentStats.sort((a, b) => b.daysCompleted - a.daysCompleted)
    };
  } catch (error) {
    console.error('Error getting processing stats:', error);
    throw error;
  }
}

module.exports = {
  startInvestmentScheduler,
  processInvestmentReturns,
  manualProcessInvestments,
  getProcessingStats
}; 