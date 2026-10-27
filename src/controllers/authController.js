const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const VerificationRecord = require('../models/VerificationRecord');
const Notification = require('../models/Notification');
const { getIO } = require('../sockets/socketHandler');
const { sendTokenResponse } = require('../utils/token');

// @desc    Register a new customer with table scan onboarding details
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, area, city, pincode, foodPreference, password, table } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and Mobile Number are required.'
      });
    }

    const userEmail = (email && email.trim()) ? email.trim().toLowerCase() : `${phone.trim()}@primecafe.local`;

    // Check if user already exists
    let existingUser = await User.findOne({
      $or: [{ email: userEmail }, { phone: phone.trim() }]
    });

    if (existingUser) {
      // Update details if customer is returning
      existingUser.name = name.trim();
      if (area) existingUser.area = area.trim();
      if (city) existingUser.city = city.trim();
      if (pincode) existingUser.pincode = pincode.trim();
      if (foodPreference) existingUser.foodPreference = foodPreference;
      if (table) existingUser.scannedTable = table.trim();
      existingUser.visitCount = (existingUser.visitCount || 1) + 1;
      existingUser.isVerified = true;
      await existingUser.save();

      // Emit real-time notification to management panel
      let notif = null;
      try {
        notif = await Notification.create({
          recipientRole: 'admin',
          type: 'customer_request',
          title: `👤 Guest Return Check-In: ${existingUser.name}`,
          message: `${existingUser.name} (+91 ${existingUser.phone}) checked in (Visit #${existingUser.visitCount})${table ? ` at ${table}` : ''}. Preference: ${existingUser.foodPreference}${existingUser.area ? ` | ${existingUser.area}` : ''}`,
          priority: 'normal',
          senderName: existingUser.name
        });
      } catch {}

      try {
        const io = getIO();
        if (io) {
          io.to('admin_room').emit('new_customer', existingUser);
          if (notif) {
            io.to('admin_room').emit('admin_notification', notif);
          }
        }
      } catch {}

      return sendTokenResponse(existingUser, 200, res, `Welcome back, ${existingUser.name}!`);
    }

    let passwordHash = undefined;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const user = await User.create({
      name: name.trim(),
      email: userEmail,
      phone: phone.trim(),
      area: area ? area.trim() : '',
      city: city ? city.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      foodPreference: foodPreference || 'Both',
      scannedTable: table ? table.trim() : '',
      visitCount: 1,
      passwordHash,
      role: 'customer',
      isVerified: true,
      rewardPoints: 50 // welcome bonus
    });

    // Create Admin Notification for new guest arrival
    let adminNotif = null;
    try {
      adminNotif = await Notification.create({
        recipientRole: 'admin',
        type: 'customer_request',
        title: `👤 New Guest Check-In: ${user.name}`,
        message: `${user.name} (+91 ${user.phone}) scanned QR and registered${user.scannedTable ? ` at ${user.scannedTable}` : ''}. Preference: ${user.foodPreference}${user.area ? ` | Locality: ${user.area}` : ''}`,
        priority: 'normal',
        senderName: user.name
      });
    } catch {}

    // Emit live WebSocket event to connected Management Panel admins
    try {
      const io = getIO();
      if (io) {
        io.to('admin_room').emit('new_customer', user);
        if (adminNotif) {
          io.to('admin_room').emit('admin_notification', adminNotif);
        }
      }
    } catch {}

    sendTokenResponse(user, 201, res, 'Registration successful. Welcome to The Prime Cafe!');
  } catch (err) {
    next(err);
  }
};

