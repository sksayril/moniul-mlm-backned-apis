const mongoose = require('mongoose');
const User = require('./models/user.model');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL);

// Rank structure for reference
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

// Function to show rank structure
async function showRankStructure() {
  console.log('\n🏆 Rank Reward Structure:');
  console.log('========================');
  console.log('Rank     | Members | Reward    | Benefits');
  console.log('---------|---------|-----------|----------------------------------');
  
  for (const rank of rankStructure) {
    const members = rank.members.toString().padStart(7);
    const reward = `₹${rank.reward.toLocaleString()}`.padStart(9);
    const benefits = rank.benefits.join(', ');
    console.log(`${rank.rank.padEnd(8)} | ${members} | ${reward} | ${benefits}`);
  }
  
  console.log('\n💡 How Rank Rewards Work:');
  console.log('• Rewards are awarded automatically when user reaches required team size');
  console.log('• Team size = number of direct active referrals');
  console.log('• Each rank can only be achieved once per user');
  console.log('• Rewards are added to rankRewards wallet and totalEarnings');
  console.log('• User rank is updated automatically');
}

// Function to show user rank progress
async function showUserRankProgress() {
  try {
    console.log('\n📊 User Rank Progress Report:');
    console.log('=============================');

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
      console.log(`   Current Rank: ${user.rank || 'Newcomer'}`);
      console.log(`   Referrer: ${user.referrer ? `${user.referrer.name} (${user.referrer.userId})` : 'None'}`);
      
      // Count direct active referrals
      const activeReferrals = await User.countDocuments({
        referrer: user._id,
        isActive: true
      });
      
      console.log(`   📈 Direct Active Referrals: ${activeReferrals}`);
      
      // Show wallet balances
      const wallet = user.incomeWallet || {};
      console.log(`   💰 Rank Rewards Earned: ₹${wallet.rankRewards || 0}`);
      console.log(`   💰 Total Earnings: ₹${wallet.totalEarnings || 0}`);
      
      // Show rank transactions
      const rankTransactions = user.incomeTransactions?.filter(t => 
        t.type === 'rank_reward'
      ) || [];
      
      if (rankTransactions.length > 0) {
        console.log(`   🏆 Ranks Achieved: ${rankTransactions.length}`);
        rankTransactions.forEach(tx => {
          const rankName = tx.description.split(' ')[0];
          console.log(`      ${rankName}: ₹${tx.amount} (${new Date(tx.date).toLocaleDateString()})`);
        });
      } else {
        console.log(`   ⏳ No ranks achieved yet`);
      }
      
      // Show next rank target
      const nextRank = rankStructure.find(rank => activeReferrals < rank.members);
      if (nextRank) {
        const needed = nextRank.members - activeReferrals;
        console.log(`   🎯 Next Target: ${nextRank.rank} (need ${needed} more referrals for ₹${nextRank.reward})`);
      } else {
        console.log(`   👑 KING RANK ACHIEVED! Maximum rank reached!`);
      }
    }

  } catch (error) {
    console.error('❌ Error showing user rank progress:', error);
  }
}

