# Admin TPIN Management API Documentation

## Overview
The Admin TPIN Management system allows administrators to:
- Generate TPINs for users without requiring payment
- Transfer TPINs between users for customer service
- Bulk generate TPINs for multiple users
- View detailed TPIN information for any user
- Audit TPIN transfers and generation activities

## Authentication
All endpoints require admin authentication using Bearer token in the Authorization header:
```
Authorization: Bearer <admin_jwt_token>
```

**Admin Role Required**: All endpoints in this documentation require the user to have `role: 'admin'`.

---

## ADMIN TPIN ENDPOINTS

### 1. Generate TPIN for User (No Payment Required)
**POST** `/api/admin/tpin/generate`

Generate TPINs for a specific user without requiring payment. Useful for promotional purposes, customer service, or resolving user issues.

**Request Body:**
```json
{
  "userId": "LIFE10001",
  "quantity": 2,
  "reason": "Customer service - promotional TPINs"
}
```

**Parameters:**
- `userId` (string, required): The user's unique ID (not MongoDB _id)
- `quantity` (number, optional): Number of TPINs to generate (1-10, default: 1)
- `reason` (string, optional): Reason for generating TPINs (for audit purposes)

**Response:**
```json
{
  "status": "success",
  "message": "Successfully generated 2 TPIN(s) for user John Doe",
  "data": {
    "userId": "LIFE10001",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "generatedTpins": [
      {
        "code": "A1B2C3D4E5",
        "status": "approved",
        "purchaseDate": "2024-01-15T10:30:00.000Z",
        "activationDate": "2024-01-15T10:30:00.000Z"
      },
      {
        "code": "F6G7H8I9J0",
        "status": "approved",
        "purchaseDate": "2024-01-15T10:30:00.000Z",
        "activationDate": "2024-01-15T10:30:00.000Z"
      }
    ],
    "totalTpins": 5,
    "availableTpins": 4,
    "reason": "Customer service - promotional TPINs",
    "generatedBy": "admin@example.com",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "User not found"
}
```

```json
{
  "status": "error",
  "message": "Quantity must be a number between 1 and 10"
}
```

### 2. Transfer TPIN Between Users
**POST** `/api/admin/tpin/transfer`

Transfer an approved and unused TPIN from one user to another. Useful for customer service scenarios.

**Request Body:**
```json
{
  "fromUserId": "LIFE10001",
  "toUserId": "LIFE10002",
  "tpinCode": "A1B2C3D4E5",
  "reason": "Customer service - user requested transfer"
}
```

**Parameters:**
- `fromUserId` (string, required): Source user's unique ID
- `toUserId` (string, required): Destination user's unique ID
- `tpinCode` (string, required): The TPIN code to transfer
- `reason` (string, optional): Reason for transfer (for audit purposes)

**Response:**
```json
{
  "status": "success",
  "message": "TPIN A1B2C3D4E5 successfully transferred from John Doe to Jane Smith",
  "data": {
    "transferDetails": {
      "tpinCode": "A1B2C3D4E5",
      "fromUser": {
        "userId": "LIFE10001",
        "name": "John Doe",
        "email": "john@example.com",
        "remainingTpins": 2
      },
      "toUser": {
        "userId": "LIFE10002",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "totalTpins": 3
      },
      "reason": "Customer service - user requested transfer",
      "transferredBy": "admin@example.com",
      "transferredAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "Source user not found"
}
```

```json
{
  "status": "error",
  "message": "TPIN not found or not available for transfer (already used, pending, or rejected)"
}
```

```json
{
  "status": "error",
  "message": "Cannot transfer TPIN to the same user"
}
```

### 3. Bulk Generate TPINs for Multiple Users
**POST** `/api/admin/tpin/bulk-generate`

Generate TPINs for multiple users at once. Useful for promotional campaigns or bulk rewards.

**Request Body:**
```json
{
  "userIds": ["LIFE10001", "LIFE10002", "LIFE10003"],
  "quantity": 1,
  "reason": "New Year promotional campaign"
}
```

**Parameters:**
- `userIds` (array, required): Array of user IDs (max 50 users)
- `quantity` (number, optional): TPINs per user (1-5, default: 1)
- `reason` (string, optional): Reason for bulk generation

**Response:**
```json
{
  "status": "success",
  "message": "Bulk TPIN generation completed. Successfully processed 3 users.",
  "data": {
    "successful": [
      {
        "userId": "LIFE10001",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "generatedTpins": ["A1B2C3D4E5"],
        "totalTpins": 3,
        "availableTpins": 2
      },
      {
        "userId": "LIFE10002",
        "userName": "Jane Smith",
        "userEmail": "jane@example.com",
        "generatedTpins": ["F6G7H8I9J0"],
        "totalTpins": 2,
        "availableTpins": 1
      }
    ],
    "failed": [
      {
        "userId": "LIFE10003",
        "error": "User not found"
      }
    ],
    "summary": {
      "totalUsers": 3,
      "successful": 2,
      "failed": 1,
      "tpinsPerUser": 1,
      "totalTpinsGenerated": 2
    },
    "reason": "New Year promotional campaign",
    "generatedBy": "admin@example.com",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "Cannot process more than 50 users at once"
}
```

```json
{
  "status": "error",
  "message": "Quantity must be a number between 1 and 5 for bulk generation"
}
```

### 4. Get User's TPIN Details
**GET** `/api/admin/tpin/user/:userId`

Get comprehensive TPIN information for a specific user including all TPINs, their status, and usage history.

