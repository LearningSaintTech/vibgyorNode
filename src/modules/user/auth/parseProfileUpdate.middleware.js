const multer = require('multer');
const ApiResponse = require('../../../utils/apiResponse');
const { normalizeProfileRequestBody } = require('../profileFormBody');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024,
		files: 25,
	},
});

function isMultipartRequest(req) {
	const contentType = (req.headers['content-type'] || '').toLowerCase();
	return contentType.includes('multipart/form-data');
}

/**
 * Parses multipart/form-data for PUT /user/auth/profile.
 * Text fields (e.g. bio) land on req.body; optional files on req.profileUploadFiles.
 */
function parseProfileUpdate(req, res, next) {
	if (!isMultipartRequest(req)) {
		req.body = normalizeProfileRequestBody(req.body);
		return next();
	}

	upload.any()(req, res, (err) => {
		if (err) {
			return ApiResponse.badRequest(res, err.message || 'Invalid form data');
		}

		req.body = normalizeProfileRequestBody(req.body);
		req.profileUploadFiles = Array.isArray(req.files) ? req.files : [];
		return next();
	});
}

module.exports = parseProfileUpdate;
