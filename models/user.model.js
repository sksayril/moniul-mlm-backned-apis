const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    subscription: {
        active: {
            type: Boolean,
            default: false
        },
        expiryDate: Date,
        plan: String
    },
    tpin: {
        value: String,
        active: {
            type: Boolean,
            default: false
        },
        requestDate: Date
    },
    paymentDetails: [{
        paymentId: String,
        amount: Number,
        currency: String,
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
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
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
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    
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
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        level: {
            type: Number,
            required: true
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
            enum: ['upi', 'bank'],
            required: true
        },
        paymentDetails: {
            upiId: String,
            bankDetails: {
                accountNumber: String,
                ifscCode: String,
                accountHolderName: String,
                bankName: String
            }
        },
        processedDate: Date,
        rejectionReason: String,
        transactionId: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema)