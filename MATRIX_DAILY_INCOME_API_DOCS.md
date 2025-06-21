# Matrix Level Income & Daily Income API Documentation

## Overview
This document describes the Matrix Level Income system and Daily Income scheduler that provides automated income distribution to MLM users.

## Matrix Level Income System

### How It Works
- **Level 1**: When a user gets 5 direct referrals, they receive ₹50
- **Level 2**: When a user gets 25 total referrals in their network, they receive ₹125
- Matrix levels are tracked individually for each user
- Income is distributed only to active users
- Inactive users' income passes to the next level up

### Base URL
```
http://localhost:3000/api/matrix
```

### Authentication
All endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`

## Matrix Income Endpoints

### 1. Get Matrix Status
Get current matrix level status and progress for the authenticated user.

**Endpoint:** `GET /api/matrix/status`

**Headers:**
```
Authorization: Bearer <user_jwt_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Matrix status retrieved successfully",
  "data": {
    "user": {
      "name": "John Doe",
      "userId": "LIFE10001",
      "matrixIncome": 175
    },
    "matrixLevels": [
      {
        "level": 1,
        "membersCount": 5,
        "requiredMembers": 5,
        "rewardAmount": 50,
        "isCompleted": true,
        "completedAt": "2024-01-15T08:30:00.000Z",
        "progress": "5/5",
        "progressPercentage": "100.0",
        "members": [
          {
            "name": "Jane Smith",
            "userId": "LIFE10002",
            "addedAt": "2024-01-10T10:15:00.000Z"
          }
        ]
      },
      {
        "level": 2,
        "membersCount": 18,
        "requiredMembers": 25,
        "rewardAmount": 125,
        "isCompleted": false,
        "progress": "18/25",
        "progressPercentage": "72.0",
        "members": [...]
      }
    ]
  }
}
```

---

### 2. Get Matrix Income History
Get paginated history of matrix income transactions.

**Endpoint:** `GET /api/matrix/history`

**Headers:**
```
Authorization: Bearer <user_jwt_token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Records per page (default: 10)

**Example Request:**
```
GET /api/matrix/history?page=1&limit=5
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Matrix income history retrieved successfully",
  "data": {
    "transactions": [
      {
        "type": "matrix_income",
        "amount": 50,
        "level": 1,
        "fromUser": {
          "name": "Jane Smith",
          "userId": "LIFE10002",
          "email": "jane@example.com"
        },
        "date": "2024-01-15T08:30:00.000Z",
        "description": "Matrix Level 1 completed - 5 members achieved"
      }
    ],
    "summary": {
      "totalMatrixIncome": 175,
      "totalTransactions": 2
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalTransactions": 2,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

## Daily Income System

### How It Works
- **Amount**: ₹5 per day for each active user
- **Schedule**: Runs automatically at 12:00 AM IST every day
- **Eligibility**: Only active, non-blocked users receive daily income
- **Tracking**: Prevents duplicate payments on the same day

### Base URL (Admin Only)
```
http://localhost:3000/api/admin/daily-income
```

### Authentication
All endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- Admin role access

## Daily Income Endpoints

### 1. Manual Trigger Daily Income
Manually trigger daily income processing (for testing or emergency).

**Endpoint:** `POST /api/admin/daily-income/trigger`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Daily income processing completed",
  "data": {
    "success": true,
    "processedCount": 1250,
    "errorCount": 3,
    "totalAmount": 6250
  }
}
```

---

### 2. Get Daily Income Statistics
Get comprehensive statistics about daily income distribution.

