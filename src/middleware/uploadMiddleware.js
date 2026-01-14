const multer = require('multer');

const IMAGE_MIME = [
	// Images
	'image/jpeg',
	'image/jpg', // Some systems use jpg instead of jpeg
	'image/png',
	'image/webp',
	'image/gif',
	'image/svg+xml',
	'image/svg'
];

const ALL_MIME = [
	...IMAGE_MIME,
	'image/bmp',
	'image/heic',
	'image/heif',
	// Videos
	'video/mp4',
	'video/quicktime',
	'video/avi',
	'video/mov',
	'video/webm',
	'video/ogg',
	// Audio/Music
	'audio/mp3',
	'audio/wav',
	'audio/m4a',
	'audio/mpeg',
	'audio/aac',
	'audio/flac',
	'audio/ogg',
	'audio/opus',
	'audio/wma',
	// Documents
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'text/plain',
	'text/csv',
	'application/rtf',
	// Archives
	'application/zip',
	'application/x-rar-compressed',
	'application/x-7z-compressed'
];

// Size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default
const MAX_MUSIC_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILES = 10;

const storage = multer.memoryStorage();

/* ---------- FILE FILTERS ---------- */
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

function fileFilter(req, file, cb) {
	console.log('fileFilter', file);

	let normalizedMimeType = file.mimetype?.toLowerCase();
	if (normalizedMimeType === 'image/jpg') {
		normalizedMimeType = 'image/jpeg';
	}

	if (normalizedMimeType !== file.mimetype) {
		file.mimetype = normalizedMimeType;
	}

	if (!ALL_MIME.includes(normalizedMimeType)) {
		console.warn('[UPLOAD] Rejected file type', {
			mimetype: file.mimetype,
			filename: file.originalname
		});
		return cb(new Error('Unsupported file type'));
	}

	const isMusic = file.mimetype.startsWith('audio/');
	const isDocument =
		file.mimetype.startsWith('application/') ||
		file.mimetype.startsWith('text/');

	let maxSize = MAX_FILE_SIZE;
	if (isMusic) maxSize = MAX_MUSIC_SIZE;
	else if (isDocument) maxSize = MAX_DOCUMENT_SIZE;

	if (file.size > maxSize) {
		console.warn('[UPLOAD] File too large', {
			mimetype: file.mimetype,
			filename: file.originalname,
			size: file.size,
			maxSize
		});
		return cb(
			new Error(
				`File size exceeds maximum allowed size of ${
					maxSize / (1024 * 1024)
				}MB`
			)
		);
	}

	console.log('[UPLOAD] Accept file', {
		mimetype: file.mimetype,
		filename: file.originalname,
		size: file.size
	});
	cb(null, true);
}

/* ---------- MIDDLEWARES ---------- */

// Profile image upload
const uploadSingleImage = multer({
	storage,
	fileFilter: imageFileFilter,
	limits: { fileSize: MAX_FILE_SIZE }
}).single('file');

// Multiple media upload
const uploadMultipleMedia = multer({
	storage,
	fileFilter: anyFileFilter,
	limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES }
}).array('files', MAX_FILES);

// Dynamic file upload
const uploadSingle = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_MUSIC_SIZE }
}).single('file');

const uploadMultiple = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_MUSIC_SIZE, files: MAX_FILES }
}).array('files', MAX_FILES);

// Posts with thumbnails
const uploadWithThumbnails = multer({
	storage,
	fileFilter: anyFileFilter,
	limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES * 2 }
}).fields([
	{ name: 'files', maxCount: MAX_FILES },
	{ name: 'thumbnails', maxCount: MAX_FILES }
	{ name: 'files', maxCount: MAX_FILES },
	{ name: 'thumbnails', maxCount: MAX_FILES }
]);

module.exports = {
	uploadSingle,
	uploadMultiple,
	uploadWithThumbnails,
	MAX_FILE_SIZE,
	MAX_MUSIC_SIZE,
	MAX_DOCUMENT_SIZE,
	MAX_FILES
};
