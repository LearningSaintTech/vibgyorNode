const User = require('../userModel/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const { uploadBuffer } = require('../../services/s3Service');
const { uploadSingle } = require('../../middleware/uploadMiddleware');

// Upload profile picture
async function uploadProfilePicture(req, res) {
	try {
		console.log('[USER][UPLOAD] uploadProfilePicture');
		
		// Use multer middleware
		uploadSingle(req, res, async (err) => {
			if (err) {
				console.error('[USER][UPLOAD] Multer error:', err.message);
				return ApiResponse.badRequest(res, err.message);
			}

			if (!req.file) {
				return ApiResponse.badRequest(res, 'No file uploaded');
			}

			try {
				const user = await User.findById(req.user?.userId);
				if (!user) return ApiResponse.notFound(res, 'User not found');

				// Upload to S3
				const { buffer, originalname, mimetype } = req.file;
				const uploadResult = await uploadBuffer({
					buffer,
					contentType: mimetype,
					userId: user._id,
					category: 'profile',
					type: 'images',
					filename: originalname,
					metadata: {
						uploadType: 'profile-picture',
						userId: String(user._id),
						originalName: originalname
					}
				});

				// Update user profile with new URL
				user.profilePictureUrl = uploadResult.url;
				await user.save();

				console.log('[USER][UPLOAD] Profile picture uploaded successfully:', uploadResult.url);

				return ApiResponse.success(res, {
					url: uploadResult.url,
					key: uploadResult.key,
					filename: originalname
				}, 'Profile picture uploaded successfully');

			} catch (uploadError) {
				console.error('[USER][UPLOAD] Upload error:', uploadError.message);
				return ApiResponse.serverError(res, 'Failed to upload profile picture');
			}
		});

	} catch (e) {
		console.error('[USER][UPLOAD] uploadProfilePicture error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to upload profile picture');
	}
}

// Upload ID proof document
async function uploadIdProof(req, res) {
	try {
		console.log('[USER][UPLOAD] uploadIdProof');
		
		// Use multer middleware
		uploadSingle(req, res, async (err) => {
			if (err) {
				console.error('[USER][UPLOAD] Multer error:', err.message);
				return ApiResponse.badRequest(res, err.message);
			}

			if (!req.file) {
				return ApiResponse.badRequest(res, 'No file uploaded');
			}

			try {
				const user = await User.findById(req.user?.userId);
				if (!user) return ApiResponse.notFound(res, 'User not found');

				const { documentType } = req.body || {};
				if (!documentType) {
					return ApiResponse.badRequest(res, 'Document type is required (e.g., id_proof, passport, driving_license)');
				}

				// Upload to S3
				const { buffer, originalname, mimetype } = req.file;
				const uploadResult = await uploadBuffer({
					buffer,
					contentType: mimetype,
					userId: user._id,
					category: 'verification',
					type: 'documents',
					filename: originalname,
					metadata: {
						uploadType: 'id-proof',
						documentType: documentType,
						userId: String(user._id),
						originalName: originalname
					}
				});

				// Update user verification document info
				user.verificationDocument.documentType = documentType;
				user.verificationDocument.documentUrl = uploadResult.url;
				user.verificationDocument.documentNumber = req.body.documentNumber || '';
				user.verificationDocument.uploadedAt = new Date();
				user.verificationStatus = 'pending'; // Set status to pending for review
				await user.save();

				console.log('[USER][UPLOAD] ID proof uploaded successfully:', uploadResult.url);

				return ApiResponse.success(res, {
					url: uploadResult.url,
					key: uploadResult.key,
					filename: originalname,
					documentType: documentType,
					verificationStatus: user.verificationStatus
				}, 'ID proof uploaded successfully');

			} catch (uploadError) {
				console.error('[USER][UPLOAD] Upload error:', uploadError.message);
				return ApiResponse.serverError(res, 'Failed to upload ID proof');
			}
		});

	} catch (e) {
		console.error('[USER][UPLOAD] uploadIdProof error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to upload ID proof');
	}
}

module.exports = {
	uploadProfilePicture,
	uploadIdProof
};
