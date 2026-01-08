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

		// Fetch user's stored preferences to use as default filters
		const user = await User.findById(currentUserId).select('preferences dating.preferences location').lean();
		const userPreferences = user?.dating?.preferences || {};
		const userLocation = user?.location || {};

		console.log('[DATING][PROFILE] User preferences:', {
			ageRange: userPreferences.ageRange,
			hereTo: userPreferences.hereTo,
			wantToMeet: userPreferences.wantToMeet,
			languages: userPreferences.languages,
			distanceRange: userPreferences.distanceRange,
			location: userLocation
		});

		// Use query parameters if provided, otherwise fall back to user's stored preferences
		// IMPORTANT: Only use preferences if they are explicitly set (not empty strings)
		// This ensures new profiles see all profiles without filters initially
		let finalHereTo = null;
		if (hereTo !== null && hereTo !== undefined) {
			finalHereTo = hereTo;
		} else {
			const prefHereTo = userPreferences.hereTo || user?.preferences?.hereFor;
			if (prefHereTo && prefHereTo.trim() !== '') {
				finalHereTo = prefHereTo;
			}
		}
		
		let finalWantToMeet = null;
		if (wantToMeet !== null && wantToMeet !== undefined) {
			finalWantToMeet = wantToMeet;
		} else {
			const prefWantToMeet = userPreferences.wantToMeet || user?.preferences?.wantToMeet;
			if (prefWantToMeet && prefWantToMeet.trim() !== '') {
				finalWantToMeet = prefWantToMeet;
			}
		}
		
		// Age range: use query params or user's stored preferences
		// Only use preferences if they are explicitly set (not default values 18-100)
		let finalAgeMin = null;
		let finalAgeMax = null;
		if (ageMin !== null && ageMin !== undefined && ageMin !== '') {
			finalAgeMin = parseInt(ageMin, 10);
		} else if (userPreferences.ageRange?.min && userPreferences.ageRange.min !== 18) {
			// Only use if not the default value
			finalAgeMin = userPreferences.ageRange.min;
		}
		if (ageMax !== null && ageMax !== undefined && ageMax !== '') {
			finalAgeMax = parseInt(ageMax, 10);
		} else if (userPreferences.ageRange?.max && userPreferences.ageRange.max !== 100) {
			// Only use if not the default value
			finalAgeMax = userPreferences.ageRange.max;
		}

		// Languages: use query params or user's stored preferences
		// Only use if explicitly set (not empty array)
		let languagesArray = null;
		if (languages) {
			if (typeof languages === 'string') {
				languagesArray = languages.split(',').map(lang => lang.trim()).filter(lang => lang);
			} else if (Array.isArray(languages)) {
				languagesArray = languages;
			}
		} else if (userPreferences.languages && Array.isArray(userPreferences.languages) && userPreferences.languages.length > 0) {
			const filteredLangs = userPreferences.languages.filter(lang => lang && lang.trim() !== '');
			if (filteredLangs.length > 0) {
				languagesArray = filteredLangs;
			}
		}

		// Location: use query params or user's stored preferences
		// Only use if explicitly set (not empty strings)
		const location = {};
		if (city) {
			location.city = city;
		} else if (userLocation.city && userLocation.city.trim() !== '') {
			location.city = userLocation.city;
		}
		if (country) {
			location.country = country;
		} else if (userLocation.country && userLocation.country.trim() !== '') {
			location.country = userLocation.country;
		}

		// Distance: use query params or user's stored preferences
		// Only use if explicitly set (not default value 100)
		let finalDistanceMax = distanceMax ? parseFloat(distanceMax) : null;
		if (!finalDistanceMax && userPreferences.distanceRange?.max && userPreferences.distanceRange.max !== 100) {
			finalDistanceMax = userPreferences.distanceRange.max;
		}
		if (filter === 'near_by' && !finalDistanceMax) {
			// Default to 50km for "near_by" filter
			finalDistanceMax = 50;
		}

		// Build filters object (query params override user preferences)
		const filters = {
			search: search.trim(),
			hereTo: finalHereTo,
			wantToMeet: finalWantToMeet,
			ageMin: finalAgeMin,
			ageMax: finalAgeMax,
			languages: languagesArray,
			location: Object.keys(location).length > 0 ? location : null,
			distanceMax: finalDistanceMax,
			filter
		};

		console.log('[DATING][PROFILE] Final filters applied:', {
			fromQuery: { hereTo, wantToMeet, ageMin, ageMax, languages, city, country, distanceMax },
			fromPreferences: {
				hereTo: userPreferences.hereTo || user?.preferences?.hereFor,
				wantToMeet: userPreferences.wantToMeet,
				ageRange: userPreferences.ageRange,
				languages: userPreferences.languages,
				distanceRange: userPreferences.distanceRange
			},
			finalFilters: filters
		});

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
		// IMPORTANT: Location in preferences is ONLY for filtering other users, NOT for setting user's actual location
		// User's actual location (user.location) should be set separately via profile update
		// Only update the filter preference location, not the user's actual location
		if (location !== undefined) {
			// Only update dating preferences location (for filtering), NOT user's actual location
			user.dating.preferences.location = {
				city: location.city || '',
				country: location.country || '',
				coordinates: {
					lat: location.coordinates?.lat ?? location.lat ?? null,
					lng: location.coordinates?.lng ?? location.lng ?? null
				}
			};
			// DO NOT update user.location - that's the user's actual location, not a filter preference
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

