# Matrix Income Scheduler Documentation

## Overview
The Matrix Income Scheduler is an automated system that runs daily at 12:00 PM to check and award matrix income based on completed team levels. Income is awarded to the `dailyTeamIncome` wallet when users achieve specific team size milestones.

## 🕐 **Schedule Configuration**
- **Frequency**: Daily
- **Time**: 12:00 PM (Asia/Kolkata timezone)
- **Cron Pattern**: `0 12 * * *`
- **Auto-start**: Initialized when server starts

## 🏆 **Matrix Level Structure**

| Level | Required Active Users | Income Award | Wallet Updated |
|-------|----------------------|--------------|----------------|
| 1     | 5                    | ₹50          | dailyTeamIncome |
| 2     | 25                   | ₹125         | dailyTeamIncome |
| 3     | 125                  | ₹625         | dailyTeamIncome |
| 4     | 625                  | ₹1,875       | dailyTeamIncome |
| 5     | 3,125                | ₹9,375       | dailyTeamIncome |
| 6     | 15,625               | ₹46,875      | dailyTeamIncome |
| 7     | 78,125               | ₹2,34,375    | dailyTeamIncome |

## 🎯 **How Level Counting Works**

### Level 1 (Direct Referrals)
```
User A refers 5 users directly
Level 1 Count = 5 active direct referrals
```

### Level 2 (Second Generation)
```
User A's 5 direct referrals each refer 5 users
Level 2 Count = 5 × 5 = 25 active users
```

### Level 3 (Third Generation)
```
User A's 25 Level-2 users each refer 5 users
Level 3 Count = 25 × 5 = 125 active users
```

### And so on...
Each level multiplies by 5, creating exponential growth requirements.

## 💰 **Income Distribution Process**

### Daily Scheduler Flow:
1. **12:00 PM Trigger**: Cron job activates scheduler
2. **User Scanning**: Check all active users in database
3. **Level Analysis**: For each user, count active team members at each level
4. **Eligibility Check**: Verify user hasn't already received that level's income
5. **Income Award**: Add income to `dailyTeamIncome` wallet
6. **Transaction Record**: Create transaction history entry
7. **Wallet Update**: Update `totalEarnings` with new income
8. **Logging**: Comprehensive console logging for monitoring

### Wallet Updates:
```javascript
// When level completed:
user.incomeWallet.dailyTeamIncome += rewardAmount;
user.incomeWallet.totalEarnings += rewardAmount;
user.incomeWallet.lastUpdated = Date.now();

// Transaction record:
user.incomeTransactions.push({
  type: 'daily_matrix_income',
  amount: rewardAmount,
  level: level,
  date: Date.now(),
  description: `Daily Matrix Level ${level} completion bonus`
});
```

## 🔒 **Important Rules**

### Daily Award System:
- ✅ Users receive matrix income **every day** they qualify
- ✅ Each level can be earned **daily** as long as team size is maintained
- 🔍 System checks if already paid today before awarding

### Active User Requirement:
- ✅ Only counts users with `isActive: true`
- ❌ Inactive/blocked users don't contribute to counts
- 🔄 Dynamic counting - if users become inactive, counts decrease

### Daily Income Potential:
- 🎯 Users can earn from multiple levels every day
- 📈 Higher levels require exponentially more team members
- 💰 Daily maximum potential: ₹2,93,300 per day per user
- 💰 Monthly potential: ₹2,93,300 × 30 = ₹87,99,000 per month
- 💰 Annual potential: ₹2,93,300 × 365 = ₹10,70,54,500 per year

## 🧪 **Testing Commands**

### NPM Test Commands:
```bash
# Show matrix structure and rules
npm run test-matrix-structure

# Show current user progress
npm run test-matrix-progress

# Run scheduler manually (test mode)
npm run test-matrix-run

# Force process (ignores previous awards)
npm run test-matrix-force

# Show statistics and analytics
npm run test-matrix-stats

# Reset matrix income (testing only)
npm run test-matrix-reset

# Create demo referral scenario
npm run test-matrix-demo-setup
```

### Direct Node Commands:
```bash
# Basic structure information
node test-matrix-scheduler.js structure

# User progress report
node test-matrix-scheduler.js progress

# Manual scheduler execution
node test-matrix-scheduler.js run

# Force processing
node test-matrix-scheduler.js force

# Statistics dashboard
node test-matrix-scheduler.js stats

# Reset for testing
node test-matrix-scheduler.js reset

# Demo scenario setup
node test-matrix-scheduler.js demo
```

