const mongoose = require('mongoose');
const dns = require('dns');

// Set reliable DNS servers to avoid querySrv ECONNREFUSED on Windows with MongoDB Atlas (+srv)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not permitted
}

const { ensureEnvAccounts } = require('../utils/bootstrapAuth');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aaj_kal_cafe');
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    await ensureEnvAccounts();
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
