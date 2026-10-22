const cloudinary = require('../config/cloudinary');
const streamifier = require('stream');

/**
 * Upload a file buffer directly to Cloudinary via upload_stream
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Cloudinary options (folder, resource_type, etc.)
 * @returns {Promise<Object>} Cloudinary upload response
 */
const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: 'aaj_kal_cafe',
      resource_type: 'auto', // Automatically detects image, video, audio, etc.
      ...options
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });

    // Pass the buffer into the stream
    const readable = new streamifier.Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

/**
 * Upload a Base64 string or remote URL directly to Cloudinary
 * @param {string} fileStr - Data URI or URL
 * @param {Object} options - Cloudinary options
 * @returns {Promise<Object>}
 */
const uploadBase64 = async (fileStr, options = {}) => {
  const uploadOptions = {
    folder: 'aaj_kal_cafe',
    resource_type: 'auto',
    ...options
  };
  return await cloudinary.uploader.upload(fileStr, uploadOptions);
};

/**
 * Delete a file from Cloudinary by publicId
 * @param {string} publicId
 * @param {string} resourceType - 'image', 'video', or 'raw' (default: 'image')
 * @returns {Promise<Object>}
 */
const deleteResource = async (publicId, resourceType = 'image') => {
  return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = {
  uploadStream,
  uploadBase64,
  deleteResource
};
