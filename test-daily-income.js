#!/usr/bin/env node

// Test script to manually trigger daily income distribution
// This allows testing without waiting for the midnight cron schedule

require("dotenv").config();
require("./utilities/database");

const { processDailyIncome, forceProcessDailyIncome, resetDailyIncomeEligibility, getDailyIncomeStats } = require('./services/daily.income.scheduler');
const User = require('./models/user.model');

console.log('🚀 Daily Income Test Script Started');
console.log('=====================================');

const runDailyIncomeTest = async () => {
  try {
    console.log('📊 Getting current statistics...');
    
    // Get stats before processing
    const statsBefore = await getDailyIncomeStats();
    console.log('\n📈 BEFORE Processing:');
    console.log(`- Total Active Users: ${statsBefore.totalActiveUsers}`);
    console.log(`- Users Received Today: ${statsBefore.todayRecipients}`);
    console.log(`- Pending Users: ${statsBefore.pendingUsers}`);
    console.log(`- Daily Income Amount: ₹${statsBefore.dailyIncomeAmount}`);
    console.log(`- Total Distributed Today: ₹${statsBefore.totalDistributedToday}`);
    console.log(`- Total Daily Income Ever: ₹${statsBefore.totalDailyIncomeEver}`);

    // Show some sample active users
    const sampleUsers = await User.find({ 
      isActive: true, 
      blocked: { $ne: true } 
    }).limit(5).select('userId name incomeWallet.dailyIncome incomeWallet.balance');
    
    console.log('\n👥 Sample Active Users:');
    sampleUsers.forEach(user => {
      console.log(`- ${user.name} (${user.userId}) - Daily Income: ₹${user.incomeWallet?.dailyIncome || 0}, Balance: ₹${user.incomeWallet?.balance || 0}`);
    });

    console.log('\n⚡ TRIGGERING DAILY INCOME DISTRIBUTION...');
    console.log('================================================');
    
    // Process daily income
    const result = await processDailyIncome();
    
    if (result.success) {
      console.log('\n✅ Daily Income Distribution COMPLETED!');
      console.log(`- Users Processed: ${result.processedCount}`);
      console.log(`- Errors: ${result.errorCount}`);
      console.log(`- Total Amount Distributed: ₹${result.totalAmount}`);
      
      // Get stats after processing
      const statsAfter = await getDailyIncomeStats();
      console.log('\n📈 AFTER Processing:');
      console.log(`- Users Received Today: ${statsAfter.todayRecipients}`);
      console.log(`- Pending Users: ${statsAfter.pendingUsers}`);
      console.log(`- Total Distributed Today: ₹${statsAfter.totalDistributedToday}`);
      console.log(`- Total Daily Income Ever: ₹${statsAfter.totalDailyIncomeEver}`);
      
      // Show updated sample users
      const updatedUsers = await User.find({ 
        _id: { $in: sampleUsers.map(u => u._id) }
      }).select('userId name incomeWallet.dailyIncome incomeWallet.balance incomeWallet.lastDailyIncome');
      
      console.log('\n👥 Updated Sample Users:');
      updatedUsers.forEach(user => {
        const lastIncome = user.incomeWallet?.lastDailyIncome ? 
          new Date(user.incomeWallet.lastDailyIncome).toLocaleString() : 'Never';
        console.log(`- ${user.name} (${user.userId}) - Daily Income: ₹${user.incomeWallet?.dailyIncome || 0}, Balance: ₹${user.incomeWallet?.balance || 0}, Last: ${lastIncome}`);
      });
      
    } else {
      console.log('\n❌ Daily Income Distribution FAILED!');
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n💥 Test Script Error:', error.message);
    console.error(error.stack);
  }
};

const forceRunDailyIncome = async () => {
  try {
    console.log('🚀 FORCE Running Daily Income Distribution...');
    console.log('This will add ₹10 to ALL active users regardless of last payment date');
    console.log('================================================');
    
    const result = await forceProcessDailyIncome();
    
    if (result.success) {
      console.log('\n✅ FORCE Daily Income Distribution COMPLETED!');
      console.log(`- Users Processed: ${result.processedCount}`);
      console.log(`- Errors: ${result.errorCount}`); 
      console.log(`- Total Amount Distributed: ₹${result.totalAmount}`);
    } else {
      console.log('\n❌ FORCE Daily Income Distribution FAILED!');
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n💥 Force Run Error:', error.message);
  }
};

const resetEligibility = async () => {
  try {
    console.log('🔄 Resetting Daily Income Eligibility...');
    const count = await resetDailyIncomeEligibility();
    console.log(`✅ Reset eligibility for ${count} users`);
    console.log('Now you can run daily income distribution again');
  } catch (error) {
    console.error('❌ Reset Error:', error.message);
  }
};

const showHelp = () => {
  console.log(`
📋 Daily Income Test Commands:
==============================

node test-daily-income.js run        - Run daily income distribution (normal)
node test-daily-income.js force      - FORCE run for ALL users (ignores eligibility)
node test-daily-income.js reset      - Reset eligibility (removes today's payments)
node test-daily-income.js stats      - Show current statistics only
node test-daily-income.js users      - Show active users list
node test-daily-income.js help       - Show this help

Examples:
---------
npm run test-daily-income             - Normal run
node test-daily-income.js force      - Force run for testing
node test-daily-income.js reset      - Reset then run again
node test-daily-income.js stats      - Check statistics
`);
};

const showStats = async () => {
  try {
    console.log('📊 Daily Income Statistics');
    console.log('==========================');
    
    const stats = await getDailyIncomeStats();
    console.log(`Total Active Users: ${stats.totalActiveUsers}`);
    console.log(`Users Received Today: ${stats.todayRecipients}`);
    console.log(`Pending Users: ${stats.pendingUsers}`);
    console.log(`Daily Income Amount: ₹${stats.dailyIncomeAmount}`);
    console.log(`Total Distributed Today: ₹${stats.totalDistributedToday}`);
    console.log(`Total Daily Income Ever: ₹${stats.totalDailyIncomeEver}`);
    
    if (stats.pendingUsers > 0) {
      console.log(`\n💡 ${stats.pendingUsers} users are eligible for daily income.`);
      console.log('Run: node test-daily-income.js run');
    } else {
      console.log('\n✅ All active users have received today\'s daily income.');
    }
    
  } catch (error) {
    console.error('Error getting stats:', error.message);
  }
};

const showActiveUsers = async () => {
  try {
    console.log('👥 Active Users List');
    console.log('===================');
    
    const users = await User.find({ 
      isActive: true, 
      blocked: { $ne: true } 
    }).select('userId name incomeWallet email createdAt').limit(20);
    
    console.log(`Found ${users.length} active users (showing first 20):\n`);
    
    users.forEach((user, index) => {
      const balance = user.incomeWallet?.balance || 0;
      const dailyIncome = user.incomeWallet?.dailyIncome || 0;
      const joinDate = user.createdAt.toLocaleDateString();
      
      console.log(`${index + 1}. ${user.name} (${user.userId})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Balance: ₹${balance} | Daily Income: ₹${dailyIncome}`);
      console.log(`   Joined: ${joinDate}\n`);
    });
    
  } catch (error) {
    console.error('Error getting users:', error.message);
  }
};

// Command line argument handling
const command = process.argv[2] || 'run';

const main = async () => {
  switch (command.toLowerCase()) {
    case 'run':
      await runDailyIncomeTest();
      break;
    case 'force':
      await forceRunDailyIncome();
      break;
    case 'reset':
      await resetEligibility();
      break;
    case 'stats':
      await showStats();
      break;
    case 'users':
      await showActiveUsers();
      break;
    case 'help':
      showHelp();
      break;
    default:
      console.log('❌ Unknown command:', command);
      showHelp();
  }
  
  console.log('\n🏁 Test Script Completed');
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('💥 Fatal Error:', error);
  process.exit(1);
}); 