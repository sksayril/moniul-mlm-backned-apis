# Enhanced User Profile API Documentation

## Overview
The `/api/auth/me` endpoint has been enhanced to provide comprehensive user profile information including daily income statistics, matrix level progress, and detailed income breakdown.

## Endpoint Details

### Get Current User Profile (Enhanced)
Get complete user profile with income statistics and matrix level information.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <user_jwt_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "_id": "673d4f8b2c5a3e1d4f6g7890",
      "name": "John Doe",
      "userId": "LIFE10001",
      "email": "john@example.com",
      "mobile": "+919876543210",
      "aadhaarNumber": "1234-5678-9012",
      "panNumber": "ABCDE1234F",
      "address": {
        "street": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "country": "India"
      },
      "role": "user",
      "isActive": true,
      "blocked": false,
      "referrer": {
        "_id": "673d4f8b2c5a3e1d4f6g7123",
        "name": "Jane Smith",
        "userId": "LIFE10000",
        "email": "jane@example.com"
      },
      "rank": "Associate",
      "teamSize": 12,
      "incomeWallet": {
        "balance": 285,
        "selfIncome": 10,
        "directIncome": 100,
        "matrixIncome": 50,
        "dailyIncome": 75,
        "dailyTeamIncome": 25,
        "rankRewards": 25,
        "fxTradingIncome": 0,
        "totalEarnings": 285,
        "withdrawnAmount": 0,
        "lastDailyIncome": "2024-01-15T18:30:00.000Z",
        "lastUpdated": "2024-01-15T18:30:00.000Z"
      },
      "investmentWallet": {
        "balance": 0,
        "totalInvested": 0,
        "totalMatured": 0,
        "totalReturns": 0
      },
      "cryptoWallet": {
        "enabled": true,
        "balance": 249.5,
        "coin": "MLMCoin",
        "lastUpdated": "2024-01-10T10:15:00.000Z"
      },
      "matrixLevels": [
        {
          "level": 1,
          "membersCount": 5,
          "requiredMembers": 5,
          "rewardAmount": 50,
          "isCompleted": true,
          "completedAt": "2024-01-12T14:20:00.000Z",
          "members": [
            {
              "userId": {
                "name": "Alice Johnson",
                "userId": "LIFE10002",
                "email": "alice@example.com"
              },
              "addedAt": "2024-01-10T10:15:00.000Z"
            }
          ]
        },
        {
          "level": 2,
          "membersCount": 12,
          "requiredMembers": 25,
          "rewardAmount": 125,
          "isCompleted": false,
          "members": [...]
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "dailyIncomeStats": {
      "totalDailyIncome": 75,
      "lastDailyIncome": "2024-01-15T18:30:00.000Z",
      "receivedToday": true,
      "dailyIncomeAmount": 5
    },
    "matrixStats": {
      "totalMatrixIncome": 50,
      "matrixLevels": [
        {
          "level": 1,
          "membersCount": 5,
          "requiredMembers": 5,
          "rewardAmount": 50,
          "isCompleted": true,
          "completedAt": "2024-01-12T14:20:00.000Z",
          "progress": "5/5",
          "progressPercentage": "100.0",
          "nextReward": 0,
          "membersNeeded": 0
        },
        {
          "level": 2,
          "membersCount": 12,
          "requiredMembers": 25,
          "rewardAmount": 125,
          "isCompleted": false,
          "progress": "12/25",
          "progressPercentage": "48.0",
          "nextReward": 125,
          "membersNeeded": 13
        }
      ]
    },
    "incomeBreakdown": {
      "selfIncome": 10,
      "directIncome": 100,
      "matrixIncome": 50,
      "dailyIncome": 75,
      "dailyTeamIncome": 25,
      "rankRewards": 25,
      "fxTradingIncome": 0,
      "totalBalance": 285,
      "totalEarnings": 285,
      "withdrawnAmount": 0
    },
    "recentTransactions": [
      {
        "type": "daily_income",
        "amount": 5,
        "date": "2024-01-15T18:30:00.000Z",
        "description": "Daily income reward for active account"
      },
      {
        "type": "matrix_income",
        "amount": 50,
        "level": 1,
        "fromUser": "673d4f8b2c5a3e1d4f6g7456",
        "date": "2024-01-12T14:20:00.000Z",
        "description": "Matrix Level 1 completed - 5 members achieved"
      }
    ]
  }
}
```

## Response Data Structure

### User Object
Complete user profile information including:
- Personal details (name, email, mobile, etc.)
- Address information
- Account status (active, blocked)
- Referrer information
- Rank and team size
- All wallet information (income, investment, crypto)
- Matrix levels with member details

### Daily Income Stats
```json
{
  "totalDailyIncome": 75,        // Total daily income earned
  "lastDailyIncome": "2024-01-15T18:30:00.000Z",  // Last daily income date
  "receivedToday": true,         // Whether received today
  "dailyIncomeAmount": 5         // Daily income amount (₹5)
}
```

### Matrix Stats
```json
{
  "totalMatrixIncome": 50,       // Total matrix income earned
  "matrixLevels": [              // Array of matrix levels
    {
      "level": 1,                // Level number
      "membersCount": 5,         // Current members
      "requiredMembers": 5,      // Required members
      "rewardAmount": 50,        // Reward amount
      "isCompleted": true,       // Completion status
      "completedAt": "2024-01-12T14:20:00.000Z",
      "progress": "5/5",         // Progress string
      "progressPercentage": "100.0",  // Progress percentage
      "nextReward": 0,           // Next reward amount (0 if completed)
      "membersNeeded": 0         // Members needed to complete
    }
  ]
}
```

### Income Breakdown
```json
{
  "selfIncome": 10,              // Self activation income
  "directIncome": 100,           // Direct referral income
  "matrixIncome": 50,            // Matrix level income
  "dailyIncome": 75,             // Total daily income
  "dailyTeamIncome": 25,         // Daily team income
  "rankRewards": 25,             // Rank-based rewards
  "fxTradingIncome": 0,          // FX trading income
  "totalBalance": 285,           // Current wallet balance
  "totalEarnings": 285,          // Total earnings ever
  "withdrawnAmount": 0           // Total withdrawn amount
}
```

### Recent Transactions
Array of recent daily income and matrix income transactions (last 10):
```json
[
  {
    "type": "daily_income",      // Transaction type
    "amount": 5,                 // Amount
    "date": "2024-01-15T18:30:00.000Z",  // Transaction date
    "description": "Daily income reward for active account"
  },
  {
    "type": "matrix_income",     // Transaction type
    "amount": 50,                // Amount
    "level": 1,                  // Matrix level
    "fromUser": "673d4f8b2c5a3e1d4f6g7456",  // User who triggered
    "date": "2024-01-12T14:20:00.000Z",
    "description": "Matrix Level 1 completed - 5 members achieved"
  }
]
```

## Key Features

### 1. Comprehensive Profile Data
- Complete user information with all wallets
- Referrer details and team information
- Account status and security information

### 2. Daily Income Tracking
- Total daily income earned to date
- Last daily income received timestamp
- Whether daily income was received today
- Daily income amount configuration

### 3. Matrix Level Progress
- Real-time matrix level progress
- Members count and requirements
- Completion status and dates
- Next reward calculations
- Members needed to complete levels

### 4. Income Breakdown
- Detailed breakdown of all income types
- Current balance and total earnings
- Withdrawal tracking

### 5. Recent Activity
- Last 10 daily income and matrix income transactions
- Transaction details with descriptions
- Chronological order (newest first)

## Usage Examples

### Basic Profile Request
```javascript
const response = await fetch('/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + userToken,
    'Content-Type': 'application/json'
  }
});

