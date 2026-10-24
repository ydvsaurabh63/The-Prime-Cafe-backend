const mongoose = require('mongoose');

const checkInMilestoneSchema = new mongoose.Schema(
  {
    visitNumber: {
      type: Number,
      required: [true, 'Visit number is required'],
      unique: true,
      min: 1,
      max: 20
    },
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0
    },
    couponCode: {
      type: String,
      required: [true, 'Coupon code is required'],
      uppercase: true,
      trim: true
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CheckInMilestone', checkInMilestoneSchema);