// @desc    Google Quick Sign-In / Registration
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res, next) => {
  try {
    const { name, email, phone, area, city, pincode, foodPreference, googleId, profileImage, credential, table } = req.body;

    let finalEmail = email;
    let finalName = name;
    let finalProfileImage = profileImage;
    let finalGoogleId = googleId;

    // Decode Google ID Token if passed from Google Identity Services
    if (credential) {
      try {
        const payloadBase64 = credential.split('.')[1];
        if (payloadBase64) {
          const decodedString = Buffer.from(payloadBase64, 'base64url').toString('utf8');
          const tokenPayload = JSON.parse(decodedString);
          if (tokenPayload.email) finalEmail = tokenPayload.email;
          if (tokenPayload.name) finalName = tokenPayload.name;
          if (tokenPayload.picture) finalProfileImage = tokenPayload.picture;
          if (tokenPayload.sub) finalGoogleId = tokenPayload.sub;
        }
      } catch (decodeErr) {
        console.error('Failed to parse Google credential token:', decodeErr);
      }
    }

    if (!finalEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for Google authentication.'
      });
    }

    finalEmail = finalEmail.toLowerCase().trim();

    let user = await User.findOne({
      $or: [
        { email: finalEmail },
        ...(phone && phone.trim() ? [{ phone: phone.trim() }] : [])
      ]
    });

    const scannedTable = table ? table.trim() : '';

    if (!user) {
      user = await User.create({
        name: finalName || 'Google Guest',
        email: finalEmail,
        phone: phone ? phone.trim() : '',
        area: area ? area.trim() : '',
        city: city ? city.trim() : '',
        pincode: pincode ? pincode.trim() : '',
        foodPreference: foodPreference || 'Both',
        profileImage: finalProfileImage || '',
        scannedTable,
        role: 'customer',
        isVerified: true,
        rewardPoints: 50,
        visitCount: 1
      });
    } else {
      if (finalName && (!user.name || user.name === 'Google Guest')) user.name = finalName;
      if (finalProfileImage) user.profileImage = finalProfileImage;
      if (phone && phone.trim()) user.phone = phone.trim();
      if (area && area.trim()) user.area = area.trim();
      if (city && city.trim()) user.city = city.trim();
      if (pincode && pincode.trim()) user.pincode = pincode.trim();
      if (foodPreference) user.foodPreference = foodPreference;
      if (scannedTable) user.scannedTable = scannedTable;
      user.isVerified = true;
      user.visitCount = (user.visitCount || 1) + 1;
      await user.save();
    }

    // Admin Notification for live guest arrival
    let adminNotif = null;
    try {
      adminNotif = await Notification.create({
        recipientRole: 'admin',
        type: 'customer_request',
        title: `👤 Guest Signed In via Google: ${user.name}`,
        message: `${user.name} (${user.email}) logged in with Google${user.scannedTable ? ` at ${user.scannedTable}` : ''}. Preference: ${user.foodPreference}`,
        priority: 'normal',
        senderName: user.name
      });
    } catch {}

    // Emit live WebSocket event
    try {
      const io = getIO();
      if (io) {
        io.to('admin_room').emit('new_customer', user);
        if (adminNotif) {
          io.to('admin_room').emit('admin_notification', adminNotif);
        }
      }
    } catch {}

    sendTokenResponse(user, 200, res, `Signed in with Google as ${user.name}!`);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user (Customer or Admin)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    
    // Fallback: If not yet in User collection, check Client collection
    if (!user) {
      const Client = require('../models/Client');
      const clientRecord = await Client.findOne({ email: email.toLowerCase().trim() });
      if (clientRecord) {
        const expectedPwd = clientRecord.plainPassword || 'Admin@123';
        if (password === expectedPwd) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(expectedPwd, salt);
          user = await User.create({
            name: clientRecord.ownerName || clientRecord.cafeName || 'Cafe Client',
            email: clientRecord.email.toLowerCase().trim(),
            phone: clientRecord.phone || '+91 98765 43210',
            passwordHash,
            plainPassword: expectedPwd,
            role: 'client',
            isVerified: true
          });
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'This account was registered via OTP/Google form. Please use OTP login or reset password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Portal-specific dynamic authorization
    if (portal) {
      const userEmail = user.email.toLowerCase();
      const superEmail = (process.env.SUPERADMIN_EMAIL || 'superadmin@aajkalcafe.com').toLowerCase();

      const Client = require('../models/Client');
      const isClientInDb = await Client.exists({ email: userEmail });

      const isSuper = user.role === 'superadmin' || userEmail === superEmail;
      const isAdmin = user.role === 'admin' || isSuper;
      const isClient = user.role === 'client' || !!isClientInDb || isAdmin || isSuper;

      if (portal === 'superadmin' && !isSuper) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only Superadmin accounts can log in through this portal.'
        });
      }
      if (portal === 'admin' && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only Territory Admin accounts can log in through this portal.'
        });
      }
      if (portal === 'client' && !isClient) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only Cafe Client accounts can log in through this portal.'
        });
      }
    }

    sendTokenResponse(user, 200, res, 'Logged in successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Customer OTP Request (Mocked/Safe for Cafe Table flow)
// @route   POST /api/auth/request-otp
// @access  Public
exports.requestOtp = async (req, res, next) => {
  try {
    const { phone, email, name, table } = req.body;
    const contact = (phone || email || '').trim();

    if (!contact) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number or email is required'
      });
    }

    // Generate 6 digit code (in dev we support fixed or simulated code for instant testing)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(otpCode, salt);

    // Save with 10 minutes expiry
    await VerificationRecord.create({
      contact,
      hashedCode,
      purpose: 'otp_login',
      metadata: { name: name || 'Cafe Guest', email, phone, table },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // In a production setup, SMS Gateway (Twilio/Fast2SMS) would be called here.
    // In development mode, provide simulated test code hint for seamless evaluation
    const isDev = process.env.NODE_ENV !== 'production';

    res.status(200).json({
      success: true,
      message: 'OTP has been generated. Please enter the 6-digit code.',
      devOtpHint: isDev ? otpCode : undefined
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify OTP and issue session
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { contact, code } = req.body;

    if (!contact || !code) {
      return res.status(400).json({
        success: false,
        message: 'Contact and verification code are required'
      });
    }

    const record = await VerificationRecord.findOne({
      contact: contact.trim(),
      purpose: 'otp_login'
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found or code expired. Please request a new OTP.'
      });
    }

    if (record.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    const isValid = await bcrypt.compare(code, record.hashedCode);
    if (!isValid) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check and retry.'
      });
    }

    // Clean up record
    await VerificationRecord.deleteOne({ _id: record._id });

    // Find or create customer
    let user = await User.findOne({
      $or: [{ phone: contact }, { email: contact.toLowerCase() }]
    });

    if (!user) {
      const isEmail = contact.includes('@');
      user = await User.create({
        name: record.metadata?.name || 'Cafe Guest',
        email: isEmail ? contact.toLowerCase() : `${contact}@primecafe.local`,
        phone: isEmail ? (record.metadata?.phone || '9999999999') : contact,
        role: 'customer',
        isVerified: true,
        rewardPoints: 50
      });
    } else {
      user.isVerified = true;
      await user.save();
    }

    sendTokenResponse(user, 200, res, 'Verification successful. Welcome!');
  } catch (err) {
    next(err);
  }
};

