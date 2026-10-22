const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: [true, 'Table number is required (e.g. Table 01)'],
      unique: true,
      trim: true
    },
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true // e.g. "01", "table-01", "T01"
    },
    seatingCapacity: {
      type: Number,
      default: 4,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true
    },
    qrCodeDataUrl: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);
