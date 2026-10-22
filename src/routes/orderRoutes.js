const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

// All customer order routes require authentication
router.use(protect);

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelMyOrder);

module.exports = router;
