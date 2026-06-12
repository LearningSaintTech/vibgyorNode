const { UserCatalog } = require('./catalog.repository');
const ApiResponse = require('../../../utils/apiResponse');
const {
	CATALOG_LIST_REGISTRY,
	VALID_LIST_TYPES,
} = require('./catalog.constants');
const {
	buildPublicCatalogResponse,
	buildAdminCatalogResponse,
	buildEmptyPublicCatalogResponse,
	extractListFromBody,
	parseBodyField,
	normalizeListByType,
	filterNewItems,
	filterRemoveItems,
	getRemovedKeys,
	filterByIdentification,
	filterCatalogListsByIdentification,
	sanitizeCatalogForSave,
} = require('./catalog.normalize');
const { attachIconsFromFiles } = require('./catalog.upload');

function buildEmptyCatalogDocument() {
	const data = { version: 1 };
	for (const config of Object.values(CATALOG_LIST_REGISTRY)) {
		data[config.dbField] = [];
	}
	return data;
}

function parseRequestItems(items) {
	if (Array.isArray(items)) return items;
	if (typeof items === 'string') {
		const parsed = parseBodyField(items);
		return Array.isArray(parsed) ? parsed : [];
	}
	return [];
}

function validateLinkedListItems(listType, items) {
	const config = CATALOG_LIST_REGISTRY[listType];
	if (!config || !['linkedText', 'linkedIconText'].includes(config.itemType)) {
		return null;
	}

	const missingIdentification = (items || []).filter(
		(item) => !String(item?.identification || '').trim()
	);
	if (missingIdentification.length > 0) {
		return `Each ${listType} item must include an identification value (e.g. Man, Woman).`;
	}
	return null;
}

function extractListsFromBody(body) {
	const lists = {};
	for (const listType of Object.keys(CATALOG_LIST_REGISTRY)) {
		const items = extractListFromBody(body, listType);
		if (items.length > 0) {
			lists[listType] = items;
		}
	}
	return lists;
}

function validateListsFromBody(listsFromBody) {
	for (const [listType, items] of Object.entries(listsFromBody)) {
		const linkedValidationError = validateLinkedListItems(listType, items);
		if (linkedValidationError) {
			return linkedValidationError;
		}
	}
	return null;
}

async function applyListUpdates(catalog, listsFromBody, files) {
	for (const [listType, items] of Object.entries(listsFromBody)) {
		if (!Array.isArray(items)) continue;

		const config = CATALOG_LIST_REGISTRY[listType];
		let processed = normalizeListByType(listType, items);

		if (config.uploadMatchKey && files?.length && processed.length > 0) {
			processed = await attachIconsFromFiles(files, listType, processed);
		}

		if (processed.length > 0) {
			catalog[config.dbField] = processed;
		}
	}
}

async function buildFullCatalogData(listsFromBody, files) {
	const data = buildEmptyCatalogDocument();

	for (const [listType, config] of Object.entries(CATALOG_LIST_REGISTRY)) {
		const incoming = listsFromBody[listType];
		if (!incoming?.length) continue;

		let processed = normalizeListByType(listType, incoming);
		if (config.uploadMatchKey && files?.length && processed.length > 0) {
			processed = await attachIconsFromFiles(files, listType, processed);
		}
		data[config.dbField] = processed;
	}

	return data;
}

function resolveIdentificationFilter(req) {
	return (req.query?.identification || req.query?.identity || '').trim();
}

async function getCatalog(req, res) {
	try {
		const catalog = await UserCatalog.findOne({}).lean();
		if (!catalog) {
			return ApiResponse.success(res, buildEmptyPublicCatalogResponse(), 'Catalog not configured');
		}
		let response = buildPublicCatalogResponse(catalog);
		const identification = resolveIdentificationFilter(req);
		if (identification) {
			response = filterCatalogListsByIdentification(response, identification);
			response.identificationFilter = identification;
		}
		return ApiResponse.success(res, response);
	} catch (e) {
		console.error('[USER][CATALOG] getCatalog error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch catalog');
	}
}

