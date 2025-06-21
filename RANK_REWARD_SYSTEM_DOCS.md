# 🏆 Rank Reward System Documentation

## Overview
The Rank Reward System automatically promotes users to higher ranks based on their team size (direct active referrals) and awards them with cash rewards and physical benefits.

## 🎯 Rank Structure

| Rank | Required Members | Cash Reward | Additional Benefits |
|------|------------------|-------------|-------------------|
| **BRONZE** | 25 active referrals | ₹500 | Official ID Card |
| **SILVER** | 50 active referrals | ₹1,000 | Premium Bag |
| **GOLD** | 100 active referrals | ₹2,500 | Mobile Phone |
| **RUBY** | 200 active referrals | ₹10,000 | Mobile Phone + Tour Package |
| **DIAMOND** | 400 active referrals | ₹15,000 | India Tour Package |
| **PLATINUM** | 800 active referrals | ₹25,000 | International Tour Package |
| **KING** | 1,600 active referrals | ₹60,000 | Bike + International Tour |

## 🔧 How It Works

### Automatic Processing
- Rank rewards are processed automatically when a user activates their TPIN
- The system checks the entire referrer chain for rank eligibility
- Each rank can only be achieved once per user (one-time reward)

### Team Size Calculation
- Team size = number of **direct active referrals** only
- Only users with `isActive: true` are counted
- Indirect referrals (sub-levels) are not counted for rank rewards

### Reward Distribution
- Cash rewards are added to the `rankRewards` wallet
- Total balance and total earnings are updated automatically
- Transaction history is recorded with detailed descriptions

## 💰 Wallet Integration

### Income Wallet Fields
```javascript
incomeWallet: {
  rankRewards: Number,     // Total rank rewards earned
  balance: Number,         // Updated with rank rewards
  totalEarnings: Number,   // Updated with rank rewards
  // ... other income types
}
```

### Transaction Records
```javascript
incomeTransactions: [{
  type: 'rank_reward',
  amount: Number,
  date: Date,
  description: "BRONZE Rank Achievement - ₹500 + ID Card (25 active members)"
}]
```

## 🚀 API Integration

### User Profile Response
The `/api/auth/me` endpoint now includes rank reward statistics:

```json
{
  "status": "success",
  "data": {
    "user": { /* user data */ },
    "rankRewardStats": {
      "currentRank": "BRONZE",
      "directReferrals": 25,
      "totalRankRewards": 500,
      "nextRank": {
        "rank": "SILVER",
        "requiredMembers": 50,
        "reward": 1000,
        "description": "₹1000 + Bag",
        "membersNeeded": 25,
        "progress": "25/50",
        "progressPercentage": "50.0"
      },
      "achievedRanks": [
        {
          "rank": "BRONZE",
          "amount": 500,
          "date": "2025-01-20T10:30:00.000Z",
          "description": "BRONZE Rank Achievement - ₹500 + ID Card (25 active members)"
        }
      ]
    }
  }
}
```

## 🎮 Testing Commands

### NPM Scripts
```bash
# Show rank structure and information
npm run test-rank-structure

# Show user progress toward ranks
npm run test-rank-progress

# Simulate rank rewards for testing
npm run test-rank-simulate

# Show rank achievement statistics
npm run test-rank-stats

# Reset all rank rewards (testing only)
npm run test-rank-reset
```

### Direct Node Commands
```bash
# Show rank structure
node test-rank-rewards.js structure

# Show user progress
node test-rank-rewards.js progress

# Simulate rewards
node test-rank-rewards.js simulate

# Show statistics
node test-rank-rewards.js stats

# Reset rewards
node test-rank-rewards.js reset
```

## 📊 Example Output

### Rank Structure Display
```
🏆 Rank Reward Structure:
========================
Rank     | Members | Reward    | Benefits
---------|---------|-----------|----------------------------------
BRONZE   |      25 |      ₹500 | ₹500 Cash Reward, Official ID Card
SILVER   |      50 |    ₹1,000 | ₹1000 Cash Reward, Premium Bag
GOLD     |     100 |    ₹2,500 | ₹2500 Cash Reward, Mobile Phone
RUBY     |     200 |   ₹10,000 | ₹10000 Cash Reward, Mobile Phone, Tour Package
DIAMOND  |     400 |   ₹15,000 | ₹15000 Cash Reward, India Tour Package
PLATINUM |     800 |   ₹25,000 | ₹25000 Cash Reward, International Tour Package
KING     |   1,600 |   ₹60,000 | ₹60000 Cash Reward, Bike, International Tour Package
```

