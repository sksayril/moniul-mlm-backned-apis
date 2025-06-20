# Investment Recharge API Documentation - Approved & Rejected Endpoints

## Overview
This documentation covers the new API endpoints for retrieving approved and rejected investment wallet recharge requests in the admin panel.

## Authentication
All endpoints require admin authentication using Bearer token in the Authorization header:
```
Authorization: Bearer <admin_jwt_token>
```

## New API Endpoints

### 1. Get Approved Investment Recharges
**GET** `/api/admin/investment/recharges/approved`

Retrieve all approved investment wallet recharge requests with pagination.

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Results per page (default: 10)

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
        "status": "verified",
        "date": "2024-01-15T10:30:00.000Z",
        "approvedAt": "2024-01-15T12:00:00.000Z",
        "approvedBy": "admin_user_id",
        "approvedByName": "Admin"
      }
    ],
    "totalCount": 5,
    "currentPage": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false,
    "summary": {
      "totalAmount": 50000,
      "averageAmount": "10000.00",
      "currencyDistribution": {
        "INR": 50000
      }
    }
  }
}
```

### 2. Get Rejected Investment Recharges
**GET** `/api/admin/investment/recharges/rejected`

Retrieve all rejected investment wallet recharge requests with pagination.

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Results per page (default: 10)

**Response:**
```json
{
  "status": "success",
  "data": {
    "recharges": [
      {
        "_id": "payment_detail_id",
        "userId": "user_id",
        "userName": "Jane Smith",
        "userEmail": "jane@example.com",
        "userMobile": "+91-9876543211",
        "paymentId": "PAY123457",
        "amount": 5000,
        "currency": "INR",
        "screenshot": "/uploads/payments/screenshot2.jpg",
        "screenshotUrl": "http://localhost:3000/uploads/payments/screenshot2.jpg",
        "status": "rejected",
        "date": "2024-01-16T10:30:00.000Z",
        "rejectionReason": "Invalid payment screenshot",
        "approvedAt": "2024-01-16T12:00:00.000Z",
        "approvedBy": "admin_user_id",
        "rejectedByName": "Admin"
      }
    ],
    "totalCount": 3,
    "currentPage": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false,
    "summary": {
      "totalAmount": 15000,
      "rejectionReasons": {
        "Invalid payment screenshot": 2,
        "Payment ID not found": 1
      },
      "mostCommonReason": "Invalid payment screenshot"
    }
  }
}
```

## Error Handling

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error fetching approved/rejected recharges",
  "error": "Detailed error message"
}
```

## Usage Examples

### Example 1: Get Approved Recharges (First Page)
```javascript
// Get the first page of approved investment recharges
const response = await fetch('/api/admin/investment/recharges/approved', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + adminToken
  }
});
```

### Example 2: Get Rejected Recharges with Custom Pagination
```javascript
// Get the second page with 20 results per page
const response = await fetch('/api/admin/investment/recharges/rejected?page=2&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + adminToken
  }
});
```

## Integration Notes

### Dashboard Integration
These endpoints are ideal for:
- Transaction history sections in the admin dashboard
- Financial reporting and reconciliation
- Audit trails for regulatory compliance
- Customer support reference for payment disputes

### Key Features
- **Pagination**: Handles large volumes of transactions
- **Sorting**: Newest transactions displayed first
- **Summary Statistics**: Provides totals, averages, and distributions
- **Detailed User Info**: Includes user details with each transaction

### Security Considerations
All endpoints are protected with:
- JWT token authentication
- Admin role verification
- Input validation for pagination parameters

### Performance
- For large datasets, consider implementing server-side filtering by date range
- Response caching can improve dashboard performance 