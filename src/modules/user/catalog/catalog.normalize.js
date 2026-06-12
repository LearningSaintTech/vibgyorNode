const { CATALOG_LIST_REGISTRY } = require('./catalog.constants');

function trimStr(value) {
	if (value == null) return '';
	return String(value).trim();
}

function identificationKey(value) {
	return trimStr(value).toLowerCase();
}

/** Legacy { name, svgUrl } → { icon, text } */
function legacyIconText(item) {
	if (!item || typeof item !== 'object') return null;
	const text = trimStr(item.text || item.name);
	if (!text) return null;
	return {
		icon: trimStr(item.icon || item.svgUrl || item.svgData || ''),
		text,
	};
}

function normalizeIconTextItem(item) {
	if (item == null) return null;
	if (typeof item === 'string') {
		const text = trimStr(item);
		return text ? { icon: '', text } : null;
	}
	return legacyIconText(item);
}

function normalizeIconTextList(items) {
	if (!Array.isArray(items)) return [];
	return items.map(normalizeIconTextItem).filter(Boolean);
}

function normalizeIdentificationItem(item) {
	if (item == null) return null;
	if (typeof item === 'string') {
		const text = trimStr(item);
		return text ? { text, description: '' } : null;
	}
	if (typeof item !== 'object') return null;
	const text = trimStr(item.text || item.name);
	if (!text) return null;
	return {
		text,
		description: trimStr(item.description),
	};
}

function normalizeIdentificationList(items) {
	if (!Array.isArray(items)) return [];
	return items.map(normalizeIdentificationItem).filter(Boolean);
}

function normalizeLinkedTextItem(item) {
	if (item == null) return null;
	if (typeof item === 'string') {
		const text = trimStr(item);
		return text ? { identification: '', text } : null;
	}
	if (typeof item !== 'object') return null;
	const text = trimStr(item.text);
	if (!text) return null;
	return {
		identification: trimStr(item.identification),
		text,
	};
}

function normalizeLinkedTextList(items) {
	if (!Array.isArray(items)) return [];
	return items.map(normalizeLinkedTextItem).filter(Boolean);
}

function normalizeLinkedIconTextItem(item) {
	if (item == null) return null;
	if (typeof item === 'string') {
		const text = trimStr(item);
		return text ? { identification: '', icon: '', text } : null;
	}
	if (typeof item !== 'object') return null;
	const text = trimStr(item.text || item.name);
	if (!text) return null;
	return {
		identification: trimStr(item.identification),
		icon: trimStr(item.icon || item.svgUrl || item.svgData || ''),
		text,
	};
}

function normalizeLinkedIconTextList(items) {
	if (!Array.isArray(items)) return [];
	return items.map(normalizeLinkedIconTextItem).filter(Boolean);
}

function normalizeIconCommunityItem(item) {
	if (item == null) return null;
	if (typeof item === 'object') {
		const community = trimStr(item.community || item.text || item.name);
		if (!community) return null;
		return {
			icon: trimStr(item.icon || item.svgUrl || ''),
			community,
		};
	}
	if (typeof item === 'string') {
		const community = trimStr(item);
		return community ? { icon: '', community } : null;
	}
	return null;
}

function normalizeIconCommunityList(items) {
	if (!Array.isArray(items)) return [];
	return items.map(normalizeIconCommunityItem).filter(Boolean);
}

function normalizeTextSubtextItem(item) {
	if (item == null) return null;
	if (typeof item === 'string') {
		const text = trimStr(item);
		return text ? { text, subtext: '' } : null;
	}
	if (typeof item === 'object') {
		const text = trimStr(item.text);
		if (!text) return null;
		return { text, subtext: trimStr(item.subtext) };
	}
	return null;
}

function normalizeTextSubtextList(items) {
	if (!Array.isArray(items)) return [];
	return items.map(normalizeTextSubtextItem).filter(Boolean);
}