**Parameters:**
- `userId` (string, required): User's unique ID in URL path

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "userId": "LIFE10001",
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true
    },
    "tpinSummary": {
      "total": 5,
      "pending": 1,
      "approved": 3,
      "rejected": 1,
      "used": 2,
      "available": 1
    },
    "tpins": {
      "all": [
        {
          "id": "tpin_id_1",
          "code": "A1B2C3D4E5",
          "status": "approved",
          "isUsed": false,
          "purchaseDate": "2024-01-10T10:00:00.000Z",
          "activationDate": "2024-01-10T12:00:00.000Z",
          "usedAt": null,
          "rejectionReason": null
        },
        {
          "id": "tpin_id_2",
          "code": "F6G7H8I9J0",
          "status": "approved",
          "isUsed": true,
          "purchaseDate": "2024-01-05T10:00:00.000Z",
          "activationDate": "2024-01-05T12:00:00.000Z",
          "usedAt": "2024-01-08T15:30:00.000Z",
          "rejectionReason": null
        }
      ],
      "available": [
        {
          "id": "tpin_id_1",
          "code": "A1B2C3D4E5",
          "activationDate": "2024-01-10T12:00:00.000Z"
        }
      ]
    }
  }
}
```

### 5. Get TPIN Transfer History
**GET** `/api/admin/tpin/transfer-history`

Get audit trail of TPIN transfers (Note: This is a placeholder endpoint for future enhancement).

**Response:**
```json
{
  "status": "success",
  "message": "TPIN transfer history feature",
  "data": {
    "note": "In a production system, TPIN transfers should be logged in a separate audit table",
    "suggestion": "Consider implementing a TpinTransferLog model to track all transfers with timestamps, admin details, and reasons"
  }
}
```

---

## BUSINESS RULES

### TPIN Generation Rules
- **Admin Privilege**: Only admins can generate TPINs without payment
- **Quantity Limits**: 
  - Single generation: 1-10 TPINs per request
  - Bulk generation: 1-5 TPINs per user, max 50 users
- **Auto Approval**: Admin-generated TPINs are automatically approved
- **Unique Codes**: Each TPIN has a unique 10-character hexadecimal code
- **Audit Trail**: All generations are logged with admin details and reasons

### TPIN Transfer Rules
- **Status Requirements**: Only approved and unused TPINs can be transferred
- **User Validation**: Both source and destination users must exist
- **No Self-Transfer**: Cannot transfer TPIN to the same user
- **Ownership Transfer**: TPIN is removed from source user and added to destination
- **Status Update**: Transfer updates the activation date to current time
- **Audit Logging**: All transfers are tracked with admin and reason details

### Security Considerations
- **Admin Only**: All endpoints require admin role verification
- **Input Validation**: All inputs are validated for type, range, and format
- **Error Handling**: Detailed error messages for debugging, generic for production
- **Audit Trail**: All administrative actions are logged with timestamps

---

## ERROR HANDLING

### Common Error Responses

**400 Bad Request:**
```json
{
  "status": "error",
  "message": "Please provide user ID"
}
```

**401 Unauthorized:**
```json
{
  "status": "error",
  "message": "Not authorized to access this route"
}
```

**403 Forbidden:**
```json
{
  "status": "error",
  "message": "You do not have permission to perform this action"
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
  "message": "Error generating TPIN for user",
  "error": "Detailed error message"
}
```

---

## USAGE EXAMPLES

### Example 1: Generate Promotional TPINs
```javascript
// Generate 3 TPINs for a user as part of promotion
const response = await fetch('/api/admin/tpin/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'LIFE10001',
    quantity: 3,
    reason: 'Welcome bonus - new user promotion'
  })
});
```

### Example 2: Customer Service Transfer
```javascript
// Transfer TPIN from one user to another for customer service
const response = await fetch('/api/admin/tpin/transfer', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fromUserId: 'LIFE10001',
    toUserId: 'LIFE10002',
    tpinCode: 'A1B2C3D4E5',
    reason: 'Customer service - accidental purchase on wrong account'
  })
});
```

### Example 3: Bulk Campaign Distribution
```javascript
// Distribute TPINs to multiple users for campaign
const response = await fetch('/api/admin/tpin/bulk-generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userIds: ['LIFE10001', 'LIFE10002', 'LIFE10003', 'LIFE10004'],
    quantity: 2,
    reason: 'Diwali Festival Bonus - 2 TPINs per user'
  })
});
```

### Example 4: Check User TPIN Status
```javascript
// View detailed TPIN information for a user
const response = await fetch('/api/admin/tpin/user/LIFE10001', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + adminToken
  }
});
```

---

## INTEGRATION NOTES

### MLM System Integration
- Generated TPINs automatically trigger MLM income calculations when used
- TPIN transfers maintain the original purchase date for MLM calculations
- Account activation with admin-generated TPINs follows the same income rules

### Audit and Compliance
- All admin actions are logged with timestamps and admin details
- Reasons for generation/transfer are stored for compliance
- Consider implementing additional audit logging for production systems

### Performance Considerations
- Bulk operations are limited to prevent system overload
- Database operations are optimized for user lookups by userId
- Consider implementing rate limiting for admin endpoints in production

### Future Enhancements
- Implement TpinTransferLog model for complete audit trail
- Add TPIN expiration dates for time-limited promotions
- Implement TPIN batch management for campaign tracking
- Add email notifications for TPIN generation/transfer events 