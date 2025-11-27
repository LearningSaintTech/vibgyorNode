const User = require('../model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');
const { uploadBuffer, uploadToS3, deleteFromS3 } = require('../../../services/s3Service');
const { uploadSingle } = require('../../../middleware/uploadMiddleware');
const multer = require('multer');

// Upload profile picture
async function uploadProfilePicture(req, res) {
	console.log("=== PROFILE PICTURE UPLOAD START ===");
	console.log("[DEBUG] Full req.headers:", {
		'content-type': req.headers['content-type'],
		'content-length': req.headers['content-length'],
		authorization: req.headers.authorization ? '[REDACTED]' : 'missing',
		userAgent: req.get('User-Agent')
	}); 
	console.log("[DEBUG] Authenticated user ID:", req.user?.userId);

	uploadSingle(req, res, async (err) => {
		if (err) {
			console.error("MULTER ERROR:", err.message);
			return ApiResponse.badRequest(res, err.message);
		}

		console.log("MULTER PARSED SUCCESSFULLY");
		console.log("[DEBUG] req.file exists:", !!req.file);
		if (req.file) {
			console.log("UPLOADED FILE DETAILS:", {
				fieldname: req.file.fieldname,
				originalname: req.file.originalname,
				mimetype: req.file.mimetype,
				size: req.file.size + " bytes",
				sizeKB: (req.file.size / 1024).toFixed(2) + " KB",
				bufferLength: req.file.buffer?.length,
				first16BytesHex: req.file.buffer || 'N/A'
			});
		} else {
			console.warn("NO FILE RECEIVED IN req.file");
			return ApiResponse.badRequest(res, 'No file uploaded');
		}

		try {
			const user = await User.findById(req.user?.userId);
			console.log("[DB] User found:", user ? `${user.name} (${user._id})` : 'NOT FOUND');

			const { buffer, originalname, mimetype } = req.file;

			// S3 Upload Debug
			console.log("PREPARING S3 UPLOAD...");
			console.log("S3 Payload being sent:", {
				bucket: process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME,
				contentType: mimetype,
				userId: user._id,
				category: 'profile',
				filename: originalname,
				fileSize: buffer.length + " bytes",
				metadata: {
					uploadType: 'profile-picture',
					userId: String(user._id),
					originalName: originalname
				}
			});

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

			console.log("S3 UPLOAD SUCCESS!");
			console.log("S3 Result → URL:", uploadResult.url);
			console.log("S3 Result → Key:", uploadResult.key);

			user.profilePictureUrl = uploadResult.url;
			await user.save();

			return ApiResponse.success(res, {
				url: uploadResult.url,
				key: uploadResult.key,
				filename: originalname
			}, 'Profile picture uploaded successfully');

		} catch (uploadError) {
			console.error("S3 OR DB ERROR:", uploadError.message);
			console.error(uploadError.stack);
			// fallback logic...
		}
	});
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

// Multer configuration for dating media
const storage = multer.memoryStorage();

const ACCEPTED_IMAGE_MIME = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'image/gif'
];

const ACCEPTED_VIDEO_MIME = [
	'video/mp4',
	'video/quicktime',
	'video/mov',
	'video/avi',
	'video/webm'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_PHOTOS = 5;
const MAX_VIDEOS = 5;

// File filter for photos
const photoFilter = (req, file, cb) => {
	if (!ACCEPTED_IMAGE_MIME.includes(file.mimetype)) {
		return cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF)'));
	}
	cb(null, true);
};

// File filter for videos
const videoFilter = (req, file, cb) => {
	if (!ACCEPTED_VIDEO_MIME.includes(file.mimetype)) {
		return cb(new Error('Only video files are allowed (MP4, MOV, AVI, WebM)'));
	}
	cb(null, true);
};

// Multer middleware for photos
const uploadPhotos = multer({
	storage,
	fileFilter: photoFilter,
	limits: {
		fileSize: MAX_FILE_SIZE,
		files: MAX_PHOTOS
	}
}).array('photos', MAX_PHOTOS);

// Multer middleware for videos
const uploadVideos = multer({
	storage,
	fileFilter: videoFilter,
	limits: {
		fileSize: MAX_FILE_SIZE,
		files: MAX_VIDEOS
	}
}).array('videos', MAX_VIDEOS);

// Multer middleware for single photo (for update)
const uploadSinglePhoto = multer({
	storage,
	fileFilter: photoFilter,
	limits: {
		fileSize: MAX_FILE_SIZE
	}
}).single('photo');

