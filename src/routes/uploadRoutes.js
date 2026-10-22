const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { uploadSingle, uploadMultiple, removeMedia } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// Allow single image/video upload:
// Can be called with form-data (field name: 'file') OR json payload ({ data: 'base64...' })
router.post('/', upload.single('file'), uploadSingle);

// Batch upload for multiple images/videos (up to 10 files at once, field name: 'files')
router.post('/multiple', upload.array('files', 10), uploadMultiple);

// Delete resource (protected for safety)
router.delete('/', protect, removeMedia);

module.exports = router;
