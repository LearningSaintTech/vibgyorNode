const HttpStatus = {
	OK: 200,
	CREATED: 201,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
};

const buildResponse = ({ success, status, message = '', data = null, meta = null, code = null }) => {
	const payload = { success, status, message };
	if (data !== null) payload.data = data;
	if (meta !== null) payload.meta = meta;
	if (code !== null) payload.code = code; // app-specific error/response code
	return payload;
};

const send = (res, status, payload) => res.status(status).json(payload);

const ApiResponse = {
	// 2xx
	success(res, data = null, message = 'OK', meta = null) {
		return send(res, HttpStatus.OK, buildResponse({ success: true, status: HttpStatus.OK, message, data, meta }));
	},
	created(res, data = null, message = 'Created', meta = null) {
		return send(res, HttpStatus.CREATED, buildResponse({ success: true, status: HttpStatus.CREATED, message, data, meta }));
	},

	// 4xx
	badRequest(res, message = 'Bad Request', code = 'BAD_REQUEST', data = null, meta = null) {
		return send(res, HttpStatus.BAD_REQUEST, buildResponse({ success: false, status: HttpStatus.BAD_REQUEST, message, data, meta, code }));
	},
	unauthorized(res, message = 'Unauthorized', code = 'UNAUTHORIZED') {
		return send(res, HttpStatus.UNAUTHORIZED, buildResponse({ success: false, status: HttpStatus.UNAUTHORIZED, message, code }));
	},
	forbidden(res, message = 'Forbidden', code = 'FORBIDDEN') {
		return send(res, HttpStatus.FORBIDDEN, buildResponse({ success: false, status: HttpStatus.FORBIDDEN, message, code }));
	},
	notFound(res, message = 'Not Found', code = 'NOT_FOUND') {
		return send(res, HttpStatus.NOT_FOUND, buildResponse({ success: false, status: HttpStatus.NOT_FOUND, message, code }));
	},
	conflict(res, message = 'Conflict', code = 'CONFLICT') {
		return send(res, HttpStatus.CONFLICT, buildResponse({ success: false, status: HttpStatus.CONFLICT, message, code }));
	},
	unprocessable(res, message = 'Unprocessable Entity', code = 'UNPROCESSABLE_ENTITY') {
		return send(res, HttpStatus.UNPROCESSABLE_ENTITY, buildResponse({ success: false, status: HttpStatus.UNPROCESSABLE_ENTITY, message, code }));
	},
	tooMany(res, message = 'Too Many Requests', code = 'TOO_MANY_REQUESTS') {
		return send(res, HttpStatus.TOO_MANY_REQUESTS, buildResponse({ success: false, status: HttpStatus.TOO_MANY_REQUESTS, message, code }));
	},

	// 5xx
	serverError(res, message = 'Internal Server Error', code = 'INTERNAL_ERROR', data = null, meta = null) {
		return send(res, HttpStatus.INTERNAL_SERVER_ERROR, buildResponse({ success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, message, data, meta, code }));
	},

	// Flexible custom sender
	custom(res, status, { success = true, message = '', data = null, meta = null, code = null } = {}) {
		return send(res, status, buildResponse({ success, status, message, data, meta, code }));
	},
};

// Helper functions for backward compatibility
const createResponse = (message, data = null, meta = null) => {
	return buildResponse({ success: true, status: HttpStatus.OK, message, data, meta });
};

const createErrorResponse = (message, status = HttpStatus.INTERNAL_SERVER_ERROR, data = null) => {
	return buildResponse({ success: false, status, message, data });
};

module.exports = Object.assign({ HttpStatus, createResponse, createErrorResponse }, ApiResponse);


