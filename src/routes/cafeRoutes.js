const express = require('express');
const router = express.Router();
const {
  getCategories,
  getMenuItems,
  getMenuItemById,
  getOffers,
  validateCoupon,
  validateTable,
  notifyStaff
} = require('../controllers/cafeController');

router.get('/categories', getCategories);
router.get('/menu', getMenuItems);
router.get('/menu/:id', getMenuItemById);
router.get('/offers', getOffers);
router.post('/offers/validate-coupon', validateCoupon);
router.get('/tables/validate/:identifier', validateTable);
router.post('/notify-staff', notifyStaff);

module.exports = router;
