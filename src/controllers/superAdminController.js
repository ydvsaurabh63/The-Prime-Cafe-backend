const User = require('../models/User');
const Client = require('../models/Client');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');

// Bootstrap sample clients if database has 0 clients
const ensureDefaultClients = async () => {
  // Clean up unwanted demo clients
  await Client.deleteMany({
    cafeName: { $in: ['Urban Chai Lounge', 'Roast & Toast Bistro', 'Mocha Express'] }
  });

  // Calculate live order stats for The Prime Cafe
  const allOrders = await Order.find({ orderStatus: { $nin: ['Cancelled', 'Rejected'] } });
  const realSales = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const realOrdersCount = await Order.countDocuments();

  const count = await Client.countDocuments();
  if (count === 0) {
    await Client.create({
      cafeName: 'The Prime Cafe',
      ownerName: 'Vikas Malhotra',
      email: 'vikas@theprimecafe.com',
      phone: '+91 98765 43210',
      city: 'Connaught Place, New Delhi',
      address: 'Block B, Inner Circle, CP',
      assignedAdminName: 'Amit Sharma (Delhi NCR)',
      status: 'Active',
      plan: 'Enterprise',
      tablesCount: 15,
      plainPassword: 'Admin@123',
      totalSales: realSales || 0,
      totalOrders: realOrdersCount || 0
    });
  } else {
    // Keep The Prime Cafe dynamically synced with real order calculations & plainPassword
    const prime = await Client.findOne({ cafeName: 'The Prime Cafe' });
    if (prime) {
      prime.totalSales = realSales || 0;
      prime.totalOrders = realOrdersCount || 0;
      if (!prime.plainPassword) prime.plainPassword = 'Admin@123';
      await prime.save();
    }
  }
};

const ensureDefaultAdmin = async () => {
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount === 0) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);
    await User.create({
      name: 'Amit Sharma',
      email: 'amit.sharma@aajkalcafe.com',
      phone: '+91 98112 34567',
      passwordHash,
      role: 'admin',
      area: 'Delhi NCR',
      city: 'New Delhi',
      isVerified: true
    });
  }
};