// @desc    Google Form Webhook / Verification endpoint
// @route   POST /api/auth/google-form-callback
// @access  Public (Secret header protected)
exports.googleFormCallback = async (req, res, next) => {
  try {
    const formSecret = req.headers['x-google-form-secret'];
    const expectedSecret = process.env.GOOGLE_FORM_VERIFICATION_SECRET;

    if (expectedSecret && formSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook verification secret'
      });
    }

    const { name, email, phone, table } = req.body;
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer phone or email required in form submission payload'
      });
    }

    // Create a verified record or update existing user
    let user = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(phone ? [{ phone }] : [])
      ]
    });

    if (!user) {
      user = await User.create({
        name: name || 'Cafe Guest',
        email: email ? email.toLowerCase() : `${phone}@primecafe.local`,
        phone: phone || '9999999999',
        role: 'customer',
        isVerified: true,
        rewardPoints: 50
      });
    } else {
      user.isVerified = true;
      if (name) user.name = name;
      await user.save();
    }

    // Generate a secure one-time verification token that customer's browser can redeem
    const claimToken = crypto.randomBytes(24).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedClaim = await bcrypt.hash(claimToken, salt);

    await VerificationRecord.create({
      contact: email ? email.toLowerCase() : phone,
      hashedCode: hashedClaim,
      purpose: 'google_form_verify',
      metadata: { userId: user._id.toString(), table },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    res.status(200).json({
      success: true,
      message: 'Google Form submission recorded and verified.',
      claimToken,
      contact: email || phone
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Redeem Google Form claim token
// @route   POST /api/auth/claim-form-session
// @access  Public
exports.claimFormSession = async (req, res, next) => {
  try {
    const { contact, claimToken } = req.body;
    if (!contact || !claimToken) {
      return res.status(400).json({
        success: false,
        message: 'Contact and claim token are required'
      });
    }

    const record = await VerificationRecord.findOne({
      contact: contact.trim(),
      purpose: 'google_form_verify'
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Form submission not found or expired. Please submit form or use OTP login.'
      });
    }

    const isValid = await bcrypt.compare(claimToken, record.hashedCode);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid claim token.'
      });
    }

    const user = await User.findById(record.metadata.userId);
    await VerificationRecord.deleteOne({ _id: record._id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found' });
    }

    sendTokenResponse(user, 200, res, 'Google Form verified successfully!');
  } catch (err) {
    next(err);
  }
};

// @desc    Get Current Logged in User
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
};
