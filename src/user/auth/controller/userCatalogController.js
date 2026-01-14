const UserCatalog = require('../model/userCatalogModel');
const ApiResponse = require('../../../utils/apiResponse');
const { uploadToS3 } = require('../../../services/s3Service');
const multer = require('multer');
const { uploadMultiple } = require('../../../middleware/uploadMiddleware');

const DEFAULT_CATALOG = {
	genderList: ['male', 'female', 'non-binary', 'transgender', 'agender', 'prefer-not-to-say'],
	pronounList: ['he/him', 'she/her', 'they/them', 'he/they', 'she/they'],
	// Convert string arrays to object arrays with SVG support (for backward compatibility, can also accept strings)
	likeList: [
		{ name: 'music' },
		{ name: 'travel' },
		{ name: 'movies' },
		{ name: 'fitness' },
		{ name: 'foodie' },
		{ name: 'gaming' },
		{ name: 'reading' }
	],
	interestList: [
		{ name: 'hiking' },
		{ name: 'photography' },
		{ name: 'coding' },
		{ name: 'dancing' },
		{ name: 'yoga' },
		{ name: 'art' },
		{ name: 'pets' }
	],
	hereForList: ['friendship', 'dating', 'networking', 'fun', 'serious-relationship', 'new-friends', 'chat'],
	languageList: ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Portuguese', 'Russian', 'Italian']
};

// Helper function to normalize interest/like data - converts strings to objects for backward compatibility
function normalizeInterestItems(items) {
	if (!items || !Array.isArray(items)) return [];
	return items.map(item => {
		// If it's already an object with name, return as is
		if (typeof item === 'object' && item !== null && item.name) {
			return item;
		}
		// If it's a string, convert to object
		if (typeof item === 'string') {
			return { name: item };
		}
		// Invalid format, return null (will be filtered)
		return null;
	}).filter(item => item !== null);
}

// Helper function to map listType to database field name
function getFieldName(listType) {
	const fieldMapping = {
		'gender': 'genderList',
		'pronouns': 'pronounList',
		'likes': 'likeList',
		'interests': 'interestList',
		'hereFor': 'hereForList',
		'languages': 'languageList'
	};
	return fieldMapping[listType];
}

// Helper function to parse form-data body fields (handles JSON strings)
function parseBodyField(fieldValue) {
	if (!fieldValue) return fieldValue;
	if (typeof fieldValue === 'string' && fieldValue.trim().startsWith('[')) {
		try {
			return JSON.parse(fieldValue);
		} catch (e) {
			return fieldValue;
		}
	}
	if (typeof fieldValue === 'string' && fieldValue.trim().startsWith('{')) {
		try {
			return JSON.parse(fieldValue);
		} catch (e) {
			return fieldValue;
		}
	}
	return fieldValue;
}

// Helper function to process uploaded files and map them to items
async function processFileUploads(files, items, itemType = 'interest') {
	if (!files || files.length === 0) return items;
	
	// Create a map of filename to file object (assuming filename format: "itemName.svg")
	const fileMap = {};
	files.forEach(file => {
		const filename = file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension
		fileMap[filename.toLowerCase()] = file;
	});
	
	// Process items and add SVG URLs from uploaded files
	const processedItems = await Promise.all(
		normalizeInterestItems(items).map(async (item) => {
			const itemName = item.name || item;
			const matchingFile = fileMap[itemName.toLowerCase()];
			
			if (matchingFile && (matchingFile.mimetype === 'image/svg+xml' || matchingFile.mimetype === 'image/svg')) {
				try {
					// Upload to S3
					const uploadResult = await uploadToS3({
						buffer: matchingFile.buffer,
						contentType: matchingFile.mimetype,
						userId: 'catalog', // Use 'catalog' as userId for catalog-related uploads
						category: 'catalog',
						type: 'svgs',
						filename: matchingFile.originalname,
						metadata: {
							itemName: itemName,
							itemType: itemType,
							uploadedAt: new Date().toISOString()
						}
					});
					
					return {
						name: itemName,
						svgUrl: uploadResult.url,
						svgKey: uploadResult.key
					};
				} catch (error) {
					console.error(`[USER][CATALOG] Failed to upload SVG for ${itemName}:`, error.message);
					// Return item without SVG URL if upload fails
					return { name: itemName };
				}
			}
			
			// If no matching file or already has svgUrl, return as is
			return typeof item === 'object' ? item : { name: itemName };
		})
	);
	
	return processedItems;
}

