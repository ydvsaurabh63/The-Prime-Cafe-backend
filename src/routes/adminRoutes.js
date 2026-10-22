const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  rejectOrder,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAllTables,
  createTable,
  toggleTableStatus,
  deleteTable
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All Admin routes require authentication AND admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard Stats
router.get('/dashboard', getDashboardStats);

// Orders
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.patch('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/reject', rejectOrder);

// Menu Items CRUD
router.post('/menu', createMenuItem);
router.patch('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);

// Categories CRUD
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Offers CRUD
router.get('/offers', getAllOffers);
router.post('/offers', createOffer);
router.patch('/offers/:id', updateOffer);
router.delete('/offers/:id', deleteOffer);

// Notifications
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);
router.delete('/notifications/:id', deleteNotification);

// Admin Profile
router.get('/profile', getAdminProfile);
router.patch('/profile', updateAdminProfile);
router.patch('/profile/password', changeAdminPassword);

// Tables & QR Management
router.get('/tables', getAllTables);
router.post('/tables', createTable);
router.patch('/tables/:id/toggle', toggleTableStatus);
router.delete('/tables/:id', deleteTable);

module.exports = router;
