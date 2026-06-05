const fs = require('fs').promises;
const { uploadToS3 } = require('../../../services/s3Service');
const { CATALOG_LIST_REGISTRY } = require('./catalog.constants');
const { normalizeListByType } = require('./catalog.normalize');

async function getFileBuffer(file) {
	if (file.buffer && Buffer.isBuffer(file.buffer)) return file.buffer;
	if (file.path) {
		try {
			return await fs.readFile(file.path);
		} catch (err) {
			console.error('[USER][CATALOG] Failed to read file:', file.path, err?.message);
			return null;
		}
	}
	return null;
}

function isImageFile(file) {
	const mime = (file.mimetype || '').toLowerCase();
	return (
		mime.startsWith('image/')
		|| mime === 'image/svg+xml'
		|| mime === 'image/svg'
	);
}

function basenameKey(file) {
	return (file.originalname || '').replace(/\.[^/.]+$/, '').toLowerCase().trim();
}

/**
 * Map files for a list: by index (brackets), by label (filename), by legacy field names.
 */
function mapFilesForListType(files, listType) {
	const config = CATALOG_LIST_REGISTRY[listType];
	const field = config.bodyField;
	const byIndex = new Map();
	const byLabel = new Map();

	for (const file of files || []) {
		if (!isImageFile(file)) continue;

		let match = file.fieldname.match(new RegExp(`^${field}\\[(\\d+)\\]\\[icon\\]$`));
		if (match) {
			byIndex.set(Number(match[1]), file);
			continue;
		}

		match = file.fieldname.match(new RegExp(`^${field}_icon_(\\d+)$`));
		if (match) {
			byIndex.set(Number(match[1]), file);
			continue;
		}

		if (file.fieldname === `${field}_icons` || file.fieldname === 'files') {
			const nextIndex = byIndex.size;
			byIndex.set(nextIndex, file);
			continue;
		}

		const label = basenameKey(file);
		if (label) byLabel.set(label, file);
	}

	return { byIndex, byLabel };
}

async function uploadIconFile(file, listType, label) {
	const buffer = await getFileBuffer(file);
	if (!buffer) return null;

	const uploadResult = await uploadToS3({
		buffer,
		contentType: file.mimetype || 'image/png',
		userId: 'catalog',
		category: 'catalog',
		type: 'icons',
		filename: file.originalname,
		metadata: {
			listType,
			label,
			uploadedAt: new Date().toISOString(),
		},
	});
	return uploadResult.url;
}

/**
 * Attach S3 icon URLs to catalog items from uploaded files.
 * Supports: identification[0][icon], identification_icon_0, Man.png (matches text/community).
 */
async function attachIconsFromFiles(files, listType, items) {
	const config = CATALOG_LIST_REGISTRY[listType];
	if (!config?.uploadMatchKey || !files?.length) {
		return normalizeListByType(listType, items);
	}

	const normalized = normalizeListByType(listType, items);
	if (!normalized.length) return normalized;

	const { byIndex, byLabel } = mapFilesForListType(files, listType);
	const matchKey = config.uploadMatchKey;

	return Promise.all(
		normalized.map(async (item, index) => {
			const label = String(item[matchKey] || '').toLowerCase().trim();
			const existingIcon = trimStr(item.icon);
			if (existingIcon && /^https?:\/\//i.test(existingIcon)) {
				return item;
			}

			const matchingFile = byIndex.get(index) || byLabel.get(label);
			if (!matchingFile) return item;

			try {
				const url = await uploadIconFile(matchingFile, listType, item[matchKey]);
				return url ? { ...item, icon: url } : item;
			} catch (err) {
				console.error(`[USER][CATALOG] Icon upload failed (${listType}/${label}):`, err?.message);
				return item;
			}
		})
	);
}

function trimStr(value) {
	if (value == null) return '';
	return String(value).trim();
}

/** List types that support icon file upload */
function getIconUploadListTypes() {
	return Object.entries(CATALOG_LIST_REGISTRY)
		.filter(([, cfg]) => cfg.uploadMatchKey)
		.map(([listType]) => listType);
}

module.exports = {
	attachIconsFromFiles,
	getIconUploadListTypes,
	mapFilesForListType,
};