// 1. OVERVIEW STATS FOR SUPERADMIN
exports.getSuperAdminOverview = async (req, res, next) => {
  try {
    await ensureDefaultClients();
    await ensureDefaultAdmin();

    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ status: 'Active' });
    const pendingClients = await Client.countDocuments({ status: 'Pending' });

    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // Aggregate orders & revenue dynamically
    const totalOrders = await Order.countDocuments();
    const allOrders = await Order.find({ orderStatus: { $nin: ['Cancelled', 'Rejected'] } });
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const clientsList = await Client.find().sort({ totalSales: -1 }).limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue || 0,
        totalOrders: totalOrders || 0,
        totalClients: totalClients || 0,
        activeClients: activeClients || 0,
        pendingClients: pendingClients || 0,
        totalAdmins: totalAdmins || 0,
        totalCustomers: totalCustomers || 0,
        topClients: clientsList,
        systemHealth: {
          database: 'Connected',
          apiLatency: 'Operational',
          uptime: '100%',
          status: 'Operational'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// 2. MANAGE ADMINS
exports.getAllAdmins = async (req, res, next) => {
  try {
    await ensureDefaultAdmin();
    const admins = await User.find({ role: 'admin' }).select('-passwordHash').sort({ createdAt: -1 });
    const clientCount = await Client.countDocuments();
    const formatted = admins.map((adm, index) => ({
      _id: adm._id,
      name: adm.name,
      email: adm.email,
      phone: adm.phone,
      organization: adm.organization || `${adm.name} Cafe Operations`,
      customId: adm.customId || `ADM-${101 + index}`,
      region: adm.area || adm.city || 'Delhi NCR & North Zone',
      password: adm.plainPassword || 'Admin@123',
      managedClientsCount: clientCount,
      status: 'Active',
      createdAt: adm.createdAt
    }));

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password, area, city, region, organization, customId } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and phone' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const passToUse = (password && password.trim()) || 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passToUse, salt);
    const adminCount = await User.countDocuments({ role: 'admin' });

    const newAdmin = await User.create({
      name,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      passwordHash,
      plainPassword: passToUse,
      organization: organization || `${name} Cafe Operations`,
      customId: customId || `ADM-${101 + adminCount}`,
      role: 'admin',
      area: region || area || 'Delhi NCR & North Zone',
      city: city || 'New Delhi',
      isVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        organization: newAdmin.organization,
        customId: newAdmin.customId,
        region: newAdmin.area || 'Delhi NCR & North Zone',
        password: newAdmin.plainPassword,
        managedClientsCount: await Client.countDocuments(),
        status: 'Active',
        createdAt: newAdmin.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, area, city, region, email, password, organization, customId } = req.body;

    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (phone) updateFields.phone = phone.trim();
    if (region || area) updateFields.area = (region || area).trim();
    if (city) updateFields.city = city.trim();
    if (organization !== undefined) updateFields.organization = organization.trim();
    if (customId) updateFields.customId = customId.trim();

    if (email && email.trim()) {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== admin.email) {
        const existing = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        updateFields.email = cleanEmail;
      }
    }

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateFields.passwordHash = await bcrypt.hash(password.trim(), salt);
      updateFields.plainPassword = password.trim();
    }

    const updated = await User.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        organization: updated.organization || `${updated.name} Cafe Operations`,
        customId: updated.customId || 'ADM-101',
        region: updated.area || 'Delhi NCR & North Zone',
        password: updated.plainPassword || (password ? password.trim() : 'Admin@123'),
        status: 'Active',
        createdAt: updated.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// 3. MANAGE CLIENTS (CAFES)
exports.getAllClients = async (req, res, next) => {
  try {
    await ensureDefaultClients();
    const clients = await Client.find().sort({ createdAt: -1 });

    const emails = clients.map((c) => c.email?.toLowerCase().trim()).filter(Boolean);
    const users = await User.find({ email: { $in: emails } });
    const userMap = {};
    users.forEach((u) => {
      userMap[u.email.toLowerCase()] = u;
    });

    const formatted = clients.map((c) => {
      const emailLower = c.email?.toLowerCase().trim();
      const matchedUser = userMap[emailLower];
      const pwd = c.plainPassword || matchedUser?.plainPassword || 'Admin@123';
      return {
        ...c.toObject(),
        password: pwd,
        plainPassword: pwd,
        clientUrl: '/client/orders'
      };
    });

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

exports.createClient = async (req, res, next) => {
  try {
    const { cafeName, ownerName, email, phone, city, address, plan, tablesCount, assignedAdminName, password } = req.body;
    if (!cafeName || !ownerName || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide cafeName, ownerName, email, and phone' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await Client.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A client with this email already exists' });
    }

    const passToUse = (password && password.trim()) || 'Admin@123';
    const client = await Client.create({
      cafeName,
      ownerName,
      email: cleanEmail,
      phone: phone.trim(),
      city: city || 'New Delhi',
      address: address || '',
      plan: plan || 'Growth',
      tablesCount: Number(tablesCount) || 8,
      assignedAdminName: assignedAdminName || 'Superadmin HQ',
      plainPassword: passToUse,
      status: 'Active'
    });

    // Also ensure login user exists
    let clientUser = await User.findOne({ email: cleanEmail });
    if (!clientUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(passToUse, salt);
      await User.create({
        name: ownerName || cafeName,
        email: cleanEmail,
        phone: phone.trim(),
        passwordHash,
        plainPassword: passToUse,
        role: 'client',
        isVerified: true
      });
    }

    res.status(201).json({
      success: true,
      message: 'Client cafe onboarded successfully',
      data: client
    });
  } catch (err) {
    next(err);
  }
};

exports.updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cafeName, ownerName, email, phone, city, address, plan, tablesCount, assignedAdminName, status, password } = req.body;

    const existingClient = await Client.findById(id);
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const oldEmail = existingClient.email?.toLowerCase().trim();
    const newEmail = email ? email.toLowerCase().trim() : oldEmail;

    if (newEmail !== oldEmail) {
      const emailTaken = await Client.findOne({ email: newEmail, _id: { $ne: id } });
      if (emailTaken) {
        return res.status(400).json({ success: false, message: 'A client with this email already exists' });
      }
    }

    const updateFields = { ...req.body };
    if (email) updateFields.email = newEmail;
    if (password && password.trim()) {
      updateFields.plainPassword = password.trim();
    }

    const updated = await Client.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });

    // Sync or update User account for this client so they can login at /client/login
    let clientUser = await User.findOne({
      $or: [
        { email: oldEmail },
        { email: newEmail }
      ]
    });

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password.trim(), salt);

      if (clientUser) {
        clientUser.email = newEmail;
        clientUser.passwordHash = passwordHash;
        clientUser.plainPassword = password.trim();
        clientUser.role = 'client';
        if (ownerName || cafeName) clientUser.name = ownerName || cafeName;
        if (phone) clientUser.phone = phone.trim();
        await clientUser.save();
      } else {
        await User.create({
          name: ownerName || cafeName || 'Cafe Client',
          email: newEmail,
          phone: phone ? phone.trim() : '+91 98765 00000',
          passwordHash,
          plainPassword: password.trim(),
          role: 'client',
          isVerified: true
        });
      }
    } else if (newEmail !== oldEmail && clientUser) {
      clientUser.email = newEmail;
      if (ownerName) clientUser.name = ownerName;
      if (phone) clientUser.phone = phone.trim();
      await clientUser.save();
    }

    const clientData = {
      ...updated.toObject(),
      password: updated.plainPassword || (password ? password.trim() : 'Admin@123'),
      plainPassword: updated.plainPassword || (password ? password.trim() : 'Admin@123')
    };

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: clientData
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleClientStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    client.status = client.status === 'Active' ? 'Suspended' : 'Active';
    await client.save();

    res.status(200).json({
      success: true,
      message: `Client status changed to ${client.status}`,
      data: client
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    await Client.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
