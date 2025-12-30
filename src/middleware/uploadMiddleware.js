const multer = require('multer');

const IMAGE_MIME = [
	// Images
	'image/jpeg',
	'image/jpg', // Some systems use jpg instead of jpeg
	'image/png',
	'image/webp',
	'image/gif'
];

const ALL_MIME = [
	...IMAGE_MIME,
	'image/gif',
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
	// Audio/Music - Extended list
	'audio/mp3',
	'audio/wav',
	'audio/m4a',
	'audio/mpeg',
	'application/pdf'
	'audio/aac',
	'audio/flac',
	'audio/ogg',
	'audio/opus',
	'audio/wma',
	// Documents
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
	'application/vnd.ms-excel', // .xls
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
	'application/vnd.ms-powerpoint', // .ppt
	'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
	'text/plain',
	'text/csv',
	'application/rtf',
	// Archives
	'application/zip',
	'application/x-rar-compressed',
	'application/x-7z-compressed'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;
// Different size limits for different file types
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default per file
const MAX_MUSIC_SIZE = 50 * 1024 * 1024; // 50MB for music files
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB for documents
const MAX_FILES = 10; // allow multiple images/videos

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
function fileFilter(req, file, cb) {
	console.log("fileFilter", file);
	
	// Normalize MIME type (handle variations like image/jpg vs image/jpeg)
	let normalizedMimeType = file.mimetype?.toLowerCase();
	if (normalizedMimeType === 'image/jpg') {
		normalizedMimeType = 'image/jpeg';
	}
	
	// Update the file object with normalized MIME type
	if (normalizedMimeType !== file.mimetype) {
		file.mimetype = normalizedMimeType;
	}
	
	if (!ACCEPTED_MIME.includes(normalizedMimeType)) {
		// eslint-disable-next-line no-console
		console.warn('[UPLOAD] Rejected file type', { mimetype: file.mimetype, normalizedMimeType, filename: file.originalname });
		return cb(new Error('Unsupported file type'));
	}
	
	// Check file size based on type
	const isMusic = file.mimetype.startsWith('audio/');
	const isDocument = file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/');
	
	let maxSize = MAX_FILE_SIZE;
	if (isMusic) {
		maxSize = MAX_MUSIC_SIZE;
	} else if (isDocument) {
		maxSize = MAX_DOCUMENT_SIZE;
	}
	
	if (file.size > maxSize) {
		// eslint-disable-next-line no-console
		console.warn('[UPLOAD] File too large', { 
			mimetype: file.mimetype, 
			filename: file.originalname, 
			size: file.size, 
			maxSize 
		});
		return cb(new Error(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`));
	}
	
	// eslint-disable-next-line no-console
	console.log('[UPLOAD] Accept file', { mimetype: file.mimetype, filename: file.originalname, size: file.size });
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
// Upload single file with dynamic size limit (handled in fileFilter)
const uploadSingle = multer({ storage, fileFilter, limits: { fileSize: MAX_MUSIC_SIZE } }).single('file');
const uploadMultiple = multer({ storage, fileFilter, limits: { fileSize: MAX_MUSIC_SIZE, files: MAX_FILES } }).array('files', MAX_FILES);

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
	MAX_MUSIC_SIZE,
	MAX_DOCUMENT_SIZE,
	MAX_FILES,
};
