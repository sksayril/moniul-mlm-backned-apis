# Investment Wallet API Documentation

## Overview
The Investment Wallet system allows users to:
- Recharge their investment wallet through manual payment verification
- Create investments of ₹5999 that mature in 35 days with ₹15000 return
- Track daily returns that are automatically processed and added to income wallet
- View investment history and statistics

## Authentication
All endpoints require authentication using Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## USER ENDPOINTS

### 1. Recharge Investment Wallet
**POST** `/api/investment/recharge`

Upload payment screenshot and details to recharge investment wallet. Requires admin approval.

**Request Body (Form Data):**
```
paymentId: string (required) - Your payment transaction ID
amount: number (required) - Amount paid
currency: string (optional, default: "INR") - Currency
screenshot: file (required) - Payment screenshot image
```

**Response:**
```json
{
  "status": "success",
  "message": "Investment wallet recharge request submitted successfully. Please wait for admin approval.",
  "data": {
    "paymentDetails": {
      "paymentId": "PAY123456",
      "amount": 10000,
      "currency": "INR",
      "purpose": "investment_wallet",
      "screenshot": "/uploads/payments/685125637e91a2eb70842534-1750154052151-screenshot.jpg",
      "screenshotUrl": "http://localhost:3000/uploads/payments/685125637e91a2eb70842534-1750154052151-screenshot.jpg",
      "status": "pending",
      "date": "2024-01-15T10:30:00.000Z"
    },
    "currentWalletBalance": 0
  }
}
```

### 2. Create Investment
**POST** `/api/investment/create`

Create a new investment of ₹5999 from investment wallet balance.

**Request Body:** None required

**Response:**
```json
{
  "status": "success",
  "message": "Investment created successfully!",
  "data": {
    "investment": {
      "investmentId": "INV-A1B2C3D4E5F6",
      "amount": 5999,
      "startDate": "2024-01-15T10:30:00.000Z",
      "maturityDate": "2024-02-19T10:30:00.000Z",
      "returnAmount": 15000,
      "status": "active",
      "daysCompleted": 0,
      "totalDays": 35,
      "dailyReturn": 257,
      "lastProcessed": "2024-01-15T10:30:00.000Z"
    },
    "walletBalance": 4001,
    "expectedReturn": 15000,
    "maturityDate": "2024-02-19T10:30:00.000Z"
  }
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "Insufficient investment wallet balance. Required: ₹5999, Available: ₹1000"
}
```

```json
{
  "status": "error",
  "message": "You already have an active investment. Wait for it to mature before creating a new one."
}
```

### 3. Get Investment Wallet Details
**GET** `/api/investment/wallet`

Get current investment wallet status, active investment, and pending recharges.

**Response:**
```json
{
  "status": "success",
  "data": {
    "wallet": {
      "balance": 4001,
      "totalInvested": 5999,
      "totalMatured": 0,
      "totalReturns": 0,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    "activeInvestment": {
      "investmentId": "INV-A1B2C3D4E5F6",
      "amount": 5999,
      "startDate": "2024-01-15T10:30:00.000Z",
      "maturityDate": "2024-02-19T10:30:00.000Z",
      "returnAmount": 15000,
      "status": "active",
      "daysCompleted": 5,
      "totalDays": 35,
      "dailyReturn": 257,
      "lastProcessed": "2024-01-20T06:00:00.000Z"
    },
    "maturedInvestments": [],
    "pendingRecharges": [
      {
        "paymentId": "PAY123456",
        "amount": 10000,
        "status": "pending",
        "date": "2024-01-15T10:30:00.000Z"
      }
    ],
    "canInvest": false,
    "investmentAmount": 5999,
    "expectedReturn": 15000,
    "investmentPeriod": 35
  }
}
```

### 4. Get Investment History
**GET** `/api/investment/history`

Get complete investment history including all investments, recharge history, and transactions.

**Response:**
```json
{
  "status": "success",
  "data": {
    "investments": [
      {
        "investmentId": "INV-A1B2C3D4E5F6",
        "amount": 5999,
        "startDate": "2024-01-15T10:30:00.000Z",
        "maturityDate": "2024-02-19T10:30:00.000Z",
        "returnAmount": 15000,
        "status": "active",
        "daysCompleted": 5,
        "totalDays": 35,
        "dailyReturn": 257
      }
    ],
    "rechargeHistory": [
      {
        "paymentId": "PAY123456",
        "amount": 10000,
        "purpose": "investment_wallet",
        "status": "verified",
        "date": "2024-01-15T10:30:00.000Z",
        "approvedAt": "2024-01-15T12:00:00.000Z"
      }
    ],
    "investmentTransactions": [
      {
        "type": "investment_return",
        "amount": 257,
        "investmentId": "INV-A1B2C3D4E5F6",
        "date": "2024-01-16T06:00:00.000Z",
        "description": "Daily return for investment INV-A1B2C3D4E5F6. Day 1 of 35"
      }
    ],
    "summary": {
      "totalInvestments": 1,
      "totalInvested": 5999,
      "totalReturns": 1285,
      "totalMatured": 0,
      "activeInvestments": 1,
      "maturedInvestments": 0
    }
  }
}
```

---

## ADMIN ENDPOINTS

### 1. Get Pending Recharge Requests
**GET** `/api/admin/investment/recharges/pending`

Get all pending investment wallet recharge requests for approval.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (pending/verified/rejected, default: pending)

**Response:**
```json
{
  "status": "success",
  "data": {
    "recharges": [
      {
        "_id": "payment_detail_id",
        "userId": "user_id",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "userMobile": "+91-9876543210",
        "paymentId": "PAY123456",
        "amount": 10000,
        "currency": "INR",
        "screenshot": "/uploads/payments/screenshot.jpg",
        "screenshotUrl": "http://localhost:3000/uploads/payments/screenshot.jpg",
        "status": "pending",
        "date": "2024-01-15T10:30:00.000Z"
      }
    ],
    "totalCount": 5,
    "currentPage": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### 2. Approve Recharge Request
**POST** `/api/admin/investment/recharges/:userId/:paymentId/approve`

Approve a pending investment wallet recharge request.

**Response:**
```json
{
  "status": "success",
  "message": "Investment wallet recharge of ₹10000 approved successfully",
  "data": {
    "userId": "user_id",
    "userName": "John Doe",
    "approvedAmount": 10000,
    "newWalletBalance": 15000,
    "approvedAt": "2024-01-15T12:00:00.000Z",
    "approvedBy": "admin_id"
  }
}
```

### 3. Reject Recharge Request
**POST** `/api/admin/investment/recharges/:userId/:paymentId/reject`

Reject a pending investment wallet recharge request.

**Request Body:**
```json
{
  "rejectionReason": "Invalid payment screenshot or payment not found"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Investment wallet recharge of ₹10000 rejected",
  "data": {
    "userId": "user_id",
    "userName": "John Doe",
    "rejectedAmount": 10000,
    "rejectionReason": "Invalid payment screenshot or payment not found",
    "rejectedAt": "2024-01-15T12:00:00.000Z",
    "rejectedBy": "admin_id"
  }
}
```

### 4. Get Investment Statistics
**GET** `/api/admin/investment/stats`

Get comprehensive investment system statistics.

**Response:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "totalUsers": 150,
      "totalInvestmentWalletBalance": 250000,
      "totalInvested": 500000,
      "totalReturns": 150000,
      "activeInvestments": 25,
      "maturedInvestments": 58,
      "pendingRecharges": 12,
      "totalRechargeAmount": 120000
    },
    "activeInvestmentDetails": [
      {
        "userId": "user_id",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "investmentId": "INV-A1B2C3D4E5F6",
        "amount": 5999,
        "startDate": "2024-01-15T10:30:00.000Z",
        "maturityDate": "2024-02-19T10:30:00.000Z",
        "daysCompleted": 5,
        "totalDays": 35,
        "status": "active",
        "expectedReturn": 15000
      }
    ],
    "pendingRechargesSummary": {
      "count": 12,
      "totalAmount": 120000
    }
  }
}
```

### 5. Get All Investments
**GET** `/api/admin/investment/investments`

Get all investments (active and matured) with pagination.