async function getCatalogAdmin(req, res) {
	try {
		const catalog = await UserCatalog.findOne({});
		if (!catalog) {
			return ApiResponse.notFound(res, 'Catalog not found. Create it with POST /user/catalog.', 'CATALOG_NOT_FOUND');
		}
		return ApiResponse.success(res, buildAdminCatalogResponse(catalog), 'Catalog fetched');
	} catch (e) {
		console.error('[USER][CATALOG] getCatalogAdmin error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch catalog');
	}
}

async function createCatalog(req, res) {
	try {
		const existing = await UserCatalog.findOne({});
		if (existing) {
			return ApiResponse.conflict(res, 'Catalog already exists. Use update instead.', 'CATALOG_EXISTS');
		}

		const listsFromBody = extractListsFromBody(req.body || {});
		const files = req.files || [];
		if (!Object.keys(listsFromBody).length) {
			return ApiResponse.badRequest(res, 'Send at least one catalog list', 'EMPTY_BODY');
		}

		const linkedValidationError = validateListsFromBody(listsFromBody);
		if (linkedValidationError) {
			return ApiResponse.badRequest(res, linkedValidationError, 'MISSING_IDENTIFICATION');
		}

		const catalogData = await buildFullCatalogData(listsFromBody, files);
		const catalog = await UserCatalog.create(catalogData);

		return ApiResponse.success(
			res,
			buildAdminCatalogResponse(catalog),
			'Catalog created successfully'
		);
	} catch (e) {
		console.error('[USER][CATALOG] createCatalog error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to create catalog');
	}
}

async function updateCatalog(req, res) {
	try {
		let catalog = await UserCatalog.findOne({});

		if (!catalog) {
			const listsFromBody = extractListsFromBody(req.body || {});
			if (!Object.keys(listsFromBody).length) {
				return ApiResponse.badRequest(res, 'Send at least one catalog list', 'EMPTY_BODY');
			}

			const linkedValidationError = validateListsFromBody(listsFromBody);
			if (linkedValidationError) {
				return ApiResponse.badRequest(res, linkedValidationError, 'MISSING_IDENTIFICATION');
			}

			const catalogData = await buildFullCatalogData(listsFromBody, req.files || []);
			catalog = await UserCatalog.create(catalogData);
			return ApiResponse.success(
				res,
				buildAdminCatalogResponse(catalog),
				'Catalog created successfully'
			);
		}

		const listsFromBody = extractListsFromBody(req.body || {});
		if (!Object.keys(listsFromBody).length) {
			return ApiResponse.badRequest(res, 'Send at least one catalog list to update', 'EMPTY_BODY');
		}

		const linkedValidationError = validateListsFromBody(listsFromBody);
		if (linkedValidationError) {
			return ApiResponse.badRequest(res, linkedValidationError, 'MISSING_IDENTIFICATION');
		}

		sanitizeCatalogForSave(catalog);
		await applyListUpdates(catalog, listsFromBody, req.files || []);
		catalog.version = (catalog.version || 1) + 1;
		sanitizeCatalogForSave(catalog);
		await catalog.save();

		return ApiResponse.success(
			res,
			buildAdminCatalogResponse(catalog),
			'Catalog updated successfully'
		);
	} catch (e) {
		console.error('[USER][CATALOG] updateCatalog error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update catalog');
	}
}

async function addToList(req, res) {
	try {
		const { listType } = req.body || {};
		const items = parseRequestItems(req.body?.items);

		if (!listType || !items.length) {
			return ApiResponse.badRequest(res, 'listType and items array are required', 'INVALID_BODY');
		}

		if (!VALID_LIST_TYPES.includes(listType)) {
			return ApiResponse.badRequest(
				res,
				`Invalid listType. Must be one of: ${VALID_LIST_TYPES.join(', ')}`,
				'INVALID_LIST_TYPE'
			);
		}

		const catalog = await UserCatalog.findOne({});
		if (!catalog) {
			return ApiResponse.notFound(res, 'Catalog not found. Create it first.', 'CATALOG_NOT_FOUND');
		}

		sanitizeCatalogForSave(catalog);

		const config = CATALOG_LIST_REGISTRY[listType];
		const currentList = catalog[config.dbField] || [];

		let newItems = filterNewItems(listType, currentList, items);
		if (newItems.length === 0) {
			return ApiResponse.badRequest(res, 'All items already exist in the list', 'DUPLICATE_ITEMS');
		}

		const linkedValidationError = validateLinkedListItems(listType, newItems);
		if (linkedValidationError) {
			return ApiResponse.badRequest(res, linkedValidationError, 'MISSING_IDENTIFICATION');
		}

		if (config.uploadMatchKey && req.files?.length) {
			newItems = await attachIconsFromFiles(req.files, listType, newItems);
		}

		catalog[config.dbField] = [...currentList, ...newItems];
		catalog.version = (catalog.version || 1) + 1;
		sanitizeCatalogForSave(catalog);
		await catalog.save();

		return ApiResponse.success(res, {
			listType,
			addedItems: newItems,
			totalItems: catalog[config.dbField].length,
			version: catalog.version,
		}, 'Items added successfully');
	} catch (e) {
		console.error('[USER][CATALOG] addToList error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to add items to list');
	}
}

