const mongoose = require('mongoose');
const User = require('../../auth/model/userAuthModel');
const DatingInteraction = require('../models/datingInteractionModel');
const { getCachedUserData, cacheUserData, invalidateUserCache } = require('../../../middleware/cacheMiddleware');

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
 * Calculate match percentage between current user and a profile
 * Based on: interests, age compatibility, preferences, languages, and distance
 * @param {Object} currentUser - Current user object
 * @param {Object} profile - Profile to match against
 * @returns {number} Match percentage (0-100)
 */
function calculateMatchPercentage(currentUser, profile) {
	console.log('\n🔍 [MATCH CALC] Starting calculation for profile:', profile.username || profile._id);
	console.log('📊 [MATCH CALC] Current User:', {
		hasInterests: !!(currentUser.interests && currentUser.interests.length > 0),
		interestsCount: currentUser.interests?.length || 0,
		hasDatingPrefs: !!currentUser.dating?.preferences,
		hasAgeRange: !!currentUser.dating?.preferences?.ageRange,
		hasHereTo: !!currentUser.dating?.preferences?.hereTo,
		hasWantToMeet: !!currentUser.dating?.preferences?.wantToMeet,
		hasLanguages: !!(currentUser.dating?.preferences?.languages && currentUser.dating.preferences.languages.length > 0),
		gender: currentUser.gender
	});
	console.log('📊 [MATCH CALC] Profile:', {
		hasInterests: !!(profile.interests && profile.interests.length > 0),
		interestsCount: profile.interests?.length || 0,
		age: profile.age,
		hasDatingPrefs: !!profile.dating?.preferences,
		hasHereTo: !!profile.dating?.preferences?.hereTo,
		hasWantToMeet: !!profile.dating?.preferences?.wantToMeet,
		hasLanguages: !!(profile.dating?.preferences?.languages && profile.dating.preferences.languages.length > 0),
		gender: profile.gender,
		distance: profile.distance
	});

	let matchScore = 0;
	let maxScore = 0;
	let availableFactors = 0;

	// 1. Shared Interests (30% weight)
	if (currentUser.interests && Array.isArray(currentUser.interests) && currentUser.interests.length > 0 &&
		profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0) {
		maxScore += 30;
		availableFactors++;
		const currentInterests = currentUser.interests.map(i => i.toLowerCase());
		const profileInterests = profile.interests.map(i => i.toLowerCase());
		const sharedInterests = currentInterests.filter(i => profileInterests.includes(i));
		if (currentInterests.length > 0) {
			const interestMatch = (sharedInterests.length / Math.max(currentInterests.length, profileInterests.length)) * 30;
			matchScore += interestMatch;
			console.log('✅ [MATCH CALC] Interests:', {
				current: currentInterests,
				profile: profileInterests,
				shared: sharedInterests,
				matchScore: interestMatch.toFixed(2),
				totalScore: matchScore.toFixed(2)
			});
		}
	} else {
		console.log('❌ [MATCH CALC] Interests: Skipped (missing data)');
	}

	// 2. Age Compatibility (20% weight)
	if (currentUser.dating?.preferences?.ageRange && profile.age) {
		maxScore += 20;
		availableFactors++;
		const { min, max } = currentUser.dating.preferences.ageRange;
		let ageScore = 0;
		if (profile.age >= min && profile.age <= max) {
			ageScore = 20; // Perfect match
			matchScore += ageScore;
		} else {
			// Partial match based on how close the age is
			const ageDiff = Math.min(
				Math.abs(profile.age - min),
				Math.abs(profile.age - max)
			);
			if (ageDiff <= 5) {
				ageScore = 10; // Close match
			} else if (ageDiff <= 10) {
				ageScore = 5; // Somewhat close
			}
			matchScore += ageScore;
		}
		console.log('✅ [MATCH CALC] Age:', {
			profileAge: profile.age,
			preferredRange: `${min}-${max}`,
			ageScore: ageScore,
			totalScore: matchScore.toFixed(2)
		});
	} else {
		console.log('❌ [MATCH CALC] Age: Skipped (missing data)');
	}

	// 3. Preferences Matching (25% weight)
	let prefScore = 0;
	let prefMax = 0;
	
	// hereTo preference match
	if (currentUser.dating?.preferences?.hereTo && profile.dating?.preferences?.hereTo) {
		prefMax += 10;
		if (currentUser.dating.preferences.hereTo === profile.dating.preferences.hereTo) {
			prefScore += 10; // Perfect match
		} else {
			prefScore += 5; // Partial match (both looking for something)
		}
		console.log('✅ [MATCH CALC] HereTo:', {
			currentUser: currentUser.dating.preferences.hereTo,
			profile: profile.dating.preferences.hereTo,
			match: currentUser.dating.preferences.hereTo === profile.dating.preferences.hereTo,
			score: currentUser.dating.preferences.hereTo === profile.dating.preferences.hereTo ? 10 : 5
		});
	}

	// wantToMeet preference match
	if (currentUser.dating?.preferences?.wantToMeet && profile.dating?.preferences?.wantToMeet) {
		prefMax += 15;
		const currentWant = (currentUser.dating.preferences.wantToMeet || '').toLowerCase();
		const profileWant = (profile.dating.preferences.wantToMeet || '').toLowerCase();
		const currentGender = (profile.gender || '').toLowerCase();
		const userGender = (currentUser.gender || '').toLowerCase();
		
		let wantToMeetScore = 0;
		if (currentWant === 'everyone' || profileWant === 'everyone') {
			wantToMeetScore = 15; // Everyone matches all
		} else if (currentWant === currentGender || profileWant === userGender) {
			wantToMeetScore = 15; // Perfect match
		} else {
			wantToMeetScore = 5; // Some compatibility
		}
		prefScore += wantToMeetScore;
		console.log('✅ [MATCH CALC] WantToMeet:', {
			currentUserWant: currentWant,
			profileWant: profileWant,
			currentUserGender: userGender,
			profileGender: currentGender,
			score: wantToMeetScore
		});
	}
	
	if (prefMax > 0) {
		maxScore += 25;
		availableFactors++;
		const prefMatchScore = (prefScore / prefMax) * 25;
		matchScore += prefMatchScore;
		console.log('✅ [MATCH CALC] Preferences Total:', {
			prefScore: prefScore,
			prefMax: prefMax,
			calculatedScore: prefMatchScore.toFixed(2),
			totalScore: matchScore.toFixed(2)
		});
	} else {
		console.log('❌ [MATCH CALC] Preferences: Skipped (missing data)');
	}

	// 4. Language Matching (15% weight)
	if (currentUser.dating?.preferences?.languages && Array.isArray(currentUser.dating.preferences.languages) && currentUser.dating.preferences.languages.length > 0 &&
		profile.dating?.preferences?.languages && Array.isArray(profile.dating.preferences.languages) && profile.dating.preferences.languages.length > 0) {
		maxScore += 15;
		availableFactors++;
		const currentLangs = currentUser.dating.preferences.languages.map(l => l.toLowerCase());
		const profileLangs = profile.dating.preferences.languages.map(l => l.toLowerCase());
		const sharedLangs = currentLangs.filter(l => profileLangs.includes(l));
		if (currentLangs.length > 0) {
			const langMatch = (sharedLangs.length / Math.max(currentLangs.length, profileLangs.length)) * 15;
			matchScore += langMatch;
			console.log('✅ [MATCH CALC] Languages:', {
				current: currentLangs,
				profile: profileLangs,
				shared: sharedLangs,
				matchScore: langMatch.toFixed(2),
				totalScore: matchScore.toFixed(2)
			});
		}
	} else {
		console.log('❌ [MATCH CALC] Languages: Skipped (missing data)');
	}

	// 5. Distance Bonus (10% weight) - closer is better
	if (profile.distance !== null && profile.distance !== undefined) {
		maxScore += 10;
		availableFactors++;
		let distanceScore = 0;
		if (profile.distance <= 10) {
			distanceScore = 10; // Very close
		} else if (profile.distance <= 25) {
			distanceScore = 7; // Close
		} else if (profile.distance <= 50) {
			distanceScore = 5; // Moderate
		} else if (profile.distance <= 100) {
			distanceScore = 3; // Far but acceptable
		}
		matchScore += distanceScore;
		console.log('✅ [MATCH CALC] Distance:', {
			distance: profile.distance,
			score: distanceScore,
			totalScore: matchScore.toFixed(2)
		});
	} else {
		console.log('❌ [MATCH CALC] Distance: Skipped (missing data)');
	}

	// If no factors are available, return 0
	if (maxScore === 0 || availableFactors === 0) {
		console.log('⚠️ [MATCH CALC] No factors available, returning 0%');
		return 0;
	}

	// Calculate percentage (ensure it's between 0 and 100)
	const rawPercentage = (matchScore / maxScore) * 100;
	const percentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));
	
	console.log('📈 [MATCH CALC] Final Calculation:', {
		matchScore: matchScore.toFixed(2),
		maxScore: maxScore,
		availableFactors: availableFactors,
		rawPercentage: rawPercentage.toFixed(2),
		roundedPercentage: percentage
	});
	
	// Return the exact calculated percentage with NO threshold or minimum
	// This shows the true compatibility score based on actual data
	console.log('🎯 [MATCH CALC] Final Match Percentage:', percentage, '%\n');
	return percentage;
}

