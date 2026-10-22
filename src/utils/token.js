const jwt = require('jsonwebtoken');

// Sign JWT Token
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'super_secret_aaj_kal_cafe_jwt_key_2026_modern',
    { expiresIn: '30d' }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rewardPoints: user.rewardPoints || 0,
        profileImage: user.profileImage || '',
        area: user.area || '',
        city: user.city || '',
        pincode: user.pincode || '',
        foodPreference: user.foodPreference || 'Both',
        isVerified: user.isVerified || false,
        createdAt: user.createdAt
      }
    });
};

module.exports = { sendTokenResponse };
