const multer = require("multer");

// Multer configuration for subadmin profile image
const ACCEPTED_IMAGE_MIME = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'image/gif'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage(); // Use memory storage for S3 upload

const imageFilter = (req, file, cb) => {
	if (!ACCEPTED_IMAGE_MIME.includes(file.mimetype)) {
		return cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF)'));
	}
	cb(null, true);
};

const upload = multer({
	storage,
	fileFilter: imageFilter,
	limits: {
		fileSize: MAX_FILE_SIZE
	}
});

module.exports = upload;