function normalizeTextOnlyItem(item) {
	if (item == null) return '';
	if (typeof item === 'string') return trimStr(item);
	if (typeof item === 'object') return trimStr(item.text || item.name || item.community);
	return '';
}

function normalizeTextOnlyList(items) {
	if (!Array.isArray(items)) return [];
	return items.map(normalizeTextOnlyItem).filter(Boolean);
}

function normalizeListByType(listType, items) {
	const config = CATALOG_LIST_REGISTRY[listType];
	if (!config) return [];

	switch (config.itemType) {
		case 'identification':
			return normalizeIdentificationList(items);
		case 'linkedText':
			return normalizeLinkedTextList(items);
		case 'linkedIconText':
			return normalizeLinkedIconTextList(items);
		case 'iconText':
			return normalizeIconTextList(items);
		case 'iconCommunity':
			return normalizeIconCommunityList(items);
		case 'textSubtext':
			return normalizeTextSubtextList(items);
		case 'textOnly':
			return normalizeTextOnlyList(items);
		default:
			return [];
	}
}

function filterByIdentification(items, identification) {
	const key = identificationKey(identification);
	if (!key) return items;
	return (items || []).filter(
		(item) => identificationKey(item?.identification) === key
	);
}

function filterCatalogListsByIdentification(catalogData, identification) {
	const key = identificationKey(identification);
	if (!key) return catalogData;

	return {
		...catalogData,
		pronouns: filterByIdentification(catalogData.pronouns, identification),
		orientation: filterByIdentification(catalogData.orientation, identification),
	};
}

function getPrimaryIdentificationText(identificationValue) {
	if (Array.isArray(identificationValue) && identificationValue.length > 0) {
		const first = identificationValue[0];
		if (typeof first === 'string') return trimStr(first);
		if (first && typeof first === 'object') return trimStr(first.text);
		return '';
	}
	if (identificationValue && typeof identificationValue === 'object' && !Array.isArray(identificationValue)) {
		return trimStr(identificationValue.text);
	}
	if (typeof identificationValue === 'string') return trimStr(identificationValue);
	return '';
}

function getItemKey(listType, item) {
	const config = CATALOG_LIST_REGISTRY[listType];
	if (!config) return '';

	switch (config.itemType) {
		case 'identification':
			return identificationKey(item?.text);
		case 'linkedText':
		case 'linkedIconText':
			return `${identificationKey(item?.identification)}::${trimStr(item?.text).toLowerCase()}`;
		case 'iconText':
			return trimStr(item?.text).toLowerCase();
		case 'iconCommunity':
			return trimStr(item?.community).toLowerCase();
		case 'textSubtext':
			return trimStr(item?.text).toLowerCase();
		case 'textOnly':
			return trimStr(item).toLowerCase();
		default:
			return '';
	}
}

function itemsEqual(listType, a, b) {
	return getItemKey(listType, a) === getItemKey(listType, b) && getItemKey(listType, a) !== '';
}

function filterNewItems(listType, currentList, incoming) {
	const normalized = normalizeListByType(listType, incoming);
	const existingKeys = new Set((currentList || []).map((item) => getItemKey(listType, item)));
	return normalized.filter((item) => !existingKeys.has(getItemKey(listType, item)));
}

function filterRemoveItems(listType, currentList, toRemove) {
	const removeKeys = new Set(
		normalizeListByType(listType, toRemove).map((item) => getItemKey(listType, item))
	);
	return (currentList || []).filter((item) => !removeKeys.has(getItemKey(listType, item)));
}

function getRemovedKeys(listType, currentList, toRemove) {
	const removeKeys = new Set(
		normalizeListByType(listType, toRemove).map((item) => getItemKey(listType, item))
	);
	return (currentList || []).filter((item) => removeKeys.has(getItemKey(listType, item)));
}

function buildEmptyPublicCatalogResponse() {
	return {
		identification: [],
		pronouns: [],
		orientation: [],
		lookingFor: [],
		likes: [],
		whatBringsYouToVibgyor: [],
		relationshipStyle: [],
		languages: [],
		version: 0,
	};
}

