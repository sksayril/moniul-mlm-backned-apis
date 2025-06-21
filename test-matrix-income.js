const mongoose = require('mongoose');
const User = require('./models/user.model');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mlm-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
  1: 50,
  2: 125,
  3: 625,
  4: 1875,
  5: 9375,
  6: 46875,
  7: 234375
};

async function demonstrateMatrixIncome() {
  try {
    console.log('🎯 Matrix Income System Demonstration');
    console.log('=====================================\n');

    // Find a user with referrals
    const users = await User.find({ isActive: true })
      .populate('referrer', 'userId name')
      .sort({ createdAt: 1 })
      .limit(10);

    if (users.length === 0) {
      console.log('❌ No active users found. Please activate some users first.');
      return;
    }

    console.log('📊 Matrix Income Progress Report:');
    console.log('================================\n');

    for (const user of users) {
      console.log(`👤 User: ${user.name} (${user.userId})`);
      console.log(`   Referrer: ${user.referrer ? `${user.referrer.name} (${user.referrer.userId})` : 'None'}`);
      
      // Count downline at each level
      const downlineStats = {};
      
      for (let level = 1; level <= 7; level++) {
        const levelCount = user.downline ? user.downline.filter(entry => entry.level === level).length : 0;
        const required = matrixCapacity[level];
        const reward = matrixIncomes[level];
        const completed = levelCount >= required;
        
        downlineStats[level] = {
          current: levelCount,
          required: required,
          reward: reward,
          completed: completed,
          percentage: ((levelCount / required) * 100).toFixed(1)
        };
        
        console.log(`   Level ${level}: ${levelCount}/${required} members (${downlineStats[level].percentage}%) - ${completed ? '✅ ₹' + reward : '⏳ ₹' + reward + ' pending'}`);
      }
      
      // Calculate total matrix income earned
      const totalMatrixIncome = user.incomeWallet?.matrixIncome || 0;
      console.log(`   💰 Total Matrix Income Earned: ₹${totalMatrixIncome}`);
      
      // Show what they're waiting for
      const nextLevel = Object.keys(downlineStats).find(level => !downlineStats[level].completed);
      if (nextLevel) {
        const needed = downlineStats[nextLevel].required - downlineStats[nextLevel].current;
        console.log(`   🎯 Next Goal: ${needed} more members for Level ${nextLevel} (₹${downlineStats[nextLevel].reward})`);
      } else {
        console.log(`   🏆 ALL LEVELS COMPLETED! Master achiever!`);
      }
      
      console.log('');
    }

    console.log('📋 Matrix Income Rules:');
    console.log('======================');
    console.log('• ❌ NO income for partial achievements');
    console.log('• ✅ FULL income only when exact threshold is met');
    console.log('• 🔒 One-time award per level (no duplicates)');
    console.log('• ⏳ System holds income until complete');
    console.log('• 💰 Maximum potential: ₹2,93,300 total matrix income');
    
  } catch (error) {
    console.error('❌ Error demonstrating matrix income:', error);
  }
}

async function showMatrixIncomeTable() {
  console.log('\n🏆 Matrix Income Structure:');
  console.log('===========================');
  console.log('Level | Members | Income    | Status');
  console.log('------|---------|-----------|--------');
  
  for (let level = 1; level <= 7; level++) {
    const members = matrixCapacity[level].toLocaleString();
    const income = `₹${matrixIncomes[level].toLocaleString()}`;
    console.log(`  ${level}   | ${members.padStart(7)} | ${income.padStart(9)} | Hold until complete`);
  }
  
  console.log('\n💡 Key Points:');
  console.log('• Income is awarded ONLY when the exact member count is reached');
  console.log('• No partial payments - it\'s all or nothing');
  console.log('• Each level can only be completed once per user');
  console.log('• System waits until threshold is met before releasing income');
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'demo':
      await demonstrateMatrixIncome();
      break;
    case 'table':
      showMatrixIncomeTable();
      break;
    default:
      console.log('Available commands:');
      console.log('• node test-matrix-income.js demo  - Show matrix progress for users');
      console.log('• node test-matrix-income.js table - Show matrix income structure');
      console.log('\nNPM Commands:');
      console.log('• npm run test-matrix-demo');
      console.log('• npm run test-matrix-table');
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
} 