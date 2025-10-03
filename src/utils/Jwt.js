const jwt = require('jsonwebtoken');

const DEFAULTS = {
	ACCESS_EXPIRES_IN: '7d',
	REFRESH_EXPIRES_IN: '7d',
};

function getSecrets() {
	const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'default-jwt-secret-for-development-only';
	const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'default-jwt-refresh-secret-for-development-only';
	return { accessSecret, refreshSecret };
}

function signAccessToken(payload, options = {}) {
	const { accessSecret } = getSecrets();
	const expiresIn = options.expiresIn || DEFAULTS.ACCESS_EXPIRES_IN;
	// eslint-disable-next-line no-console
	console.log('[JWT] signAccessToken', { expiresIn });
	return jwt.sign(payload, accessSecret, { expiresIn, ...options });
}

function signRefreshToken(payload, options = {}) {
	const { refreshSecret } = getSecrets();
	const expiresIn = options.expiresIn || DEFAULTS.REFRESH_EXPIRES_IN;
	// eslint-disable-next-line no-console
	console.log('[JWT] signRefreshToken', { expiresIn });
	return jwt.sign(payload, refreshSecret, { expiresIn, ...options });
}

function verifyAccessToken(token) {
	const { accessSecret } = getSecrets();
	// eslint-disable-next-line no-console
	console.log('[JWT] verifyAccessToken');
	return jwt.verify(token, accessSecret);
}

function verifyRefreshToken(token) {
	const { refreshSecret } = getSecrets();
	// eslint-disable-next-line no-console
	console.log('[JWT] verifyRefreshToken');
	return jwt.verify(token, refreshSecret);
}

function decodeToken(token) {
	// eslint-disable-next-line no-console
	console.log('[JWT] decodeToken');
	return jwt.decode(token, { complete: false });
}

module.exports = {
	signAccessToken,
	signRefreshToken,
	verifyAccessToken,
	verifyRefreshToken,
	decodeToken,
};


