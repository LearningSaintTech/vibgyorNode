const ApiResponse = require('../../../utils/apiResponse');
const datingProfileService = require('../services/datingProfileService');
const User = require('../../auth/model/userAuthModel');

function normalizeLanguages(languages) {
	if (!languages) {
		return [];
	}

	if (Array.isArray(languages)) {
		return languages.filter(Boolean);
	}

	if (typeof languages === 'string') {
		return languages.split(',').map(lang => lang.trim()).filter(Boolean);
	}

	return [];
}

function buildPreferencesResponse(user) {
	const primaryLanguage = user.preferences?.primaryLanguage || '';
	const secondaryLanguage = user.preferences?.secondaryLanguage || '';
	const languages = [primaryLanguage, secondaryLanguage].filter(Boolean);

	return {
		hereTo: user.preferences?.hereFor || '',
		wantToMeet: user.preferences?.wantToMeet || '',
		ageRange: user.dating?.preferences?.ageRange || { min: 18, max: 100 },
		languages,
		location: {
			city: user.location?.city || '',
			country: user.location?.country || '',
			coordinates: {
				lat: user.location?.lat ?? null,
				lng: user.location?.lng ?? null
			}
		},
		distanceRange: user.dating?.preferences?.distanceRange || { min: 0, max: 100 }
	};
}

/**
 * Get all dating profiles with filters
 * Supports search by name/username and various filters
 */
async function getAllDatingProfiles(req, res) {
	try {
		console.log('[DATING][PROFILE] getAllDatingProfiles request', { query: req.query, userId: req.user?.userId });
		
		const currentUserId = req.user?.userId;
		if (!currentUserId) {
			return ApiResponse.unauthorized(res, 'User not authenticated');
		}

		// Extract query parameters
		const {
			search = '', // Search by name or username
			hereTo = null, // "Make New Friends", "Dating", etc. (maps to preferences.hereFor)
			wantToMeet = null, // "Woman", "Man", "Everyone"
			ageMin = null,
			ageMax = null,
			languages = null, // Comma-separated or array
			city = null,
			country = null, // Note: location doesn't have state field in schema
			distanceMax = null, // in km
			filter = 'all', // 'all', 'liked_you', 'liked_by_you', 'new_dater', 'near_by', 'same_interests'
			page = 1,
			limit = 20
		} = req.query;

		// Parse languages if provided as string
		let languagesArray = null;
		if (languages) {
			if (typeof languages === 'string') {
				languagesArray = languages.split(',').map(lang => lang.trim()).filter(lang => lang);
			} else if (Array.isArray(languages)) {
				languagesArray = languages;
			}
		}

		// Build location object (note: schema only has city and country, no state)
		const location = {};
		if (city) location.city = city;
		if (country) location.country = country;

		// Build filters object
		const filters = {
			search: search.trim(),
			hereTo,
			wantToMeet,
			ageMin: ageMin ? parseInt(ageMin, 10) : null,
			ageMax: ageMax ? parseInt(ageMax, 10) : null,
			languages: languagesArray,
			location: Object.keys(location).length > 0 ? location : null,
			distanceMax: distanceMax ? parseFloat(distanceMax) : null,
			filter
		};

		// Get profiles
		const result = await datingProfileService.getAllDatingProfiles(
			currentUserId,
			filters,
			{
				page: parseInt(page, 10),
				limit: parseInt(limit, 10)
			}
		);

		console.log('[DATING][PROFILE] getAllDatingProfiles result', {
			count: result.profiles.length,
			page: result.pagination?.page,
			limit: result.pagination?.limit
		});

		return ApiResponse.success(
			res,
			{
				profiles: result.profiles,
				pagination: result.pagination,
				filters: filters
			},
			'Dating profiles retrieved successfully'
		);

	} catch (error) {
		console.error('[DATING][PROFILE] Error:', error?.message || error);
		return ApiResponse.serverError(res, `Failed to get dating profiles: ${error.message}`);
	}
}

/**
 * Update dating preferences
 */
