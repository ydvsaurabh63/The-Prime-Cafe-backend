const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register,
  googleAuth,
  login,
  requestOtp,
  verifyOtp,
  googleFormCallback,
  claimFormSession,
  getMe,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rate limiting for auth sensitive routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  }
});

router.post('/register', authLimiter, register);
router.post('/google', authLimiter, googleAuth);
router.post('/login', authLimiter, login);
router.post('/request-otp', authLimiter, requestOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/google-form-callback', googleFormCallback);
router.post('/claim-form-session', claimFormSession);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;