const profileData = await response.json();
console.log(profileData);
```

### Accessing Specific Data
```javascript
const { user, dailyIncomeStats, matrixStats, incomeBreakdown } = profileData.data;

// Check daily income status
if (dailyIncomeStats.receivedToday) {
  console.log('Daily income received today');
} else {
  console.log('Daily income pending');
}

// Check matrix progress
matrixStats.matrixLevels.forEach(level => {
  console.log(`Level ${level.level}: ${level.progress} (${level.progressPercentage}%)`);
  if (!level.isCompleted) {
    console.log(`Need ${level.membersNeeded} more members for ₹${level.nextReward}`);
  }
});

// Check income breakdown
console.log(`Total Balance: ₹${incomeBreakdown.totalBalance}`);
console.log(`Daily Income: ₹${incomeBreakdown.dailyIncome}`);
console.log(`Matrix Income: ₹${incomeBreakdown.matrixIncome}`);
```

## Error Responses

### User Not Found (404)
```json
{
  "status": "error",
  "message": "User not found"
}
```

### Unauthorized (401)
```json
{
  "status": "error",
  "message": "Please provide valid authentication token"
}
```

### Server Error (500)
```json
{
  "status": "error",
  "message": "Error fetching user profile",
  "error": "Technical error details"
}
```

## Security Notes

1. **Authentication Required**: Valid JWT token required
2. **User-Specific Data**: Only returns data for authenticated user
3. **Password Excluded**: Password fields are never returned
4. **Sensitive Data**: All sensitive information is properly filtered

## Performance Considerations

1. **Populated Data**: Referrer and matrix member details are populated
2. **Matrix Initialization**: Matrix levels are initialized if not exists
3. **Efficient Queries**: Optimized database queries with proper selection
4. **Recent Transactions**: Limited to last 10 for performance

This enhanced endpoint provides a complete dashboard view of the user's profile, income status, and matrix progress in a single API call. 