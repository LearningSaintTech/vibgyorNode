const User = require('../model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');
const { uploadToS3, deleteFromS3 } = require('../../../services/s3Service');
const multer = require('multer');

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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file (larger for videos)
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

/**
 * Upload dating profile photos (1-5 photos)
 */
async function uploadDatingPhotos(req, res) {
	try {
		console.log('[DATING][UPLOAD] uploadDatingPhotos');

		uploadPhotos(req, res, async (err) => {
			if (err) {
				console.error('[DATING][UPLOAD] Multer error:', err.message);
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

				console.log(`[DATING][UPLOAD] Uploading ${req.files.length} photo(s) to S3`);

				// Upload all photos to S3
				const uploadedPhotos = [];

				for (let i = 0; i < req.files.length; i++) {
					const file = req.files[i];
					const { buffer, originalname, mimetype } = file;

					console.log(`[DATING][UPLOAD] Processing photo ${i + 1}/${req.files.length}:`, originalname);

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
						thumbnailUrl: uploadResult.url, // Can be replaced with actual thumbnail URL later
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

				console.log(`[DATING][UPLOAD] ${req.files.length} photo(s) uploaded successfully`);

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
				console.error('[DATING][UPLOAD] Upload error:', uploadError.message);
				return ApiResponse.serverError(res, `Failed to upload photos: ${uploadError.message}`);
			}
		});

	} catch (e) {
		console.error('[DATING][UPLOAD] uploadDatingPhotos error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to upload dating photos');
	}
}

/**
 * Upload dating profile videos (1-5 videos)
 */
async function uploadDatingVideos(req, res) {
	try {
		console.log('[DATING][UPLOAD] uploadDatingVideos');

		uploadVideos(req, res, async (err) => {
			if (err) {
				console.error('[DATING][UPLOAD] Multer error:', err.message);
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

				console.log(`[DATING][UPLOAD] Uploading ${req.files.length} video(s) to S3`);

				// Upload all videos to S3
				const uploadedVideos = [];

				for (let i = 0; i < req.files.length; i++) {
					const file = req.files[i];
					const { buffer, originalname, mimetype } = file;

					console.log(`[DATING][UPLOAD] Processing video ${i + 1}/${req.files.length}:`, originalname);

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
					const duration = req.body.durations && req.body.durations[i] 
						? parseFloat(req.body.durations[i]) 
						: 0;

					const videoData = {
						url: uploadResult.url,
						thumbnailUrl: uploadResult.url, // Can be replaced with actual thumbnail URL later
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

				console.log(`[DATING][UPLOAD] ${req.files.length} video(s) uploaded successfully`);

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
				console.error('[DATING][UPLOAD] Upload error:', uploadError.message);
				return ApiResponse.serverError(res, `Failed to upload videos: ${uploadError.message}`);
			}
		});

	} catch (e) {
		console.error('[DATING][UPLOAD] uploadDatingVideos error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to upload dating videos');
	}
}

/**
 * Remove a dating photo by index
 */
async function removeDatingPhoto(req, res) {
	try {
		const { photoIndex } = req.params;
		const index = parseInt(photoIndex, 10);

		if (isNaN(index) || index < 0) {
			return ApiResponse.badRequest(res, 'Invalid photo index');
		}

		const user = await User.findById(req.user?.userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (!user.dating || !user.dating.photos || index >= user.dating.photos.length) {
			return ApiResponse.badRequest(res, 'Photo not found at the specified index');
		}

		const photo = user.dating.photos[index];
		
		// Extract S3 key from URL for deletion
		if (photo.url) {
			try {
				// Extract key from S3 URL
				// URL format: https://bucket.s3.region.amazonaws.com/userId/category-type/timestamp-filename
				const urlObj = new URL(photo.url);
				const pathParts = urlObj.pathname.split('/').filter(part => part);
				// Remove bucket name if present, then join the rest as key
				const key = pathParts.join('/');
				if (key) {
					await deleteFromS3(key);
					console.log(`[DATING] Deleted photo from S3: ${key}`);
				}
			} catch (deleteError) {
				console.error('[DATING] Error deleting photo from S3:', deleteError.message);
				// Continue even if S3 deletion fails
			}
		}

		await user.removeDatingPhoto(index);

		const updatedUser = await User.findById(user._id);
		const datingProfile = updatedUser.getDatingProfile();

		return ApiResponse.success(
			res,
			{
				datingProfile: datingProfile
			},
			'Photo removed successfully'
		);

	} catch (e) {
		console.error('[DATING] removeDatingPhoto error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to remove photo');
	}
}

/**
 * Remove a dating video by index
 */
async function removeDatingVideo(req, res) {
	try {
		const { videoIndex } = req.params;
		const index = parseInt(videoIndex, 10);

		if (isNaN(index) || index < 0) {
			return ApiResponse.badRequest(res, 'Invalid video index');
		}

		const user = await User.findById(req.user?.userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (!user.dating || !user.dating.videos || index >= user.dating.videos.length) {
			return ApiResponse.badRequest(res, 'Video not found at the specified index');
		}

		const video = user.dating.videos[index];
		
		// Extract S3 key from URL for deletion
		if (video.url) {
			try {
				// Extract key from S3 URL
				// URL format: https://bucket.s3.region.amazonaws.com/userId/category-type/timestamp-filename
				const urlObj = new URL(video.url);
				const pathParts = urlObj.pathname.split('/').filter(part => part);
				// Remove bucket name if present, then join the rest as key
				const key = pathParts.join('/');
				if (key) {
					await deleteFromS3(key);
					console.log(`[DATING] Deleted video from S3: ${key}`);
				}
			} catch (deleteError) {
				console.error('[DATING] Error deleting video from S3:', deleteError.message);
				// Continue even if S3 deletion fails
			}
		}

		await user.removeDatingVideo(index);

		const updatedUser = await User.findById(user._id);
		const datingProfile = updatedUser.getDatingProfile();

		return ApiResponse.success(
			res,
			{
				datingProfile: datingProfile
			},
			'Video removed successfully'
		);

	} catch (e) {
		console.error('[DATING] removeDatingVideo error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to remove video');
	}
}

/**
 * Update photo order
 */
async function updatePhotoOrder(req, res) {
	try {
		const { photoIndex, order } = req.body;

		if (photoIndex === undefined || order === undefined) {
			return ApiResponse.badRequest(res, 'Photo index and order are required');
		}

		const user = await User.findById(req.user?.userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		await user.updateDatingPhotoOrder(parseInt(photoIndex, 10), parseInt(order, 10));

		const updatedUser = await User.findById(user._id);
		const datingProfile = updatedUser.getDatingProfile();

		return ApiResponse.success(
			res,
			{
				datingProfile: datingProfile
			},
			'Photo order updated successfully'
		);

	} catch (e) {
		console.error('[DATING] updatePhotoOrder error:', e?.message || e);
		return ApiResponse.serverError(res, `Failed to update photo order: ${e.message}`);
	}
}

/**
 * Update video order
 */
async function updateVideoOrder(req, res) {
	try {
		const { videoIndex, order } = req.body;

		if (videoIndex === undefined || order === undefined) {
			return ApiResponse.badRequest(res, 'Video index and order are required');
		}

		const user = await User.findById(req.user?.userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		await user.updateDatingVideoOrder(parseInt(videoIndex, 10), parseInt(order, 10));

		const updatedUser = await User.findById(user._id);
		const datingProfile = updatedUser.getDatingProfile();

		return ApiResponse.success(
			res,
			{
				datingProfile: datingProfile
			},
			'Video order updated successfully'
		);

	} catch (e) {
		console.error('[DATING] updateVideoOrder error:', e?.message || e);
		return ApiResponse.serverError(res, `Failed to update video order: ${e.message}`);
	}
}

/**
 * Get dating profile
 */
async function getDatingProfile(req, res) {
	try {
		const user = await User.findById(req.user?.userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const datingProfile = user.getDatingProfile();

		return ApiResponse.success(
			res,
			{
				datingProfile: datingProfile
			},
			'Dating profile retrieved successfully'
		);

	} catch (e) {
		console.error('[DATING] getDatingProfile error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to get dating profile');
	}
}

/**
 * Toggle dating profile active status
 */
async function toggleDatingProfile(req, res) {
	try {
		const { isActive } = req.body;

		const user = await User.findById(req.user?.userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		await user.toggleDatingProfile(isActive);

		const updatedUser = await User.findById(user._id);
		const datingProfile = updatedUser.getDatingProfile();

		return ApiResponse.success(
			res,
			{
				datingProfile: datingProfile
			},
			`Dating profile ${datingProfile.isDatingProfileActive ? 'activated' : 'deactivated'} successfully`
		);

	} catch (e) {
		console.error('[DATING] toggleDatingProfile error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to toggle dating profile');
	}
}

module.exports = {
	uploadDatingPhotos,
	uploadDatingVideos,
	removeDatingPhoto,
	removeDatingVideo,
	updatePhotoOrder,
	updateVideoOrder,
	getDatingProfile,
	toggleDatingProfile
};

