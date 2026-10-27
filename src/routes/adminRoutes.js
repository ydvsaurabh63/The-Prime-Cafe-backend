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
  sendCustomerMessage,
  getSentCustomerMessages,
  deleteCustomerMessage,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAllTables,
  createTable,
  toggleTableStatus,
  deleteTable,
  getAllCheckInMilestones,
  createCheckInMilestone,
  updateCheckInMilestone,
  deleteCheckInMilestone,
  getAllCustomers
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All Admin & Client Cafe routes require authentication
router.use(protect);
router.use(authorize('admin', 'client'));

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

// Check-In Milestones CRUD (Client Dynamic Control)
router.get('/checkin-milestones', getAllCheckInMilestones);
router.post('/checkin-milestones', createCheckInMilestone);
router.patch('/checkin-milestones/:id', updateCheckInMilestone);
router.delete('/checkin-milestones/:id', deleteCheckInMilestone);

// Notifications
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);
router.delete('/notifications/:id', deleteNotification);

// Cafe Owner to Customer Messaging
router.post('/customer-messages', sendCustomerMessage);
router.get('/customer-messages', getSentCustomerMessages);
router.delete('/customer-messages/:id', deleteCustomerMessage);

// Admin Profile
router.get('/profile', getAdminProfile);
router.patch('/profile', updateAdminProfile);
router.patch('/profile/password', changeAdminPassword);

// Tables & QR Management
router.get('/tables', getAllTables);
router.post('/tables', createTable);
router.patch('/tables/:id/toggle', toggleTableStatus);
router.delete('/tables/:id', deleteTable);

// Customer Leads & QR Scanned Guests
router.get('/customers', getAllCustomers);

module.exports = router;
