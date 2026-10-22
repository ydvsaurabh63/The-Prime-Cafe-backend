const multer = require('multer');

// Store files in memory buffer so we can stream directly to Cloudinary
const storage = multer.memoryStorage();

// Allowed file types for Images and Videos
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-matroska', // .mkv
    'video/mpeg'
  ];

  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only images and videos are allowed.`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024 // 60MB max file size (suitable for videos and HD images)
  },
  fileFilter
});

module.exports = upload;
