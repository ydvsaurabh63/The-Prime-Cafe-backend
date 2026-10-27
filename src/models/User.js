const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    passwordHash: {
      type: String,
      select: false // never returned by default in queries
    },
    plainPassword: {
      type: String,
      default: ''
    },
    organization: {
      type: String,
      trim: true,
      default: ''
    },
    customId: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'superadmin', 'client'],
      default: 'customer'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    profileImage: {
      type: String,
      default: ''
    },
    area: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    foodPreference: {
      type: String,
      enum: ['Veg', 'Non Veg', 'Both'],
      default: 'Both'
    },
    rewardPoints: {
      type: Number,
      default: 50
    },
    claimedRewards: {
      type: [Number],
      default: []
    },
    scannedTable: {
      type: String,
      trim: true,
      default: ''
    },
    visitCount: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }

);

module.exports = mongoose.model('User', userSchema);
