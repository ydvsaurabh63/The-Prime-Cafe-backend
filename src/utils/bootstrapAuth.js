const bcrypt = require('bcryptjs');
const User = require('../models/User');

const bootstrapAccount = async ({ email, password, name, role, area, city, phone }) => {
  if (!email || !password) return;
  const cleanEmail = email.trim().toLowerCase();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password.trim(), salt);

  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = role;
    existing.isVerified = true;
    if (name) existing.name = name;
    if (area) existing.area = area;
    if (city) existing.city = city;
    await existing.save();
    console.log(`[Auth Bootstrapper] Synced ${role} account: ${cleanEmail}`);
  } else {
    await User.create({
      name: name || 'Admin User',
      email: cleanEmail,
      phone: phone || '+91 98112 00000',
      passwordHash,
      role,
      area: area || 'Delhi NCR',
      city: city || 'New Delhi',
      isVerified: true
    });
    console.log(`[Auth Bootstrapper] Created ${role} account: ${cleanEmail}`);
  }
};

const ensureEnvAccounts = async () => {
  try {
    // 1. Superadmin from .env
    const superEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@aajkalcafe.com';
    const superPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';
    await bootstrapAccount({
      email: superEmail,
      password: superPassword,
      name: 'Superadmin HQ',
      role: 'superadmin',
      area: 'National HQ',
      city: 'New Delhi',
      phone: '+91 98000 11111'
    });

    // 2. Admin (Territory Admin) from .env
    const adminEmail = process.env.ADMIN_EMAIL || 'amit.sharma@aajkalcafe.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    await bootstrapAccount({
      email: adminEmail,
      password: adminPassword,
      name: 'Amit Sharma',
      role: 'admin',
      area: 'Delhi NCR',
      city: 'New Delhi',
      phone: '+91 98112 34567'
    });

    // 3. Client (The Prime Cafe) from .env
    const clientEmail = process.env.CLIENT_EMAIL || 'admin@theprimecafe.com';
    const clientPassword = process.env.CLIENT_PASSWORD || 'Admin@123';
    await bootstrapAccount({
      email: clientEmail,
      password: clientPassword,
      name: 'The Prime Cafe Admin',
      role: 'admin',
      area: 'Connaught Place',
      city: 'New Delhi',
      phone: '+91 98765 43210'
    });
  } catch (err) {
    console.error('[Auth Bootstrapper] Error syncing env accounts:', err.message);
  }
};

module.exports = { ensureEnvAccounts };
