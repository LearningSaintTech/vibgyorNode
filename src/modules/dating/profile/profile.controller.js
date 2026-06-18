const ApiResponse = require('../../../utils/apiResponse');
const datingProfileService = require('./profile.service');
const { User } = require('./profile.repository');
const {
	getProfileLookingForTexts,
	getProfileIdentificationTexts,
} = require('../matching/matchUtils');

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
	const languages = Array.isArray(user.preferences) && user.preferences.length > 0
		? user.preferences
		: (user.dating?.preferences?.languages || []);

	const distanceRange = user.distance?.max != null
		? {
			min: user.distance?.min ?? 0,
			max: user.distance?.max ?? 100,
			unit: user.distance?.unit || 'km',
		}
		: (user.dating?.preferences?.distanceRange || { min: 0, max: 100 });

	return {
		hereTo: user.dating?.preferences?.hereTo || getProfileLookingForTexts(user)[0] || '',
		wantToMeet: user.dating?.preferences?.wantToMeet || getProfileIdentificationTexts(user)[0] || '',
		datingOrientation: user.dating?.preferences?.orientation || '',
		datingInterests: user.dating?.preferences?.interests || '',
		lookingFor: user.lookingFor || [],
		whatBringsYouToVibgyor: user.whatBringsYouToVibgyor || [],
		identification: user.identification || [],
		orientation: user.orientation || '',
		relationshipStyle: user.relationshipStyle || { text: '', subtext: '' },
		ageRange: user.dating?.preferences?.ageRange || { min: 18, max: 100 },
		languages,
		location: {
			city: user.dating?.preferences?.location?.city || '',
			country: user.dating?.preferences?.location?.country || '',
			coordinates: {
				lat: user.dating?.preferences?.location?.coordinates?.lat ?? user.dating?.preferences?.location?.lat ?? null,
				lng: user.dating?.preferences?.location?.coordinates?.lng ?? user.dating?.preferences?.location?.lng ?? null
			}
		},
		distanceRange,
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
			hereTo = null, // legacy alias for lookingFor filter
			lookingFor = null,
			wantToMeet = null, // legacy alias for identification filter
			identification = null,
			ageMin = null,
			ageMax = null,
			languages = null, // Comma-separated or array
			city = null,
			country = null, // Note: location doesn't have state field in schema
			distanceMax = null, // in km
			filter = 'all', // 'all', 'liked_you', 'liked_by_you', 'new_dater', 'near_by', 'same_likes' (same_interests alias)
			interests = null,
			page = 1,
			limit = 20
		} = req.query;

		// Fetch user's stored preferences to use as default filters
		const user = await User.findById(currentUserId)
			.select('preferences dating.preferences location distance lookingFor identification whatBringsYouToVibgyor orientation relationshipStyle')
			.lean();
		const userPreferences = user?.dating?.preferences || {};
		const userLocation = user?.location || {};

		console.log('[DATING][PROFILE] User preferences:', {
			ageRange: userPreferences.ageRange,
			hereTo: userPreferences.hereTo,
			wantToMeet: userPreferences.wantToMeet,
			languages: userPreferences.languages,
			distanceRange: userPreferences.distanceRange,
			interests: userPreferences.interests,
			location: userLocation
		});

		// Use query parameters by default.
		// Optional behavior: allow preference-driven defaults only when explicitly requested.
		// This avoids over-filtering (e.g. city/country + hereTo) that can hide valid profiles.
		const usePreferenceDefaults = req.query.usePreferences === 'true';

		let finalHereTo = null;
		if (hereTo !== null && hereTo !== undefined) {
			finalHereTo = hereTo;
		} else if (usePreferenceDefaults) {
			const prefHereTo = userPreferences.hereTo;
			if (prefHereTo && prefHereTo.trim() !== '') {
				finalHereTo = prefHereTo;
			}
		}
		
		let finalWantToMeet = null;
		if (wantToMeet !== null && wantToMeet !== undefined) {
			finalWantToMeet = wantToMeet;
		} else if (usePreferenceDefaults) {
			const prefWantToMeet = userPreferences.wantToMeet;
			if (prefWantToMeet && prefWantToMeet.trim() !== '') {
				finalWantToMeet = prefWantToMeet;
			}
		}
		
		// Age range: use query params or (optionally) user's stored preferences
		let finalAgeMin = null;
		let finalAgeMax = null;
		if (ageMin !== null && ageMin !== undefined && ageMin !== '') {
			finalAgeMin = parseInt(ageMin, 10);
		} else if (usePreferenceDefaults && userPreferences.ageRange?.min && userPreferences.ageRange.min !== 18) {
			// Only use if not the default value
			finalAgeMin = userPreferences.ageRange.min;
		}
		if (ageMax !== null && ageMax !== undefined && ageMax !== '') {
			finalAgeMax = parseInt(ageMax, 10);
		} else if (usePreferenceDefaults && userPreferences.ageRange?.max && userPreferences.ageRange.max !== 100) {
			// Only use if not the default value
			finalAgeMax = userPreferences.ageRange.max;
		}

		// Languages: use query params or (optionally) user's stored preferences
		let languagesArray = null;
		if (languages) {
			if (typeof languages === 'string') {
				languagesArray = languages.split(',').map(lang => lang.trim()).filter(lang => lang);
			} else if (Array.isArray(languages)) {
				languagesArray = languages;
			}
		} else if (usePreferenceDefaults && userPreferences.languages && Array.isArray(userPreferences.languages) && userPreferences.languages.length > 0) {
			const filteredLangs = userPreferences.languages.filter(lang => lang && lang.trim() !== '');
			if (filteredLangs.length > 0) {
				languagesArray = filteredLangs;
			}
		}

		// Location: use explicit query params only by default.
		// Preference fallback can be enabled via usePreferences=true.
		const location = {};
		if (city) {
			location.city = city;
		} else if (usePreferenceDefaults && userPreferences.location?.city && userPreferences.location.city.trim() !== '') {
			location.city = userPreferences.location.city;
		}
		if (country) {
			location.country = country;
		} else if (usePreferenceDefaults && userPreferences.location?.country && userPreferences.location.country.trim() !== '') {
			location.country = userPreferences.location.country;
		}

		// Distance: use query params or (optionally) user's stored preferences
		let finalDistanceMax = distanceMax ? parseFloat(distanceMax) : null;
		const storedDistanceMax = user?.distance?.max ?? userPreferences.distanceRange?.max;
		if (!finalDistanceMax && usePreferenceDefaults && storedDistanceMax && storedDistanceMax !== 100) {
			finalDistanceMax = storedDistanceMax;
		}
		if (filter === 'near_by' && !finalDistanceMax) {
			// Default to 50km for "near_by" filter
			finalDistanceMax = 50;
		}

		// Interests: use query params or user preferences fallback
		let finalInterests = null;
		if (interests !== null && interests !== undefined) {
			finalInterests = interests;
		} else if (usePreferenceDefaults) {
			const prefInterests = userPreferences.interests;
			if (prefInterests && prefInterests.trim() !== '') {
				finalInterests = prefInterests;
			}
		}

		// Build filters object (query params override user preferences)
		const normalizedFilter = filter === 'same_interests' ? 'same_likes' : filter;

		const filters = {
			search: search.trim(),
			hereTo: finalHereTo,
			lookingFor: lookingFor || null,
			wantToMeet: finalWantToMeet,
			identification: identification || null,
			ageMin: finalAgeMin,
			ageMax: finalAgeMax,
			languages: languagesArray,
			location: Object.keys(location).length > 0 ? location : null,
			distanceMax: finalDistanceMax,
			filter: normalizedFilter,
			interests: finalInterests,
		};

		console.log('[DATING][PROFILE] Final filters applied:', {
			usePreferenceDefaults,
			fromQuery: { hereTo, wantToMeet, ageMin, ageMax, languages, city, country, distanceMax, interests },
			fromPreferences: {
				hereTo: userPreferences.hereTo,
				wantToMeet: userPreferences.wantToMeet,
				ageRange: userPreferences.ageRange,
				languages: userPreferences.languages,
				distanceRange: userPreferences.distanceRange,
				interests: userPreferences.interests
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
			orientation,
			interests,
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
				isDatingProfileActive: true,
				preferences: {},
				lastUpdatedAt: null
			};
		}

		if (!user.dating.preferences) {
			user.dating.preferences = {};
		}

		if (!Array.isArray(user.preferences)) {
			user.preferences = [];
		}
		// Update dating filter preferences (languages also stored on user.preferences)
		if (hereTo !== undefined) {
			user.dating.preferences.hereTo = hereTo;
		}
		if (wantToMeet !== undefined) {
			user.dating.preferences.wantToMeet = wantToMeet;
		}
		if (orientation !== undefined) {
			user.dating.preferences.orientation = orientation;
		}
		if (interests !== undefined) {
			user.dating.preferences.interests = interests;
		}
		if (languages !== undefined) {
			user.preferences = languagesArr;
			user.dating.preferences.languages = languagesArr;
		}
		if (ageMin !== undefined || ageMax !== undefined) {
			if (!user.dating.preferences.ageRange) {
				user.dating.preferences.ageRange = { min: 18, max: 100 };
			}
			if (ageMin !== undefined) {
				user.dating.preferences.ageRange.min = (ageMin !== null && ageMin !== '') ? parseInt(ageMin, 10) : 18;
			}
			if (ageMax !== undefined) {
				user.dating.preferences.ageRange.max = (ageMax !== null && ageMax !== '') ? parseInt(ageMax, 10) : 100;
			}
		}
		// IMPORTANT: Location in preferences is ONLY for filtering other users, NOT for setting user's actual location
		// User's actual location (user.location) should be set separately via profile update
		// Only update the filter preference location, not the user's actual location
		if (location !== undefined) {
			// Only update dating preferences location (for filtering), NOT user's actual location
			user.dating.preferences.location = {
				city: location?.city || '',
				country: location?.country || '',
				coordinates: {
					lat: location?.coordinates?.lat ?? location?.lat ?? null,
					lng: location?.coordinates?.lng ?? location?.lng ?? null
				}
			};
			// DO NOT update user.location - that's the user's actual location, not a filter preference
		}
		if (distanceMin !== undefined || distanceMax !== undefined) {
			if (!user.dating.preferences.distanceRange) {
				user.dating.preferences.distanceRange = { min: 0, max: 100 };
			}
			if (!user.distance) {
				user.distance = { min: 0, max: 100, unit: 'km' };
			}
			if (distanceMin !== undefined) {
				user.dating.preferences.distanceRange.min = distanceMin !== null ? parseFloat(distanceMin) : 0;
				user.distance.min = distanceMin !== null ? parseFloat(distanceMin) : 0;
			}
			if (distanceMax !== undefined) {
				user.dating.preferences.distanceRange.max = distanceMax !== null ? parseFloat(distanceMax) : 100;
				user.distance.max = distanceMax !== null ? parseFloat(distanceMax) : 100;
			}
			user.markModified('distance');
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

