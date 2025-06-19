const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    mobile: {
        type: String,
        trim: true
    },
    aadhaarNumber: {
        type: String,
        trim: true
    },
    panNumber: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: {
            type: String,
            default: 'India'
        }
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    originalPassword: {
        type: String,
        required: true,
        select: false  // Hidden by default for security
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: false
    },
    activationReason: {
        type: String
    },
    activatedAt: {
        type: Date
    },
    deactivationReason: {
        type: String
    },
    deactivatedAt: {
        type: Date
    },
    tpins: [{
        code: {
            type: String,
            required: true
        },
        isUsed: {
            type: Boolean,
            default: false
        },
        purchaseDate: {
            type: Date,
            default: Date.now
        },
        activationDate: Date,
        usedAt: Date,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        rejectionReason: String
    }],
    paymentDetails: [{
        paymentId: String,
        amount: Number,
        currency: String,
        purpose: {
            type: String,
            enum: ['tpin_purchase', 'subscription', 'trading_package'],
            default: 'tpin_purchase'
        },
        quantity: {
            type: Number,
            default: 1
        },
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        },
        screenshot: String,      // Relative path to screenshot
        screenshotUrl: String,   // Full URL to screenshot
        date: {
            type: Date,
            default: Date.now
        },
        rejectionReason: String
    }],
    
    // MLM System Fields
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // User ID is also used as referral code
    referrals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    incomeWallet: {
        balance: {
            type: Number,
            default: 0
        },
        selfIncome: {
            type: Number,
            default: 0
        },
        directIncome: {
            type: Number,
            default: 0
        },
        matrixIncome: {
            type: Number,
            default: 0
        },
        dailyTeamIncome: {
            type: Number,
            default: 0
        },
        rankRewards: {
            type: Number,
            default: 0
        },
        fxTradingIncome: {
            type: Number,
            default: 0
        },
        totalEarnings: {
            type: Number,
            default: 0
        },
        withdrawnAmount: {
            type: Number,
            default: 0
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    
    // Income transaction history
    incomeTransactions: [{
        type: {
            type: String,
            enum: ['self_income', 'direct_income', 'matrix_income', 'rank_reward', 'fx_trading', 'withdrawal'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        level: Number, // For matrix income
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        date: {
            type: Date,
            default: Date.now
        },
        description: String
    }],
    
    // Rank information
    rank: {
        type: String,
        enum: ['Newcomer', 'Associate', 'Senior', 'Manager', 'Director', 'Executive'],
        default: 'Newcomer'
    },
    teamSize: {
        type: Number,
        default: 0
    },
    
    // Keep track of entire downline (for matrix income calculation)
    downline: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        level: {
            type: Number,
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Trading package tracking
    tradingPackage: {
        purchased: {
            type: Boolean,
            default: false
        },
        startDate: Date,
        expectedReturn: Number
    },
    
    // User payment methods for withdrawals
    paymentMethods: {
        upiId: String,
        bankDetails: {
            accountNumber: String,
            ifscCode: String,
            accountHolderName: String,
            bankName: String
        },
        cryptoWallet: {
            walletAddress: String,
            walletType: {
                type: String,
                enum: ['bitcoin', 'ethereum', 'binance', 'tron', 'polygon', 'other']
            },
            network: String // e.g., "BTC", "ETH", "BSC", "TRC20", "MATIC", etc.
        }
    },
    
    // Withdrawal history
    withdrawals: [{
        amount: Number,
        requestDate: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        paymentMethod: {
            type: String,
            enum: ['upi', 'bank', 'crypto'],
            required: true
        },
        paymentDetails: {
            upiId: String,
            bankDetails: {
                accountNumber: String,
                ifscCode: String,
                accountHolderName: String,
                bankName: String
            },
            cryptoWallet: {
                walletAddress: String,
                walletType: {
                    type: String,
                    enum: ['bitcoin', 'ethereum', 'binance', 'tron', 'polygon', 'other']
                },
                network: String
            }
        },
        processedDate: Date,
        rejectionReason: String,
        transactionId: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema)