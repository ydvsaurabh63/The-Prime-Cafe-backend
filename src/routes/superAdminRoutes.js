const express = require('express');
const router = express.Router();
const {
  getSuperAdminOverview,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAllClients,
  createClient,
  updateClient,
  toggleClientStatus,
  deleteClient
} = require('../controllers/superAdminController');

// Superadmin Overview
router.get('/overview', getSuperAdminOverview);

// Manage Admins
router.get('/admins', getAllAdmins);
router.post('/admins', createAdmin);
router.patch('/admins/:id', updateAdmin);
router.delete('/admins/:id', deleteAdmin);

// Manage Clients (Cafes)
router.get('/clients', getAllClients);
router.post('/clients', createClient);
router.patch('/clients/:id', updateClient);
router.patch('/clients/:id/toggle', toggleClientStatus);
router.delete('/clients/:id', deleteClient);

module.exports = router;
