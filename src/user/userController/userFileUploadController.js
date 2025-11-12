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

				const { buffer, originalname, mimetype } = req.file;
				
				// Check if S3 is configured
				const BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
				if (!BUCKET) {
					console.log('[USER][UPLOAD] S3 not configured, using fallback URL');
					// Fallback: Generate a placeholder URL or use a default avatar service
					const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user._id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
					
					// Update user profile with fallback URL
					user.profilePictureUrl = fallbackUrl;
					await user.save();

					console.log('[USER][UPLOAD] Profile picture set to fallback URL:', fallbackUrl);

					return ApiResponse.success(res, {
						url: fallbackUrl,
						key: 'fallback',
						filename: originalname,
						message: 'S3 not configured, using fallback avatar'
					}, 'Profile picture updated successfully (fallback mode)');
				}

				// Upload to S3 if configured
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
				
				// Fallback on S3 error
				try {
					const user = await User.findById(req.user?.userId);
					if (user) {
						const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user._id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
						user.profilePictureUrl = fallbackUrl;
						await user.save();
						
						return ApiResponse.success(res, {
							url: fallbackUrl,
							key: 'fallback',
							filename: req.file?.originalname || 'unknown',
							message: 'S3 upload failed, using fallback avatar'
						}, 'Profile picture updated (fallback mode)');
					}
				} catch (fallbackError) {
					console.error('[USER][UPLOAD] Fallback error:', fallbackError.message);
				}
				
				return ApiResponse.serverError(res, 'Failed to upload profile picture');
			}
		});

	} catch (e) {
		console.error('[USER][UPLOAD] uploadProfilePicture error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to upload profile picture');
	}
}

// Upload ID proof document (supports multiple images like Aadhar front & back)
async function uploadIdProof(req, res) {
	try {
		console.log('[USER][UPLOAD] uploadIdProof - Multiple files');
		
		// Create multer middleware for multiple files
		const multer = require('multer');
		const storage = multer.memoryStorage();
		
		const ACCEPTED_MIME = [
			'image/jpeg', 'image/png', 'image/webp', 'image/gif',
			'application/pdf'
		];
		
		const fileFilter = (req, file, cb) => {
			if (!ACCEPTED_MIME.includes(file.mimetype)) {
				return cb(new Error('Unsupported file type. Only images and PDF allowed.'));
			}
			cb(null, true);
		};
		
		// Configure multer for multiple files with field name 'file'
		const uploadMultipleFiles = multer({ 
			storage, 
			fileFilter, 
			limits: { 
				fileSize: 10 * 1024 * 1024, // 10MB per file
				files: 10 // Max 10 files
			} 
		}).array('file', 10); // Using 'file' as field name (not 'files')
		
		// Use multer middleware
		uploadMultipleFiles(req, res, async (err) => {
			if (err) {
				console.error('[USER][UPLOAD] Multer error:', err.message);
				return ApiResponse.badRequest(res, err.message);
			}

			if (!req.files || req.files.length === 0) {
				return ApiResponse.badRequest(res, 'No files uploaded. Please upload at least one file.');
			}

			try {
				const user = await User.findById(req.user?.userId);
				if (!user) return ApiResponse.notFound(res, 'User not found');

				const { documentType } = req.body || {};
				if (!documentType) {
					return ApiResponse.badRequest(res, 'Document type is required (e.g., id_proof, passport, driving_license)');
				}

				console.log('[USER][UPLOAD] Uploading', req.files.length, 'file(s) to S3');

				// Upload all files to S3
				const uploadedUrls = [];
				const uploadedKeys = [];
				const uploadedFilenames = [];

				for (const file of req.files) {
					const { buffer, originalname, mimetype } = file;
					
					console.log('[USER][UPLOAD] Processing file:', originalname);
					
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

					uploadedUrls.push(uploadResult.url);
					uploadedKeys.push(uploadResult.key);
					uploadedFilenames.push(originalname);
				}

				// Update user verification document info
				user.verificationDocument.documentType = documentType;
				user.verificationDocument.documentUrls = uploadedUrls; // Store all URLs
				user.verificationDocument.documentUrl = uploadedUrls[0]; // Store first URL for backward compatibility
				user.verificationDocument.documentNumber = req.body.documentNumber || '';
				user.verificationDocument.uploadedAt = new Date();
				user.verificationStatus = 'pending'; // Set status to pending for review
				await user.save();

				console.log('[USER][UPLOAD] ID proof uploaded successfully:', {
					count: uploadedUrls.length,
					firstUrl: uploadedUrls[0]
				});

				return ApiResponse.success(res, {
					urls: uploadedUrls,
					keys: uploadedKeys,
					filenames: uploadedFilenames,
					totalFiles: uploadedUrls.length,
					documentType: documentType,
					verificationStatus: user.verificationStatus
				}, `${uploadedUrls.length} ID proof document(s) uploaded successfully`);

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
