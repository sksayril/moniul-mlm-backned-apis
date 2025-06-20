# Crypto Trading API Documentation

## Overview

The Crypto Trading API allows users to buy and sell MLMCoins through an admin approval process. Users can submit purchase or sell requests, which administrators can then approve or reject.

## Authentication

All API endpoints require authentication via a Bearer token. Include the token in your request headers:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## User Endpoints

### 1. Request to Purchase Crypto Coins

**Endpoint**: `POST /api/crypto/purchase`

**Description**: Submit a request to purchase MLMCoins.

**Authentication**: Required

**Request Body**:
```json
{
  "coinValue": 0.10,
  "quantity": 200
}
```

**Response Format**:
```json
{
  "status": "success",
  "message": "Crypto purchase request submitted for admin approval",
  "data": {
    "requestId": "60a1b2c3d4e5f6g7h8i9j0k1",
    "type": "purchase",
    "coinValue": 0.10,
    "quantity": 200,
    "totalAmount": 20,
    "status": "pending"
  }
}
```

### 2. Request to Sell Crypto Coins

**Endpoint**: `POST /api/crypto/sell`

**Description**: Submit a request to sell MLMCoins.

**Authentication**: Required

**Request Body**:
```json
{
  "coinValue": 0.10,
  "quantity": 200
}
```

**Response Format**:
```json
{
  "status": "success",
  "message": "Crypto sell request submitted for admin approval",
  "data": {
    "requestId": "60a1b2c3d4e5f6g7h8i9j0k1",
    "type": "sell",
    "coinValue": 0.10,
    "quantity": 200,
    "totalAmount": 20,
    "status": "pending"
  }
}
```

### 3. View My Crypto Requests

**Endpoint**: `GET /api/crypto/requests`

**Description**: Get a list of all your crypto purchase and sell requests.

**Authentication**: Required

**Response Format**:
```json
{
  "status": "success",
  "data": {
    "requests": [
      {
        "_id": "60a1b2c3d4e5f6g7h8i9j0k1",
        "type": "purchase",
        "coinValue": 0.10,
        "quantity": 200,
        "totalAmount": 20,
        "status": "pending",
        "createdAt": "2023-07-15T10:30:45.123Z"
      },
      {
        "_id": "60a1b2c3d4e5f6g7h8i9j0k2",
        "type": "sell",
        "coinValue": 0.10,
        "quantity": 100,
        "totalAmount": 10,
        "status": "approved",
        "createdAt": "2023-07-14T08:20:15.456Z",
        "updatedAt": "2023-07-14T09:45:30.789Z"
      }
    ]
  }
}
```

## Admin Endpoints

### 1. View Pending Crypto Requests

**Endpoint**: `GET /api/admin/crypto/requests/pending`

**Description**: Get all pending crypto purchase and sell requests.

**Authentication**: Required (Admin only)

**Response Format**:
```json
{
  "status": "success",
  "data": {
    "count": 2,
    "requests": [
      {
        "requestId": "60a1b2c3d4e5f6g7h8i9j0k1",
        "userId": "LIFE10025",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "type": "purchase",
        "coinValue": 0.10,
        "quantity": 200,
        "totalAmount": 20,
        "createdAt": "2023-07-15T10:30:45.123Z"
      },
      {
        "requestId": "60a1b2c3d4e5f6g7h8i9j0k2",
        "userId": "LIFE10026",
        "userName": "Jane Smith",
        "userEmail": "jane@example.com",
        "type": "sell",
        "coinValue": 0.10,
        "quantity": 100,
        "totalAmount": 10,
        "createdAt": "2023-07-14T08:20:15.456Z"
      }
    ]
  }
}
```

### 2. View Approved Crypto Requests

**Endpoint**: `GET /api/admin/crypto/requests/approved`

**Description**: Get all approved crypto purchase and sell requests.

**Authentication**: Required (Admin only)

**Response Format**: Similar to pending requests but with approved status.

### 3. View Rejected Crypto Requests

**Endpoint**: `GET /api/admin/crypto/requests/rejected`

**Description**: Get all rejected crypto purchase and sell requests.

**Authentication**: Required (Admin only)

**Response Format**: Similar to pending requests but with rejected status.

### 4. Approve a Crypto Request

**Endpoint**: `PATCH /api/admin/crypto/requests/:userId/:requestId/approve`

**Description**: Approve a pending crypto purchase or sell request.

**Authentication**: Required (Admin only)

**Response Format**:
```json
{
  "status": "success",
  "message": "Crypto purchase request approved successfully",
  "data": {
    "userId": "LIFE10025",
    "requestId": "60a1b2c3d4e5f6g7h8i9j0k1",
    "type": "purchase",
    "quantity": 200,
    "totalAmount": 20,
    "currentBalance": 450
  }
}
```

### 5. Reject a Crypto Request

**Endpoint**: `PATCH /api/admin/crypto/requests/:userId/:requestId/reject`

**Description**: Reject a pending crypto purchase or sell request.

**Authentication**: Required (Admin only)

**Response Format**:
```json
{
  "status": "success",
  "message": "Crypto purchase request rejected",
  "data": {
    "userId": "LIFE10025",
    "requestId": "60a1b2c3d4e5f6g7h8i9j0k1",
    "type": "purchase"
  }
}
```

## Implementation Details

- Users can request to buy or sell MLMCoins at a specified coin value
- All requests require admin approval before processing
- Purchase requests add coins to the user's crypto wallet when approved
- Sell requests deduct coins from the user's crypto wallet when approved
- The system maintains a complete transaction history for all crypto operations
- Coin values are specified in INR per coin
- Total amount is calculated as coinValue × quantity 