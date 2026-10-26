const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      enum: ['admin', 'customer'],
      default: 'admin'
    },
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: [
        'new_order',
        'order_status',
        'cancellation_request',
        'system_alert',
        'customer_request',
        'service_bell',
        'owner_message',
        'cafe_announcement',
        'kitchen_alert',
        'offer_alert'
      ],
      default: 'customer_request'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    targetTable: {
      type: String,
      default: 'All'
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent', 'offer', 'alert'],
      default: 'normal'
    },
    senderName: {
      type: String,
      default: 'Cafe Owner'
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    orderNumber: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
