const ApiResponse = require('../../../utils/apiResponse');
const datingProfileService = require('../services/datingProfileService');
const User = require('../../auth/model/userAuthModel');

/**
 * Get all dating profiles with filters
 * Supports search by name/username and various filters
 */
async function getAllDatingProfiles(req, res) {
	try {
		console.log('[DATING][PROFILE] getAllDatingProfiles request');
		
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
			filter = 'all', // 'all', 'liked_you', 'new_dater', 'near_by', 'same_interests'
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

		console.log(`[DATING][PROFILE] Found ${result.profiles.length} profiles`);

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
		console.log('[DATING][PREFERENCES] updateDatingPreferences request');
		
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

		// Update preferences
		if (hereTo !== undefined) {
			user.dating.preferences.hereTo = hereTo;
		}
		if (wantToMeet !== undefined) {
			user.dating.preferences.wantToMeet = wantToMeet;
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
		if (languages !== undefined) {
			user.dating.preferences.languages = Array.isArray(languages) ? languages : [languages];
		}
		if (location !== undefined) {
			user.dating.preferences.location = {
				city: location.city || '',
				country: location.country || '',
				coordinates: {
					lat: location.coordinates?.lat || location.lat || null,
					lng: location.coordinates?.lng || location.lng || null
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
		await user.save();

		return ApiResponse.success(
			res,
			{
				preferences: user.dating.preferences
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
		const currentUserId = req.user?.userId;
		if (!currentUserId) {
			return ApiResponse.unauthorized(res, 'User not authenticated');
		}

		const user = await User.findById(currentUserId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const preferences = user.dating?.preferences || {
			hereTo: user.preferences?.hereFor || '', // Fallback to preferences.hereFor
			wantToMeet: '',
			ageRange: { min: 18, max: 100 },
			languages: [],
			location: {
				city: '',
				country: '',
				coordinates: { lat: null, lng: null }
			},
			distanceRange: { min: 0, max: 100 }
		};

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