async function updateDatingPreferences(req, res) {
	try {
		console.log('[DATING][PREFERENCES] update request', { body: req.body, userId: req.user?.userId });
		
		const currentUserId = req.user?.userId;
		if (!currentUserId) {
			return ApiResponse.unauthorized(res, 'User not authenticated');
		}

		const user = await User.findById(currentUserId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const {
			hereTo,
			wantToMeet,
			ageMin,
			ageMax,
			languages,
			location,
			distanceMin,
			distanceMax
		} = req.body;

		const languagesArr = normalizeLanguages(languages);

		// Initialize dating object if it doesn't exist
		if (!user.dating) {
			user.dating = {
				photos: [],
				videos: [],
				isDatingProfileActive: false,
				preferences: {},
				lastUpdatedAt: null
			};
		}

		if (!user.dating.preferences) {
			user.dating.preferences = {};
		}

		if (!user.preferences) {
			user.preferences = {};
		}

		// Update preferences
		if (hereTo !== undefined) {
			user.preferences.hereFor = hereTo;
			user.dating.preferences.hereTo = hereTo;
		}
		if (wantToMeet !== undefined) {
			user.preferences.wantToMeet = wantToMeet;
			user.dating.preferences.wantToMeet = wantToMeet;
		}
		if (languagesArr.length) {
			user.preferences.primaryLanguage = languagesArr[0] || '';
			user.preferences.secondaryLanguage = languagesArr[1] || '';
			user.dating.preferences.languages = languagesArr;
		}
		if (ageMin !== undefined || ageMax !== undefined) {
			if (!user.dating.preferences.ageRange) {
				user.dating.preferences.ageRange = { min: 18, max: 100 };
			}
			if (ageMin !== undefined) {
				user.dating.preferences.ageRange.min = parseInt(ageMin, 10);
			}
			if (ageMax !== undefined) {
				user.dating.preferences.ageRange.max = parseInt(ageMax, 10);
			}
		}
		if (location !== undefined) {
			user.location = {
				city: location.city || '',
				country: location.country || '',
				lat: location.coordinates?.lat ?? location.lat ?? null,
				lng: location.coordinates?.lng ?? location.lng ?? null
			};
			user.dating.preferences.location = {
				city: user.location.city,
				country: user.location.country,
				coordinates: {
					lat: user.location.lat,
					lng: user.location.lng
				}
			};
		}
		if (distanceMin !== undefined || distanceMax !== undefined) {
			if (!user.dating.preferences.distanceRange) {
				user.dating.preferences.distanceRange = { min: 0, max: 100 };
			}
			if (distanceMin !== undefined) {
				user.dating.preferences.distanceRange.min = parseFloat(distanceMin);
			}
			if (distanceMax !== undefined) {
				user.dating.preferences.distanceRange.max = parseFloat(distanceMax);
			}
		}

		user.dating.lastUpdatedAt = new Date();
		user.markModified('preferences');
		await user.save();

		const preferencesResponse = buildPreferencesResponse(user);
		return ApiResponse.success(
			res,
			{
				preferences: preferencesResponse
			},
			'Dating preferences updated successfully'
		);

	} catch (error) {
		console.error('[DATING][PREFERENCES] Error:', error?.message || error);
		return ApiResponse.serverError(res, `Failed to update dating preferences: ${error.message}`);
	}
}

/**
 * Get dating preferences
 */
async function getDatingPreferences(req, res) {
	try {
		console.log('[DATING][PREFERENCES] get request', { userId: req.user?.userId });
		const currentUserId = req.user?.userId;
		if (!currentUserId) {
			return ApiResponse.unauthorized(res, 'User not authenticated');
		}

		const user = await User.findById(currentUserId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const preferences = buildPreferencesResponse(user);

		return ApiResponse.success(
			res,
			{
				preferences: preferences
			},
			'Dating preferences retrieved successfully'
		);

	} catch (error) {
		console.error('[DATING][PREFERENCES] Error:', error?.message || error);
		return ApiResponse.serverError(res, 'Failed to get dating preferences');
	}
}

module.exports = {
	getAllDatingProfiles,
	updateDatingPreferences,
	getDatingPreferences
};

