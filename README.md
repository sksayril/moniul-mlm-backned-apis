# Subscription-Based API System with User/Admin Sides and TPIN Authentication

This API system provides a complete solution for subscription-based applications with user and admin interfaces, payment verification, and TPIN (Transaction PIN) functionality.

## Features

- **User Authentication**: Signup and signin functionality with JWT-based auth
- **Role-Based Access Control**: Separate user and admin functionalities
- **Subscription System**: Allow users to subscribe to different plans
- **Payment Verification**: Admin approval flow for user payments
- **TPIN System**: Request and approval flow for Transaction PINs
- **Protected Resources**: Access control based on subscription and TPIN status

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MongoDB connection

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables in `.env` file:

```
PORT=3100
DATABASE_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=30d
NODE_ENV=development
```

4. Start the server:

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/signin` - Login user
- `GET /api/auth/me` - Get current user profile (protected)
- `PATCH /api/auth/updateMe` - Update user profile (protected)

### User Subscription

- `POST /api/subscription/request` - Request subscription with payment details
- `GET /api/subscription/status` - Check subscription status
- `POST /api/subscription/tpin/request` - Request TPIN (requires active subscription)
- `GET /api/subscription/tpin/status` - Check TPIN status

### Admin Management

- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get specific user
- `GET /api/admin/subscriptions/pending` - Get pending subscription requests
- `POST /api/admin/subscriptions/approve` - Approve subscription request
- `POST /api/admin/subscriptions/reject` - Reject subscription request
- `GET /api/admin/tpin/pending` - Get pending TPIN requests
- `POST /api/admin/tpin/approve` - Approve TPIN request
- `POST /api/admin/tpin/reject` - Reject TPIN request

## System Workflow

1. **User Registration**: Users sign up with name, email, and password
2. **Subscription Request**: Users submit payment details and proof of payment
3. **Admin Approval**: Admin verifies payment and approves subscription
4. **TPIN Request**: Subscribed users request a TPIN
5. **TPIN Approval**: Admin approves TPIN request and system generates a unique TPIN
6. **Access Premium Content**: Users can access premium content using active TPIN

## Project Structure

- `/controllers` - Request handlers for different features
- `/middleware` - Authentication and authorization middleware
- `/models` - MongoDB schema definitions
- `/routes` - API endpoint definitions
- `/utilities` - Helper functions and utilities

## Initial Project Setup

This project was generated using Express Generator:

```bash
npm i -g express
npm install -g express-generator
express --no-view==<projectname>
```
