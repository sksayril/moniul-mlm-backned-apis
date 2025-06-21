const mongoose = require('mongoose');
const User = require('./models/user.model');
const { 
  processMatrixIncomeScheduler, 
  forceProcessMatrixIncome, 
  getMatrixIncomeStats 
} = require('./services/matrix.income.scheduler');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL);

// Matrix configuration for reference
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

// Function to show matrix income structure
async function showMatrixStructure() {
  console.log('\n🏆 Matrix Income Structure (Daily Scheduler):');
  console.log('=============================================');
  console.log('Level | Required | Income    | Wallet        | Schedule');
  console.log('------|----------|-----------|---------------|----------');
  
  for (let level = 1; level <= 7; level++) {
    const members = matrixCapacity[level].toLocaleString();
    const income = `₹${matrixIncomes[level].toLocaleString()}`;
    console.log(`  ${level}   | ${members.padStart(8)} | ${income.padStart(9)} | dailyTeamIncome | Daily 12PM`);
  }
  
  console.log('\n💡 How Daily Matrix Scheduler Works:');
  console.log('• Runs every day at 12:00 PM automatically');
  console.log('• Checks all active users for completed matrix levels');
  console.log('• Awards income to dailyTeamIncome wallet (not matrixIncome)');
  console.log('• Each level can only be completed once per user');
  console.log('• Updates totalEarnings with new income');
  console.log('• Creates transaction records for tracking');
}

// Function to show user matrix progress
async function showUserProgress() {
  try {
    console.log('\n📊 User Matrix Progress Report:');
    console.log('===============================');

    const users = await User.find({ isActive: true })
      .populate('referrer', 'userId name')
      .sort({ createdAt: 1 })
      .limit(10);

    if (users.length === 0) {
      console.log('❌ No active users found');
      return;
    }

    for (const user of users) {
      console.log(`\n👤 User: ${user.name} (${user.userId})`);
      console.log(`   Referrer: ${user.referrer ? `${user.referrer.name} (${user.referrer.userId})` : 'None'}`);
      
      // Show wallet balances
      const wallet = user.incomeWallet || {};
      console.log(`   💰 dailyTeamIncome: ₹${wallet.dailyTeamIncome || 0}`);
      console.log(`   💰 totalEarnings: ₹${wallet.totalEarnings || 0}`);
      
      // Count direct referrals
      const directReferrals = await User.countDocuments({
        referrer: user._id,
        isActive: true
      });
      
      console.log(`   📈 Direct referrals: ${directReferrals}`);
      
      // Show matrix income transactions
      const matrixTransactions = user.incomeTransactions?.filter(t => 
        t.type === 'daily_matrix_income'
      ) || [];
      
      if (matrixTransactions.length > 0) {
        console.log(`   🎯 Matrix levels completed: ${matrixTransactions.length}`);
        matrixTransactions.forEach(tx => {
          console.log(`      Level ${tx.level}: ₹${tx.amount} (${new Date(tx.date).toLocaleDateString()})`);
        });
      } else {
        console.log(`   ⏳ No matrix levels completed yet`);
      }
    }

  } catch (error) {
    console.error('❌ Error showing user progress:', error);
  }
}

// Function to run the scheduler manually
async function runSchedulerTest() {
  console.log('\n🚀 Running Matrix Income Scheduler Test');
  console.log('======================================');
  console.log('This simulates the daily 12PM scheduler run...\n');
  
  await processMatrixIncomeScheduler();
}

// Function to force process (for testing)
async function forceProcessTest() {
  console.log('\n⚡ Force Processing Matrix Income');
  console.log('===============================');
  console.log('This forces processing even if already processed today...\n');
  
  await forceProcessMatrixIncome();
}

// Function to show statistics
async function showStats() {
  await getMatrixIncomeStats();
}

// Function to reset matrix income (for testing)
async function resetMatrixIncome() {
  try {
    console.log('\n🔄 Resetting Matrix Income (FOR TESTING ONLY)');
    console.log('=============================================');
    
    const result = await User.updateMany(
      { isActive: true },
      {
        $unset: {
          'incomeWallet.dailyTeamIncome': '',
        },
        $pull: {
          incomeTransactions: { type: 'daily_matrix_income' }
        }
      }
    );
    
    console.log(`✅ Reset completed for ${result.modifiedCount} users`);
    console.log('• Cleared dailyTeamIncome amounts');
    console.log('• Removed daily_matrix_income transactions');
    console.log('• Users can now receive matrix income again');
    
  } catch (error) {
    console.error('❌ Error resetting matrix income:', error);
  }
}

// Function to create demo scenario
async function createDemoScenario() {
  try {
    console.log('\n🎭 Creating Demo Matrix Scenario');
    console.log('===============================');
    
    // Find users to set up demo
    const users = await User.find({ isActive: true }).limit(10);
    
    if (users.length < 6) {
      console.log('❌ Need at least 6 active users for demo. Please activate more users first.');
      return;
    }
    
    // Set up a referral chain: User1 -> User2 -> User3 -> User4 -> User5 -> User6
    const [user1, user2, user3, user4, user5, user6] = users;
    
    // Create referral chain
    user2.referrer = user1._id;
    user3.referrer = user2._id;
    user4.referrer = user3._id;
    user5.referrer = user4._id;
    user6.referrer = user5._id;
    
    await user2.save();
    await user3.save();
    await user4.save();
    await user5.save();
    await user6.save();
    
    console.log('✅ Demo referral chain created:');
    console.log(`   ${user1.userId} -> ${user2.userId} -> ${user3.userId} -> ${user4.userId} -> ${user5.userId} -> ${user6.userId}`);
    console.log('\n🎯 Now run the scheduler to see matrix income in action!');
    console.log('   Command: npm run test-matrix-run');
    
  } catch (error) {
    console.error('❌ Error creating demo scenario:', error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'structure':
      showMatrixStructure();
      break;
    case 'progress':
      await showUserProgress();
      break;
    case 'run':
      await runSchedulerTest();
      break;
    case 'force':
      await forceProcessTest();
      break;
    case 'stats':
      await showStats();
      break;
    case 'reset':
      await resetMatrixIncome();
      break;
    case 'demo':
      await createDemoScenario();
      break;
    default:
      console.log('🎯 Matrix Income Scheduler Test Commands:');
      console.log('========================================');
      console.log('• node test-matrix-scheduler.js structure - Show matrix structure');
      console.log('• node test-matrix-scheduler.js progress  - Show user progress');
      console.log('• node test-matrix-scheduler.js run       - Run scheduler test');
      console.log('• node test-matrix-scheduler.js force     - Force process test');
      console.log('• node test-matrix-scheduler.js stats     - Show statistics');
      console.log('• node test-matrix-scheduler.js reset     - Reset matrix income');
      console.log('• node test-matrix-scheduler.js demo      - Create demo scenario');
      console.log('\n📱 NPM Commands:');
      console.log('• npm run test-matrix-structure');
      console.log('• npm run test-matrix-progress');
      console.log('• npm run test-matrix-run');
      console.log('• npm run test-matrix-force');
      console.log('• npm run test-matrix-stats');
      console.log('• npm run test-matrix-reset');
      console.log('• npm run test-matrix-demo');
      console.log('\n⏰ Automatic Schedule: Every day at 12:00 PM');
      console.log('💰 Income goes to: dailyTeamIncome wallet');
      console.log('🎯 Levels: 1-7 (₹50 to ₹2,34,375)');
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
} 