require('dotenv').config();
require('../utilities/database');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const crypto = require('crypto');

// Function to create a demo user with approved TPIN
async function createDemoUser() {
  try {
    console.log('Checking for existing demo user...');
    
    // Check if demo user already exists
    const existingUser = await User.findOne({ userId: 'LIFE10001' });
    
    if (existingUser) {
      console.log('Demo user already exists:');
      console.log(`- Name: ${existingUser.name}`);
      console.log(`- User ID: ${existingUser.userId} (use this as referral code)`);
      console.log(`- Email: ${existingUser.email}`);
      console.log(`- Active: ${existingUser.isActive}`);
      
      if (existingUser.tpins && existingUser.tpins.length > 0) {
        const approvedTpins = existingUser.tpins.filter(tpin => tpin.status === 'approved');
        console.log(`- TPINs: ${existingUser.tpins.length} (${approvedTpins.length} approved)`);
      }
      
      console.log('Use this user for testing referrals.');
      
      // Exit process
      process.exit(0);
      return;
    }
    
    console.log('Creating new demo user...');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Demo@123', salt);
    
    // Generate a TPIN
    const tpinCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Create the user
    const newUser = new User({
      name: 'Demo User',
      userId: 'LIFE10001', // This will also be used as referral code
      email: 'demo@example.com',
      password: hashedPassword,
      originalPassword: 'Demo@123',  // ⚠️ SECURITY RISK: Storing plain text password
      isActive: true, // Make user active
      role: 'user',
      tpins: [
        {
          code: tpinCode,
          isUsed: false,
          purchaseDate: Date.now(),
          status: 'approved', // TPIN is pre-approved
          activationDate: null
        }
      ],
      // Add some money to income wallet for testing
      incomeWallet: {
        balance: 100,
        selfIncome: 50,
        directIncome: 30,
        matrixIncome: 20,
        rankRewards: 0,
        lastUpdated: Date.now()
      },
      rank: 'Associate',
      teamSize: 0
    });
    
    await newUser.save();
    
    console.log('Demo user created successfully!');
    console.log(`- Name: ${newUser.name}`);
    console.log(`- User ID: ${newUser.userId} (use this as referral code)`);
    console.log(`- Email: ${newUser.email}`);
    console.log(`- Password: Demo@123`);
    console.log(`- TPIN: ${tpinCode} (approved)`);
    console.log('Use this user to test the referral system.');
    
    // Exit process
    process.exit(0);
    
  } catch (error) {
    console.error('Error creating demo user:', error);
    process.exit(1);
  }
}

// Run the function
createDemoUser();
