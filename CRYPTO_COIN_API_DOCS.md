# Crypto Coin Wallet API Documentation

## Overview

The Crypto Coin Wallet API allows users to manage their crypto coin wallet that is automatically funded upon account activation with TPIN. Each user receives a random amount of MLMCoin (valued between 0.20 to 1.00 INR) when they activate their account.

## Authentication

All API endpoints require authentication via a Bearer token. Include the token in your request headers:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. Get Crypto Wallet Details

**Endpoint**: `GET /api/crypto/wallet`

**Description**: Returns the user's crypto wallet details including balance and estimated INR value.

**Authentication**: Required

**Response Format**:
```json
{
  "status": "success",
  "data": {
    "cryptoWallet": {
      "enabled": true,
      "coin": "MLMCoin",
      "balance": 249.50,
      "estimatedInrValue": 0.50,
      "lastUpdated": "2023-07-15T10:30:45.123Z"
    }
  }
}
```

### 2. Get Crypto Wallet Transaction History

**Endpoint**: `GET /api/crypto/transactions`

**Description**: Returns the user's complete crypto transaction history including wallet transactions and buy/sell requests.

**Authentication**: Required

**Response Format**:
```json
{
  "status": "success",
  "data": {
    "transactions": [
      {
        "_id": "transaction_id",
        "type": "wallet_transaction",
        "transactionType": "activation_bonus",
        "amount": 249.50,
        "description": "Account activation bonus (0.50 INR worth)",
        "inrValue": 0.50,
        "createdAt": "2023-07-15T10:30:45.123Z",
        "status": "completed"
      },
      {
        "_id": "request_id",
        "type": "crypto_request",
        "transactionType": "purchase",
        "coinValue": 2.50,
        "quantity": 100,
        "totalAmount": 250,
        "description": "Purchase request for 100 coins at ₹2.50 each",
        "status": "pending",
        "createdAt": "2024-01-21T14:20:00.000Z",
        "updatedAt": "2024-01-21T14:20:00.000Z"
      },
      {
        "_id": "request_id2",
        "type": "crypto_request",
        "transactionType": "sell",
        "coinValue": 3.00,
        "quantity": 50,
        "totalAmount": 150,
        "description": "Sell request for 50 coins at ₹3.00 each",
        "status": "approved",
        "createdAt": "2024-01-22T09:15:00.000Z",
        "updatedAt": "2024-01-22T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalWalletTransactions": 1,
      "totalCryptoRequests": 2,
      "pendingRequests": 1,
      "approvedRequests": 1,
      "rejectedRequests": 0,
      "totalPurchaseRequests": 1,
      "totalSellRequests": 1
    },
    "totalTransactions": 3
  }
}
```

**Transaction Types:**
- `wallet_transaction`: Direct wallet transactions (activation bonus, admin gifts, etc.)
- `crypto_request`: Buy/sell requests submitted by user

**Transaction Statuses:**
- `completed`: For wallet transactions
- `pending`: Request awaiting admin approval
- `approved`: Request approved by admin
- `rejected`: Request rejected by admin

### 3. Get Crypto System Statistics (Admin Only)

**Endpoint**: `GET /api/crypto/stats`

**Description**: Returns statistics about the entire crypto coin system.

**Authentication**: Required (Admin only)

**Response Format**:
```json
{
  "status": "success",
  "data": {
    "totalEnabledWallets": 150,
    "totalCoinsInCirculation": 37425.50,
    "estimatedInrValue": 75.00,
    "coinRate": 499
  }
}
```

## Implementation Details

- Each user automatically receives MLMCoins upon activating their account with a TPIN
- The value of coins is randomly determined between 0.20 and 1.00 INR
- The conversion rate is fixed at 499 MLMCoins = 1 INR
- Users cannot directly purchase crypto coins - they are only given as bonuses
- The crypto wallet is created and enabled automatically during account activation 