// Multer middleware for single video (for update)
const uploadSingleVideo = multer({
	storage,
	fileFilter: videoFilter,
	limits: {
		fileSize: MAX_FILE_SIZE
	}
}).single('video');

/**
 * Upload dating profile photos (1-5 photos)
 */
async function uploadDatingPhotos(req, res) {
	try {
		console.log('[USER][UPLOAD] uploadDatingPhotos');

		uploadPhotos(req, res, async (err) => {
			if (err) {
				console.error('[USER][UPLOAD] Multer error:', err.message);
				return ApiResponse.badRequest(res, err.message);
			}

			if (!req.files || req.files.length === 0) {
				return ApiResponse.badRequest(res, 'No photos uploaded. Please upload at least 1 photo (max 5).');
			}

			if (req.files.length > MAX_PHOTOS) {
				return ApiResponse.badRequest(res, `Maximum ${MAX_PHOTOS} photos allowed`);
			}

			try {
				const user = await User.findById(req.user?.userId);
				if (!user) {
					return ApiResponse.notFound(res, 'User not found');
				}

				// Check existing photos count
				const existingPhotosCount = user.dating?.photos?.length || 0;
				const totalPhotos = existingPhotosCount + req.files.length;

				if (totalPhotos > MAX_PHOTOS) {
					return ApiResponse.badRequest(
						res,
						`You can only have ${MAX_PHOTOS} photos total. You currently have ${existingPhotosCount} photo(s).`
					);
				}

				console.log(`[USER][UPLOAD] Uploading ${req.files.length} photo(s) to S3`);

				// Upload all photos to S3
				const uploadedPhotos = [];

				for (let i = 0; i < req.files.length; i++) {
					const file = req.files[i];
					const { buffer, originalname, mimetype } = file;

					console.log(`[USER][UPLOAD] Processing photo ${i + 1}/${req.files.length}:`, originalname);

					// Upload to S3
					const uploadResult = await uploadToS3({
						buffer,
						contentType: mimetype,
						userId: user._id,
						category: 'dating',
						type: 'images',
						filename: originalname,
						metadata: {
							uploadType: 'dating-photo',
							userId: String(user._id),
							originalName: originalname,
							order: existingPhotosCount + i
						}
					});

					// For images, thumbnail is same as URL (can be enhanced later with image processing)
					const photoData = {
						url: uploadResult.url,
						thumbnailUrl: uploadResult.url,
						order: existingPhotosCount + i,
						uploadedAt: new Date()
					};

					// Add photo to user's dating profile
					await user.addDatingPhoto(photoData);
					uploadedPhotos.push({
						url: photoData.url,
						thumbnailUrl: photoData.thumbnailUrl,
						order: photoData.order,
						uploadedAt: photoData.uploadedAt
					});
				}

				// Refresh user to get updated data
				await user.save();
				const updatedUser = await User.findById(user._id);
				const datingProfile = updatedUser.getDatingProfile();

				console.log(`[USER][UPLOAD] ${req.files.length} photo(s) uploaded successfully`);

				return ApiResponse.success(
					res,
					{
						photos: uploadedPhotos,
						totalPhotos: datingProfile.photos.length,
						datingProfile: datingProfile
					},
					`${req.files.length} photo(s) uploaded successfully`
				);

			} catch (uploadError) {
				console.error('[USER][UPLOAD] Upload error:', uploadError.message);
				return ApiResponse.serverError(res, `Failed to upload photos: ${uploadError.message}`);
			}
		});

	} catch (e) {
		console.error('[USER][UPLOAD] uploadDatingPhotos error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to upload dating photos');
	}
}

/**
 * Upload dating profile videos (1-5 videos)
 */
