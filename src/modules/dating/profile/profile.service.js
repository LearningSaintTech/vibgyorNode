const mongoose = require('mongoose');
const { User, DatingInteraction } = require('./profile.repository');
const { getCachedUserData, cacheUserData } = require('../../../middleware/cacheMiddleware');
const {
	calculateDistance,
	calculateMatchPercentage,
	buildSearchQuery,
	PROFILE_SELECT_FIELDS,
	CURRENT_USER_SELECT_FIELDS,
} = require('../matching/matchUtils');

const PROFILE_PROJECT = Object.fromEntries(
	PROFILE_SELECT_FIELDS.split(' ').map((field) => [field, 1])
);

/**
 * Filter profiles by distance.
 * Profiles without coordinates are kept (matched by city/country only); distance shown as null later.
 */
function filterByDistance(profiles, currentUser, maxDistance) {
	if (!maxDistance || !currentUser.location?.lat || !currentUser.location?.lng) {
		return profiles;
	}

	return profiles.filter(profile => {
		let profileLat = null;
		let profileLng = null;

		if (profile.location?.lat != null && profile.location?.lng != null) {
			profileLat = profile.location.lat;
			profileLng = profile.location.lng;
		} else if (profile.dating?.preferences?.location?.coordinates?.lat != null &&
			profile.dating?.preferences?.location?.coordinates?.lng != null) {
			profileLat = profile.dating.preferences.location.coordinates.lat;
			profileLng = profile.dating.preferences.location.coordinates.lng;
		}

		// No coordinates: keep profile (they matched city/country); distance will be null in response
		if (profileLat == null || profileLng == null) {
			return true;
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
		// Convert currentUserId to ObjectId and get hex string for use in aggregation $expr
		const currentUserIdObj = new mongoose.Types.ObjectId(currentUserId);
		const currentUserIdHex = currentUserIdObj.toString();
		
		// OPTIMIZED: Cache user data with filter-specific key (Phase 2 Optimization)
		// Create cache key that includes filter hash for better cache granularity
		const filterHash = JSON.stringify(filters).substring(0, 50); // Use first 50 chars as hash
		const cacheKey = `dating:userData:${currentUserId}:${filterHash.substring(0, 20)}`;
		let currentUser = getCachedUserData(currentUserId, cacheKey);
		
		if (!currentUser) {
			// OPTIMIZED: Select only needed fields for better caching (Phase 2 Optimization)
			// Include gender for match calculation
			currentUser = await User.findById(currentUserId)
				.select(CURRENT_USER_SELECT_FIELDS)
				.lean();
		if (!currentUser) {
			throw new Error('Current user not found');
		}
			// Cache user data for 5 minutes (300 seconds)
			cacheUserData(currentUserId, cacheKey, currentUser, 300);
		}
		console.log('[DATING][SERVICE] Current user loaded:', { userId: currentUserId, hasLocation: !!(currentUser.location?.lat && currentUser.location?.lng), locationCoordinates: !!currentUser.location?.coordinates });

		// Get users that the current user has already interacted with (liked or disliked)
		// Exception: Don't exclude when filter is 'liked_by_you' or 'liked_you' (we want to show those)
		let excludedUserIds = [];
		let currentUserLikedMap = new Map(); // Map to store which profiles the current user has liked
		let dislikedByUserIdsMap = new Map(); // Map to store which users have disliked the current user (reverse check)
		
		if (filters.filter !== 'liked_by_you' && filters.filter !== 'liked_you') {
			const userInteractions = await DatingInteraction.find({
				user: currentUserId,
				action: { $in: ['like', 'dislike'] }
			}).select('targetUser action').lean();
			
			// Extract targetUser IDs and track which ones are liked by current user
			userInteractions.forEach(interaction => {
				const targetUserId = interaction.targetUser.toString();
				if (interaction.action === 'like') {
					currentUserLikedMap.set(targetUserId, true);
				}
			});
			
			// Extract targetUser IDs and remove duplicates for exclusion
			excludedUserIds = [...new Set(
				userInteractions.map(interaction => interaction.targetUser.toString())
			)].map(id => new mongoose.Types.ObjectId(id));
			console.log('[DATING][SERVICE] Interactions query (exclude already seen):', { excludedCount: excludedUserIds.length });
		} else {
			// Even if we're showing liked_by_you or liked_you, we still need to know which ones current user has liked
			const currentUserLikedInteractions = await DatingInteraction.find({
				user: currentUserId,
				action: 'like'
			}).select('targetUser').lean();
			
			currentUserLikedInteractions.forEach(interaction => {
				const targetUserId = interaction.targetUser.toString();
				currentUserLikedMap.set(targetUserId, true);
			});
		}
		
		// Get all users who have disliked the current user (to populate disliked field)
		// This checks: has the profile (other user) disliked me (current user)?
		const usersWhoDislikedMe = await DatingInteraction.find({
			targetUser: currentUserId,
			action: 'dislike'
		}).select('user').lean();
		
		// Populate map: key = user who disliked me, value = true
		usersWhoDislikedMe.forEach(interaction => {
			const userIdWhoDislikedMe = interaction.user.toString();
			dislikedByUserIdsMap.set(userIdWhoDislikedMe, true);
		});
		console.log('[DATING][SERVICE] Users who disliked me count:', dislikedByUserIdsMap.size);

		// Build search query with excluded user IDs
		const query = buildSearchQuery(currentUser, filters, excludedUserIds);
		
		const skip = (pagination.page - 1) * pagination.limit;

		// Count how many documents match the query (before geo/pagination) for debugging
		const queryMatchCount = await User.countDocuments(query);
		console.log('[DATING][SERVICE] User.countDocuments(query) result:', queryMatchCount);

		// OPTIMIZED: Use aggregation pipeline for efficient filtering (Phase 1 Optimization)
		// For filter 'all' with distanceMax: use find + filterByDistance so we don't require location.coordinates (GeoJSON)
		let profiles;
		const useAggregation = filters.filter === 'liked_you' || filters.filter === 'liked_by_you';
		console.log('[DATING][SERVICE] useAggregation:', useAggregation, { filter: filters.filter, distanceMax: filters.distanceMax, hasUserCoords: !!(currentUser.location?.lat && currentUser.location?.lng) });

		if (useAggregation) {
			const pipeline = [];

			// Step 1: Match base query (exclude users, active profiles, etc.)
			pipeline.push({ $match: query });

			// Step 2: Filter by interaction type using $lookup (OPTIMIZED)
			if (filters.filter === 'liked_you') {
				// "liked_you" = users who have liked the current user
				// We need interactions where targetUser = currentUserId and user = this profile
				pipeline.push({
					$lookup: {
						from: 'datinginteractions',
						let: { profileUserId: '$_id' },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ['$user', '$$profileUserId'] }, // The profile user is the one who liked
											{ $eq: [{ $toString: '$targetUser' }, currentUserIdHex] }, // Current user was liked
											{ $eq: ['$action', 'like'] }
										]
									}
								}
							}
						],
						as: 'interaction'
					}
				});
				// Only include profiles that have an interaction (they liked current user)
				pipeline.push({
					$match: {
						'interaction.0': { $exists: true }
					}
				});
				// Remove the interaction array from output
				pipeline.push({
					$project: {
						'interaction': 0
					}
				});
			} else if (filters.filter === 'liked_by_you') {
				// "liked_by_you" = users that the current user has liked
				// We need interactions where user = currentUserId and targetUser = this profile
				pipeline.push({
					$lookup: {
						from: 'datinginteractions',
						let: { profileUserId: '$_id' },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: [{ $toString: '$user' }, currentUserIdHex] }, // Current user did the liking
											{ $eq: ['$targetUser', '$$profileUserId'] }, // This profile was liked
											{ $eq: ['$action', 'like'] }
										]
									}
								}
							}
						],
						as: 'interaction'
					}
				});
				// Only include profiles that have an interaction (current user liked them)
				pipeline.push({
					$match: {
						'interaction.0': { $exists: true }
					}
				});
				// Remove the interaction array from output
				pipeline.push({
					$project: {
						'interaction': 0
					}
				});
			}

			pipeline.push({ $project: PROFILE_PROJECT });
			pipeline.push({ $sort: { createdAt: -1 } });
			pipeline.push({ $skip: skip });
			pipeline.push({ $limit: pagination.limit });

			profiles = await User.aggregate(pipeline);
			console.log('[DATING][SERVICE] After User.aggregate(pipeline):', profiles?.length ?? 0, 'profiles');
		} else {
			// filter 'all' or no interaction filter: use find (optionally with in-memory distance filter)
			if (filters.distanceMax !== null && currentUser.location?.lat && currentUser.location?.lng) {
				// Use find + filterByDistance so we work with location.lat/lng (no GeoJSON required)
				const fetchLimit = Math.min(pagination.limit * 20, 500); // fetch extra for distance filter
				const profilesBeforeDistance = await User.find(query)
					.select(PROFILE_SELECT_FIELDS)
					.sort({ createdAt: -1 })
					.limit(fetchLimit)
					.lean();
				console.log('[DATING][SERVICE] After User.find(query) (before distance filter):', profilesBeforeDistance?.length ?? 0, 'profiles');
				profiles = filterByDistance(profilesBeforeDistance, currentUser, filters.distanceMax);
				console.log('[DATING][SERVICE] After filterByDistance:', profiles?.length ?? 0, 'profiles');
				// Fallback: if no one within distanceMax, show matching profiles anyway (distance will show on card)
				if (profiles.length === 0 && profilesBeforeDistance.length > 0) {
					profiles = profilesBeforeDistance.slice(skip, skip + pagination.limit);
					console.log('[DATING][SERVICE] Fallback: no profiles within', filters.distanceMax, 'km; showing', profiles.length, 'matches (distance shown on card)');
				} else {
					profiles = profiles.slice(skip, skip + pagination.limit);
				}
				console.log('[DATING][SERVICE] After slice(skip, skip+limit):', profiles?.length ?? 0, 'profiles');
			} else {
				// No distance filter: simple find + pagination
				profiles = await User.find(query)
					.select(PROFILE_SELECT_FIELDS)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(pagination.limit)
					.lean();
				console.log('[DATING][SERVICE] After User.find(query).skip().limit():', profiles?.length ?? 0, 'profiles');
			}
		}

		// Fallback: filter in memory if user has no coordinates but distanceMax was set
		if (filters.distanceMax !== null && (!currentUser.location?.lat || !currentUser.location?.lng)) {
			profiles = filterByDistance(profiles, currentUser, filters.distanceMax);
			profiles = profiles.slice(0, pagination.limit);
			console.log('[DATING][SERVICE] After fallback filterByDistance (no user coords):', profiles?.length ?? 0, 'profiles');
		}

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

			// Calculate match percentage
			profile.matchPercentage = calculateMatchPercentage(currentUser, profile);
			
			// Add isLiked field - check if current user has liked this profile
			// isLiked = true means: "I (current user) have liked this profile"
			const profileIdStr = profile._id.toString();
			profile.isLiked = currentUserLikedMap.has(profileIdStr) || false;
			
			// Add disliked field - check if this profile (other user) has disliked the current user
			// disliked = true means: "This person has disliked my profile"
			profile.disliked = dislikedByUserIdsMap.has(profileIdStr) || false;
			
			// Debug logging (can be removed in production)
			if (process.env.NODE_ENV === 'development') {
				console.log(`[MATCH] Profile ${profile.username || profile._id}: ${profile.matchPercentage}% match, isLiked: ${profile.isLiked}, disliked: ${profile.disliked}`);
			}

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

		// OPTIMIZED: Get total count efficiently (Phase 1 Optimization)
		// Use $facet to get count and results in single query for better performance
		// For now, use hasMore based on returned results length (more efficient than counting all)
		// Only count when explicitly needed (e.g., for showing "X results found")
		const hasMore = profiles.length === pagination.limit;

		return {
			profiles,
			pagination: {
				page: pagination.page,
				limit: pagination.limit,
				total: profiles.length, // Return count of current page results
				hasMore: hasMore // More efficient than exact count
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
	filterByDistance,
	calculateMatchPercentage,
};

