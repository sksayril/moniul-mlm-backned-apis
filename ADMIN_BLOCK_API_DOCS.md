# Admin Block/Unblock User API Documentation

## Overview
This document describes the Admin Block/Unblock User API endpoints that allow administrators to manage user access by blocking or unblocking users from the system.

## Base URL
```
http://localhost:3000/api/admin/block
```

## Authentication
All endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- Admin role access

## Endpoints

### 1. Block User
Block a specific user from accessing the system.

**Endpoint:** `POST /api/admin/block/block/:userId`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**URL Parameters:**
- `userId` (string, required): MongoDB ObjectId of the user to block

**Request Body:**
```json
{
  "reason": "Violation of terms and conditions"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "User John Doe (LIFE10001) has been blocked successfully",
  "data": {
    "userId": "673d4f8b2c5a3e1d4f6g7890",
    "userIdCode": "LIFE10001",
    "name": "John Doe",
    "email": "john@example.com",
    "blocked": true,
    "blockedAt": "2024-01-15T08:30:00.000Z",
    "blockReason": "Violation of terms and conditions"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Invalid user ID format or user already blocked
- **404 Not Found:** User not found
- **500 Internal Server Error:** Server error

---

### 2. Unblock User
Unblock a previously blocked user.

**Endpoint:** `POST /api/admin/block/unblock/:userId`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**URL Parameters:**
- `userId` (string, required): MongoDB ObjectId of the user to unblock

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "User John Doe (LIFE10001) has been unblocked successfully",
  "data": {
    "userId": "673d4f8b2c5a3e1d4f6g7890",
    "userIdCode": "LIFE10001",
    "name": "John Doe",
    "email": "john@example.com",
    "blocked": false
  }
}
```

**Error Responses:**
- **400 Bad Request:** Invalid user ID format or user is not blocked
- **404 Not Found:** User not found
- **500 Internal Server Error:** Server error

---

### 3. Get Blocked Users List
Retrieve a paginated list of all blocked users.

**Endpoint:** `GET /api/admin/block/blocked-users`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Number of users per page (default: 10)

**Example Request:**
```
GET /api/admin/block/blocked-users?page=1&limit=5
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Blocked users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "673d4f8b2c5a3e1d4f6g7890",
        "name": "John Doe",
        "userId": "LIFE10001",
        "email": "john@example.com",
        "mobile": "+919876543210",
        "blocked": true,
        "blockedAt": "2024-01-15T08:30:00.000Z",
        "blockReason": "Violation of terms and conditions",
        "blockedBy": {
          "_id": "673d4f8b2c5a3e1d4f6g7123",
          "name": "Admin User",
          "userId": "ADMIN001",
          "email": "admin@example.com"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalUsers": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 4. Get User Block Status
Get detailed block status and information for a specific user.

**Endpoint:** `GET /api/admin/block/user/:userId/status`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**URL Parameters:**
- `userId` (string, required): MongoDB ObjectId of the user

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "User block status retrieved successfully",
  "data": {
    "user": {
      "_id": "673d4f8b2c5a3e1d4f6g7890",
      "name": "John Doe",
      "userId": "LIFE10001",
      "email": "john@example.com",
      "mobile": "+919876543210",
      "blocked": true,
      "blockedAt": "2024-01-15T08:30:00.000Z",
      "blockReason": "Violation of terms and conditions",
      "blockedBy": {
        "_id": "673d4f8b2c5a3e1d4f6g7123",
        "name": "Admin User",
        "userId": "ADMIN001",
        "email": "admin@example.com"
      }
    },
    "isBlocked": true
  }
}
```

---

### 5. Get Blocking Statistics
Get comprehensive statistics about blocked users.

**Endpoint:** `GET /api/admin/block/stats`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Blocking statistics retrieved successfully",
  "data": {
    "totalUsers": 1500,
    "blockedUsers": 25,
    "activeUsers": 1350,
    "recentBlocks": 5,
    "blockingRate": "1.67%"
  }
}
```

---

## User Login Restriction

When a blocked user attempts to login, they will receive the following error response:

**Login Endpoint:** `POST /api/auth/signin`

**Error Response for Blocked User (403 Forbidden):**
```json
{
  "status": "error",
  "message": "Your account has been blocked. Please contact administrator for assistance.",
  "blocked": true,
  "blockReason": "Violation of terms and conditions"
}
```

---

## Data Model Changes

The User model has been extended with the following fields:

```javascript
{
  blocked: {
    type: Boolean,
    default: false
  },
  blockedAt: {
    type: Date
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blockReason: {
    type: String
  }
}
```

---

## Usage Examples

### Example 1: Block a User
```javascript
// Block user with reason
const response = await fetch('/api/admin/block/block/673d4f8b2c5a3e1d4f6g7890', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Suspicious activity detected'
  })
});

const result = await response.json();
console.log(result);
```

### Example 2: Get Blocked Users with Pagination
```javascript
// Get blocked users - page 2, 20 users per page
const response = await fetch('/api/admin/block/blocked-users?page=2&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + adminToken
  }
});

const blockedUsers = await response.json();
console.log(blockedUsers);
```

### Example 3: Unblock a User
```javascript
// Unblock user
const response = await fetch('/api/admin/block/unblock/673d4f8b2c5a3e1d4f6g7890', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(result);
```

---

## Security Notes

1. **Admin Only Access:** All endpoints require admin role authentication
2. **Admin Protection:** Admin users cannot be blocked by other admins
3. **Audit Trail:** All blocking actions are logged with timestamp and admin details
4. **Login Prevention:** Blocked users cannot authenticate until unblocked
5. **Comprehensive Validation:** All inputs are validated for security

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Description of the error",
  "error": "Technical error details (development only)"
}
```

Common HTTP status codes:
- **200 OK:** Successful operation
- **400 Bad Request:** Invalid input or business logic error
- **401 Unauthorized:** Missing or invalid authentication
- **403 Forbidden:** Insufficient permissions or blocked user
- **404 Not Found:** Resource not found
- **500 Internal Server Error:** Server error

---

## Rate Limiting & Best Practices

1. **Use Pagination:** Always use pagination for large datasets
2. **Provide Reasons:** Always provide clear reasons when blocking users
3. **Monitor Statistics:** Regularly check blocking statistics
4. **Audit Logs:** Review blocked user logs for compliance
5. **User Communication:** Inform users about block reasons when appropriate 