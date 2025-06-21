# Daily Income Test Script Documentation

## Overview
The `test-daily-income.js` script allows you to manually trigger and test the daily income distribution system without waiting for the midnight cron schedule.

## ✅ Changes Made
- **Daily Income Amount**: Updated from ₹5 to ₹10 per day
- **TPIN Activation Bonus**: ₹10 added to both `selfIncome` and `dailyIncome`
- **Instant Testing**: Script to run daily income distribution immediately

## 🚀 How to Run

### Method 1: Using NPM Scripts (Recommended)
```bash
# Run daily income distribution instantly
npm run test-daily-income

# Show statistics only
npm run daily-stats

# Show active users list
npm run show-users
```

### Method 2: Direct Node Commands
```bash
# Run daily income distribution
node test-daily-income.js run

# Show current statistics
node test-daily-income.js stats

# Show active users
node test-daily-income.js users

# Show help
node test-daily-income.js help
```

## 📊 What the Script Does

### 1. **Run Command** (`run`)
- Shows statistics before processing
- Displays sample active users
- Triggers daily income distribution instantly
- Shows results and updated statistics
- Distributes ₹10 to all eligible active users

### 2. **Stats Command** (`stats`)
- Shows current daily income statistics
- Total active users
- Users who received income today
- Pending users eligible for income
- Total amounts distributed

### 3. **Users Command** (`users`)
- Lists active users (first 20)
- Shows their current balance and daily income
- Display join dates and user IDs

## 🎯 Expected Output

### Sample Run Output:
```
🚀 Daily Income Test Script Started
=====================================
📊 Getting current statistics...

📈 BEFORE Processing:
- Total Active Users: 5
- Users Received Today: 0
- Pending Users: 5
- Daily Income Amount: ₹10
- Total Distributed Today: ₹0
- Total Daily Income Ever: ₹250

👥 Sample Active Users:
- John Doe (LIFE10001) - Daily Income: ₹50, Balance: ₹120
- Jane Smith (LIFE10002) - Daily Income: ₹30, Balance: ₹85

⚡ TRIGGERING DAILY INCOME DISTRIBUTION...
================================================

✅ Daily Income Distribution COMPLETED!
- Users Processed: 5
- Errors: 0
- Total Amount Distributed: ₹50

📈 AFTER Processing:
- Users Received Today: 5
- Pending Users: 0
- Total Distributed Today: ₹50
- Total Daily Income Ever: ₹300
```

## 🔧 Technical Details

### What Happens During Distribution:
1. **Finds Eligible Users**: Active users who haven't received today's income
2. **Updates Wallets**: Adds ₹10 to `dailyIncome` and `balance`
3. **Creates Transactions**: Records transaction with type `daily_income`
4. **Updates Timestamps**: Sets `lastDailyIncome` to current date
5. **Logs Progress**: Shows processing for each user

### Database Updates:
```javascript
// For each eligible user:
user.incomeWallet.dailyIncome += 10
user.incomeWallet.balance += 10
user.incomeWallet.totalEarnings += 10
user.incomeWallet.lastDailyIncome = new Date()

// Transaction record:
user.incomeTransactions.push({
  type: 'daily_income',
  amount: 10,
  date: new Date(),
  description: 'Daily income reward for active account - ₹10 per day'
})
```

## 🕐 Scheduler Information

### Automatic Schedule:
- **Time**: Every day at 12:00 AM (midnight)
- **Timezone**: Asia/Kolkata (IST)
- **Amount**: ₹10 per active user
- **Eligibility**: Active users who haven't received today's income

### Manual Testing:
- Use this script for immediate testing
- Safe to run multiple times (prevents duplicate payments)
- Shows before/after comparisons

## 🛡️ Safety Features

1. **Duplicate Prevention**: Users can't receive multiple payments for the same day
2. **Active User Check**: Only active, non-blocked users receive income
3. **Error Handling**: Continues processing even if individual user fails
4. **Transaction Logging**: Complete audit trail maintained

## 💡 Usage Tips

### For Development:
```bash
# Test the system after new user activation
npm run test-daily-income

# Check how many users are eligible
npm run daily-stats

# See user balances before/after
npm run show-users
```

### For Production Testing:
```bash
# Run once daily for testing (in addition to automatic cron)
node test-daily-income.js run

# Monitor system health
node test-daily-income.js stats
```

## 🚨 Important Notes

1. **Environment**: Requires `.env` file with database connection
2. **Database**: Must be connected to MongoDB
3. **One Per Day**: Each user receives income only once per day
4. **Time Zone**: Uses Asia/Kolkata timezone for scheduling
5. **Active Users**: Only processes users with `isActive: true` and `blocked: false`

## 🔍 Troubleshooting

### If Script Fails:
1. Check database connection in `.env`
2. Verify MongoDB is running
3. Check for any user model validation errors
4. Look at console logs for specific errors

### If No Users Processed:
1. Verify users have `isActive: true`
2. Check users are not blocked
3. Confirm users haven't already received today's income
4. Use `node test-daily-income.js users` to see active users

## ✅ Testing Checklist

- [ ] Script runs without errors
- [ ] Active users receive ₹10 daily income
- [ ] Balance increases correctly
- [ ] Transaction records created
- [ ] Duplicate payments prevented
- [ ] Statistics update properly
- [ ] Console logs show progress

---

**Happy Testing! 💰**

Your daily income system now distributes ₹10 to all active users every day, with instant testing capabilities! 