**Endpoint:** `GET /api/admin/daily-income/stats`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Daily income statistics retrieved successfully",
  "data": {
    "todayRecipients": 1250,
    "totalActiveUsers": 1253,
    "totalDistributedToday": 6250,
    "totalDailyIncomeEver": 125000,
    "pendingUsers": 3,
    "dailyIncomeAmount": 5
  }
}
```

---

## Database Schema Updates

### User Model Extensions

**Matrix Level Tracking:**
```javascript
matrixLevels: [{
  level: Number,              // 1 or 2
  membersCount: Number,       // Current members in this level
  requiredMembers: Number,    // Required members to complete level
  rewardAmount: Number,       // Reward amount for completing level
  isCompleted: Boolean,       // Whether level is completed
  completedAt: Date,          // When level was completed
  members: [{
    userId: ObjectId,         // Reference to User
    addedAt: Date            // When member was added
  }]
}]
```

**Income Wallet Updates:**
```javascript
incomeWallet: {
  // ... existing fields
  dailyIncome: Number,        // Total daily income earned
  lastDailyIncome: Date,      // Last daily income received date
}
```

**Transaction Types:**
```javascript
incomeTransactions: [{
  type: String,  // Added: 'daily_income', 'matrix_income'
  // ... other fields
}]
```

---

## Automated Schedulers

### Daily Income Scheduler
- **Schedule**: Every day at 12:00 AM IST
- **Cron Expression**: `0 0 * * *`
- **Timezone**: Asia/Kolkata
- **Process**: Finds all active users and distributes ₹5 daily income

### Matrix Income Processing
- **Trigger**: When user activates account with TPIN
- **Process**: Automatically updates matrix levels for upline users
- **Rewards**: Distributes income when levels are completed

---

## Income Flow Example

### Matrix Level 1 Example:
1. User A activates account
2. User A refers 5 people (B, C, D, E, F)
3. When 5th person (F) activates, User A receives ₹50
4. Matrix Level 1 is marked as completed
5. System continues tracking for Level 2

### Matrix Level 2 Example:
1. User A needs 25 total referrals in network
2. Direct referrals + their referrals count toward Level 2
3. When 25th person activates, User A receives ₹125
4. Matrix Level 2 is marked as completed

### Daily Income Example:
1. Scheduler runs at 12:00 AM IST
2. Finds all active, non-blocked users
3. Adds ₹5 to each user's daily income
4. Updates lastDailyIncome timestamp
5. Creates transaction record

---

## API Response Formats

### Success Response:
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response:
```json
{
  "status": "error",
  "message": "Error description",
  "error": "Technical error details"
}
```

---

## Testing & Monitoring

### Testing Matrix Income:
1. Create test users with referral relationships
2. Activate accounts with TPIN
3. Check matrix status API for progress
4. Verify income distribution

### Testing Daily Income:
1. Use manual trigger endpoint
2. Check daily income stats
3. Verify user wallet updates
4. Monitor scheduler logs

### Monitoring:
- Check application logs for scheduler execution
- Monitor database for income transactions
- Track user wallet balances
- Review error logs for failed processing

---

## Security & Compliance

1. **Admin Access**: Daily income management restricted to admins
2. **Duplicate Prevention**: Prevents multiple daily income on same day
3. **Active User Check**: Only active, non-blocked users receive income
4. **Audit Trail**: Complete transaction history for compliance
5. **Error Handling**: Comprehensive error logging and recovery

---

## Configuration

### Matrix Levels Configuration:
```javascript
const MATRIX_CONFIG = {
  1: { requiredMembers: 5, rewardAmount: 50 },
  2: { requiredMembers: 25, rewardAmount: 125 }
};
```

### Daily Income Configuration:
```javascript
const DAILY_INCOME_AMOUNT = 5; // ₹5 per day
```

### Scheduler Configuration:
- **Timezone**: Asia/Kolkata (IST)
- **Daily Schedule**: 12:00 AM every day
- **Retry Logic**: Built-in error handling and logging

---

## Troubleshooting

### Common Issues:

1. **Matrix Income Not Distributed**
   - Check if upline users are active
   - Verify referral relationships
   - Check matrix level completion status

2. **Daily Income Skipped**
   - Verify user is active and not blocked
   - Check lastDailyIncome timestamp
   - Review scheduler logs

3. **Duplicate Transactions**
   - System prevents duplicates automatically
   - Check transaction timestamps
   - Verify user eligibility

### Debug Endpoints:
- Matrix status API shows current progress
- Daily income stats show processing status
- Transaction history shows all income records 