// GET - Fetch catalog
async function getCatalog(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][CATALOG] getCatalog request started');
		console.log('[USER][CATALOG] Request headers:', req.headers);
		console.log('[USER][CATALOG] User info:', req.user);
		
		let catalog = await UserCatalog.findOne({}).lean();
		console.log('[USER][CATALOG] Database query result:', catalog ? 'Found catalog' : 'No catalog found');
		console.log('[USER][CATALOG] Full catalog object from DB (getCatalog):', JSON.stringify(catalog, null, 2));
		
		if (!catalog) {
			// seed defaults
			console.log('[USER][CATALOG] Creating default catalog with data:', DEFAULT_CATALOG);
			catalog = await UserCatalog.create(DEFAULT_CATALOG);
			console.log('[USER][CATALOG] Seeded default catalogs with ID:', catalog._id);
		} else {
			console.log('[USER][CATALOG] Using existing catalog with ID:', catalog._id);
			console.log('[USER][CATALOG] Raw catalog data from DB:', {
				genderList: catalog.genderList,
				pronounList: catalog.pronounList,
				likeList: catalog.likeList,
				interestList: catalog.interestList,
				version: catalog.version
			});
		}
		
		// Normalize interest/like items (convert strings to objects if needed)
		const normalizedLikes = normalizeInterestItems(catalog.likeList || []);
		const normalizedInterests = normalizeInterestItems(catalog.interestList || []);
		
		const responseData = {
			gender: catalog.genderList || [],
			pronouns: catalog.pronounList || [],
			likes: normalizedLikes,
			interests: normalizedInterests,
			hereFor: catalog.hereForList || [],
			languages: catalog.languageList || [],
			version: catalog.version || 1,
		};
		
		console.log('[USER][CATALOG] Returning response data:', responseData);
		console.log('[USER][CATALOG] getCatalog request completed successfully');
		
		return ApiResponse.success(res, responseData);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][CATALOG] getCatalog error:', e?.message || e);
		console.error('[USER][CATALOG] Error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to fetch catalog');
	}
}

// POST - Create new catalog
async function createCatalog(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][CATALOG] createCatalog request started');
		console.log('[USER][CATALOG] Request body:', req.body);
		console.log('[USER][CATALOG] Request files:', req.files ? req.files.length : 0);
		console.log('[USER][CATALOG] User info:', req.user);
		
		// Parse body data (can be JSON or form-data)
		const genderList = parseBodyField(req.body?.genderList);
		const pronounList = parseBodyField(req.body?.pronounList);
		const likeList = parseBodyField(req.body?.likeList);
		const interestList = parseBodyField(req.body?.interestList);
		const hereForList = parseBodyField(req.body?.hereForList);
		const languageList = parseBodyField(req.body?.languageList);
		
		console.log('[USER][CATALOG] Extracted data:', { genderList, pronounList, likeList, interestList, hereForList, languageList });
		
		// Check if catalog already exists
		console.log('[USER][CATALOG] Checking for existing catalog...');
		const existingCatalog = await UserCatalog.findOne({});
		if (existingCatalog) {
			console.log('[USER][CATALOG] Catalog already exists with ID:', existingCatalog._id);
			return ApiResponse.conflict(res, 'Catalog already exists. Use update instead.');
		}
		console.log('[USER][CATALOG] No existing catalog found, proceeding with creation');

		// Process file uploads if files are present
		let processedLikeList = likeList ? normalizeInterestItems(likeList) : DEFAULT_CATALOG.likeList;
		let processedInterestList = interestList ? normalizeInterestItems(interestList) : DEFAULT_CATALOG.interestList;
		
		if (req.files && req.files.length > 0) {
			console.log('[USER][CATALOG] Processing file uploads...');
			if (likeList) {
				processedLikeList = await processFileUploads(req.files, likeList, 'like');
			}
			if (interestList) {
				processedInterestList = await processFileUploads(req.files, interestList, 'interest');
			}
		}

		const catalogData = {
			genderList: genderList || DEFAULT_CATALOG.genderList,
			pronounList: pronounList || DEFAULT_CATALOG.pronounList,
			likeList: processedLikeList,
			interestList: processedInterestList,
			hereForList: hereForList || DEFAULT_CATALOG.hereForList,
			languageList: languageList || DEFAULT_CATALOG.languageList,
		};
		console.log('[USER][CATALOG] Creating catalog with data:', catalogData);
		
		const catalog = await UserCatalog.create(catalogData);
		console.log('[USER][CATALOG] Catalog created successfully with ID:', catalog._id);

		// Normalize interest/like items for response
		const normalizedLikes = normalizeInterestItems(catalog.likeList || []);
		const normalizedInterests = normalizeInterestItems(catalog.interestList || []);
		
		const responseData = {
			id: catalog._id,
			gender: catalog.genderList,
			pronouns: catalog.pronounList,
			likes: normalizedLikes,
			interests: normalizedInterests,
			hereFor: catalog.hereForList,
			languages: catalog.languageList,
			version: catalog.version,
		};
		console.log('[USER][CATALOG] Returning response data:', responseData);
		console.log('[USER][CATALOG] createCatalog request completed successfully');
		
		return ApiResponse.success(res, responseData, 'Catalog created successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][CATALOG] createCatalog error:', e?.message || e);
		console.error('[USER][CATALOG] Error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to create catalog');
	}
}