async function uploadDatingVideos(req, res) {
	try {
		console.log('[USER][UPLOAD] uploadDatingVideos');

		uploadVideos(req, res, async (err) => {
			if (err) {
				console.error('[USER][UPLOAD] Multer error:', err.message);
				return ApiResponse.badRequest(res, err.message);
			}

			if (!req.files || req.files.length === 0) {
				return ApiResponse.badRequest(res, 'No videos uploaded. Please upload at least 1 video (max 5).');
			}

			if (req.files.length > MAX_VIDEOS) {
				return ApiResponse.badRequest(res, `Maximum ${MAX_VIDEOS} videos allowed`);
			}

			try {
				const user = await User.findById(req.user?.userId);
				if (!user) {
					return ApiResponse.notFound(res, 'User not found');
				}

				// Check existing videos count
				const existingVideosCount = user.dating?.videos?.length || 0;
				const totalVideos = existingVideosCount + req.files.length;

				if (totalVideos > MAX_VIDEOS) {
					return ApiResponse.badRequest(
						res,
						`You can only have ${MAX_VIDEOS} videos total. You currently have ${existingVideosCount} video(s).`
					);
				}

				console.log(`[USER][UPLOAD] Uploading ${req.files.length} video(s) to S3`);

				// Upload all videos to S3
				const uploadedVideos = [];

				for (let i = 0; i < req.files.length; i++) {
					const file = req.files[i];
					const { buffer, originalname, mimetype } = file;

					console.log(`[USER][UPLOAD] Processing video ${i + 1}/${req.files.length}:`, originalname);

					// Upload to S3
					const uploadResult = await uploadToS3({
						buffer,
						contentType: mimetype,
						userId: user._id,
						category: 'dating',
						type: 'videos',
						filename: originalname,
						metadata: {
							uploadType: 'dating-video',
							userId: String(user._id),
							originalName: originalname,
							order: existingVideosCount + i
						}
					});

					// Extract duration from request body if provided (client should send this)
					const durations = req.body.durations ? (Array.isArray(req.body.durations) ? req.body.durations : [req.body.durations]) : [];
					const duration = durations[i] ? parseFloat(durations[i]) : 0;

					const videoData = {
						url: uploadResult.url,
						thumbnailUrl: uploadResult.url,
						duration: duration,
						order: existingVideosCount + i,
						uploadedAt: new Date()
					};

					// Add video to user's dating profile
					await user.addDatingVideo(videoData);
					uploadedVideos.push({
						url: videoData.url,
						thumbnailUrl: videoData.thumbnailUrl,
						duration: videoData.duration,
						order: videoData.order,
						uploadedAt: videoData.uploadedAt
					});
				}

				// Refresh user to get updated data
				await user.save();
				const updatedUser = await User.findById(user._id);
				const datingProfile = updatedUser.getDatingProfile();

				console.log(`[USER][UPLOAD] ${req.files.length} video(s) uploaded successfully`);

				return ApiResponse.success(
					res,
					{
						videos: uploadedVideos,
						totalVideos: datingProfile.videos.length,
						datingProfile: datingProfile
					},
					`${req.files.length} video(s) uploaded successfully`
				);

			} catch (uploadError) {
				console.error('[USER][UPLOAD] Upload error:', uploadError.message);
				return ApiResponse.serverError(res, `Failed to upload videos: ${uploadError.message}`);
			}
		});

	} catch (e) {
		console.error('[USER][UPLOAD] uploadDatingVideos error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to upload dating videos');
	}
}

/**
 * Update dating photo by index (replace existing photo)
 */
async function updateDatingPhoto(req, res) {
	try {
		console.log('[USER][UPLOAD] updateDatingPhoto');

		const { photoIndex } = req.params;
		const index = parseInt(photoIndex, 10);

		if (isNaN(index) || index < 0) {
			return ApiResponse.badRequest(res, 'Invalid photo index');
		}

		uploadSinglePhoto(req, res, async (err) => {
			if (err) {
				console.error('[USER][UPLOAD] Multer error:', err.message);
				return ApiResponse.badRequest(res, err.message);
			}

			if (!req.file) {
				return ApiResponse.badRequest(res, 'No photo uploaded');
			}

			try {
				const user = await User.findById(req.user?.userId);
				if (!user) {
					return ApiResponse.notFound(res, 'User not found');
				}

				if (!user.dating || !user.dating.photos || index >= user.dating.photos.length) {
					return ApiResponse.badRequest(res, 'Photo not found at the specified index');
				}

				const existingPhoto = user.dating.photos[index];

				// Delete old photo from S3
				if (existingPhoto.url) {
					try {
						const urlObj = new URL(existingPhoto.url);
						const pathParts = urlObj.pathname.split('/').filter(part => part);
						const key = pathParts.join('/');
						if (key) {
							await deleteFromS3(key);
							console.log(`[USER][UPLOAD] Deleted old photo from S3: ${key}`);
						}
					} catch (deleteError) {
						console.error('[USER][UPLOAD] Error deleting old photo from S3:', deleteError.message);
					}
				}

				// Upload new photo to S3
				const { buffer, originalname, mimetype } = req.file;
				const uploadResult = await uploadToS3({
					buffer,
					contentType: mimetype,
					userId: user._id,
					category: 'dating',
					type: 'images',
					filename: originalname,
					metadata: {
						uploadType: 'dating-photo-update',
						userId: String(user._id),
						originalName: originalname,
						photoIndex: index
					}
				});

				// Update photo in user's dating profile
				user.dating.photos[index].url = uploadResult.url;
				user.dating.photos[index].thumbnailUrl = uploadResult.url;
				user.dating.photos[index].uploadedAt = new Date();
				user.dating.lastUpdatedAt = new Date();

				await user.save();

				const updatedUser = await User.findById(user._id);
				const datingProfile = updatedUser.getDatingProfile();

				console.log(`[USER][UPLOAD] Photo at index ${index} updated successfully`);

				return ApiResponse.success(
					res,
					{
						photo: datingProfile.photos[index],
						datingProfile: datingProfile
					},
					'Photo updated successfully'
				);

			} catch (uploadError) {
				console.error('[USER][UPLOAD] Upload error:', uploadError.message);
				return ApiResponse.serverError(res, `Failed to update photo: ${uploadError.message}`);
			}
		});

	} catch (e) {
		console.error('[USER][UPLOAD] updateDatingPhoto error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update dating photo');
	}
}

