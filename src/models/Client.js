const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    cafeName: {
      type: String,
      required: [true, 'Please provide the Cafe name'],
      trim: true,
      maxlength: [100, 'Cafe name cannot exceed 100 characters']
    },
    ownerName: {
      type: String,
      required: [true, 'Please provide the Owner name'],
      trim: true,
      maxlength: [60, 'Owner name cannot exceed 60 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide a contact phone number'],
      trim: true
    },
    city: {
      type: String,
      trim: true,
      default: 'New Delhi'
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAdminName: {
      type: String,
      default: 'Superadmin HQ'
    },
    status: {
      type: String,
      enum: ['Active', 'Pending', 'Suspended'],
      default: 'Active'
    },
    plan: {
      type: String,
      enum: ['Starter', 'Growth', 'Enterprise'],
      default: 'Growth'
    },
    tablesCount: {
      type: Number,
      default: 8
    },
    totalSales: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    logo: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