// PUT - Update entire catalog
async function updateCatalog(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][CATALOG] updateCatalog request started');
		console.log('[USER][CATALOG] Request body:', req.body);
		console.log('[USER][CATALOG] Request files:', req.files ? req.files.length : 0);
		console.log('[USER][CATALOG] User info:', req.user);
		
		// Parse body data (can be JSON or form-data)
		const genderList = parseBodyField(req.body?.genderList);
		const pronounList = parseBodyField(req.body?.pronounList);
		const likeList = parseBodyField(req.body?.likeList);
		const interestList = parseBodyField(req.body?.interestList);
		const hereForList = parseBodyField(req.body?.hereForList);
		const languageList = parseBodyField(req.body?.languageList);
		
		console.log('[USER][CATALOG] Extracted data:', { genderList, pronounList, likeList, interestList, hereForList, languageList });
		
		console.log('[USER][CATALOG] Finding existing catalog...');
		let catalog = await UserCatalog.findOne({});
		if (!catalog) {
			// Create if doesn't exist
			console.log('[USER][CATALOG] No existing catalog found, creating new one');
			
			// Process file uploads if files are present
			let processedLikeList = likeList ? normalizeInterestItems(likeList) : DEFAULT_CATALOG.likeList;
			let processedInterestList = interestList ? normalizeInterestItems(interestList) : DEFAULT_CATALOG.interestList;
			
			if (req.files && req.files.length > 0) {
				console.log('[USER][CATALOG] Processing file uploads...');
				if (likeList) {
					processedLikeList = await processFileUploads(req.files, likeList, 'like');
				}
				if (interestList) {
					processedInterestList = await processFileUploads(req.files, interestList, 'interest');
				}
			}
			
			const catalogData = {
				genderList: genderList || DEFAULT_CATALOG.genderList,
				pronounList: pronounList || DEFAULT_CATALOG.pronounList,
				likeList: processedLikeList,
				interestList: processedInterestList,
				hereForList: hereForList || DEFAULT_CATALOG.hereForList,
				languageList: languageList || DEFAULT_CATALOG.languageList,
			};
			console.log('[USER][CATALOG] Creating catalog with data:', catalogData);
			catalog = await UserCatalog.create(catalogData);
			console.log('[USER][CATALOG] Catalog created with ID:', catalog._id);
		} else {
			// Update existing
			console.log('[USER][CATALOG] Found existing catalog with ID:', catalog._id);
			console.log('[USER][CATALOG] Current catalog data:', {
				genderList: catalog.genderList,
				pronounList: catalog.pronounList,
				likeList: catalog.likeList,
				interestList: catalog.interestList,
				hereForList: catalog.hereForList,
				languageList: catalog.languageList,
				version: catalog.version
			});
			
			if (genderList) {
				console.log('[USER][CATALOG] Updating genderList from', catalog.genderList, 'to', genderList);
				catalog.genderList = genderList;
			}
			if (pronounList) {
				console.log('[USER][CATALOG] Updating pronounList from', catalog.pronounList, 'to', pronounList);
				catalog.pronounList = pronounList;
			}
			if (likeList) {
				console.log('[USER][CATALOG] Updating likeList...');
				let processedLikeList = normalizeInterestItems(likeList);
				if (req.files && req.files.length > 0) {
					processedLikeList = await processFileUploads(req.files, likeList, 'like');
				}
				catalog.likeList = processedLikeList;
			}
			if (interestList) {
				console.log('[USER][CATALOG] Updating interestList...');
				let processedInterestList = normalizeInterestItems(interestList);
				if (req.files && req.files.length > 0) {
					processedInterestList = await processFileUploads(req.files, interestList, 'interest');
				}
				catalog.interestList = processedInterestList;
			}
			if (hereForList) {
				console.log('[USER][CATALOG] Updating hereForList from', catalog.hereForList, 'to', hereForList);
				catalog.hereForList = hereForList;
			}
			if (languageList) {
				console.log('[USER][CATALOG] Updating languageList from', catalog.languageList, 'to', languageList);
				catalog.languageList = languageList;
			}
			catalog.version = (catalog.version || 1) + 1;
			console.log('[USER][CATALOG] Incremented version to:', catalog.version);
			
			await catalog.save();
			console.log('[USER][CATALOG] Catalog saved successfully');
		}

		// Normalize interest/like items for response
		const normalizedLikes = normalizeInterestItems(catalog.likeList || []);
		const normalizedInterests = normalizeInterestItems(catalog.interestList || []);
		
		const responseData = {
			id: catalog._id,
			gender: catalog.genderList,
			pronouns: catalog.pronounList,
			likes: normalizedLikes,
			interests: normalizedInterests,
			hereFor: catalog.hereForList,
			languages: catalog.languageList,
			version: catalog.version,
		};
		console.log('[USER][CATALOG] Returning response data:', responseData);
		console.log('[USER][CATALOG] updateCatalog request completed successfully');
		
		return ApiResponse.success(res, responseData, 'Catalog updated successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][CATALOG] updateCatalog error:', e?.message || e);
		console.error('[USER][CATALOG] Error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to update catalog');
	}
}

