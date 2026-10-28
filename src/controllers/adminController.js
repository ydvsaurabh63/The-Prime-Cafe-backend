const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Offer = require('../models/Offer');
const Notification = require('../models/Notification');
const Table = require('../models/Table');
const User = require('../models/User');
const CheckInMilestone = require('../models/CheckInMilestone');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const {
  emitOrderStatusUpdate,
  emitAdminNotification,
  emitCustomerNotification,
  emitMenuUpdated,
  emitOfferUpdated
} = require('../sockets/socketHandler');

// ====================== DASHBOARD OVERVIEW ======================
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'Pending' });
    const preparingOrders = await Order.countDocuments({ orderStatus: { $in: ['Accepted', 'Preparing'] } });
    const readyOrders = await Order.countDocuments({ orderStatus: 'Ready' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'Served' });

    // Today's sales
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({
      createdAt: { $gte: startOfToday },
      orderStatus: { $nin: ['Cancelled', 'Rejected'] }
    });

    const todaySales = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const todayCount = todayOrders.length;

    const totalMenuItems = await MenuItem.countDocuments();
    const activeOffers = await Offer.countDocuments({ isActive: true, endDate: { $gte: new Date() } });

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        completedOrders,
        todaySales,
        todayCount,
        totalMenuItems,
        activeOffers
      }
    });
  } catch (err) {
    next(err);
  }
};

// ====================== ORDERS MANAGEMENT ======================
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, search, date } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.orderStatus = status;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { tableNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (date) {
      const selectedDate = new Date(date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query.createdAt = { $gte: selectedDate, $lt: nextDay };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    const ordersWithVisits = await Promise.all(
      orders.map(async (ord) => {
        const ordObj = ord.toObject();
        try {
          if (ord.customerPhone) {
            const previousVisits = await Order.countDocuments({
              customerPhone: ord.customerPhone,
              $or: [{ paymentStatus: 'paid' }, { orderStatus: 'Served' }]
            });
            ordObj.customerVisits = previousVisits;
          } else if (ord.customer) {
            const previousVisits = await Order.countDocuments({
              customer: ord.customer,
              $or: [{ paymentStatus: 'paid' }, { orderStatus: 'Served' }]
            });
            ordObj.customerVisits = previousVisits;
          } else {
            ordObj.customerVisits = 0;
          }
        } catch (e) {
          ordObj.customerVisits = 0;
        }
        return ordObj;
      })
    );

    res.status(200).json({
      success: true,
      count: ordersWithVisits.length,
      data: ordersWithVisits
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer', 'name email phone');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;
    const validStatuses = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served', 'Cancelled', 'Rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Backend validation for sensible order progression
    if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Rejected') {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of an order that is already ${order.orderStatus}`
      });
    }

    order.orderStatus = status;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }
    if (status === 'Served' && !paymentStatus) {
      order.paymentStatus = 'paid';
    }

    await order.save();

    // Broadcast update via Socket.IO
    emitOrderStatusUpdate(order);

    res.status(200).json({
      success: true,
      message: `Order status updated to "${status}"`,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

exports.rejectOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.orderStatus = 'Rejected';
    order.cancellationReason = reason || 'Order rejected by cafe management';
    await order.save();

    emitOrderStatusUpdate(order);

    res.status(200).json({
      success: true,
      message: 'Order rejected successfully',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// ====================== MENU CRUD ======================
exports.createMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, category, isVeg, prepTime, tags, image, availability } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required'
      });
    }

    if (Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price cannot be negative'
      });
    }

    const catDoc = await Category.findById(category);
    if (!catDoc) {
      return res.status(400).json({ success: false, message: 'Specified category does not exist' });
    }

    const item = await MenuItem.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      category: catDoc._id,
      categorySlug: catDoc.slug,
      isVeg: isVeg !== undefined ? isVeg : true,
      prepTime: prepTime || '10-15 mins',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      image: image || '',
      availability: availability !== undefined ? availability : true
    });

    emitMenuUpdated({ action: 'create', item });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: item
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, category, isVeg, prepTime, tags, image, availability } = req.body;
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (price !== undefined && Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'Price cannot be negative' });
    }

    if (category) {
      const catDoc = await Category.findById(category);
      if (catDoc) {
        item.category = catDoc._id;
        item.categorySlug = catDoc.slug;
      }
    }

    if (name) item.name = name.trim();
    if (description !== undefined) item.description = description.trim();
    if (price !== undefined) item.price = Number(price);
    if (isVeg !== undefined) item.isVeg = isVeg;
    if (prepTime !== undefined) item.prepTime = prepTime;
    if (tags !== undefined) {
      item.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    }
    if (image !== undefined) item.image = image;
    if (availability !== undefined) item.availability = availability;

    await item.save();

    emitMenuUpdated({ action: 'update', item });

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: item
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    await MenuItem.deleteOne({ _id: item._id });

    emitMenuUpdated({ action: 'delete', id: item._id, name: item.name });

    res.status(200).json({
      success: true,
      message: `Menu item "${item.name}" deleted successfully`
    });
  } catch (err) {
    next(err);
  }
};

