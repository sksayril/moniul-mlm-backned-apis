# TPIN Activation System API Documentation

## Overview
The TPIN (Transaction PIN) activation system allows users to activate their accounts and receive instant rewards. This is a crucial part of the MLM platform as it enables users to participate in the referral program and start earning income.

## Key Features
- ✅ **Instant ₹10 Bonus**: Users receive ₹10 immediately upon first activation
- ✅ **One-time Activation**: Prevents multiple activations on the same account
- ✅ **Crypto Bonus**: Random crypto coins worth ₹0.20-₹1.00 
- ✅ **MLM Income Processing**: Triggers referral and matrix income calculations
- ✅ **Transaction History**: Complete audit trail of activation bonuses
- ✅ **Detailed Validation**: Clear error messages for invalid TPINs

## API Endpoints

### 1. Check TPIN Status
**Endpoint**: `GET /api/auth/tpin-status`  
**Authentication**: Required (Bearer Token)

**Response Example**:
```json
{
  "status": "success",
  "data": {
    "accountStatus": "inactive",
    "isActive": false,
    "canActivate": true,
    "tpinSummary": {
      "available": 2,
      "pending": 1,
      "used": 0,
      "total": 3
    },
    "activationBonus": "₹10 instant bonus on first activation",
    "instructions": "You have approved TPINs available. Use any TPIN code to activate your account."
  }
}
```

### 2. Activate Account with TPIN
**Endpoint**: `POST /api/auth/activate`  
**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "tpinCode": "TPIN123456"
}
```

**Success Response**:
```json
{
  "status": "success",
  "message": "🎉 Account activated successfully! ₹10 instant bonus credited to your wallet",
  "data": {
    "isActive": true,
    "activatedAt": "2025-01-27T10:30:00.000Z",
    "tpinUsed": "TPIN123456",
    "instantBonus": {
      "amount": 10,
      "type": "Activation Bonus",
      "description": "First-time account activation reward"
    },
         "incomeWallet": {
       "currentBalance": 10,
       "selfIncome": 10,
       "dailyIncome": 10,
       "totalEarnings": 10
     },
    "cryptoWallet": {
      "enabled": true,
      "coin": "MLMCoin",
      "balance": 249.50,
      "bonusInrValue": 0.50
    },
    "nextSteps": [
             "Start referring friends using your User ID as referral code",
       "Earn ₹50 for each successful referral",
             "Receive ₹10 daily income for active account",
      "Participate in matrix income program"
    ]
  }
}
```

**Error Responses**:
```json
{
  "status": "error",
  "message": "Account is already activated"
}
```

```json
{
  "status": "error",
  "message": "TPIN activation failed: TPIN already used",
  "hint": "Please check your TPIN code or contact admin if the issue persists"
}
```

## Activation Process Flow

1. **User Requests Activation**: User calls `/api/auth/activate` with TPIN code
2. **Validation Checks**:
   - Account not already active
   - TPIN exists and is approved
   - TPIN not already used
3. **Account Activation**:
   - Mark TPIN as used
   - Set account as active
   - Record activation timestamp
4. **Instant Rewards**:
   - Add ₹10 to income wallet
   - Add random crypto coins (₹0.20-₹1.00 worth)
   - Create transaction records
5. **MLM Processing**:
   - Process referral income for upline
   - Calculate matrix income distribution
   - Update team statistics
6. **Response**: Return success with complete wallet status

## Income Distribution on Activation

### Direct User Benefits
- **Self Income**: ₹10 instant activation bonus
- **Daily Income**: ₹10 instant activation bonus (same amount, counted in both categories)
- **Crypto Bonus**: 99.8-499 MLMCoins (₹0.20-₹1.00 worth)
- **Daily Income Eligibility**: ₹10 per day starting next day (in addition to activation bonus)

### Referrer Benefits (if user has referrer)
- **Direct Income**: ₹50 for immediate referrer (instant bonus)
- **Matrix Income**: Distributed across 7 levels based on team completion
- **Team Size**: Updated counts and ranks

### Matrix Income Structure (7 Levels)
- **Level 1**: ₹50 when 5 members activate
- **Level 2**: ₹125 when 25 members activate
- **Level 3**: ₹625 when 125 members activate
- **Level 4**: ₹1,875 when 625 members activate
- **Level 5**: ₹9,375 when 3,125 members activate
- **Level 6**: ₹46,875 when 15,625 members activate
- **Level 7**: ₹2,34,375 when 78,125 members activate

## Validation Rules

### TPIN Requirements
- ✅ TPIN must exist in user's TPIN list
- ✅ TPIN status must be 'approved' 
- ✅ TPIN must not be already used
- ✅ Account must not be already active

### Error Handling
- **TPIN not found**: "TPIN code not found"
- **TPIN pending**: "TPIN not approved yet"
- **TPIN used**: "TPIN already used"
- **Account active**: "Account is already activated"

## Database Changes

### User Model Updates
```javascript
// Added fields for better tracking
activatedAt: Date,
activationReason: String,
incomeTransactions: [{
  type: String,
  amount: Number,
  date: Date,
  description: String,
  tpinCode: String
}]
```

### Transaction Types
- `self_income`: ₹10 account activation reward (stored as self_income)
- `daily_income`: ₹10 daily income
- `direct_income`: ₹50 referral income
- `matrix_income`: Multi-level commission
- `investment_return`: Investment-related earnings
- `rank_reward`: Bonus based on team rank

**Note**: Crypto bonuses are tracked separately in the `cryptoWallet.transactions` with type `activation_bonus`

## Security Features

- **One-time Activation**: Prevents multiple activation attempts
- **TPIN Validation**: Multi-layer validation with specific error messages
- **Transaction Logging**: Complete audit trail of all income additions
- **Anti-fraud**: Account status checks prevent duplicate rewards

## Testing Scenarios

### Happy Path
1. User purchases TPIN
2. Admin approves TPIN
3. User activates with valid TPIN code
4. Receives ₹10 + crypto bonus instantly
5. Referrer receives ₹20 (if applicable)

### Error Cases
1. Using invalid TPIN code → Clear error message
2. Using already used TPIN → "TPIN already used"
3. Activating already active account → "Account is already activated"
4. Using pending TPIN → "TPIN not approved yet"

## Support Information

### For Users
- Check TPIN status before activation using `/api/auth/tpin-status`
- Contact admin if TPIN is not approved within 24 hours
- Each user can only activate once per account

### For Admins
- Monitor activation logs in server console
- Track income distribution through admin dashboard
- Handle TPIN approval requests promptly

## API Integration Examples

### JavaScript/Axios
```javascript
// Check TPIN status
const checkStatus = await axios.get('/api/auth/tpin-status', {
  headers: { Authorization: `Bearer ${token}` }
});

// Activate account
const activate = await axios.post('/api/auth/activate', 
  { tpinCode: 'TPIN123456' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### cURL
```bash
# Check status
curl -X GET "http://localhost:3100/api/auth/tpin-status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Activate account
curl -X POST "http://localhost:3100/api/auth/activate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"tpinCode": "TPIN123456"}'
```

## Conclusion

The improved TPIN activation system provides:
- **Instant Gratification**: ₹10 immediate reward
- **Clear Communication**: Detailed success/error messages
- **Robust Validation**: Prevents fraud and duplicate activations
- **Complete Tracking**: Full audit trail for all transactions
- **MLM Integration**: Seamless referral income processing

This system is designed to encourage user engagement while maintaining security and providing a smooth activation experience. 