// PATCH - Add items to specific list
async function addToList(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][CATALOG] addToList request started');
		console.log('[USER][CATALOG] Request body:', req.body);
		console.log('[USER][CATALOG] User info:', req.user);
		
		const { listType, items } = req.body || {};
		console.log('[USER][CATALOG] Extracted data:', { listType, items });
		
		if (!listType || !items || !Array.isArray(items)) {
			console.log('[USER][CATALOG] Validation failed: listType and items array are required');
			return ApiResponse.badRequest(res, 'listType and items array are required');
		}

		const validListTypes = ['gender', 'pronouns', 'likes', 'interests'];
		if (!validListTypes.includes(listType)) {
			console.log('[USER][CATALOG] Validation failed: Invalid listType:', listType);
			return ApiResponse.badRequest(res, 'Invalid listType. Must be one of: gender, pronouns, likes, interests');
		}
		console.log('[USER][CATALOG] Validation passed for listType:', listType);

		console.log('[USER][CATALOG] Finding existing catalog...');
		let catalog = await UserCatalog.findOne({});
		if (!catalog) {
			console.log('[USER][CATALOG] No existing catalog found, creating default');
			catalog = await UserCatalog.create(DEFAULT_CATALOG);
			console.log('[USER][CATALOG] Default catalog created with ID:', catalog._id);
		} else {
			console.log('[USER][CATALOG] Found existing catalog with ID:', catalog._id);
		}

		const listField = getFieldName(listType);
		console.log('[USER][CATALOG] Field mapping:', listType, '->', listField);
		const currentList = catalog[listField] || [];
		console.log('[USER][CATALOG] Current list for', listType, ':', currentList);
		console.log('[USER][CATALOG] Items to add:', items);
		
		// Normalize items to add (convert strings to objects)
		const normalizedItems = normalizeInterestItems(items);
		
		// Check for duplicates by comparing names
		const existingNames = currentList.map(item => {
			return typeof item === 'string' ? item : (item?.name || '');
		});
		
		const newItems = normalizedItems.filter(item => !existingNames.includes(item.name));
		console.log('[USER][CATALOG] New items (not duplicates):', newItems);
		
		if (newItems.length === 0) {
			console.log('[USER][CATALOG] All items already exist in the list');
			return ApiResponse.badRequest(res, 'All items already exist in the list');
		}

		catalog[listField] = [...currentList, ...newItems];
		catalog.version = (catalog.version || 1) + 1;
		console.log('[USER][CATALOG] Updated list:', catalog[listField]);
		console.log('[USER][CATALOG] Incremented version to:', catalog.version);
		
		await catalog.save();
		console.log('[USER][CATALOG] Catalog saved successfully');

		const responseData = {
			listType,
			addedItems: newItems,
			totalItems: catalog[listField].length,
			version: catalog.version,
		};
		console.log('[USER][CATALOG] Returning response data:', responseData);
		console.log('[USER][CATALOG] addToList request completed successfully');
		
		return ApiResponse.success(res, responseData, 'Items added successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][CATALOG] addToList error:', e?.message || e);
		console.error('[USER][CATALOG] Error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to add items to list');
	}
}

