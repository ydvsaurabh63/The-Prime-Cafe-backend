const mongoose = require('mongoose');

const verificationRecordSchema = new mongoose.Schema(
  {
    contact: {
      type: String, // phone or email
      required: true,
      index: true
    },
    hashedCode: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      enum: ['google_form_verify', 'otp_login', 'password_reset'],
      default: 'otp_login'
    },
    metadata: {
      name: String,
      email: String,
      phone: String,
      table: String
    },
    attempts: {
      type: Number,
      default: 0
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index in MongoDB
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationRecord', verificationRecordSchema);
