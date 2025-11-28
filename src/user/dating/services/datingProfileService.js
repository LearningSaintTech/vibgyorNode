const User = require('../../auth/model/userAuthModel');
const DatingInteraction = require('../models/datingInteractionModel');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Radius of the Earth in km
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Build search query based on filters
 */
function buildSearchQuery(currentUser, filters = {}) {
	const {
		search = '', // Search by name or username
		hereTo = null,
		wantToMeet = null,
		ageMin = null,
		ageMax = null,
		languages = null,
		location = null, // { city, state, country }
		distanceMax = null, // in km
		filter = 'all' // 'all', 'liked_you', 'liked_by_you', 'new_dater', 'near_by', 'same_interests'
	} = filters;

	// Base query - exclude current user, blocked users, and inactive profiles
	const query = {
		$and: [
			{ _id: { $ne: currentUser._id } }, // Exclude current user
			{ isActive: true }, // Only active users
			{ 'dating.isDatingProfileActive': true }, // Only active dating profiles
			{ _id: { $nin: [...(currentUser.blockedUsers || []), ...(currentUser.blockedBy || [])] } } // Exclude blocked users
		]
	};

	// Search by name or username
	if (search && search.trim()) {
		query.$and.push({
			$or: [
				{ fullName: { $regex: search.trim(), $options: 'i' } },
				{ username: { $regex: search.trim(), $options: 'i' } }
			]
		});
	}

	// Filter by "Here To" preference (check both preferences.hereFor and dating.preferences.hereTo)
	if (hereTo) {
		query.$and.push({
			$or: [
				{ 'preferences.hereFor': { $regex: hereTo, $options: 'i' } },
				{ 'dating.preferences.hereTo': { $regex: hereTo, $options: 'i' } }
			]
		});
	}

	// Filter by "Want to Meet" (gender preference)
	if (wantToMeet) {
		// If user wants to meet "Everyone", don't filter by gender
		if (wantToMeet.toLowerCase() !== 'everyone') {
			query.$and.push({
				gender: { $regex: wantToMeet, $options: 'i' }
			});
		}
	}

	// Filter by age range
	if (ageMin !== null || ageMax !== null) {
		const ageQuery = {};
		if (ageMin !== null) {
			// Calculate max birth year for minimum age
			const currentYear = new Date().getFullYear();
			const maxBirthYear = currentYear - ageMin;
			ageQuery.$lte = new Date(`${maxBirthYear}-12-31`);
		}
		if (ageMax !== null) {
			// Calculate min birth year for maximum age
			const currentYear = new Date().getFullYear();
			const minBirthYear = currentYear - ageMax;
			ageQuery.$gte = new Date(`${minBirthYear}-01-01`);
		}
		if (Object.keys(ageQuery).length > 0) {
			query.$and.push({ dob: ageQuery });
		}
	}

	// Filter by languages
	if (languages && Array.isArray(languages) && languages.length > 0) {
		query.$and.push({
			$or: [
				{ 'dating.preferences.languages': { $in: languages } },
				{ 'preferences.primaryLanguage': { $in: languages } },
				{ 'preferences.secondaryLanguage': { $in: languages } }
			]
		});
	}

	// Filter by location (city, country) - Note: location doesn't have state field in schema
	if (location) {
		const locationQuery = { $or: [] };
		
		if (location.city) {
			locationQuery.$or.push({ 'location.city': { $regex: location.city, $options: 'i' } });
			locationQuery.$or.push({ 'dating.preferences.location.city': { $regex: location.city, $options: 'i' } });
		}
		if (location.country) {
			locationQuery.$or.push({ 'location.country': { $regex: location.country, $options: 'i' } });
			locationQuery.$or.push({ 'dating.preferences.location.country': { $regex: location.country, $options: 'i' } });
		}
		
		if (locationQuery.$or.length > 0) {
			query.$and.push(locationQuery);
		}
	}

	// Filter by distance (requires coordinates)
	if (distanceMax !== null && currentUser.location?.lat && currentUser.location?.lng) {
		// This will be handled in post-processing since MongoDB doesn't have built-in geospatial queries for distance
		// We'll filter after fetching results
	}

	// Special filters
	if (filter === 'new_dater') {
		// Users who joined recently (last 7 days)
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		query.$and.push({ createdAt: { $gte: sevenDaysAgo } });
	}

	if (filter === 'same_interests') {
		// Users with matching interests
		if (currentUser.interests && currentUser.interests.length > 0) {
			query.$and.push({
				interests: { $in: currentUser.interests }
			});
		}
	}

	return query;
}

/**
 * Filter profiles by distance
 */
function filterByDistance(profiles, currentUser, maxDistance) {
	if (!maxDistance || !currentUser.location?.lat || !currentUser.location?.lng) {
		return profiles;
	}

		return profiles.filter(profile => {
		// Check if profile has location coordinates
		let profileLat = null;
		let profileLng = null;
		
		if (profile.location?.lat && profile.location?.lng) {
			profileLat = profile.location.lat;
			profileLng = profile.location.lng;
		} else if (profile.dating?.preferences?.location?.coordinates?.lat && 
			profile.dating?.preferences?.location?.coordinates?.lng) {
			profileLat = profile.dating.preferences.location.coordinates.lat;
			profileLng = profile.dating.preferences.location.coordinates.lng;
		}
		
		if (!profileLat || !profileLng) {
			return false; // No location data, exclude
		}
		
		const distance = calculateDistance(
			currentUser.location.lat,
			currentUser.location.lng,
			profileLat,
			profileLng
		);
		return distance <= maxDistance;
	});
}

