require("dotenv").config()
require("./utilities/database")
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fileUpload = require('express-fileupload');
const cors = require('cors');

// Import routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth.routes');
const tpinRouter = require('./routes/tpin.routes');
const adminRouter = require('./routes/admin.routes');
const adminAuthRouter = require('./routes/admin.auth.routes');
const mlmRouter = require('./routes/mlm.routes');
const mlmAdminRouter = require('./routes/mlm.admin.routes');
const adminDashboardRouter = require('./routes/admin.dashboard.routes');
const investmentRouter = require('./routes/investment.routes');
const adminInvestmentRouter = require('./routes/admin.investment.routes');
const adminTpinRouter = require('./routes/admin.tpin.routes');
const cryptoRouter = require('./routes/crypto.routes');
const adminCryptoRouter = require('./routes/admin.crypto.routes');

const app = express();

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// File upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public/uploads/payments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Mount routes
app.use('/', indexRouter);
app.use('/api/auth', authRouter);

// Mount admin auth routes first to avoid auth middleware conflicts
app.use('/api/admin/auth', adminAuthRouter);

// Other protected routes
app.use('/api/tpin', tpinRouter);
app.use('/api/admin', adminRouter);
app.use('/api/mlm', mlmRouter);
app.use('/api/admin/mlm', mlmAdminRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);

// Investment routes
app.use('/api/investment', investmentRouter);
app.use('/api/admin/investment', adminInvestmentRouter);

// Admin TPIN routes
app.use('/api/admin/tpin', adminTpinRouter);

// Crypto routes
app.use('/api/crypto', cryptoRouter);
app.use('/api/admin/crypto', adminCryptoRouter);

// Start investment scheduler
const investmentScheduler = require('./services/investment.scheduler');
investmentScheduler.startInvestmentScheduler();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

module.exports = app;