/**
 * Update dating video by index (replace existing video)
 */
async function updateDatingVideo(req, res) {
	try {
		console.log('[USER][UPLOAD] updateDatingVideo');

		const { videoIndex } = req.params;
		const index = parseInt(videoIndex, 10);

		if (isNaN(index) || index < 0) {
			return ApiResponse.badRequest(res, 'Invalid video index');
		}

		uploadSingleVideo(req, res, async (err) => {
			if (err) {
				console.error('[USER][UPLOAD] Multer error:', err.message);
				return ApiResponse.badRequest(res, err.message);
			}

			if (!req.file) {
				return ApiResponse.badRequest(res, 'No video uploaded');
			}

			try {
				const user = await User.findById(req.user?.userId);
				if (!user) {
					return ApiResponse.notFound(res, 'User not found');
				}

				if (!user.dating || !user.dating.videos || index >= user.dating.videos.length) {
					return ApiResponse.badRequest(res, 'Video not found at the specified index');
				}

				const existingVideo = user.dating.videos[index];

				// Delete old video from S3
				if (existingVideo.url) {
					try {
						const urlObj = new URL(existingVideo.url);
						const pathParts = urlObj.pathname.split('/').filter(part => part);
						const key = pathParts.join('/');
						if (key) {
							await deleteFromS3(key);
							console.log(`[USER][UPLOAD] Deleted old video from S3: ${key}`);
						}
					} catch (deleteError) {
						console.error('[USER][UPLOAD] Error deleting old video from S3:', deleteError.message);
					}
				}

				// Upload new video to S3
				const { buffer, originalname, mimetype } = req.file;
				const uploadResult = await uploadToS3({
					buffer,
					contentType: mimetype,
					userId: user._id,
					category: 'dating',
					type: 'videos',
					filename: originalname,
					metadata: {
						uploadType: 'dating-video-update',
						userId: String(user._id),
						originalName: originalname,
						videoIndex: index
					}
				});

				// Extract duration from request body if provided
				const duration = req.body.duration ? parseFloat(req.body.duration) : existingVideo.duration || 0;

				// Update video in user's dating profile
				user.dating.videos[index].url = uploadResult.url;
				user.dating.videos[index].thumbnailUrl = uploadResult.url;
				user.dating.videos[index].duration = duration;
				user.dating.videos[index].uploadedAt = new Date();
				user.dating.lastUpdatedAt = new Date();

				await user.save();

				const updatedUser = await User.findById(user._id);
				const datingProfile = updatedUser.getDatingProfile();

				console.log(`[USER][UPLOAD] Video at index ${index} updated successfully`);

				return ApiResponse.success(
					res,
					{
						video: datingProfile.videos[index],
						datingProfile: datingProfile
					},
					'Video updated successfully'
				);

			} catch (uploadError) {
				console.error('[USER][UPLOAD] Upload error:', uploadError.message);
				return ApiResponse.serverError(res, `Failed to update video: ${uploadError.message}`);
			}
		});

	} catch (e) {
		console.error('[USER][UPLOAD] updateDatingVideo error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update dating video');
	}
}

module.exports = {
	uploadProfilePicture,
	uploadIdProof,
	uploadDatingPhotos,
	uploadDatingVideos,
	updateDatingPhoto,
	updateDatingVideo
};
