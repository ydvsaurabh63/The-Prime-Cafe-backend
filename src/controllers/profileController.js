const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get customer profile with order stats
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const orderCount = await Order.countDocuments({ customer: req.user._id });
    const completedOrders = await Order.countDocuments({ customer: req.user._id, orderStatus: 'Served' });

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalOrders: orderCount,
          completedOrders,
          rewardPoints: user.rewardPoints || 0
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update customer profile
// @route   PATCH /api/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, area, city, pincode, foodPreference, table } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (area !== undefined) user.area = area.trim();
    if (city !== undefined) user.city = city.trim();
    if (pincode !== undefined) user.pincode = pincode.trim();
    if (foodPreference !== undefined) user.foodPreference = foodPreference;
    if (table) user.scannedTable = table.trim();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (err) {
    next(err);
  }
};
