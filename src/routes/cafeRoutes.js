const express = require('express');
const router = express.Router();
const {
  getCategories,
  getMenuItems,
  getMenuItemById,
  getOffers,
  getCheckInMilestones,
  validateCoupon,
  validateTable,
  notifyStaff,
  getCustomerNotifications,
  markCustomerNotificationRead
} = require('../controllers/cafeController');

router.get('/categories', getCategories);
router.get('/menu', getMenuItems);
router.get('/menu/:id', getMenuItemById);
router.get('/offers', getOffers);
router.get('/offers/checkin-milestones', getCheckInMilestones);
router.post('/offers/validate-coupon', validateCoupon);
router.get('/tables/validate/:identifier', validateTable);
router.post('/notify-staff', notifyStaff);

// Customer Notification Routes (Owner to Customer)
router.get('/customer-notifications', getCustomerNotifications);
router.patch('/customer-notifications/:id/read', markCustomerNotificationRead);

module.exports = router;