// PATCH - Remove items from specific list
async function removeFromList(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][CATALOG] removeFromList request started');
		console.log('[USER][CATALOG] Request body:', req.body);
		console.log('[USER][CATALOG] User info:', req.user);
		
		const { listType, items } = req.body || {};
		console.log('[USER][CATALOG] Extracted data:', { listType, items });
		
		if (!listType || !items || !Array.isArray(items)) {
			console.log('[USER][CATALOG] Validation failed: listType and items array are required');
			return ApiResponse.badRequest(res, 'listType and items array are required');
		}

		const validListTypes = ['gender', 'pronouns', 'likes', 'interests'];
		if (!validListTypes.includes(listType)) {
			console.log('[USER][CATALOG] Validation failed: Invalid listType:', listType);
			return ApiResponse.badRequest(res, 'Invalid listType. Must be one of: gender, pronouns, likes, interests');
		}
		console.log('[USER][CATALOG] Validation passed for listType:', listType);

		console.log('[USER][CATALOG] Finding existing catalog...');
		const catalog = await UserCatalog.findOne({});
		if (!catalog) {
			console.log('[USER][CATALOG] Catalog not found');
			return ApiResponse.notFound(res, 'Catalog not found');
		}
		console.log('[USER][CATALOG] Found existing catalog with ID:', catalog._id);
		console.log('[USER][CATALOG] Full catalog object from DB:', JSON.stringify(catalog, null, 2));

		const listField = getFieldName(listType);
		console.log('[USER][CATALOG] Field mapping:', listType, '->', listField);
		console.log('[USER][CATALOG] Available fields in catalog:', Object.keys(catalog.toObject ? catalog.toObject() : catalog));
		const currentList = catalog[listField] || [];
		console.log('[USER][CATALOG] Current list for', listType, ':', currentList);
		console.log('[USER][CATALOG] Items to remove:', items);
		
		// Normalize items to remove (handle both strings and objects)
		const itemsToRemove = items.map(item => typeof item === 'string' ? item : (item?.name || item));
		const existingNames = currentList.map(item => typeof item === 'string' ? item : (item?.name || ''));
		
		const removedItems = itemsToRemove.filter(item => existingNames.includes(item));
		console.log('[USER][CATALOG] Items that exist and will be removed:', removedItems);
		
		if (removedItems.length === 0) {
			console.log('[USER][CATALOG] None of the items exist in the list');
			return ApiResponse.badRequest(res, 'None of the items exist in the list');
		}

		// Filter out items by name comparison
		catalog[listField] = currentList.filter(item => {
			const itemName = typeof item === 'string' ? item : (item?.name || '');
			return !itemsToRemove.includes(itemName);
		});
		catalog.version = (catalog.version || 1) + 1;
		console.log('[USER][CATALOG] Updated list after removal:', catalog[listField]);
		console.log('[USER][CATALOG] Incremented version to:', catalog.version);
		
		await catalog.save();
		console.log('[USER][CATALOG] Catalog saved successfully');

		const responseData = {
			listType,
			removedItems,
			totalItems: catalog[listField].length,
			version: catalog.version,
		};
		console.log('[USER][CATALOG] Returning response data:', responseData);
		console.log('[USER][CATALOG] removeFromList request completed successfully');
		
		return ApiResponse.success(res, responseData, 'Items removed successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][CATALOG] removeFromList error:', e?.message || e);
		console.error('[USER][CATALOG] Error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to remove items from list');
	}
}