### User Progress Report
```
📊 User Rank Progress Report:
=============================

👤 User: John Doe (LIFE10001)
   Current Rank: BRONZE
   Referrer: Admin User (LIFE10000)
   📈 Direct Active Referrals: 25
   💰 Rank Rewards Earned: ₹500
   💰 Total Earnings: ₹1,560
   🏆 Ranks Achieved: 1
      BRONZE: ₹500 (1/20/2025)
   🎯 Next Target: SILVER (need 25 more referrals for ₹1000)
```

## 🔄 Processing Flow

### When User Activates TPIN
1. User successfully activates account with TPIN
2. System processes MLM income for referrer chain
3. System processes matrix income for referrer chain
4. **NEW**: System processes rank rewards for referrer chain
5. Each referrer in chain is checked for rank eligibility
6. Eligible users receive rank rewards automatically

### Rank Processing Logic
```javascript
// For each user in referrer chain
1. Count direct active referrals
2. Check against rank structure (25, 50, 100, 200, 400, 800, 1600)
3. Determine highest eligible rank not yet achieved
4. Award cash reward and update rank
5. Record transaction with detailed description
6. Continue to next level in chain
```

## 🎁 Benefits Explanation

### Cash Rewards
- Immediately credited to `rankRewards` wallet
- Added to total balance for withdrawals
- Counted toward total lifetime earnings

### Physical Benefits
- **ID Card**: Official company identification
- **Bag**: Premium branded bag
- **Mobile Phone**: Latest smartphone model
- **Tour Packages**: Domestic and international travel
- **Bike**: Two-wheeler vehicle
- **International Tour**: Premium overseas travel package

## 🔐 Security Features

### Duplicate Prevention
- Each rank can only be achieved once per user
- System checks transaction history before awarding
- Prevents multiple awards for same rank level

### Data Integrity
- All transactions are recorded with timestamps
- Detailed descriptions include member count verification
- Audit trail maintained for all rank achievements

## 📈 Statistics Tracking

### System-Wide Metrics
- Total rank rewards distributed
- Number of users at each rank level
- Percentage distribution across ranks
- Average time to rank achievement

### User-Specific Metrics
- Current rank and progress
- Next rank requirements
- Historical rank achievements
- Total rank rewards earned

## 🛠️ Technical Implementation

### Database Schema Updates
```javascript
// User Model Updates
rank: {
  type: String,
  enum: ['Newcomer', 'BRONZE', 'SILVER', 'GOLD', 'RUBY', 'DIAMOND', 'PLATINUM', 'KING'],
  default: 'Newcomer'
}

// Transaction Types
incomeTransactions: [{
  type: {
    enum: [..., 'rank_reward', ...] // Added rank_reward type
  }
}]
```

### Controller Functions
- `processRankRewards()`: Main rank processing function
- `rankRewardStats`: User profile rank statistics
- Integration with TPIN activation flow

## 🎯 Future Enhancements

### Potential Additions
1. **Rank Maintenance**: Monthly requirements to maintain rank
2. **Bonus Multipliers**: Higher ranks get income bonuses
3. **Exclusive Features**: Rank-based platform privileges
4. **Team Rank Bonuses**: Rewards for team rank achievements
5. **Anniversary Rewards**: Annual rank celebration bonuses

### Physical Benefit Tracking
1. **Delivery Status**: Track physical reward shipments
2. **Redemption System**: Allow users to choose reward timing
3. **Upgrade Options**: Higher value alternatives for rewards
4. **Regional Variations**: Location-specific benefit options

## 📞 Support Information

### For Users
- Rank progress visible in user dashboard
- Automatic notifications for rank achievements
- Support tickets for physical benefit inquiries

### For Administrators
- Rank achievement monitoring dashboard
- Physical benefit fulfillment tracking
- Rank statistics and analytics

---

## 🎉 Congratulations System
When users achieve new ranks, they receive:
- Instant cash reward credited to wallet
- Congratulatory notification
- Updated rank display across platform
- Physical benefit processing initiation
- Social recognition within platform

This comprehensive rank reward system motivates users to build larger teams while providing substantial rewards for their achievements! 