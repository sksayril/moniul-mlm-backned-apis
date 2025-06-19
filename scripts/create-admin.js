require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

// Connect to database
mongoose.connect(process.env.DATABASE_URL)
  .then(async () => {
    try {
      console.log('Connected to database');
      
      // Check if admin already exists
      const adminExists = await User.findOne({ email: 'admin@example.com', role: 'admin' });
      
      if (adminExists) {
        console.log('Admin user already exists');
        process.exit(0);
      }
      
      // Admin details
      const adminDetails = {
        name: 'System Admin',
        email: 'admin@example.com',
        password: 'admin123', // Change this to a secure password
        role: 'admin'
      };
      
      // Generate admin userId
      const adminUserId = `ADMIN${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminDetails.password, salt);
      
      // Create admin user
      const admin = await User.create({
        name: adminDetails.name,
        userId: adminUserId,
        email: adminDetails.email,
        password: hashedPassword,
        originalPassword: adminDetails.password,  // ⚠️ SECURITY RISK: Storing plain text password
        role: adminDetails.role
      });
      
      console.log('Admin user created successfully:');
      console.log(`Name: ${admin.name}`);
      console.log(`User ID: ${admin.userId}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Password: ${adminDetails.password}`);
      console.log(`Role: ${admin.role}`);
      console.log('\nPlease change the password after first login.');
      
    } catch (err) {
      console.error('Error creating admin user:', err);
    } finally {
      mongoose.disconnect();
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
