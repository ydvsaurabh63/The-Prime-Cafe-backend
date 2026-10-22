const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Offer = require('../models/Offer');
const Table = require('../models/Table');
const Notification = require('../models/Notification');
const { emitAdminNotification } = require('../sockets/socketHandler');

// @desc    Get all active categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all active menu items with search and category filter
// @route   GET /api/menu
// @access  Public
exports.getMenuItems = async (req, res, next) => {
  try {
    const { category, search, vegOnly } = req.query;
    let query = { availability: true };

    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        query.categorySlug = category.toLowerCase();
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (vegOnly === 'true') {
      query.isVeg = true;
    }

    const items = await MenuItem.find(query).populate('category', 'name slug').sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single menu item details
// @route   GET /api/menu/:id
// @access  Public
exports.getMenuItemById = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id).populate('category', 'name slug');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all active & valid offers
// @route   GET /api/offers
// @access  Public
exports.getOffers = async (req, res, next) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      endDate: { $gte: now },
      startDate: { $lte: now }
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: offers.length,
      data: offers
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Validate a coupon code and calculate discount
// @route   POST /api/offers/validate-coupon
// @access  Public
exports.validateCoupon = async (req, res, next) => {
  try {
    const { couponCode, subtotal } = req.body;

    if (!couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const now = new Date();
    const offer = await Offer.findOne({
      couponCode: couponCode.trim().toUpperCase(),
      isActive: true,
      endDate: { $gte: now }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired coupon code'
      });
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (offer.minimumOrderAmount && orderSubtotal < offer.minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value for coupon ${offer.couponCode} is ₹${offer.minimumOrderAmount}`
      });
    }

    let discount = 0;
    if (offer.discountType === 'percentage') {
      discount = (orderSubtotal * offer.discountValue) / 100;
      if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) {
        discount = offer.maxDiscountAmount;
      }
    } else {
      discount = offer.discountValue;
    }

    discount = Math.min(discount, orderSubtotal);

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully!',
      data: {
        code: offer.couponCode,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        discountCalculated: Math.round(discount)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Validate Table Identifier from QR Code
// @route   GET /api/tables/validate/:identifier
// @access  Public
exports.validateTable = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const table = await Table.findOne({
      $or: [{ identifier: identifier }, { tableNumber: identifier }, { tableNumber: `Table ${identifier}` }]
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: `Table "${identifier}" does not exist in The Prime Cafe.`
      });
    }

    if (!table.isActive) {
      return res.status(400).json({
        success: false,
        message: `Table ${table.tableNumber} is currently inactive. Please contact cafe staff.`
      });
    }

    res.status(200).json({
      success: true,
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        identifier: table.identifier,
        seatingCapacity: table.seatingCapacity
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Customer notifies cafe staff / rings service bell
// @route   POST /api/notify-staff
// @access  Public
exports.notifyStaff = async (req, res, next) => {
  try {
    const { tableNumber, customerName, requestType, message } = req.body;

    if (!tableNumber && !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your table number or a message.'
      });
    }

    const tableLabel = tableNumber
      ? String(tableNumber).toLowerCase().startsWith('table')
        ? tableNumber
        : `Table ${tableNumber}`
      : 'General Customer';

    const typeLabel = requestType || 'Customer Assistance';
    const displayMsg = message?.trim()
      ? `${message.trim()} (By: ${customerName || 'Customer'})`
      : `${customerName || 'Customer'} requested ${typeLabel} at ${tableLabel}.`;

    const notification = await Notification.create({
      recipientRole: 'admin',
      type: 'customer_request',
      title: `🛎️ ${typeLabel} - ${tableLabel}`,
      message: displayMsg
    });

    emitAdminNotification(notification);

    res.status(201).json({
      success: true,
      message: 'Notification sent to staff successfully!',
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