// ====================== CATEGORY CRUD ======================
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, image, order } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      name: name.trim(),
      slug,
      description: description || '',
      image: image || '',
      order: Number(order) || 0
    });

    emitMenuUpdated({ action: 'category_create', category });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, image, isActive, order } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) {
      category.name = name.trim();
      category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;
    if (order !== undefined) category.order = Number(order);

    await category.save();

    emitMenuUpdated({ action: 'category_update', category });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if items exist under this category
    const itemsCount = await MenuItem.countDocuments({ category: category._id });
    if (itemsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category because ${itemsCount} menu items belong to it. Please reassign or delete items first.`
      });
    }

    await Category.deleteOne({ _id: category._id });

    emitMenuUpdated({ action: 'category_delete', id: category._id });

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" deleted successfully`
    });
  } catch (err) {
    next(err);
  }
};

// ====================== OFFERS CRUD ======================
exports.getAllOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: offers.length,
      data: offers
    });
  } catch (err) {
    next(err);
  }
};

exports.createOffer = async (req, res, next) => {
  try {
    const {
      title,
      description,
      image,
      discountType,
      discountValue,
      couponCode,
      minimumOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      isActive
    } = req.body;

    if (!title || !description || discountValue === undefined || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, discount value, and end date are required'
      });
    }

    const offer = await Offer.create({
      title: title.trim(),
      description: description.trim(),
      image: image || '',
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      couponCode: couponCode ? couponCode.trim().toUpperCase() : '',
      minimumOrderAmount: Number(minimumOrderAmount) || 0,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer
    });
    emitOfferUpdated({ action: 'create', offer });
  } catch (err) {
    next(err);
  }
};

exports.updateOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    const fields = [
      'title', 'description', 'image', 'discountType', 'discountValue',
      'couponCode', 'minimumOrderAmount', 'maxDiscountAmount', 'startDate', 'endDate', 'isActive'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'couponCode') {
          offer[field] = req.body[field].trim().toUpperCase();
        } else {
          offer[field] = req.body[field];
        }
      }
    });

    await offer.save();

    emitOfferUpdated({ action: 'update', offer });

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: offer
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    await Offer.deleteOne({ _id: offer._id });

    emitOfferUpdated({ action: 'delete', id: offer._id });

    res.status(200).json({
      success: true,
      message: `Offer "${offer.title}" deleted successfully`
    });
  } catch (err) {
    next(err);
  }
};

// ====================== NOTIFICATIONS ======================
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipientRole: 'admin' }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ recipientRole: 'admin', isRead: false });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipientRole: 'admin', isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await Notification.deleteOne({ _id: notification._id });
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};

// ====================== OWNER TO CUSTOMER MESSAGING ======================
// @desc    Cafe Owner sends a notification / message to customers
// @route   POST /api/admin/customer-messages
// @access  Private (Admin / Client)
exports.sendCustomerMessage = async (req, res, next) => {
  try {
    const { title, message, type, targetTable, priority } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both title and message for the customer.'
      });
    }

    const notification = await Notification.create({
      recipientRole: 'customer',
      type: type || 'owner_message',
      title: title.trim(),
      message: message.trim(),
      targetTable: targetTable?.trim() || 'All',
      priority: priority || 'normal',
      senderName: req.user?.name || 'Cafe Owner',
      isRead: false
    });

    // Real-time broadcast via socket
    emitCustomerNotification(notification);

    res.status(201).json({
      success: true,
      message: 'Message sent to customers successfully!',
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all messages sent by Cafe Owner to customers
// @route   GET /api/admin/customer-messages
// @access  Private (Admin / Client)
exports.getSentCustomerMessages = async (req, res, next) => {
  try {
    const messages = await Notification.find({ recipientRole: 'customer' })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a message sent to customers
// @route   DELETE /api/admin/customer-messages/:id
// @access  Private (Admin / Client)
exports.deleteCustomerMessage = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientRole: 'customer'
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    await Notification.deleteOne({ _id: notification._id });
    res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    next(err);
  }
};


// ====================== ADMIN PROFILE ======================
exports.getAdminProfile = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        profileImage: admin.profileImage,
        createdAt: admin.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateAdminProfile = async (req, res, next) => {
  try {
    const { name, phone, email, profileImage } = req.body;
    const admin = await User.findById(req.user._id);

    if (name) admin.name = name.trim();
    if (phone) admin.phone = phone.trim();
    if (email) admin.email = email.trim().toLowerCase();
    if (profileImage !== undefined) admin.profileImage = profileImage;

    // Do NOT permit self-promotion or role manipulation
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully',
      data: admin
    });
  } catch (err) {
    next(err);
  }
};

