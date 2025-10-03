const multer = require('multer');

const ACCEPTED_MIME = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'video/mp4',
	'video/quicktime',
	'video/avi',
	'video/mov',
	'audio/mp3',
	'audio/wav',
	'audio/m4a',
	'audio/mpeg',
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'text/plain',
	'application/zip',
	'application/x-rar-compressed'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 10; // allow multiple images/videos

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
	if (!ACCEPTED_MIME.includes(file.mimetype)) {
		// eslint-disable-next-line no-console
		console.warn('[UPLOAD] Rejected file type', { mimetype: file.mimetype, filename: file.originalname });
		return cb(new Error('Unsupported file type'));
	}
	// eslint-disable-next-line no-console
	console.log('[UPLOAD] Accept file', { mimetype: file.mimetype, filename: file.originalname, size: file.size });
	cb(null, true);
}

const uploadSingle = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } }).single('file');
const uploadMultiple = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES } }).array('files', MAX_FILES);

module.exports = {
	uploadSingle,
	uploadMultiple,
	ACCEPTED_MIME,
	MAX_FILE_SIZE,
	MAX_FILES,
};