// Function to simulate rank rewards (for testing)
async function simulateRankRewards() {
  try {
    console.log('\n🎭 Simulating Rank Rewards (FOR TESTING)');
    console.log('=======================================');
    
    const users = await User.find({ isActive: true }).limit(5);
    
    if (users.length === 0) {
      console.log('❌ No active users found for simulation');
      return;
    }
    
    // Simulate different team sizes
    const simulations = [
      { userId: users[0]?._id, teamSize: 25, expectedRank: 'BRONZE' },
      { userId: users[1]?._id, teamSize: 50, expectedRank: 'SILVER' },
      { userId: users[2]?._id, teamSize: 100, expectedRank: 'GOLD' },
      { userId: users[3]?._id, teamSize: 200, expectedRank: 'RUBY' },
      { userId: users[4]?._id, teamSize: 400, expectedRank: 'DIAMOND' }
    ];
    
    for (const sim of simulations) {
      if (!sim.userId) continue;
      
      const user = await User.findById(sim.userId);
      console.log(`\n🎯 Simulating ${sim.expectedRank} rank for ${user.name} (${user.userId})`);
      console.log(`   Simulated team size: ${sim.teamSize} members`);
      
      // Find the rank data
      const rankData = rankStructure.find(r => r.rank === sim.expectedRank);
      if (!rankData) continue;
      
      // Check if already received
      const alreadyReceived = user.incomeTransactions?.some(transaction => 
        transaction.type === 'rank_reward' && 
        transaction.description && 
        transaction.description.includes(rankData.rank)
      );
      
      if (alreadyReceived) {
        console.log(`   ✅ Already received ${rankData.rank} rank reward`);
        continue;
      }
      
      // Initialize wallets if needed
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
      
      if (!user.incomeTransactions) {
        user.incomeTransactions = [];
      }
      
      // Award rank reward
      const previousRankRewards = user.incomeWallet.rankRewards || 0;
      const previousTotalEarnings = user.incomeWallet.totalEarnings || 0;
      
      user.incomeWallet.rankRewards += rankData.reward;
      user.incomeWallet.balance += rankData.reward;
      user.incomeWallet.totalEarnings += rankData.reward;
      user.incomeWallet.lastUpdated = Date.now();
      user.rank = rankData.rank;
      
      user.incomeTransactions.push({
        type: 'rank_reward',
        amount: rankData.reward,
        date: Date.now(),
        description: `${rankData.rank} Rank Achievement - ${rankData.description} (${sim.teamSize} active members - SIMULATED)`
      });
      
      await user.save();
      
      console.log(`   🎉 ₹${rankData.reward} ${rankData.rank} rank reward awarded!`);
      console.log(`   💰 rankRewards: ₹${previousRankRewards} → ₹${user.incomeWallet.rankRewards}`);
      console.log(`   💰 totalEarnings: ₹${previousTotalEarnings} → ₹${user.incomeWallet.totalEarnings}`);
      console.log(`   🏆 Rank updated to: ${rankData.rank}`);
      console.log(`   🎁 Benefits: ${rankData.benefits.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error simulating rank rewards:', error);
  }
}

// Function to show rank statistics
async function showRankStats() {
  try {
    console.log('\n📈 Rank Achievement Statistics:');
    console.log('==============================');

    const users = await User.find({ isActive: true });
    
    let totalRankRewards = 0;
    let usersWithRanks = 0;
    const rankCounts = {};
    
    // Initialize rank counts
    rankStructure.forEach(rank => {
      rankCounts[rank.rank] = 0;
    });
    rankCounts['Newcomer'] = 0;

    for (const user of users) {
      const rankRewards = user.incomeWallet?.rankRewards || 0;
      if (rankRewards > 0) {
        totalRankRewards += rankRewards;
        usersWithRanks++;
      }
      
      // Count current ranks
      const currentRank = user.rank || 'Newcomer';
      if (rankCounts.hasOwnProperty(currentRank)) {
        rankCounts[currentRank]++;
      }
    }

    console.log(`👥 Total active users: ${users.length}`);
    console.log(`🏆 Users with rank rewards: ${usersWithRanks}`);
    console.log(`💰 Total rank rewards distributed: ₹${totalRankRewards.toLocaleString()}`);
    console.log('\n🎯 Rank Distribution:');
    
    Object.entries(rankCounts).forEach(([rank, count]) => {
      const percentage = users.length > 0 ? ((count / users.length) * 100).toFixed(1) : '0.0';
      console.log(`   ${rank.padEnd(12)}: ${count.toString().padStart(3)} users (${percentage}%)`);
    });

  } catch (error) {
    console.error('❌ Error showing rank stats:', error);
  }
}

// Function to reset rank rewards (for testing)
async function resetRankRewards() {
  try {
    console.log('\n🔄 Resetting Rank Rewards (FOR TESTING ONLY)');
    console.log('============================================');
    
    const result = await User.updateMany(
      { isActive: true },
      {
        $set: { rank: 'Newcomer' },
        $unset: { 'incomeWallet.rankRewards': '' },
        $pull: { incomeTransactions: { type: 'rank_reward' } }
      }
    );
    
    console.log(`✅ Reset completed for ${result.modifiedCount} users`);
    console.log('• All ranks reset to Newcomer');
    console.log('• Cleared rankRewards amounts');
    console.log('• Removed rank_reward transactions');
    console.log('• Users can now receive rank rewards again');
    
  } catch (error) {
    console.error('❌ Error resetting rank rewards:', error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'structure':
      showRankStructure();
      break;
    case 'progress':
      await showUserRankProgress();
      break;
    case 'simulate':
      await simulateRankRewards();
      break;
    case 'stats':
      await showRankStats();
      break;
    case 'reset':
      await resetRankRewards();
      break;
    default:
      console.log('🏆 Rank Reward System Test Commands:');
      console.log('===================================');
      console.log('• node test-rank-rewards.js structure - Show rank structure');
      console.log('• node test-rank-rewards.js progress  - Show user progress');
      console.log('• node test-rank-rewards.js simulate  - Simulate rank rewards');
      console.log('• node test-rank-rewards.js stats     - Show statistics');
      console.log('• node test-rank-rewards.js reset     - Reset rank rewards');
      console.log('\n📱 NPM Commands:');
      console.log('• npm run test-rank-structure');
      console.log('• npm run test-rank-progress');
      console.log('• npm run test-rank-simulate');
      console.log('• npm run test-rank-stats');
      console.log('• npm run test-rank-reset');
      console.log('\n🎯 Rank System Features:');
      console.log('• Automatic rank promotion based on team size');
      console.log('• One-time rewards for each rank achievement');
      console.log('• Rewards added to rankRewards wallet');
      console.log('• Benefits include cash + physical rewards');
      console.log('• Maximum rank: KING (1600 members, ₹60,000)');
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
} 