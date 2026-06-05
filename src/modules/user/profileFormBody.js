/**
 * Normalize profile update payloads from multipart/form-data or urlencoded forms.
 */

const JSON_FIELD_KEYS = new Set([
	'identification',
	'lookingFor',
	'likes',
	'whatBringsYouToVibgyor',
	'preferences',
	'relationshipStyle',
	'distance',
	'location',
	'photos',
	'datingPhotos',
]);

function parseMaybeJson(value) {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (!trimmed) return value;
	if (
		(trimmed.startsWith('[') && trimmed.endsWith(']'))
		|| (trimmed.startsWith('{') && trimmed.endsWith('}'))
	) {
		try {
			return JSON.parse(trimmed);
		} catch {
			return value;
		}
	}
	return value;
}

function parseBoolean(value, defaultValue = true) {
	if (value === undefined || value === null || value === '') return defaultValue;
	if (typeof value === 'boolean') return value;
	const normalized = String(value).trim().toLowerCase();
	if (normalized === 'true' || normalized === '1') return true;
	if (normalized === 'false' || normalized === '0') return false;
	return defaultValue;
}

function coerceField(key, value) {
	if (value === undefined || value === null) return value;

	if (JSON_FIELD_KEYS.has(key)) {
		return parseMaybeJson(value);
	}

	if (key === 'advanceStep') {
		return parseBoolean(value, true);
	}

	if (key === 'heightCm' && value !== '') {
		const num = Number(value);
		return Number.isNaN(num) ? value : num;
	}

	if (typeof value === 'string') {
		return parseMaybeJson(value);
	}

	return value;
}

function normalizeProfileRequestBody(body) {
	if (!body || typeof body !== 'object') return {};

	const normalized = {};
	for (const [key, raw] of Object.entries(body)) {
		if (raw === undefined) continue;
		normalized[key] = coerceField(key, raw);
	}
	return normalized;
}

module.exports = {
	normalizeProfileRequestBody,
	parseBoolean,
	parseMaybeJson,
};