function buildPublicCatalogResponse(catalog) {
	const doc = catalog?.toObject ? catalog.toObject() : catalog || {};
	return {
		identification: normalizeIdentificationList(doc.identificationList),
		pronouns: normalizeLinkedTextList(doc.pronounList),
		orientation: normalizeLinkedIconTextList(doc.orientationList),
		lookingFor: normalizeIconTextList(doc.lookingForList),
		likes: normalizeIconTextList(doc.likeList),
		whatBringsYouToVibgyor: normalizeIconCommunityList(doc.whatBringsYouToVibgyorList),
		relationshipStyle: normalizeTextSubtextList(doc.relationshipStyleList),
		languages: normalizeTextOnlyList(doc.languageList),
		version: doc.version || 1,
	};
}

function buildAdminCatalogResponse(catalog) {
	const publicData = buildPublicCatalogResponse(catalog);
	const doc = catalog?.toObject ? catalog.toObject() : catalog || {};
	return {
		...publicData,
		id: doc._id,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

function parseBodyField(fieldValue) {
	if (fieldValue == null || fieldValue === '') return fieldValue;
	if (typeof fieldValue === 'string') {
		const trimmed = fieldValue.trim();
		if (
			(trimmed.startsWith('[') && trimmed.endsWith(']'))
			|| (trimmed.startsWith('{') && trimmed.endsWith('}'))
		) {
			try {
				return JSON.parse(trimmed);
			} catch {
				return fieldValue;
			}
		}
	}
	return fieldValue;
}

function ensureArray(value) {
	if (Array.isArray(value)) return value;
	if (value == null || value === '') return [];
	if (typeof value === 'string') {
		const parsed = parseBodyField(value);
		return Array.isArray(parsed) ? parsed : [];
	}
	return [];
}

/** identification[0][text] style fields from form-data */
function parseBracketIconText(body, fieldName) {
	const items = [];
	const textPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[text\\]$`);
	const iconUrlPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[icon\\]$`);

	for (const [key, value] of Object.entries(body || {})) {
		let match = key.match(textPattern);
		if (match) {
			const index = Number(match[1]);
			if (!items[index]) items[index] = { icon: '', text: '' };
			items[index].text = value != null ? String(value) : '';
			continue;
		}
		match = key.match(iconUrlPattern);
		if (match && typeof value === 'string' && value.trim() && !value.buffer) {
			const index = Number(match[1]);
			if (!items[index]) items[index] = { icon: '', text: '' };
			items[index].icon = value.trim();
		}
	}

	return items.filter((item) => item && trimStr(item.text));
}

/** identification[0][text|description] from form-data */
function parseBracketIdentification(body, fieldName) {
	const items = [];
	const textPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[text\\]$`);
	const descriptionPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[description\\]$`);

	for (const [key, value] of Object.entries(body || {})) {
		let match = key.match(textPattern);
		if (match) {
			const index = Number(match[1]);
			if (!items[index]) items[index] = { text: '', description: '' };
			items[index].text = value != null ? String(value) : '';
			continue;
		}
		match = key.match(descriptionPattern);
		if (match) {
			const index = Number(match[1]);
			if (!items[index]) items[index] = { text: '', description: '' };
			items[index].description = value != null ? String(value) : '';
		}
	}

	return items.filter((item) => item && trimStr(item.text));
}