/**
 * Get all dating profiles with filters
 */
async function getAllDatingProfiles(currentUserId, filters = {}, pagination = { page: 1, limit: 20 }) {
	try {
		const currentUser = await User.findById(currentUserId);
		if (!currentUser) {
			throw new Error('Current user not found');
		}

		// Build search query
		const query = buildSearchQuery(currentUser, filters);
		
		const skip = (pagination.page - 1) * pagination.limit;

		// Fetch profiles - select all fields needed for dating profile display
		let profiles = await User.find(query)
			.select('username fullName profilePictureUrl dob gender pronouns bio interests likes preferences location dating verificationStatus createdAt')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(pagination.limit * 2) // Fetch more to account for distance filtering
			.lean();

		// Exclude profiles that the current user has already interacted with (liked or disliked)
		// This prevents showing profiles that have already been swiped on
		// Exception: Don't exclude when filter is 'liked_by_you' (we want to show those)
		if (filters.filter !== 'liked_by_you' && filters.filter !== 'liked_you') {
			const userInteractions = await DatingInteraction.find({
				user: currentUserId,
				action: { $in: ['like', 'dislike'] }
			}).select('targetUser').lean();
			
			const interactedUserIds = userInteractions.map(interaction => interaction.targetUser.toString());
			profiles = profiles.filter(profile => !interactedUserIds.includes(profile._id.toString()));
		}

		// Filter by interaction type (liked_you, liked_by_you)
		if (filters.filter === 'liked_you') {
			// Find users who have liked the current user
			const likedYouInteractions = await DatingInteraction.find({
				targetUser: currentUserId,
				action: 'like'
			}).select('user').lean();
			
			const likedYouUserIds = likedYouInteractions.map(interaction => interaction.user);
			profiles = profiles.filter(profile => likedYouUserIds.some(id => id.toString() === profile._id.toString()));
		} else if (filters.filter === 'liked_by_you') {
			// Find users that the current user has liked
			const likedByYouInteractions = await DatingInteraction.find({
				user: currentUserId,
				action: 'like'
			}).select('targetUser').lean();
			
			const likedByYouUserIds = likedByYouInteractions.map(interaction => interaction.targetUser);
			profiles = profiles.filter(profile => likedByYouUserIds.some(id => id.toString() === profile._id.toString()));
		}

		// Filter by distance if needed
		if (filters.distanceMax !== null) {
			profiles = filterByDistance(profiles, currentUser, filters.distanceMax);
		}

		// Limit results after distance filtering
		profiles = profiles.slice(0, pagination.limit);

		// Calculate age for each profile
		profiles = profiles.map(profile => {
			// Always expose username so search results can display it
			profile.username = profile.username || '';

			if (profile.dob) {
				const today = new Date();
				const birthDate = new Date(profile.dob);
				let age = today.getFullYear() - birthDate.getFullYear();
				const monthDiff = today.getMonth() - birthDate.getMonth();
				if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
					age--;
				}
				profile.age = age;
			}
			
			// Calculate distance if both users have coordinates
			if (currentUser.location?.lat && currentUser.location?.lng) {
				let profileLat = null;
				let profileLng = null;
				
				if (profile.location?.lat && profile.location?.lng) {
					profileLat = profile.location.lat;
					profileLng = profile.location.lng;
				} else if (profile.dating?.preferences?.location?.coordinates?.lat && 
					profile.dating?.preferences?.location?.coordinates?.lng) {
					profileLat = profile.dating.preferences.location.coordinates.lat;
					profileLng = profile.dating.preferences.location.coordinates.lng;
				}
				
				if (profileLat && profileLng) {
					const distanceKm = calculateDistance(
						currentUser.location.lat,
						currentUser.location.lng,
						profileLat,
						profileLng
					);
					
					profile.distance = distanceKm;
					
					// Format distance for display
					if (distanceKm >= 1) {
						// Round to 1 decimal place for km
						profile.distanceAway = `${Math.round(distanceKm * 10) / 10} km away`;
					} else {
						// Convert to meters and round
						const distanceMeters = Math.round(distanceKm * 1000);
						profile.distanceAway = `${distanceMeters} m away`;
					}
				} else {
					// No coordinates on profile, surface empty distance fields
					profile.distance = null;
					profile.distanceAway = null;
				}
			} else {
				// Current user has no coordinates, still expose distance keys for the client
				profile.distance = null;
				profile.distanceAway = null;
			}

			// Format dating profile
			profile.datingProfile = {
				photos: profile.dating?.photos || [],
				videos: profile.dating?.videos || [],
				isActive: profile.dating?.isDatingProfileActive || false
			};

			return profile;
		});

		// Sort by distance if available
		if (filters.filter === 'near_by' || filters.distanceMax !== null) {
			profiles.sort((a, b) => {
				const distA = a.distance || Infinity;
				const distB = b.distance || Infinity;
				return distA - distB;
			});
		}

		// Get total count (approximate, since distance filtering is done in memory)
		const totalQuery = buildSearchQuery(currentUser, { ...filters, distanceMax: null });
		const total = await User.countDocuments(totalQuery);

		return {
			profiles,
			pagination: {
				page: pagination.page,
				limit: pagination.limit,
				total: profiles.length,
				hasMore: profiles.length === pagination.limit
			}
		};

	} catch (error) {
		console.error('[DATING SERVICE] Error getting dating profiles:', error);
		throw error;
	}
}

module.exports = {
	getAllDatingProfiles,
	calculateDistance,
	buildSearchQuery,
	filterByDistance
};

