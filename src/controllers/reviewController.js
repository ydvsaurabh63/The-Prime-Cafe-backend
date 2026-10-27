const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { getIO } = require('../sockets/socketHandler');

const DEFAULT_REVIEWS = [
  {
    name: 'Aarav Mehta',
    rating: 5,
    tag: 'Regular Diner',
    source: 'Google',
    review: 'The artisanal 3D burger and smoked hazelnut cold brew are out of this world! Cozy aesthetic and super smooth table QR ordering.',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    name: 'Priya Sharma',
    rating: 5,
    tag: 'Food Critic',
    source: 'Google',
    review: 'Incredible cozy vibe! High speed Wi-Fi makes it my favorite place to work remotely while sipping their single-origin cappuccino.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    name: 'Kabir Verma',
    rating: 5,
    tag: 'Verified Guest',
    source: 'Google',
    review: 'Table QR ordering was seamless. Sourdough pizza and pastries were served oven-hot within 10 minutes. 10/10 recommended!',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
];

// @desc    Get all approved reviews & rating stats
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    let reviews = await Review.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(30);

    // If no reviews in DB yet, auto-seed default ones
    if (reviews.length === 0) {
      try {
        await Review.insertMany(DEFAULT_REVIEWS);
        reviews = await Review.find({ isApproved: true })
          .sort({ createdAt: -1 })
          .limit(30);
      } catch {
        reviews = DEFAULT_REVIEWS;
      }
    }

    const baseCount = 2850;
    const totalCount = baseCount + reviews.length;

    res.status(200).json({
      success: true,
      data: {
        reviews,
        stats: {
          averageRating: 4.9,
          totalReviews: totalCount,
          recommendedPercent: 98,
          happyGuests: '15K+'
        },
        googleReviewUrl: process.env.GOOGLE_REVIEW_URL || 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4'
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit a new customer review
// @route   POST /api/reviews
// @access  Public (Optional Auth)
exports.createReview = async (req, res, next) => {
  try {
    const { name, rating, review, tag, favoriteDish, source } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your name' });
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars' });
    }

    if (!review || !review.trim()) {
      return res.status(400).json({ success: false, message: 'Please write a brief review of your experience' });
    }

    const newReview = await Review.create({
      name: name.trim(),
      rating: Math.round(numRating),
      review: review.trim(),
      tag: tag?.trim() || 'Verified Diner',
      favoriteDish: favoriteDish?.trim() || '',
      source: source || (numRating >= 4 ? 'Google' : 'In-House'),
      isApproved: true,
      customer: req.user ? req.user._id : null
    });

    // Create an Admin Notification so it shows up in notifications list
    let adminNotif = null;
    try {
      adminNotif = await Notification.create({
        recipientRole: 'admin',
        type: 'new_review',
        title: `⭐ New ${newReview.rating}★ Review from ${newReview.name}`,
        message: `${newReview.name} (${newReview.tag}): "${newReview.review.slice(0, 120)}${newReview.review.length > 120 ? '...' : ''}"`,
        priority: newReview.rating >= 4 ? 'normal' : 'urgent',
        senderName: newReview.name
      });
    } catch (notifErr) {
      console.warn('Notification create warning:', notifErr.message);
    }

    // Broadcast in real-time to connected management panel admins via socket
    try {
      const io = getIO();
      if (io) {
        io.to('admin_room').emit('new_review', newReview);
        if (adminNotif) {
          io.to('admin_room').emit('admin_notification', adminNotif);
        }
        io.emit('review_added', newReview);
      }
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Thank you for your valuable review! Your feedback helps us serve you better.',
      data: newReview
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reviews for Admin Panel with filter & stats
// @route   GET /api/reviews/admin
// @access  Private (Admin / Client / SuperAdmin)
exports.getAdminReviews = async (req, res, next) => {
  try {
    const { rating, search, isApproved } = req.query;

    const query = {};
    if (rating && rating !== 'All') {
      query.rating = Number(rating);
    }
    if (isApproved !== undefined && isApproved !== 'All') {
      query.isApproved = isApproved === 'true';
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { review: regex }, { tag: regex }];
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 });

    // Aggregate Rating breakdown
    const allReviews = await Review.find();
    const stats = {
      total: allReviews.length,
      average: allReviews.length ? (allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length).toFixed(1) : '5.0',
      fiveStars: allReviews.filter((r) => r.rating === 5).length,
      fourStars: allReviews.filter((r) => r.rating === 4).length,
      threeStars: allReviews.filter((r) => r.rating === 3).length,
      twoStars: allReviews.filter((r) => r.rating === 2).length,
      oneStar: allReviews.filter((r) => r.rating === 1).length,
      googleCount: allReviews.filter((r) => r.source === 'Google').length,
      inHouseCount: allReviews.filter((r) => r.source !== 'Google').length
    };

    res.status(200).json({
      success: true,
      data: reviews,
      stats
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle review approval
// @route   PATCH /api/reviews/:id/approval
// @access  Private (Admin)
exports.toggleReviewApproval = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.isApproved = !review.isApproved;
    await review.save();

    res.status(200).json({
      success: true,
      message: `Review ${review.isApproved ? 'approved' : 'hidden'} successfully`,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Admin)
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
