const multer = require('multer');

const IMAGE_MIME = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif'
];

const ALL_MIME = [
	...IMAGE_MIME,
	'video/mp4',
	'video/quicktime',
	'audio/mpeg',
	'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

const storage = multer.memoryStorage();

/* ---------- FILE FILTER ---------- */
function imageFileFilter(req, file, cb) {
	if (!IMAGE_MIME.includes(file.mimetype)) {
		return cb(new Error('Only image files are allowed'), false);
	}
	cb(null, true);
}

function anyFileFilter(req, file, cb) {
	if (!ALL_MIME.includes(file.mimetype)) {
		return cb(new Error('Unsupported file type'), false);
	}
	cb(null, true);
}

/* ---------- MIDDLEWARES ---------- */

// ✅ Profile image upload (ONLY images, field = file)
const uploadSingle = multer({
	storage,
	fileFilter: imageFileFilter,
	limits: { fileSize: MAX_FILE_SIZE }
}).single('file');

// For posts / media uploads
const uploadMultiple = multer({
	storage,
	fileFilter: anyFileFilter,
	limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES }
}).array('files', MAX_FILES);

// Posts with thumbnails
const uploadWithThumbnails = multer({
	storage,
	fileFilter: anyFileFilter,
	limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES * 2 }
}).fields([
	{ name: 'files', maxCount: MAX_FILES },
	{ name: 'thumbnails', maxCount: MAX_FILES }
]);

module.exports = {
	uploadSingle,
	uploadMultiple,
	uploadWithThumbnails,
	MAX_FILE_SIZE,
	MAX_FILES
};
