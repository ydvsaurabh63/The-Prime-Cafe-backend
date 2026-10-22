const { uploadStream, uploadBase64, deleteResource } = require('../services/cloudinaryService');

/**
 * Handle single file/image/video upload
 */
const uploadSingle = async (req, res, next) => {
  try {
    const folder = req.body.folder || 'aaj_kal_cafe';
    const resourceType = req.body.resource_type || 'auto';

    let result;

    if (req.file) {
      // Upload from multipart file buffer (image or video)
      result = await uploadStream(req.file.buffer, {
        folder,
        resource_type: resourceType
      });
    } else if (req.body.data || req.body.image || req.body.video) {
      // Upload from base64 string or URL
      const dataString = req.body.data || req.body.image || req.body.video;
      result = await uploadBase64(dataString, {
        folder,
        resource_type: resourceType
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file or data provided for upload'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        duration: result.duration || null,
        width: result.width || null,
        height: result.height || null
      }
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload media to Cloudinary'
    });
  }
};

/**
 * Handle multiple files upload
 */
const uploadMultiple = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided for upload'
      });
    }

    const folder = req.body.folder || 'aaj_kal_cafe';
    const uploadPromises = req.files.map((file) =>
      uploadStream(file.buffer, {
        folder,
        resource_type: 'auto'
      })
    );

    const results = await Promise.all(uploadPromises);

    const uploadedData = results.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes
    }));

    return res.status(200).json({
      success: true,
      message: `${uploadedData.length} files uploaded successfully`,
      data: uploadedData
    });
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload multiple files'
    });
  }
};

/**
 * Delete a media file from Cloudinary
 */
const removeMedia = async (req, res, next) => {
  try {
    const { publicId, resourceType = 'image' } = req.body;
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'publicId is required for deletion'
      });
    }

    const result = await deleteResource(publicId, resourceType);
    return res.status(200).json({
      success: true,
      message: 'Resource removed successfully',
      result
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete resource'
    });
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  removeMedia
};
