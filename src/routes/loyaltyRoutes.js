const express = require('express');
const router = express.Router();
const { getLoyaltyStatus, claimReward } = require('../controllers/loyaltyController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/status', optionalAuth, getLoyaltyStatus);
router.post('/claim', protect, claimReward);

module.exports = router;