## 📊 **Monitoring & Logging**

### Console Output Example:
```
🎯 Starting Daily Matrix Income Scheduler
⏰ Time: 1/15/2025, 12:00:00 PM
==========================================

👤 Checking user: John Doe (LIFE10001)
   📈 Level 1: 5/5 active users
   🎉 Level 1 COMPLETED! Awarding ₹50 to dailyTeamIncome
   ✅ ₹50 added to dailyTeamIncome
   💰 dailyTeamIncome: ₹0 → ₹50
   💰 totalEarnings: ₹150 → ₹200
   📈 Level 2: 12/25 active users
   ⏳ Level 2: Needs 13 more active users for ₹125

📋 Daily Matrix Income Summary:
===============================
👥 Users processed: 25
🏆 Users rewarded: 3
💰 Total income awarded: ₹175
⏰ Completed at: 1/15/2025, 12:00:15 PM
```

## 🔧 **Technical Implementation**

### Scheduler Initialization:
```javascript
// In app.js
const matrixIncomeScheduler = require('./services/matrix.income.scheduler');
matrixIncomeScheduler.startMatrixIncomeScheduler();
```

### Recursive Level Counting:
```javascript
const countActiveUsersAtLevel = async (userId, targetLevel, visitedUsers = new Set()) => {
  if (targetLevel === 1) {
    // Direct referrals
    return await User.countDocuments({
      referrer: userId,
      isActive: true
    });
  } else {
    // Recursive counting for higher levels
    const directReferrals = await User.find({
      referrer: userId,
      isActive: true
    });
    
    let totalCount = 0;
    for (const referral of directReferrals) {
      totalCount += await countActiveUsersAtLevel(referral._id, targetLevel - 1);
    }
    return totalCount;
  }
};
```

### Duplicate Prevention:
```javascript
const hasReceivedMatrixIncome = (user, level) => {
  return user.incomeTransactions?.some(transaction => 
    transaction.type === 'daily_matrix_income' && 
    transaction.level === level
  );
};
```

## 📈 **Income Scenarios**

### Scenario 1: Small Team Leader (Daily)
- **5 direct referrals**: Level 1 qualified → ₹50 daily
- **Daily Team Income**: ₹50 per day
- **Monthly Earnings**: ₹50 × 30 = ₹1,500
- **Annual Earnings**: ₹50 × 365 = ₹18,250

### Scenario 2: Medium Team Leader (Daily)
- **25 second-level team**: Level 2 qualified → ₹125 daily
- **Level 1**: ₹50 daily (also qualified)
- **Daily Team Income**: ₹175 per day
- **Monthly Earnings**: ₹175 × 30 = ₹5,250
- **Annual Earnings**: ₹175 × 365 = ₹63,875

### Scenario 3: Large Team Leader (Daily)
- **125 third-level team**: Level 3 qualified → ₹625 daily
- **Previous Levels**: ₹50 + ₹125 = ₹175 daily
- **Daily Team Income**: ₹800 per day
- **Monthly Earnings**: ₹800 × 30 = ₹24,000
- **Annual Earnings**: ₹800 × 365 = ₹2,92,000

## 🚨 **Error Handling**

### Common Issues:
- **Database Connection**: Scheduler continues on next cycle
- **Invalid User Data**: Skip user, continue processing
- **Calculation Errors**: Log error, continue with next user
- **Memory Issues**: Prevent infinite loops with visited user tracking

### Logging Levels:
- ✅ **Success**: Income awarded successfully
- ⏳ **Pending**: Level not yet complete
- ❌ **Error**: Processing failed
- 🔄 **Skip**: Already processed

## 🔮 **Future Enhancements**

### Potential Additions:
- **Email Notifications**: Alert users when levels complete
- **Dashboard Integration**: Real-time matrix progress display
- **Bonus Multipliers**: Special events with increased rewards
- **Team Performance Analytics**: Detailed team growth reports
- **Mobile Push Notifications**: Instant level completion alerts

## 📞 **Support & Troubleshooting**

### Common Commands for Debugging:
```bash
# Check if scheduler is running
npm run test-matrix-stats

# View user progress
npm run test-matrix-progress

# Manual test run
npm run test-matrix-run

# Reset for testing
npm run test-matrix-reset
```

### Log File Locations:
- Console output shows real-time processing
- Database transactions stored in user records
- Server logs contain scheduler activation times

---

**The Matrix Income Scheduler provides automated, fair, and transparent distribution of team-building rewards, encouraging sustained growth and engagement in the MLM system.** 