const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      default: ''
    },
    isVeg: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    customerName: {
      type: String,
      required: true
    },
    customerPhone: {
      type: String,
      required: true
    },
    tableNumber: {
      type: String,
      required: true // e.g. "Table 01"
    },
    tableIdentifier: {
      type: String,
      required: true // e.g. "01"
    },
    items: [orderItemSchema],
    itemSubtotal: {
      type: Number,
      required: true
    },
    couponCode: {
      type: String,
      default: ''
    },
    discount: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    serviceCharge: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['counter_cash', 'counter_upi'],
      default: 'counter_upi'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served', 'Cancelled', 'Rejected'],
      default: 'Pending'
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    specialInstructions: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
