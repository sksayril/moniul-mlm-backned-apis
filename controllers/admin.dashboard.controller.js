const User = require('../models/user.model');
const mongoose = require('mongoose');

// Get comprehensive dashboard statistics for admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Get date range parameters with defaults
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    // USD to INR conversion rate (can be updated to use a real API in production)
    const usdToInrRate = 83.5; // Example rate: 1 USD = 83.5 INR
    
    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });
    
    // Payment statistics by purpose and status
    const paymentStats = await User.aggregate([
      {
        $unwind: '$paymentDetails'
      },
      {
        $group: {
          _id: {
            purpose: { $ifNull: ['$paymentDetails.purpose', 'tpin_purchase'] },
            status: '$paymentDetails.status'
          },
          totalAmount: { $sum: '$paymentDetails.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format payment statistics
    const paymentStatsByPurpose = {};
    const paymentStatsByStatus = {
      pending: { count: 0, amount: 0 },
      verified: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 }
    };
    
    let totalRevenue = 0;
    let totalPendingAmount = 0;
    let totalRejectedAmount = 0;
    
    paymentStats.forEach(stat => {
      const purpose = stat._id.purpose;
      const status = stat._id.status;
      const amount = stat.totalAmount;
      const count = stat.count;
      
      // Initialize purpose object if it doesn't exist
      if (!paymentStatsByPurpose[purpose]) {
        paymentStatsByPurpose[purpose] = {
          total: { count: 0, amount: 0 },
          pending: { count: 0, amount: 0 },
          verified: { count: 0, amount: 0 },
          rejected: { count: 0, amount: 0 }
        };
      }
      
      // Update purpose stats
      paymentStatsByPurpose[purpose][status].count += count;
      paymentStatsByPurpose[purpose][status].amount += amount;
      paymentStatsByPurpose[purpose].total.count += count;
      paymentStatsByPurpose[purpose].total.amount += amount;
      
      // Update status stats
      paymentStatsByStatus[status].count += count;
      paymentStatsByStatus[status].amount += amount;
      
      // Update totals
      if (status === 'verified') {
        totalRevenue += amount;
      } else if (status === 'pending') {
        totalPendingAmount += amount;
      } else if (status === 'rejected') {
        totalRejectedAmount += amount;
      }
    });
    
    // Payment statistics for the selected period
    const periodPaymentStats = await User.aggregate([
      {
        $unwind: '$paymentDetails'
      },
      {
        $match: {
          'paymentDetails.date': { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            purpose: { $ifNull: ['$paymentDetails.purpose', 'tpin_purchase'] },
            status: '$paymentDetails.status'
          },
          totalAmount: { $sum: '$paymentDetails.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format period payment statistics
    const periodPaymentStatsByPurpose = {};
    const periodPaymentStatsByStatus = {
      pending: { count: 0, amount: 0 },
      verified: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 }
    };
    
    let periodTotalRevenue = 0;
    
    periodPaymentStats.forEach(stat => {
      const purpose = stat._id.purpose;
      const status = stat._id.status;
      const amount = stat.totalAmount;
      const count = stat.count;
      
      // Initialize purpose object if it doesn't exist
      if (!periodPaymentStatsByPurpose[purpose]) {
        periodPaymentStatsByPurpose[purpose] = {
          total: { count: 0, amount: 0 },
          pending: { count: 0, amount: 0 },
          verified: { count: 0, amount: 0 },
          rejected: { count: 0, amount: 0 }
        };
      }
      
      // Update purpose stats
      periodPaymentStatsByPurpose[purpose][status].count += count;
      periodPaymentStatsByPurpose[purpose][status].amount += amount;
      periodPaymentStatsByPurpose[purpose].total.count += count;
      periodPaymentStatsByPurpose[purpose].total.amount += amount;
      
      // Update status stats
      periodPaymentStatsByStatus[status].count += count;
      periodPaymentStatsByStatus[status].amount += amount;
      
      // Update period total revenue
      if (status === 'verified') {
        periodTotalRevenue += amount;
      }
    });
    
    // Subscription revenue statistics
    const subscriptionStats = await User.aggregate([
      {
        $match: {
          'subscription.active': true,
          'paymentDetails.status': 'verified'
        }
      },
      {
        $unwind: '$paymentDetails'
      },
      {
        $match: {
          'paymentDetails.status': 'verified',
          'paymentDetails.date': { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$paymentDetails.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // MLM statistics
    const mlmStats = {
      activeReferrers: await User.countDocuments({ referralCode: { $exists: true, $ne: null } }),
      totalTeamSize: await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$teamSize', 0] } }
          }
        }
      ]),
      totalDirectIncome: await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$incomeWallet.directIncome', 0] } }
          }
        }
      ]),
      totalMatrixIncome: await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$incomeWallet.matrixIncome', 0] } }
          }
        }
      ]),
      totalSelfIncome: await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$incomeWallet.selfIncome', 0] } }
          }
        }
      ]),
      totalRankRewards: await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$incomeWallet.rankRewards', 0] } }
          }
        }
      ]),
      tradingPackages: await User.countDocuments({ 'tradingPackage.purchased': true })
    };
    
    // Matrix level statistics
    const matrixLevelStats = await User.aggregate([
      {
        $unwind: {
          path: '$downline',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: '$downline.level',
          totalMembers: { $sum: 1 },
          uniqueUplineUsers: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          level: '$_id',
          totalMembers: 1,
          uniqueUplineUsersCount: { $size: '$uniqueUplineUsers' }
        }
      },
      {
        $sort: { level: 1 }
      }
    ]);
    
    // TPIN activation statistics
    const tpinActivationStats = await User.aggregate([
      {
        $unwind: {
          path: '$tpins',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: {
            status: '$tpins.status',
            isUsed: '$tpins.isUsed'
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Income transactions analysis
    const incomeTransactionStats = await User.aggregate([
      {
        $unwind: {
          path: '$incomeTransactions',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: {
            type: '$incomeTransactions.type',
            level: '$incomeTransactions.level'
          },
          totalAmount: { $sum: '$incomeTransactions.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Matrix capacity and completion analysis
    const matrixCapacity = {
      1: 5,
      2: 25,
      3: 125,
      4: 625,
      5: 3125,
      6: 15625,
      7: 78125
    };
    
    const matrixCompletionRates = matrixLevelStats.map(levelStat => {
      const level = levelStat.level;
      const capacity = matrixCapacity[level] || 0;
      const completion = capacity > 0 ? (levelStat.totalMembers / (capacity * levelStat.uniqueUplineUsersCount)) * 100 : 0;
      
      return {
        level,
        totalMembers: levelStat.totalMembers,
        uniqueUplineUsers: levelStat.uniqueUplineUsersCount,
        capacity: capacity,
        completionRate: Math.min(completion, 100), // Cap at 100%
        potentialIncome: capacity * getMatrixIncomeForLevel(level)
      };
    });
    
    // Top performers in MLM
    const topPerformers = await User.find({
      isActive: true,
      'incomeWallet.totalEarnings': { $gt: 0 }
    })
    .select('name userId incomeWallet.totalEarnings incomeWallet.directIncome incomeWallet.matrixIncome teamSize rank')
    .sort({ 'incomeWallet.totalEarnings': -1 })
    .limit(10);
    
    // Withdrawal statistics
    const withdrawalStats = await User.aggregate([
      {
        $unwind: {
          path: '$withdrawals',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: '$withdrawals.status',
          totalAmount: { $sum: '$withdrawals.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Time series data for charts (last 30 days)
    const timeSeriesData = await getTimeSeriesData(start, end);
    
    // Rank distribution
    const rankDistribution = await User.aggregate([
      {
        $group: {
          _id: '$rank',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Recent payments (last 10)
    const recentPayments = await User.aggregate([
      { $unwind: '$paymentDetails' },
      { $sort: { 'paymentDetails.date': -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userName: '$name',
          userEmail: '$email',
          userIdCode: '$userId',
          paymentId: '$paymentDetails.paymentId',
          amount: '$paymentDetails.amount',
          currency: '$paymentDetails.currency',
          purpose: { $ifNull: ['$paymentDetails.purpose', 'tpin_purchase'] },
          status: '$paymentDetails.status',
          date: '$paymentDetails.date'
        }
      }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        userStats: {
          totalUsers,
          newUsers,
          activeUsers: await User.countDocuments({ isActive: true }),
          activeSubscriptions: await User.countDocuments({ 'subscription.active': true }),
          activeTpins: await User.countDocuments({ 'tpins.status': 'approved' }),
          pendingSubscriptions: await User.countDocuments({
            'paymentDetails.status': 'pending'
          }),
          pendingTpins: await User.countDocuments({
            'tpins.status': 'pending'
          })
        },
        financialStats: {
          totalRevenue,
          totalRevenueInr: totalRevenue * usdToInrRate,
          pendingAmount: totalPendingAmount,
          pendingAmountInr: totalPendingAmount * usdToInrRate,
          rejectedAmount: totalRejectedAmount,
          rejectedAmountInr: totalRejectedAmount * usdToInrRate,
          revenueInPeriod: periodTotalRevenue,
          revenueInPeriodInr: periodTotalRevenue * usdToInrRate,
          transactionsInPeriod: periodPaymentStatsByStatus.verified.count,
          totalWithdrawals: {
            pending: getWithdrawalStatsByStatus(withdrawalStats, 'pending'),
            approved: getWithdrawalStatsByStatus(withdrawalStats, 'approved'),
            rejected: getWithdrawalStatsByStatus(withdrawalStats, 'rejected')
          },
          conversionRate: {
            usdToInr: usdToInrRate
          }
        },
        paymentStats: {
          byPurpose: paymentStatsByPurpose,
          byStatus: paymentStatsByStatus,
          period: {
            byPurpose: periodPaymentStatsByPurpose,
            byStatus: periodPaymentStatsByStatus
          },
          recentPayments
        },
        mlmStats: {
          activeReferrers: mlmStats.activeReferrers,
          totalTeamSize: mlmStats.totalTeamSize.length > 0 ? mlmStats.totalTeamSize[0].total : 0,
          totalDirectIncome: mlmStats.totalDirectIncome.length > 0 ? mlmStats.totalDirectIncome[0].total : 0,
          totalMatrixIncome: mlmStats.totalMatrixIncome.length > 0 ? mlmStats.totalMatrixIncome[0].total : 0,
          totalSelfIncome: mlmStats.totalSelfIncome.length > 0 ? mlmStats.totalSelfIncome[0].total : 0,
          totalRankRewards: mlmStats.totalRankRewards.length > 0 ? mlmStats.totalRankRewards[0].total : 0,
          activeTradingPackages: mlmStats.tradingPackages,
          rankDistribution: rankDistribution,
          matrixLevelStats: matrixLevelStats,
          matrixCompletionRates: matrixCompletionRates,
          tpinActivationStats: tpinActivationStats,
          incomeTransactionStats: incomeTransactionStats,
          topPerformers: topPerformers,
          totalIncomeDistributed: (mlmStats.totalDirectIncome.length > 0 ? mlmStats.totalDirectIncome[0].total : 0) +
                                  (mlmStats.totalMatrixIncome.length > 0 ? mlmStats.totalMatrixIncome[0].total : 0) +
                                  (mlmStats.totalSelfIncome.length > 0 ? mlmStats.totalSelfIncome[0].total : 0) +
                                  (mlmStats.totalRankRewards.length > 0 ? mlmStats.totalRankRewards[0].total : 0)
        },
        chartData: timeSeriesData
      }
    });
    
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching dashboard statistics',
      error: err.message
    });
  }
};

// Helper function to get time series data for graphs
async function getTimeSeriesData(startDate, endDate) {
  try {
    // Generate date range array
    const dateArray = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // New users by day
    const newUsersByDay = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Revenue by day
    const revenueByDay = await User.aggregate([
      {
        $unwind: '$paymentDetails'
      },
      {
        $match: {
          'paymentDetails.status': 'verified',
          'paymentDetails.date': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDetails.date' } },
          amount: { $sum: '$paymentDetails.amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Withdrawals by day
    const withdrawalsByDay = await User.aggregate([
      {
        $unwind: '$withdrawals'
      },
      {
        $match: {
          'withdrawals.requestDate': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$withdrawals.requestDate' } },
          amount: { $sum: '$withdrawals.amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Format the results for charting
    const formattedData = {
      labels: dateArray.map(date => date.toISOString().split('T')[0]),
      datasets: {
        newUsers: formatTimeSeriesData(newUsersByDay, dateArray),
        revenue: formatTimeSeriesData(revenueByDay, dateArray),
        withdrawals: formatTimeSeriesData(withdrawalsByDay, dateArray)
      }
    };

    return formattedData;
  } catch (error) {
    console.error('Error generating time series data:', error);
    return {};
  }
}

// Helper function to format time series data
function formatTimeSeriesData(data, dateArray) {
  const formattedData = [];
  
  // Create a map of date -> value from the aggregation results
  const dataMap = new Map();
  data.forEach(item => {
    dataMap.set(item._id, item.count || item.amount || 0);
  });
  
  // For each date in the date range, get the value or default to 0
  dateArray.forEach(date => {
    const dateString = date.toISOString().split('T')[0];
    formattedData.push(dataMap.get(dateString) || 0);
  });
  
  return formattedData;
}

// Helper function to get withdrawal stats by status
function getWithdrawalStatsByStatus(withdrawalStats, status) {
  const stat = withdrawalStats.find(item => item._id === status);
  return stat ? {
    totalAmount: stat.totalAmount,
    count: stat.count
  } : {
    totalAmount: 0,
    count: 0
  };
}

// Helper function to get matrix income for a specific level
function getMatrixIncomeForLevel(level) {
  const matrixIncomes = {
    1: 50,
    2: 125,
    3: 625,
    4: 1875,
    5: 9375,
    6: 46875,
    7: 234375
  };
  return matrixIncomes[level] || 0;
}
