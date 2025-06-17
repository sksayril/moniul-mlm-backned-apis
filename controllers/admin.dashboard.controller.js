const User = require('../models/user.model');
const mongoose = require('mongoose');

// Get comprehensive dashboard statistics for admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Get date range parameters with defaults
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: start, $lte: end }
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
    
    res.status(200).json({
      status: 'success',
      data: {
        userStats: {
          totalUsers,
          newUsers,
          activeSubscriptions: await User.countDocuments({ 'subscription.active': true }),
          activeTpins: await User.countDocuments({ 'tpin.active': true }),
          pendingSubscriptions: await User.countDocuments({
            'paymentDetails.status': 'pending'
          }),
          pendingTpins: await User.countDocuments({
            'tpin.requestDate': { $ne: null },
            'tpin.active': false
          })
        },
        financialStats: {
          totalRevenue: subscriptionStats.length > 0 ? subscriptionStats[0].totalRevenue : 0,
          revenueInPeriod: subscriptionStats.length > 0 ? subscriptionStats[0].totalRevenue : 0,
          transactionsInPeriod: subscriptionStats.length > 0 ? subscriptionStats[0].count : 0,
          totalWithdrawals: {
            pending: getWithdrawalStatsByStatus(withdrawalStats, 'pending'),
            approved: getWithdrawalStatsByStatus(withdrawalStats, 'approved'),
            rejected: getWithdrawalStatsByStatus(withdrawalStats, 'rejected')
          }
        },
        mlmStats: {
          activeReferrers: mlmStats.activeReferrers,
          totalTeamSize: mlmStats.totalTeamSize.length > 0 ? mlmStats.totalTeamSize[0].total : 0,
          totalDirectIncome: mlmStats.totalDirectIncome.length > 0 ? mlmStats.totalDirectIncome[0].total : 0,
          totalMatrixIncome: mlmStats.totalMatrixIncome.length > 0 ? mlmStats.totalMatrixIncome[0].total : 0,
          totalSelfIncome: mlmStats.totalSelfIncome.length > 0 ? mlmStats.totalSelfIncome[0].total : 0,
          totalRankRewards: mlmStats.totalRankRewards.length > 0 ? mlmStats.totalRankRewards[0].total : 0,
          activeTradingPackages: mlmStats.tradingPackages,
          rankDistribution: rankDistribution
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