// DELETE - Delete entire catalog
async function deleteCatalog(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][CATALOG] deleteCatalog request started');
		console.log('[USER][CATALOG] Request headers:', req.headers);
		console.log('[USER][CATALOG] User info:', req.user);
		
		console.log('[USER][CATALOG] Attempting to delete catalog...');
		const result = await UserCatalog.deleteOne({});
		console.log('[USER][CATALOG] Delete operation result:', result);
		
		if (result.deletedCount === 0) {
			console.log('[USER][CATALOG] No catalog found to delete');
			return ApiResponse.notFound(res, 'Catalog not found');
		}

		console.log('[USER][CATALOG] Catalog deleted successfully, deleted count:', result.deletedCount);
		console.log('[USER][CATALOG] deleteCatalog request completed successfully');
		
		return ApiResponse.success(res, null, 'Catalog deleted successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][CATALOG] deleteCatalog error:', e?.message || e);
		console.error('[USER][CATALOG] Error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to delete catalog');
	}
}

// GET - Get specific list
async function getList(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][CATALOG] getList request started');
		console.log('[USER][CATALOG] Request params:', req.params);
		console.log('[USER][CATALOG] User info:', req.user);
		
		const { listType } = req.params || {};
		console.log('[USER][CATALOG] Extracted listType:', listType);
		
		const validListTypes = ['gender', 'pronouns', 'likes', 'interests'];
		if (!validListTypes.includes(listType)) {
			console.log('[USER][CATALOG] Validation failed: Invalid listType:', listType);
			return ApiResponse.badRequest(res, 'Invalid listType. Must be one of: gender, pronouns, likes, interests');
		}
		console.log('[USER][CATALOG] Validation passed for listType:', listType);

		console.log('[USER][CATALOG] Finding catalog...');
		const catalog = await UserCatalog.findOne({}).lean();
		if (!catalog) {
			console.log('[USER][CATALOG] Catalog not found');
			return ApiResponse.notFound(res, 'Catalog not found');
		}
		console.log('[USER][CATALOG] Found catalog with ID:', catalog._id);

		const listField = getFieldName(listType);
		console.log('[USER][CATALOG] Field mapping:', listType, '->', listField);
		const items = catalog[listField] || [];
		// Normalize items (convert strings to objects for consistency)
		const normalizedItems = normalizeInterestItems(items);
		console.log('[USER][CATALOG] Retrieved items for', listType, ':', normalizedItems);
		console.log('[USER][CATALOG] Item count:', normalizedItems.length);

		const responseData = {
			listType,
			items: normalizedItems,
			count: normalizedItems.length,
			version: catalog.version,
		};
		console.log('[USER][CATALOG] Returning response data:', responseData);
		console.log('[USER][CATALOG] getList request completed successfully');
		
		return ApiResponse.success(res, responseData);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][CATALOG] getList error:', e?.message || e);
		console.error('[USER][CATALOG] Error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to fetch list');
	}
}

module.exports = { 
	getCatalog, 
	createCatalog, 
	updateCatalog, 
	addToList, 
	removeFromList, 
	deleteCatalog, 
	getList 
};


