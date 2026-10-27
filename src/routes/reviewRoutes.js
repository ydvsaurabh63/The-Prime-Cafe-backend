const express = require('express');
const router = express.Router();
const {
  getReviews,
  createReview,
  getAdminReviews,
  toggleReviewApproval,
  deleteReview
} = require('../controllers/reviewController');
const { optionalAuth, protect, authorize } = require('../middleware/auth');

// Public endpoints
router.get('/', getReviews);
router.post('/', optionalAuth, createReview);

// Admin management endpoints
router.get('/admin', protect, authorize('admin', 'client', 'superadmin'), getAdminReviews);
router.patch('/:id/approval', protect, authorize('admin', 'client', 'superadmin'), toggleReviewApproval);
router.delete('/:id', protect, authorize('admin', 'client', 'superadmin'), deleteReview);

module.exports = router;