**Query Parameters:**
- `status` (optional): Filter by status (all/active/matured, default: all)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "status": "success",
  "data": {
    "investments": [
      {
        "userId": "user_id",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "userMobile": "+91-9876543210",
        "investmentId": "INV-A1B2C3D4E5F6",
        "amount": 5999,
        "startDate": "2024-01-15T10:30:00.000Z",
        "maturityDate": "2024-02-19T10:30:00.000Z",
        "returnAmount": 15000,
        "status": "active",
        "daysCompleted": 5,
        "totalDays": 35,
        "dailyReturn": 257,
        "lastProcessed": "2024-01-20T06:00:00.000Z"
      }
    ],
    "totalCount": 83,
    "currentPage": 1,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false,
    "summary": {
      "totalInvestments": 83,
      "activeInvestments": 25,
      "maturedInvestments": 58,
      "totalInvestedAmount": 497917,
      "totalReturnAmount": 1245000
    }
  }
}
```

### 6. Manual Process Investment Returns
**POST** `/api/admin/investment/process-returns`

Manually trigger investment return processing (for testing/emergency use).

**Response:**
```json
{
  "status": "success",
  "message": "Investment processing completed",
  "data": {
    "success": true,
    "processedInvestments": 25,
    "maturedInvestments": 3,
    "totalReturnsProcessed": 8500
  }
}
```

### 7. Get Processing Statistics
**GET** `/api/admin/investment/processing-stats`

Get detailed statistics about investment processing status.

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalActiveInvestments": 25,
    "totalMaturedInvestments": 58,
    "totalDueForMaturity": 2,
    "investmentStats": [
      {
        "userId": "user_id",
        "userName": "John Doe",
        "investmentId": "INV-A1B2C3D4E5F6",
        "amount": 5999,
        "daysCompleted": 35,
        "status": "active",
        "maturityDate": "2024-02-19T10:30:00.000Z",
        "isDueForMaturity": true
      }
    ]
  }
}
```

---

## AUTOMATED SCHEDULER

### Daily Processing
The system automatically processes investment returns daily at:
- **6:00 AM IST** - Main daily processing
- **Every 4 hours** - Backup processing checks

### Processing Logic
1. **Daily Returns**: Each active investment receives daily returns distributed over 35 days
2. **Maturity Check**: After 35 days, investment status changes to "matured"
3. **Income Transfer**: Full return amount (₹15,000) is transferred to user's income wallet upon maturity
4. **Transaction Records**: All returns and maturity events are recorded in income transactions

### Investment Flow
1. User recharges investment wallet (requires admin approval)
2. User creates investment of ₹5,999 (deducted from investment wallet)
3. Daily returns are automatically processed and added to income wallet
4. After 35 days, investment matures and full ₹15,000 is transferred to income wallet

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "status": "error",
  "message": "Please provide payment ID and amount"
}
```

**401 Unauthorized:**
```json
{
  "status": "error",
  "message": "No token provided"
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "User not found"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error processing investment wallet recharge",
  "error": "Detailed error message"
}
```

---

## File Upload Requirements

### Payment Screenshots
- **Formats**: JPG, JPEG, PNG, GIF
- **Size Limit**: 5MB maximum
- **Storage**: `/public/uploads/payments/`
- **Naming**: `{userId}-{timestamp}-{originalName}`

### Example Upload (Frontend)
```javascript
const formData = new FormData();
formData.append('paymentId', 'PAY123456');
formData.append('amount', '10000');
formData.append('currency', 'INR');
formData.append('screenshot', fileInput.files[0]);

fetch('/api/investment/recharge', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

---

## Business Rules

### Investment Rules
- **Investment Amount**: Fixed at ₹5,999
- **Return Amount**: Fixed at ₹15,000 (150% return)
- **Investment Period**: 35 days
- **Daily Return**: Approximately ₹257 per day (profit distributed daily)
- **Active Limit**: One active investment per user at a time
- **Maturity**: Full return transferred to income wallet after 35 days

### Wallet Rules
- **Recharge**: Manual approval required for all recharges
- **Minimum Balance**: Must have ₹5,999 to create investment
- **Currency**: INR (Indian Rupees)
- **Transaction History**: All transactions logged with timestamps

### Admin Rules
- **Approval**: Required for all investment wallet recharges
- **Processing**: Can manually trigger return processing
- **Monitoring**: Full visibility into all investments and statistics 