async function removeFromList(req, res) {
	try {
		const { listType } = req.body || {};
		const items = parseRequestItems(req.body?.items);

		if (!listType || !items.length) {
			return ApiResponse.badRequest(res, 'listType and items array are required', 'INVALID_BODY');
		}

		if (!VALID_LIST_TYPES.includes(listType)) {
			return ApiResponse.badRequest(
				res,
				`Invalid listType. Must be one of: ${VALID_LIST_TYPES.join(', ')}`,
				'INVALID_LIST_TYPE'
			);
		}

		const catalog = await UserCatalog.findOne({});
		if (!catalog) {
			return ApiResponse.notFound(res, 'Catalog not found');
		}

		sanitizeCatalogForSave(catalog);

		const config = CATALOG_LIST_REGISTRY[listType];
		const currentList = catalog[config.dbField] || [];
		const removedItems = getRemovedKeys(listType, currentList, items);

		if (removedItems.length === 0) {
			return ApiResponse.badRequest(res, 'None of the items exist in the list', 'ITEMS_NOT_FOUND');
		}

		catalog[config.dbField] = filterRemoveItems(listType, currentList, items);
		catalog.version = (catalog.version || 1) + 1;
		sanitizeCatalogForSave(catalog);
		await catalog.save();

		return ApiResponse.success(res, {
			listType,
			removedItems,
			totalItems: catalog[config.dbField].length,
			version: catalog.version,
		}, 'Items removed successfully');
	} catch (e) {
		console.error('[USER][CATALOG] removeFromList error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to remove items from list');
	}
}

async function deleteCatalog(req, res) {
	try {
		const result = await UserCatalog.deleteOne({});
		if (result.deletedCount === 0) {
			return ApiResponse.notFound(res, 'Catalog not found');
		}
		return ApiResponse.success(res, null, 'Catalog deleted successfully');
	} catch (e) {
		console.error('[USER][CATALOG] deleteCatalog error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to delete catalog');
	}
}

async function getList(req, res) {
	try {
		const { listType } = req.params || {};

		if (!VALID_LIST_TYPES.includes(listType)) {
			return ApiResponse.badRequest(
				res,
				`Invalid listType. Must be one of: ${VALID_LIST_TYPES.join(', ')}`,
				'INVALID_LIST_TYPE'
			);
		}

		const catalog = await UserCatalog.findOne({}).lean();
		if (!catalog) {
			return ApiResponse.success(res, {
				listType,
				items: [],
				count: 0,
				version: 0,
			}, 'Catalog not configured');
		}

		const config = CATALOG_LIST_REGISTRY[listType];
		let items = normalizeListByType(listType, catalog[config.dbField] || []);
		const identification = resolveIdentificationFilter(req);

		if (config.filterByIdentification && identification) {
			items = filterByIdentification(items, identification);
		}

		return ApiResponse.success(res, {
			listType,
			items,
			count: items.length,
			version: catalog.version || 1,
			...(identification ? { identificationFilter: identification } : {}),
		});
	} catch (e) {
		console.error('[USER][CATALOG] getList error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch list');
	}
}

module.exports = {
	getCatalog,
	getCatalogAdmin,
	createCatalog,
	updateCatalog,
	addToList,
	removeFromList,
	deleteCatalog,
	getList,
};
