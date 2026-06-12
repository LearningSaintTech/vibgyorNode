const { uploadBuffer } = require('../../services/s3Service');

const ICON_TEXT_FIELDS = ['likes', 'lookingFor', 'whatBringsYouToVibgyor'];
const MAX_ITEMS_PER_FIELD = 20;

function parseJsonArray(value) {
	if (value == null) return null;
	if (Array.isArray(value)) return value;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return [];
		if (trimmed.startsWith('[')) {
			try {
				const parsed = JSON.parse(trimmed);
				return Array.isArray(parsed) ? parsed : null;
			} catch {
				return null;
			}
		}
	}
	return null;
}

/** Parse identification[0][text] style keys from multipart body */
function parseBracketTextFields(body, fieldName) {
	const items = [];
	const textPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[text\\]$`);
	const iconPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[icon\\]$`);

	for (const [key, value] of Object.entries(body || {})) {
		let match = key.match(textPattern);
		if (match) {
			const index = Number(match[1]);
			if (!items[index]) items[index] = { icon: '', text: '' };
			items[index].text = value != null ? String(value) : '';
			continue;
		}
		match = key.match(iconPattern);
		if (match && typeof value === 'string' && value.trim()) {
			const index = Number(match[1]);
			if (!items[index]) items[index] = { icon: '', text: '' };
			items[index].icon = value.trim();
		}
	}

	return items.length ? items : null;
}

function mapFilesByIndex(files, fieldName) {
	const map = new Map();

	for (const file of files || []) {
		if (!file?.buffer) continue;

		let match = file.fieldname.match(new RegExp(`^${fieldName}\\[(\\d+)\\]\\[icon\\]$`));
		if (match) {
			map.set(Number(match[1]), file);
			continue;
		}

		match = file.fieldname.match(new RegExp(`^${fieldName}_icon_(\\d+)$`));
		if (match) {
			map.set(Number(match[1]), file);
			continue;
		}

		if (file.fieldname === `${fieldName}_icon`) {
			const nextIndex = map.size;
			map.set(nextIndex, file);
		}
	}

	// Multiple files under identification_icons (order preserved)
	const batch = (files || []).filter((f) => f.fieldname === `${fieldName}_icons`);
	batch.forEach((file, index) => {
		if (!map.has(index)) map.set(index, file);
	});

	return map;
}

async function uploadIconMedia(file, userId, fieldName) {
	const ext = (file.originalname && file.originalname.includes('.'))
		? file.originalname.split('.').pop()
		: 'jpg';

	const result = await uploadBuffer({
		buffer: file.buffer,
		contentType: file.mimetype || 'image/jpeg',
		userId,
		category: 'profile',
		type: `${fieldName}-icon`,
		filename: `icon.${ext}`,
		metadata: { field: fieldName },
	});

	return result.url;
}

/**
 * Build [{ icon, text }] from JSON + indexed fields + uploaded icon files.
 * icon field stores media URL after upload, or a preset icon key if sent as text.
 */
async function buildIconTextField({ body, files, fieldName, userId }) {
	const fromJson = parseJsonArray(body[fieldName]);
	const fromBrackets = parseBracketTextFields(body, fieldName);
	const fileMap = mapFilesByIndex(files, fieldName);

	let items = fromJson || fromBrackets || [];
	if (!items.length && fileMap.size === 0) {
		return null;
	}

	const maxIndex = Math.max(
		items.length - 1,
		fileMap.size ? Math.max(...fileMap.keys()) : -1,
		0
	);

	const result = [];
	for (let i = 0; i <= maxIndex && i < MAX_ITEMS_PER_FIELD; i++) {
		const base = items[i] || {};
		const text = base.text != null
			? String(base.text)
			: (body[`${fieldName}_${i}_text`] != null ? String(body[`${fieldName}_${i}_text`]) : '');

		let icon = base.icon != null ? String(base.icon) : '';
		const iconFile = fileMap.get(i);
		if (iconFile) {
			icon = await uploadIconMedia(iconFile, userId, fieldName);
		}

		if (text || icon) {
			result.push({ icon, text });
		}
	}

	return result.length ? result : null;
}

async function mergeIconTextMediaIntoBody(body, files, userId) {
	const merged = { ...body };

	for (const fieldName of ICON_TEXT_FIELDS) {
		const built = await buildIconTextField({ body, files, fieldName, userId });
		if (built) {
			merged[fieldName] = built;
		}
	}

	return merged;
}

module.exports = {
	ICON_TEXT_FIELDS,
	mergeIconTextMediaIntoBody,
	buildIconTextField,
};
