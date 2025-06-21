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
            enum: ['tpin_purchase', 'subscription', 'trading_package', 'investment_wallet'],
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
        rejectionReason: String,
        approvedAt: Date,
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
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
        dailyIncome: {
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
        lastDailyIncome: {
            type: Date
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    
    // Investment Wallet System
    investmentWallet: {
        balance: {
            type: Number,
            default: 0
        },
        totalInvested: {
            type: Number,
            default: 0
        },
        totalMatured: {
            type: Number,
            default: 0
        },
        totalReturns: {
            type: Number,
            default: 0
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    
    // Investment transactions
    investments: [{
        investmentId: {
            type: String,
            required: true,
            unique: true
        },
        amount: {
            type: Number,
            required: true
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        maturityDate: {
            type: Date
        },
        returnAmount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['active', 'matured', 'cancelled'],
            default: 'active'
        },
        daysCompleted: {
            type: Number,
            default: 0
        },
        totalDays: {
            type: Number,
            default: 35
        },
        dailyReturn: {
            type: Number,
            default: 0
        },
        maturedAt: Date,
        lastProcessed: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Matrix level tracking
    matrixLevels: [{
        level: {
            type: Number,
            required: true
        },
        membersCount: {
            type: Number,
            default: 0
        },
        requiredMembers: {
            type: Number,
            required: true
        },
        rewardAmount: {
            type: Number,
            required: true
        },
        isCompleted: {
            type: Boolean,
            default: false
        },
        completedAt: Date,
        members: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],

    // Income transaction history
    incomeTransactions: [{
        type: {
            type: String,
            enum: ['self_income', 'direct_income', 'matrix_income', 'daily_income', 'rank_reward', 'fx_trading', 'withdrawal', 'investment_return', 'investment_maturity'],
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
        investmentId: String, // For investment-related transactions
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
    
    // Crypto wallet (automatically given after TPIN activation)
    cryptoWallet: {
        enabled: {
            type: Boolean,
            default: false
        },
        balance: {
            type: Number,
            default: 0
        },
        coin: {
            type: String,
            default: 'MLMCoin'
        },
        transactions: [{
            amount: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: ['activation_bonus', 'referral_bonus', 'admin_gift', 'purchase', 'transfer'],
                required: true
            },
            description: String,
            inrValue: Number, // Value in INR at time of transaction
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    
    // Crypto purchase and sell requests
    cryptoRequests: [{
        type: {
            type: String,
            enum: ['purchase', 'sell'],
            required: true
        },
        coinValue: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        totalAmount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: Date
    }],
    
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