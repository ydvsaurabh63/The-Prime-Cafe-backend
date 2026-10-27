const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters']
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a star rating'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars']
    },
    review: {
      type: String,
      required: [true, 'Please share your review or experience'],
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    tag: {
      type: String,
      default: 'Verified Diner',
      trim: true
    },
    favoriteDish: {
      type: String,
      default: '',
      trim: true
    },
    source: {
      type: String,
      enum: ['Google', 'In-House'],
      default: 'Google'
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
