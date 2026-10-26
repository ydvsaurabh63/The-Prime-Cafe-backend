const Order = require('../models/Order');
const Client = require('../models/Client');
const MenuItem = require('../models/MenuItem');
const Offer = require('../models/Offer');
const Table = require('../models/Table');
const Notification = require('../models/Notification');
const { emitNewOrder, emitOrderStatusUpdate, emitAdminNotification } = require('../sockets/socketHandler');

// @desc    Create new customer order
// @route   POST /api/orders
// @access  Private (Authenticated customer)
exports.createOrder = async (req, res, next) => {
  try {
    const { items, tableIdentifier, couponCode, paymentMethod, specialInstructions } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one menu item'
      });
    }

    // 1. Verify and lookup Table (graceful fallback so orders succeed seamlessly for all customers)
    let table = null;
    if (tableIdentifier) {
      table = await Table.findOne({
        $or: [
          { identifier: tableIdentifier },
          { tableNumber: tableIdentifier },
          { tableNumber: `Table ${tableIdentifier}` }
        ]
      });
    }

    if (!table || !table.isActive) {
      table = await Table.findOne({ isActive: true });
    }

    if (!table) {
      table = {
        tableNumber: 'Dine-In',
        identifier: '01',
        isActive: true
      };
    }

    // 2. Fetch all menu items from database to prevent client price tampering
    const itemIds = items.map(i => i.menuItemId);
    const dbMenuItems = await MenuItem.find({ _id: { $in: itemIds } });
    const dbItemMap = new Map();
    dbMenuItems.forEach(item => dbItemMap.set(item._id.toString(), item));

    let calculatedSubtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const dbItem = dbItemMap.get(item.menuItemId);
      if (!dbItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item with ID ${item.menuItemId} does not exist.`
        });
      }

      if (!dbItem.availability) {
        return res.status(400).json({
          success: false,
          message: `Sorry, "${dbItem.name}" is currently sold out / unavailable.`
        });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for item "${dbItem.name}"`
        });
      }

      const itemLineTotal = dbItem.price * qty;
      calculatedSubtotal += itemLineTotal;

      // Save complete snapshot
      orderItems.push({
        menuItemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: qty,
        subtotal: itemLineTotal,
        image: dbItem.image,
        isVeg: dbItem.isVeg
      });
    }

    // 3. Server-side discount calculation
    let calculatedDiscount = 0;
    let validCouponCode = '';

    if (couponCode && couponCode.trim()) {
      const now = new Date();
      let offer = await Offer.findOne({
        couponCode: couponCode.trim().toUpperCase(),
        isActive: true,
        endDate: { $gte: now }
      });

      if (!offer) {
        const LOYALTY_COUPONS = {
          FREECOFFEE: { couponCode: 'FREECOFFEE', discountType: 'fixed', discountValue: 120, minimumOrderAmount: 120 },
          BURGER50: { couponCode: 'BURGER50', discountType: 'fixed', discountValue: 50, minimumOrderAmount: 150 },
          FREEGARLIC: { couponCode: 'FREEGARLIC', discountType: 'fixed', discountValue: 150, minimumOrderAmount: 150 },
          PASTA100: { couponCode: 'PASTA100', discountType: 'fixed', discountValue: 100, minimumOrderAmount: 200 },
          FREEDESSERT: { couponCode: 'FREEDESSERT', discountType: 'fixed', discountValue: 180, minimumOrderAmount: 180 }
        };
        const normalized = couponCode.trim().toUpperCase();
        if (LOYALTY_COUPONS[normalized]) {
          offer = LOYALTY_COUPONS[normalized];
        }
      }

      if (offer) {
        if (!offer.minimumOrderAmount || calculatedSubtotal >= offer.minimumOrderAmount) {
          validCouponCode = offer.couponCode;
          if (offer.discountType === 'percentage') {
            calculatedDiscount = (calculatedSubtotal * offer.discountValue) / 100;
            if (offer.maxDiscountAmount && calculatedDiscount > offer.maxDiscountAmount) {
              calculatedDiscount = offer.maxDiscountAmount;
            }
          } else {
            calculatedDiscount = offer.discountValue;
          }
          calculatedDiscount = Math.min(calculatedDiscount, calculatedSubtotal);
        }
      }
    }


    // 4. Server-side taxes & total
    // Aaj Kal Cafe: 5% GST included or added (5% standard cafe rate)
    const discountedAmount = Math.max(0, calculatedSubtotal - calculatedDiscount);
    const tax = Math.round(discountedAmount * 0.05); // 5% GST
    const finalTotal = discountedAmount + tax;

    // 5. Generate unique Order Number
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `AKC-${datePrefix}-${randomSuffix}`;

    const order = await Order.create({
      orderNumber,
      customer: req.user._id,
      customerName: req.user.name,
      customerPhone: req.user.phone,
      tableNumber: table.tableNumber,
      tableIdentifier: table.identifier,
      items: orderItems,
      itemSubtotal: calculatedSubtotal,
      couponCode: validCouponCode,
      discount: Math.round(calculatedDiscount),
      tax,
      totalAmount: finalTotal,
      paymentMethod: paymentMethod || 'counter_upi',
      paymentStatus: 'pending',
      orderStatus: 'Pending',
      specialInstructions: specialInstructions || ''
    });

    // 6. Create Admin Notification in Database
    const notification = await Notification.create({
      recipientRole: 'admin',
      type: 'new_order',
      title: `New Order: ${orderNumber}`,
      message: `${order.customerName} at ${table.tableNumber} placed an order for ₹${order.totalAmount}`,
      order: order._id,
      orderNumber: order.orderNumber
    });

    // 7. Dynamically update The Prime Cafe client sales & order count in MongoDB
    try {
      await Client.updateOne(
        { cafeName: 'The Prime Cafe' },
        { $inc: { totalSales: finalTotal, totalOrders: 1 } }
      );
    } catch (e) {
      // ignore client update error
    }

    // 8. Emit Real-time Sockets
    emitNewOrder(order);
    emitAdminNotification(notification);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Please relax while we prepare your order.',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged in customer's order history
// @route   GET /api/orders/my
// @access  Private
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single order details by id
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Must be either order owner or admin
    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Customer requests cancellation of their order
// @route   POST /api/orders/:id/cancel
// @access  Private
exports.cancelMyOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own orders'
      });
    }

    // Only allow cancellation if order is still Pending
    if (order.orderStatus !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because its status is already "${order.orderStatus}". Please speak to the cafe counter directly.`
      });
    }

    order.orderStatus = 'Cancelled';
    order.cancellationReason = reason || 'Customer requested cancellation';
    await order.save();

    // Notify Admin
    const notification = await Notification.create({
      recipientRole: 'admin',
      type: 'cancellation_request',
      title: `Order Cancelled: ${order.orderNumber}`,
      message: `${order.customerName} at ${order.tableNumber} cancelled their order.`,
      order: order._id,
      orderNumber: order.orderNumber
    });

    emitOrderStatusUpdate(order);
    emitAdminNotification(notification);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: order
    });
  } catch (err) {
    next(err);
  }
};