/**
 * Build search query based on filters
 */
function buildSearchQuery(currentUser, filters = {}, excludedUserIds = []) {
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

	console.log('[FILTER] buildSearchQuery called with filters:', {
		ageMin,
		ageMax,
		hereTo,
		wantToMeet,
		languages,
		location,
		distanceMax,
		filter
	});

	// Combine all excluded user IDs (blocked users + already interacted users)
	// Convert all to strings first to remove duplicates, then back to ObjectIds for consistency
	const allExcludedIdsStrings = [
		...(currentUser.blockedUsers || []).map(id => id.toString()),
		...(currentUser.blockedBy || []).map(id => id.toString()),
		...excludedUserIds.map(id => id.toString())
	].filter(Boolean);
	
	// Remove duplicates and convert back to ObjectIds
	const allExcludedIds = [...new Set(allExcludedIdsStrings)].map(id => new mongoose.Types.ObjectId(id));

	// Base query - exclude current user, blocked users, interacted users, and inactive profiles
	const query = {
		$and: [
			{ _id: { $ne: currentUser._id } }, // Exclude current user
			{ isActive: true }, // Only active users
			{ 'dating.isDatingProfileActive': true }, // Only active dating profiles
			...(allExcludedIds.length > 0 ? [{ _id: { $nin: allExcludedIds } }] : []) // Exclude blocked users and already interacted users
		]
	};

	// Search by name or username using regex (MongoDB $text search cannot be combined with regex in $or)
	if (search && search.trim()) {
		const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); // Escape special regex characters
		query.$and.push({
			$or: [
				{ fullName: { $regex: searchRegex } },
				{ username: { $regex: searchRegex } }
			]
		});
	}

	// Filter by "Here To" preference (check both preferences.hereFor and dating.preferences.hereTo)
	if (hereTo) {
		// Map common frontend values to database values
		const hereToLower = hereTo.toLowerCase();
		const hereToValues = [hereTo]; // Always include original value
		
		// Map frontend display values to database values
		const hereToMapping = {
			'make new friends': 'friendship',
			'find a date': 'dating',
			'find a partner': 'relationship',
			'serious relationship': 'relationship',
			'casual': 'casual',
			'networking': 'networking',
			'not sure': 'not sure'
		};
		
		if (hereToMapping[hereToLower]) {
			hereToValues.push(hereToMapping[hereToLower]);
		}
		
		// Remove duplicates
		const uniqueValues = [...new Set(hereToValues)];
		
		// Build $or conditions for each value
		const hereToConditions = [];
		uniqueValues.forEach(value => {
			hereToConditions.push(
				{ 'preferences.hereFor': { $regex: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
				{ 'dating.preferences.hereTo': { $regex: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
			);
		});
		
		query.$and.push({ $or: hereToConditions });
		console.log(`[FILTER] HereTo: "${hereTo}" → searching for:`, uniqueValues);
	}

	// Filter by "Want to Meet" (gender preference)
	if (wantToMeet) {
		// If user wants to meet "Everyone", don't filter by gender
		if (wantToMeet.toLowerCase() !== 'everyone') {
			// Map frontend values to database gender values
			const wantToMeetLower = wantToMeet.toLowerCase();
			let genderValue = null;
			
			if (wantToMeetLower === 'men' || wantToMeetLower === 'man') {
				genderValue = 'male';
			} else if (wantToMeetLower === 'women' || wantToMeetLower === 'woman') {
				genderValue = 'female';
			} else if (wantToMeetLower === 'non-binary' || wantToMeetLower === 'nonbinary') {
				genderValue = 'non-binary';
			} else {
				// Fallback: try to match directly (case-insensitive)
				genderValue = wantToMeet;
			}
			
			if (genderValue) {
				query.$and.push({
					gender: { $regex: new RegExp(`^${genderValue}$`, 'i') }
				});
				console.log(`[FILTER] WantToMeet: "${wantToMeet}" → gender: "${genderValue}"`);
			}
		} else {
			console.log('[FILTER] WantToMeet: "Everyone" → No gender filter applied');
		}
	}

	// Filter by age range (default ageMin to 18 when only ageMax set to avoid showing minors)
	const effectiveAgeMin = ageMin !== null ? ageMin : (ageMax !== null ? 18 : null);
	const effectiveAgeMax = ageMax;
	if (effectiveAgeMin !== null || effectiveAgeMax !== null) {
		const ageQuery = {};
		if (effectiveAgeMin !== null) {
			// Calculate max birth year for minimum age
			const currentYear = new Date().getFullYear();
			const maxBirthYear = currentYear - effectiveAgeMin;
			ageQuery.$lte = new Date(`${maxBirthYear}-12-31`);
			console.log(`[FILTER] Age Min: ${effectiveAgeMin} → Max Birth Year: ${maxBirthYear} → DOB <= ${maxBirthYear}-12-31`);
		}
		if (effectiveAgeMax !== null) {
			// Calculate min birth year for maximum age
			const currentYear = new Date().getFullYear();
			const minBirthYear = currentYear - effectiveAgeMax;
			ageQuery.$gte = new Date(`${minBirthYear}-01-01`);
			console.log(`[FILTER] Age Max: ${effectiveAgeMax} → Min Birth Year: ${minBirthYear} → DOB >= ${minBirthYear}-01-01`);
		}
		if (Object.keys(ageQuery).length > 0) {
			query.$and.push({ dob: ageQuery });
			console.log('[FILTER] Age filter applied:', ageQuery);
		}
	} else {
		console.log('[FILTER] Age filter NOT applied (ageMin and ageMax are null)');
	}

	// Filter by languages (case-insensitive: DB may store 'english' or 'English')
	if (languages && Array.isArray(languages) && languages.length > 0) {
		const langConditions = [];
		languages.forEach(lang => {
			if (!lang || !String(lang).trim()) return;
			const regex = new RegExp(`^${String(lang).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
			langConditions.push({ 'dating.preferences.languages': regex });
			langConditions.push({ 'preferences.primaryLanguage': regex });
			langConditions.push({ 'preferences.secondaryLanguage': regex });
		});
		if (langConditions.length > 0) {
			query.$and.push({ $or: langConditions });
			console.log('[FILTER] Languages applied (case-insensitive):', languages);
		}
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
			console.log('[FILTER] Location applied:', locationQuery.$or.length, 'conditions (city/country regex)');
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

	console.log('[FILTER] buildSearchQuery result (full query):', JSON.stringify(query, null, 2));
	return query;
}

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
				.select('_id blockedUsers blockedBy location dating preferences interests isActive gender')
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
		const useAggregation = (filters.filter === 'liked_you' || filters.filter === 'liked_by_you') ||
		                      (filters.distanceMax !== null && currentUser.location?.lat && currentUser.location?.lng && filters.filter !== 'all');
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

			// Step 3: Geospatial filtering (if needed)
			if (filters.distanceMax !== null && currentUser.location?.lat && currentUser.location?.lng) {
				const userCoordinates = currentUser.location?.coordinates?.coordinates 
					? currentUser.location.coordinates.coordinates 
					: [currentUser.location.lng, currentUser.location.lat];
				
				// Use $geoNear stage (must be first stage, but we handle it differently in aggregation)
				// Since we need $geoNear first, we restructure the pipeline
				const geoNearStage = {
					$geoNear: {
						near: {
							type: 'Point',
							coordinates: userCoordinates
						},
						distanceField: 'distance',
						maxDistance: filters.distanceMax * 1000,
						query: query,
						spherical: true,
						key: 'location.coordinates'
					}
				};

				// For distance-based queries, we need to put $geoNear first, then filter by interactions
				const distancePipeline = [geoNearStage];
				
				// Add interaction filtering after geospatial
				if (filters.filter === 'liked_you') {
					// "liked_you" = users who have liked the current user
					distancePipeline.push({
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
					distancePipeline.push({
						$match: { 'interaction.0': { $exists: true } }
					});
					distancePipeline.push({ $project: { 'interaction': 0 } });
				} else if (filters.filter === 'liked_by_you') {
					// "liked_by_you" = users that the current user has liked
					distancePipeline.push({
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
					distancePipeline.push({
						$match: { 'interaction.0': { $exists: true } }
					});
					distancePipeline.push({ $project: { 'interaction': 0 } });
				}

				// Project only needed fields
				distancePipeline.push({
					$project: {
						username: 1,
						fullName: 1,
						profilePictureUrl: 1,
						dob: 1,
						gender: 1,
						pronouns: 1,
						bio: 1,
						interests: 1,
						likes: 1,
						preferences: 1,
						location: 1,
						dating: 1,
						verificationStatus: 1,
						createdAt: 1,
						distance: 1
					}
				});

				// Sort and paginate
				distancePipeline.push({
					$sort: filters.filter === 'near_by' || filters.distanceMax !== null 
						? { distance: 1, createdAt: -1 }
						: { createdAt: -1 }
				});
				distancePipeline.push({ $skip: skip });
				distancePipeline.push({ $limit: pagination.limit });

				profiles = await User.aggregate(distancePipeline);
				console.log('[DATING][SERVICE] After User.aggregate(distancePipeline) [$geoNear]:', profiles?.length ?? 0, 'profiles');
			} else {
				// No distance filter, use regular aggregation
				// Project only needed fields
				pipeline.push({
					$project: {
						username: 1,
						fullName: 1,
						profilePictureUrl: 1,
						dob: 1,
						gender: 1,
						pronouns: 1,
						bio: 1,
						interests: 1,
						likes: 1,
						preferences: 1,
						location: 1,
						dating: 1,
						verificationStatus: 1,
						createdAt: 1
					}
				});

				// Sort and paginate
				pipeline.push({ $sort: { createdAt: -1 } });
				pipeline.push({ $skip: skip });
				pipeline.push({ $limit: pagination.limit });

				profiles = await User.aggregate(pipeline);
				console.log('[DATING][SERVICE] After User.aggregate(pipeline):', profiles?.length ?? 0, 'profiles');
			}
		} else {
			// filter 'all' or no interaction filter: use find (optionally with in-memory distance filter)
			if (filters.distanceMax !== null && currentUser.location?.lat && currentUser.location?.lng) {
				// Use find + filterByDistance so we work with location.lat/lng (no GeoJSON required)
				const fetchLimit = Math.min(pagination.limit * 20, 500); // fetch extra for distance filter
				const profilesBeforeDistance = await User.find(query)
					.select('username fullName profilePictureUrl dob gender pronouns bio interests likes preferences location dating verificationStatus createdAt')
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
					.select('username fullName profilePictureUrl dob gender pronouns bio interests likes preferences location dating verificationStatus createdAt')
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
	calculateMatchPercentage
};