/** orientation[0][identification|text|icon] or pronouns[0][identification|text] */
function parseBracketLinked(body, fieldName, withIcon = false) {
	const items = [];
	const identificationPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[identification\\]$`);
	const textPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[text\\]$`);
	const iconUrlPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[icon\\]$`);

	for (const [key, value] of Object.entries(body || {})) {
		let match = key.match(identificationPattern);
		if (match) {
			const index = Number(match[1]);
			if (!items[index]) {
				items[index] = withIcon
					? { identification: '', icon: '', text: '' }
					: { identification: '', text: '' };
			}
			items[index].identification = value != null ? String(value) : '';
			continue;
		}
		match = key.match(textPattern);
		if (match) {
			const index = Number(match[1]);
			if (!items[index]) {
				items[index] = withIcon
					? { identification: '', icon: '', text: '' }
					: { identification: '', text: '' };
			}
			items[index].text = value != null ? String(value) : '';
			continue;
		}
		if (withIcon) {
			match = key.match(iconUrlPattern);
			if (match && typeof value === 'string' && value.trim() && !value.buffer) {
				const index = Number(match[1]);
				if (!items[index]) items[index] = { identification: '', icon: '', text: '' };
				items[index].icon = value.trim();
			}
		}
	}

	return items.filter((item) => item && trimStr(item.text));
}

function parseBracketIconCommunity(body, fieldName) {
	const items = [];
	const textPattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[community\\]$`);

	for (const [key, value] of Object.entries(body || {})) {
		const match = key.match(textPattern);
		if (match) {
			const index = Number(match[1]);
			if (!items[index]) items[index] = { icon: '', community: '' };
			items[index].community = value != null ? String(value) : '';
		}
	}

	return items.filter((item) => item && trimStr(item.community));
}

/**
 * Migrate legacy shapes (e.g. pronoun strings) before mongoose save / list mutations.
 */
function sanitizeCatalogForSave(catalog) {
	if (!catalog) return catalog;

	for (const [listType, config] of Object.entries(CATALOG_LIST_REGISTRY)) {
		const normalized = normalizeListByType(listType, catalog[config.dbField]);
		catalog[config.dbField] = normalized;
		if (typeof catalog.markModified === 'function') {
			catalog.markModified(config.dbField);
		}
	}

	return catalog;
}

function extractListFromBody(body, listType) {
	const config = CATALOG_LIST_REGISTRY[listType];
	if (!config) return [];

	const raw = parseBodyField(body?.[config.bodyField] ?? body?.[config.dbField]);
	const fromJson = ensureArray(raw);
	if (fromJson.length > 0) return fromJson;

	if (config.itemType === 'identification') {
		const bracket = parseBracketIdentification(body, config.bodyField);
		if (bracket.length > 0) return bracket;
	}

	if (config.itemType === 'linkedText') {
		const bracket = parseBracketLinked(body, config.bodyField, false);
		if (bracket.length > 0) return bracket;
	}

	if (config.itemType === 'linkedIconText') {
		const bracket = parseBracketLinked(body, config.bodyField, true);
		if (bracket.length > 0) return bracket;
	}

	if (config.itemType === 'iconText') {
		const bracket = parseBracketIconText(body, config.bodyField);
		if (bracket.length > 0) return bracket;
	}

	if (config.itemType === 'iconCommunity') {
		const bracket = parseBracketIconCommunity(body, config.bodyField);
		if (bracket.length > 0) return bracket;
	}

	return [];
}

module.exports = {
	normalizeIconTextList,
	normalizeIdentificationList,
	normalizeIdentificationItem,
	normalizeLinkedTextList,
	normalizeLinkedIconTextList,
	normalizeIconCommunityList,
	normalizeTextSubtextList,
	normalizeTextOnlyList,
	normalizeListByType,
	filterByIdentification,
	filterCatalogListsByIdentification,
	getPrimaryIdentificationText,
	identificationKey,
	getItemKey,
	filterNewItems,
	filterRemoveItems,
	getRemovedKeys,
	buildEmptyPublicCatalogResponse,
	buildPublicCatalogResponse,
	buildAdminCatalogResponse,
	parseBodyField,
	ensureArray,
	parseBracketIconText,
	parseBracketIdentification,
	parseBracketLinked,
	parseBracketIconCommunity,
	extractListFromBody,
	sanitizeCatalogForSave,
};