exports.changeAdminPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const admin = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match'
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    next(err);
  }
};

// ====================== TABLE & QR MANAGEMENT ======================
exports.getAllTables = async (req, res, next) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.status(200).json({
      success: true,
      count: tables.length,
      data: tables
    });
  } catch (err) {
    next(err);
  }
};

exports.createTable = async (req, res, next) => {
  try {
    const { tableNumber, identifier, seatingCapacity } = req.body;

    if (!tableNumber || !identifier) {
      return res.status(400).json({
        success: false,
        message: 'Table number and unique identifier are required'
      });
    }

    const cleanTableNum = tableNumber.trim();
    const cleanId = identifier.trim().toLowerCase();

    // Check duplicates
    const existing = await Table.findOne({
      $or: [{ tableNumber: cleanTableNum }, { identifier: cleanId }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A table with this number or identifier already exists'
      });
    }

    // Generate QR Code URL with table parameter
    const frontendBase = process.env.FRONTEND_URL || 'https://the-prime-cafe-frontend.vercel.app';
    const qrUrl = `${frontendBase}/cafe?table=${encodeURIComponent(cleanId)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#4A2C18', // Coffee Brown
        light: '#FAF7F2'  // Cream
      }
    });

    const table = await Table.create({
      tableNumber: cleanTableNum,
      identifier: cleanId,
      seatingCapacity: Number(seatingCapacity) || 4,
      isActive: true,
      qrCodeDataUrl
    });

    res.status(201).json({
      success: true,
      message: `Table ${cleanTableNum} created with QR Code`,
      data: table
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleTableStatus = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.isActive = !table.isActive;
    await table.save();

    res.status(200).json({
      success: true,
      message: `Table ${table.tableNumber} is now ${table.isActive ? 'Active' : 'Inactive'}`,
      data: table
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    await Table.deleteOne({ _id: table._id });

    res.status(200).json({
      success: true,
      message: `Table ${table.tableNumber} deleted successfully`
    });
  } catch (err) {
    next(err);
  }
};

// ====================== CHECK-IN MILESTONES (CLIENT DYNAMIC CONTROL) ======================
const DEFAULT_CHECKIN_MILESTONES = [
  {
    visitNumber: 1,
    title: '10% OFF Welcome',
    discountType: 'percentage',
    discountValue: 10,
    couponCode: 'PRIME10',
    minimumOrderAmount: 0,
    maxDiscountAmount: 100,
    description: 'Flat 10% discount on 1st check-in order.',
    isActive: true
  },
  {
    visitNumber: 3,
    title: 'Free Coffee Perk',
    discountType: 'fixed',
    discountValue: 120,
    couponCode: 'FREECOFFEE',
    minimumOrderAmount: 0,
    maxDiscountAmount: 120,
    description: 'Free artisan coffee on 3rd visit.',
    isActive: true
  },
  {
    visitNumber: 5,
    title: 'Free Fried Rice Treat',
    discountType: 'fixed',
    discountValue: 160,
    couponCode: 'FREEFRIEDRICE',
    minimumOrderAmount: 0,
    maxDiscountAmount: 160,
    description: 'Free delicious Fried Rice on 5th visit.',
    isActive: true
  },
  {
    visitNumber: 7,
    title: 'Pizza Feast',
    discountType: 'fixed',
    discountValue: 200,
    couponCode: 'GOLD7PIZZA',
    minimumOrderAmount: 500,
    maxDiscountAmount: 200,
    description: 'Flat ₹200 savings on pizza feast orders above ₹500 on 7th visit.',
    isActive: true
  },
  {
    visitNumber: 10,
    title: 'VIP Royalty',
    discountType: 'percentage',
    discountValue: 30,
    couponCode: 'VIP10FEAST',
    minimumOrderAmount: 500,
    maxDiscountAmount: 350,
    description: '30% VIP discount on entire table feast orders above ₹500 on 10th visit.',
    isActive: true
  }
];

exports.getAllCheckInMilestones = async (req, res, next) => {
  try {
    let milestones = await CheckInMilestone.find().sort({ visitNumber: 1 });
    if (!milestones || milestones.length === 0) {
      await CheckInMilestone.insertMany(DEFAULT_CHECKIN_MILESTONES);
      milestones = await CheckInMilestone.find().sort({ visitNumber: 1 });
    }
    res.status(200).json({
      success: true,
      count: milestones.length,
      data: milestones
    });
  } catch (err) {
    next(err);
  }
};

exports.createCheckInMilestone = async (req, res, next) => {
  try {
    const {
      visitNumber,
      title,
      discountType,
      discountValue,
      couponCode,
      minimumOrderAmount,
      maxDiscountAmount,
      description,
      isActive
    } = req.body;

    if (!visitNumber || !title || discountValue === undefined || !couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Visit number, title, discount value, and coupon code are required'
      });
    }

    const existing = await CheckInMilestone.findOne({ visitNumber: Number(visitNumber) });
    if (existing) {
      existing.title = title.trim();
      existing.discountType = discountType || 'percentage';
      existing.discountValue = Number(discountValue);
      existing.couponCode = couponCode.trim().toUpperCase();
      existing.minimumOrderAmount = Number(minimumOrderAmount) || 0;
      existing.maxDiscountAmount = Number(maxDiscountAmount) || 0;
      existing.description = description ? description.trim() : '';
      if (isActive !== undefined) existing.isActive = isActive;
      await existing.save();

      return res.status(200).json({
        success: true,
        message: `Milestone for Visit #${visitNumber} updated successfully`,
        data: existing
      });
    }

    const milestone = await CheckInMilestone.create({
      visitNumber: Number(visitNumber),
      title: title.trim(),
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      couponCode: couponCode.trim().toUpperCase(),
      minimumOrderAmount: Number(minimumOrderAmount) || 0,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      description: description ? description.trim() : '',
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: `Milestone for Visit #${visitNumber} created successfully`,
      data: milestone
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCheckInMilestone = async (req, res, next) => {
  try {
    const milestone = await CheckInMilestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const fields = [
      'visitNumber',
      'title',
      'discountType',
      'discountValue',
      'couponCode',
      'minimumOrderAmount',
      'maxDiscountAmount',
      'description',
      'isActive'
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (f === 'couponCode') {
          milestone[f] = req.body[f].trim().toUpperCase();
        } else if (
          f === 'visitNumber' ||
          f === 'discountValue' ||
          f === 'minimumOrderAmount' ||
          f === 'maxDiscountAmount'
        ) {
          milestone[f] = Number(req.body[f]);
        } else {
          milestone[f] = req.body[f];
        }
      }
    });

    await milestone.save();

    res.status(200).json({
      success: true,
      message: 'Milestone updated successfully',
      data: milestone
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteCheckInMilestone = async (req, res, next) => {
  try {
    const milestone = await CheckInMilestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    await CheckInMilestone.deleteOne({ _id: milestone._id });

    res.status(200).json({
      success: true,
      message: `Milestone for Visit #${milestone.visitNumber} deleted successfully`
    });
  } catch (err) {
    next(err);
  }
};

// ====================== CUSTOMER LEADS & QR SCANS ======================
// @desc    Get all registered customers from QR scans / form submissions
// @route   GET /api/admin/customers
// @access  Private (Admin / Client)
exports.getAllCustomers = async (req, res, next) => {
  try {
    const { search, foodPreference, table, todayOnly } = req.query;

    const query = { role: 'customer' };

    if (foodPreference && foodPreference !== 'All') {
      query.foodPreference = foodPreference;
    }

    if (table && table !== 'All') {
      query.scannedTable = new RegExp(table, 'i');
    }

    if (todayOnly === 'true') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startOfToday };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { area: regex },
        { city: regex },
        { scannedTable: regex }
      ];
    }

    const customers = await User.find(query).sort({ createdAt: -1 });

    // Fetch order stats for each customer to enrich lead data
    const customerIds = customers.map((c) => c._id);
    const orders = await Order.find({ customer: { $in: customerIds } });

    const orderStatsMap = {};
    orders.forEach((o) => {
      const cId = o.customer ? o.customer.toString() : null;
      if (cId) {
        if (!orderStatsMap[cId]) {
          orderStatsMap[cId] = { totalOrders: 0, totalSpent: 0 };
        }
        orderStatsMap[cId].totalOrders += 1;
        if (o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Rejected') {
          orderStatsMap[cId].totalSpent += o.totalAmount || 0;
        }
      }
    });

    const enrichedCustomers = customers.map((c) => {
      const cObj = c.toObject();
      const s = orderStatsMap[c._id.toString()] || { totalOrders: 0, totalSpent: 0 };
      cObj.totalOrders = s.totalOrders;
      cObj.totalSpent = s.totalSpent;
      return cObj;
    });

    // KPI stats
    const allCustomers = await User.find({ role: 'customer' });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const stats = {
      total: allCustomers.length,
      todayNew: allCustomers.filter((c) => new Date(c.createdAt) >= startOfToday).length,
      veg: allCustomers.filter((c) => c.foodPreference === 'Veg').length,
      nonVeg: allCustomers.filter((c) => c.foodPreference === 'Non Veg').length,
      both: allCustomers.filter((c) => c.foodPreference === 'Both').length
    };

    res.status(200).json({
      success: true,
      count: enrichedCustomers.length,
      data: enrichedCustomers,
      stats
    });
  } catch (err) {
    next(err);
  }
};

