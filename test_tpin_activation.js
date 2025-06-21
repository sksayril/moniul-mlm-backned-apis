// Test script for TPIN Activation System
// This script demonstrates the correct usage of the TPIN activation API

const testTPINActivation = {
  // Test data for TPIN activation
  validTPINCode: "TPIN123456",
  
  // Expected enum values for incomeTransactions.type
  validTransactionTypes: [
    'self_income',
    'direct_income', 
    'matrix_income',
    'daily_income',
    'rank_reward',
    'fx_trading',
    'withdrawal',
    'investment_return',
    'investment_maturity'
  ],
  
  // Expected enum values for cryptoWallet.transactions.type
  validCryptoTransactionTypes: [
    'activation_bonus',
    'referral_bonus',
    'admin_gift',
    'purchase',
    'transfer'
  ],
  
  // Test activation request
  activationRequest: {
    method: 'POST',
    url: '/api/auth/activate',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    body: {
      tpinCode: "TPIN123456"
    }
  },
  
  // Expected successful response structure
  expectedSuccessResponse: {
    status: "success",
    message: "🎉 Account activated successfully! ₹10 instant bonus credited to your wallet",
    data: {
      isActive: true,
      activatedAt: "2025-01-27T10:30:00.000Z",
      tpinUsed: "TPIN123456",
      instantBonus: {
        amount: 10,
        type: "Activation Bonus",
        description: "First-time account activation reward"
      },
      incomeWallet: {
        currentBalance: 10,
        selfIncome: 10,
        totalEarnings: 10
      },
      cryptoWallet: {
        enabled: true,
        coin: "MLMCoin",
        balance: 249.50,
        bonusInrValue: 0.50
      }
    }
  },
  
  // What happens in the database
  databaseChanges: {
    userDocument: {
      isActive: true,
      activatedAt: "2025-01-27T10:30:00.000Z",
      activationReason: "TPIN Code Activation",
      tpins: [
        {
          code: "TPIN123456",
          isUsed: true,
          usedAt: "2025-01-27T10:30:00.000Z",
          activationDate: "2025-01-27T10:30:00.000Z",
          status: "approved"
        }
      ],
      incomeWallet: {
        balance: 10,
        selfIncome: 10,
        totalEarnings: 10,
        lastUpdated: "2025-01-27T10:30:00.000Z"
      },
      incomeTransactions: [
        {
          type: "self_income", // ✅ Correct enum value
          amount: 10,
          date: "2025-01-27T10:30:00.000Z",
          description: "Account activation bonus for first TPIN activation"
        }
      ],
      cryptoWallet: {
        enabled: true,
        balance: 249.50,
        coin: "MLMCoin",
        transactions: [
          {
            amount: 249.50,
            type: "activation_bonus", // ✅ Correct enum for crypto transactions
            description: "Account activation bonus (0.50 INR worth)",
            inrValue: 0.50,
            createdAt: "2025-01-27T10:30:00.000Z"
          }
        ]
      }
    }
  },
  
  // Common error scenarios
  errorScenarios: {
    accountAlreadyActive: {
      status: "error",
      message: "Account is already activated"
    },
    invalidTpin: {
      status: "error", 
      message: "TPIN activation failed: TPIN code not found",
      hint: "Please check your TPIN code or contact admin if the issue persists"
    },
    tpinAlreadyUsed: {
      status: "error",
      message: "TPIN activation failed: TPIN already used",
      hint: "Please check your TPIN code or contact admin if the issue persists"
    },
    tpinNotApproved: {
      status: "error",
      message: "TPIN activation failed: TPIN not approved yet",
      hint: "Please check your TPIN code or contact admin if the issue persists"
    }
  }
};

// Export for use in testing frameworks
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testTPINActivation;
}

console.log('✅ TPIN Activation Test Configuration Loaded');
console.log('📋 Valid Income Transaction Types:', testTPINActivation.validTransactionTypes);
console.log('💰 Valid Crypto Transaction Types:', testTPINActivation.validCryptoTransactionTypes); 