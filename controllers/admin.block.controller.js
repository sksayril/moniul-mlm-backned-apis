const User = require('../models/user.model');
const mongoose = require('mongoose');

// Block a user
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user is admin
    if (user.role === 'admin') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot block admin users'
      });
    }

    // Check if user is already blocked
    if (user.blocked) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already blocked'
      });
    }

    // Block the user
    user.blocked = true;
    user.blockedAt = new Date();
    user.blockedBy = req.user.id;
    user.blockReason = reason || 'No reason provided';

    await user.save();

    res.status(200).json({
      status: 'success',
      message: `User ${user.name} (${user.userId}) has been blocked successfully`,
      data: {
        userId: user._id,
        userIdCode: user.userId,
        name: user.name,
        email: user.email,
        blocked: user.blocked,
        blockedAt: user.blockedAt,
        blockReason: user.blockReason
      }
    });

  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error blocking user',
      error: err.message
    });
  }
};

// Unblock a user
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user is not blocked
    if (!user.blocked) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not blocked'
      });
    }

    // Unblock the user
    user.blocked = false;
    user.blockedAt = null;
    user.blockedBy = null;
    user.blockReason = null;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: `User ${user.name} (${user.userId}) has been unblocked successfully`,
      data: {
        userId: user._id,
        userIdCode: user.userId,
        name: user.name,
        email: user.email,
        blocked: user.blocked
      }
    });

  } catch (err) {
    console.error('Error unblocking user:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error unblocking user',
      error: err.message
    });
  }
};

// Get list of blocked users
exports.getBlockedUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find all blocked users
    const blockedUsers = await User.find({ blocked: true })
      .populate('blockedBy', 'name userId email')
      .select('name userId email mobile blocked blockedAt blockReason')
      .sort({ blockedAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get total count for pagination
    const totalBlocked = await User.countDocuments({ blocked: true });
    const totalPages = Math.ceil(totalBlocked / limit);

    res.status(200).json({
      status: 'success',
      message: 'Blocked users retrieved successfully',
      data: {
        users: blockedUsers,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalUsers: totalBlocked,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (err) {
    console.error('Error fetching blocked users:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching blocked users',
      error: err.message
    });
  }
};

// Get user block status and details
exports.getUserBlockStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }

    // Find the user
    const user = await User.findById(userId)
      .populate('blockedBy', 'name userId email')
      .select('name userId email mobile blocked blockedAt blockReason');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'User block status retrieved successfully',
      data: {
        user: user,
        isBlocked: user.blocked
      }
    });

  } catch (err) {
    console.error('Error fetching user block status:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user block status',
      error: err.message
    });
  }
};

// Get blocking statistics
exports.getBlockingStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const blockedUsers = await User.countDocuments({ blocked: true });
    const activeUsers = await User.countDocuments({ 
      role: 'user', 
      blocked: false, 
      isActive: true 
    });

    // Get recent blocks (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentBlocks = await User.countDocuments({
      blocked: true,
      blockedAt: { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      status: 'success',
      message: 'Blocking statistics retrieved successfully',
      data: {
        totalUsers,
        blockedUsers,
        activeUsers,
        recentBlocks,
        blockingRate: totalUsers > 0 ? ((blockedUsers / totalUsers) * 100).toFixed(2) + '%' : '0%'
      }
    });

  } catch (err) {
    console.error('Error fetching blocking stats:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching blocking statistics',
      error: err.message
    });
  }
}; 