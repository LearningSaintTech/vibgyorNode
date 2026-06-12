const mongoose = require('mongoose');

const PROFILE_SELECT_FIELDS =
	'username fullName profilePictureUrl dob gender pronouns bio likes preferences identification orientation lookingFor relationshipStyle whatBringsYouToVibgyor distance location dating verificationStatus createdAt';

const CURRENT_USER_SELECT_FIELDS =
	'_id blockedUsers blockedBy location dating preferences likes identification orientation lookingFor relationshipStyle whatBringsYouToVibgyor distance gender isActive dob';

const MATCH_USER_SELECT_FIELDS =
	'likes identification orientation lookingFor relationshipStyle whatBringsYouToVibgyor preferences dating gender location dob';

function trimLower(value) {
	return String(value || '').trim().toLowerCase();
}

function escapeRegex(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractIconTextValues(items) {
	if (!Array.isArray(items)) return [];
	return items
		.map((item) => {
			if (item == null) return '';
			if (typeof item === 'string') return trimLower(item);
			return trimLower(item.text || item.community || item.name);
		})
		.filter(Boolean);
}

function uniqueStrings(values) {
	return [...new Set((values || []).map(trimLower).filter(Boolean))];
}

function getUserLanguages(user) {
	if (Array.isArray(user?.preferences) && user.preferences.length) {
		return uniqueStrings(user.preferences);
	}
	return uniqueStrings(user?.dating?.preferences?.languages || []);
}

function getProfileLikeTexts(user) {
	return uniqueStrings(extractIconTextValues(user?.likes));
}

function getProfileLookingForTexts(user) {
	const values = [
		...extractIconTextValues(user?.lookingFor),
		...extractIconTextValues(user?.whatBringsYouToVibgyor),
	];
	const legacyHereTo = trimLower(user?.dating?.preferences?.hereTo);
	if (legacyHereTo) values.push(legacyHereTo);
	return uniqueStrings(values);
}

function getProfileIdentificationTexts(user) {
	const fromIdentification = uniqueStrings(extractIconTextValues(user?.identification));
	if (fromIdentification.length) return fromIdentification;
	if (user?.gender) return uniqueStrings([user.gender]);
	return [];
}

function normalizeWantToMeetAliases(value) {
	const v = trimLower(value);
	const map = {
		men: ['man', 'male', 'men'],
		man: ['man', 'male', 'men'],
		male: ['man', 'male', 'men'],
		women: ['woman', 'female', 'women'],
		woman: ['woman', 'female', 'women'],
		female: ['woman', 'female', 'women'],
		'non-binary': ['non-binary', 'nonbinary', 'non binary'],
		nonbinary: ['non-binary', 'nonbinary', 'non binary'],
		everyone: ['everyone', 'all'],
		all: ['everyone', 'all'],
	};
	return uniqueStrings(map[v] || [v]);
}

function normalizeHereToAliases(hereTo) {
	const raw = String(hereTo || '').trim();
	const lower = trimLower(raw);
	const mapping = {
		'make new friends': 'friendship',
		friendship: 'friendship',
		friends: 'friendship',
		'find a date': 'dating',
		dating: 'dating',
		'find a partner': 'long-term',
		'long-term': 'long-term',
		'long term': 'long-term',
		relationship: 'long-term',
		'serious relationship': 'long-term',
		casual: 'casual',
		networking: 'networking',
		'meet new people': 'meet new people',
		'explore community': 'explore community',
		events: 'events',
	};
	const values = [raw];
	if (mapping[lower]) values.push(mapping[lower]);
	return uniqueStrings(values);
}

function overlapRatio(listA, listB) {
	if (!listA?.length || !listB?.length) return 0;
	const setB = new Set(listB.map(trimLower));
	const shared = listA.filter((item) => setB.has(trimLower(item)));
	return shared.length / Math.max(listA.length, listB.length);
}

function buildRegexOrConditions(fieldPath, values) {
	return values.map((value) => ({
		[fieldPath]: { $regex: new RegExp(`^${escapeRegex(value)}$`, 'i') },
	}));
}

function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function scoreWeightedFactor(weight, ratio) {
	if (ratio <= 0) return { weight: 0, score: 0 };
	return { weight, score: ratio * weight };
}

function scoreAgeCompatibility(currentUser, profile) {
	const ageRange = currentUser?.dating?.preferences?.ageRange;
	if (!ageRange || profile?.age == null) return { weight: 0, score: 0 };

	const { min, max } = ageRange;
	let ageScore = 0;
	if (profile.age >= min && profile.age <= max) {
		ageScore = 20;
	} else {
		const ageDiff = Math.min(Math.abs(profile.age - min), Math.abs(profile.age - max));
		if (ageDiff <= 5) ageScore = 10;
		else if (ageDiff <= 10) ageScore = 5;
	}
	return { weight: 20, score: ageScore };
}

function scoreLookingForOverlap(currentUser, profile) {
	const currentValues = getProfileLookingForTexts(currentUser);
	const profileValues = getProfileLookingForTexts(profile);
	const filterHereTo = trimLower(currentUser?.dating?.preferences?.hereTo);
	if (filterHereTo) currentValues.push(...normalizeHereToAliases(filterHereTo));
	const ratio = overlapRatio(
		uniqueStrings(currentValues),
		uniqueStrings(profileValues)
	);
	return scoreWeightedFactor(20, ratio);
}

function scoreIdentificationCompatibility(currentUser, profile) {
	const currentWant = trimLower(currentUser?.dating?.preferences?.wantToMeet);
	const profileWant = trimLower(profile?.dating?.preferences?.wantToMeet);
	const profileIds = getProfileIdentificationTexts(profile);
	const userIds = getProfileIdentificationTexts(currentUser);

	if (!currentWant && !profileWant && !profileIds.length && !userIds.length) {
		return { weight: 0, score: 0 };
	}

	let points = 0;
	let maxPoints = 0;

	if (currentWant) {
		maxPoints += 1;
		if (currentWant === 'everyone') {
			points += 1;
		} else {
			const aliases = normalizeWantToMeetAliases(currentWant);
			points += profileIds.some((id) => aliases.includes(id)) ? 1 : 0.35;
		}
	}

	if (profileWant) {
		maxPoints += 1;
		if (profileWant === 'everyone') {
			points += 1;
		} else {
			const aliases = normalizeWantToMeetAliases(profileWant);
			points += userIds.some((id) => aliases.includes(id)) ? 1 : 0.35;
		}
	}

	if (!currentWant && !profileWant && profileIds.length && userIds.length) {
		maxPoints = 1;
		points = overlapRatio(userIds, profileIds) > 0 ? 1 : 0.25;
	}

	if (maxPoints === 0) return { weight: 0, score: 0 };
	return scoreWeightedFactor(20, points / maxPoints);
}

function scoreOrientationMatch(currentUser, profile) {
	const a = trimLower(currentUser?.orientation);
	const b = trimLower(profile?.orientation);
	if (!a || !b) return { weight: 0, score: 0 };
	return scoreWeightedFactor(10, a === b ? 1 : 0);
}

function scoreRelationshipStyleMatch(currentUser, profile) {
	const a = trimLower(currentUser?.relationshipStyle?.text);
	const b = trimLower(profile?.relationshipStyle?.text);
	if (!a || !b) return { weight: 0, score: 0 };
	return scoreWeightedFactor(5, a === b ? 1 : 0.4);
}

function scoreLanguageOverlap(currentUser, profile) {
	const ratio = overlapRatio(getUserLanguages(currentUser), getUserLanguages(profile));
	return scoreWeightedFactor(10, ratio);
}

function scoreSharedLikes(currentUser, profile) {
	const ratio = overlapRatio(getProfileLikeTexts(currentUser), getProfileLikeTexts(profile));
	return scoreWeightedFactor(25, ratio);
}

function scoreDistance(profile) {
	if (profile.distance == null) return { weight: 0, score: 0 };
	let distanceScore = 0;
	if (profile.distance <= 10) distanceScore = 10;
	else if (profile.distance <= 25) distanceScore = 7;
	else if (profile.distance <= 50) distanceScore = 5;
	else if (profile.distance <= 100) distanceScore = 3;
	return { weight: 10, score: distanceScore };
}

/**
 * Compatibility score (0–100) using catalog-aligned profile fields.
 */
function calculateMatchPercentage(currentUser, profile) {
	const factors = [
		scoreSharedLikes(currentUser, profile),
		scoreAgeCompatibility(currentUser, profile),
		scoreLookingForOverlap(currentUser, profile),
		scoreIdentificationCompatibility(currentUser, profile),
		scoreOrientationMatch(currentUser, profile),
		scoreRelationshipStyleMatch(currentUser, profile),
		scoreLanguageOverlap(currentUser, profile),
		scoreDistance(profile),
	].filter((factor) => factor.weight > 0);

	if (!factors.length) return 0;

	const maxScore = factors.reduce((sum, factor) => sum + factor.weight, 0);
	const matchScore = factors.reduce((sum, factor) => sum + factor.score, 0);
	const percentage = Math.round((matchScore / maxScore) * 100);
	return Math.min(100, Math.max(0, percentage));
}

function buildSearchQuery(currentUser, filters = {}, excludedUserIds = []) {
	const {
		search = '',
		hereTo = null,
		lookingFor = null,
		wantToMeet = null,
		identification = null,
		ageMin = null,
		ageMax = null,
		languages = null,
		location = null,
		distanceMax = null,
		filter = 'all',
	} = filters;

	const allExcludedIdsStrings = [
		...(currentUser.blockedUsers || []).map((id) => id.toString()),
		...(currentUser.blockedBy || []).map((id) => id.toString()),
		...excludedUserIds.map((id) => id.toString()),
	].filter(Boolean);

	const allExcludedIds = [...new Set(allExcludedIdsStrings)].map(
		(id) => new mongoose.Types.ObjectId(id)
	);

	const query = {
		$and: [
			{ _id: { $ne: currentUser._id } },
			{ isActive: true },
			{ 'dating.isDatingProfileActive': true },
			...(allExcludedIds.length ? [{ _id: { $nin: allExcludedIds } }] : []),
		],
	};

	if (search && search.trim()) {
		const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
		query.$and.push({
			$or: [{ fullName: { $regex: searchRegex } }, { username: { $regex: searchRegex } }],
		});
	}

	const hereToFilter = hereTo || lookingFor;
	if (hereToFilter) {
		const values = Array.isArray(hereToFilter)
			? uniqueStrings(hereToFilter.flatMap(normalizeHereToAliases))
			: normalizeHereToAliases(hereToFilter);
		const hereToConditions = [];
		values.forEach((value) => {
			hereToConditions.push(...buildRegexOrConditions('lookingFor.text', [value]));
			hereToConditions.push(...buildRegexOrConditions('whatBringsYouToVibgyor.community', [value]));
			hereToConditions.push(...buildRegexOrConditions('dating.preferences.hereTo', [value]));
		});
		if (hereToConditions.length) {
			query.$and.push({ $or: hereToConditions });
		}
	}

	const meetFilter = wantToMeet || identification;
	if (meetFilter && trimLower(meetFilter) !== 'everyone') {
		const values = Array.isArray(meetFilter)
			? uniqueStrings(meetFilter.flatMap(normalizeWantToMeetAliases))
			: normalizeWantToMeetAliases(meetFilter);
		const meetConditions = [];
		values.forEach((value) => {
			meetConditions.push(...buildRegexOrConditions('identification.text', [value]));
			meetConditions.push(...buildRegexOrConditions('gender', [value]));
		});
		if (meetConditions.length) {
			query.$and.push({ $or: meetConditions });
		}
	}

	const effectiveAgeMin = ageMin !== null ? ageMin : ageMax !== null ? 18 : null;
	if (effectiveAgeMin !== null || ageMax !== null) {
		const ageQuery = {};
		const currentYear = new Date().getFullYear();
		if (effectiveAgeMin !== null) {
			ageQuery.$lte = new Date(`${currentYear - effectiveAgeMin}-12-31`);
		}
		if (ageMax !== null) {
			ageQuery.$gte = new Date(`${currentYear - ageMax}-01-01`);
		}
		if (Object.keys(ageQuery).length) {
			query.$and.push({ dob: ageQuery });
		}
	}

	if (languages && Array.isArray(languages) && languages.length) {
		const langConditions = [];
		languages.forEach((lang) => {
			if (!lang || !String(lang).trim()) return;
			const regex = new RegExp(`^${escapeRegex(String(lang).trim())}$`, 'i');
			langConditions.push({ preferences: regex });
			langConditions.push({ 'dating.preferences.languages': regex });
		});
		if (langConditions.length) {
			query.$and.push({ $or: langConditions });
		}
	}

	if (location) {
		const locationQuery = { $or: [] };
		if (location.city) {
			locationQuery.$or.push({ 'location.city': { $regex: location.city, $options: 'i' } });
			locationQuery.$or.push({
				'dating.preferences.location.city': { $regex: location.city, $options: 'i' },
			});
		}
		if (location.country) {
			locationQuery.$or.push({ 'location.country': { $regex: location.country, $options: 'i' } });
			locationQuery.$or.push({
				'dating.preferences.location.country': { $regex: location.country, $options: 'i' },
			});
		}
		if (locationQuery.$or.length) {
			query.$and.push(locationQuery);
		}
	}

	if (distanceMax !== null && currentUser.location?.lat && currentUser.location?.lng) {
		// Post-query distance filter
	}

	if (filter === 'new_dater') {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		query.$and.push({ createdAt: { $gte: sevenDaysAgo } });
	}

	if (filter === 'same_interests' || filter === 'same_likes') {
		const likeTexts = getProfileLikeTexts(currentUser);
		if (likeTexts.length) {
			query.$and.push({ 'likes.text': { $in: likeTexts } });
		}
	}

	return query;
}

module.exports = {
	PROFILE_SELECT_FIELDS,
	CURRENT_USER_SELECT_FIELDS,
	MATCH_USER_SELECT_FIELDS,
	calculateDistance,
	calculateMatchPercentage,
	buildSearchQuery,
	getUserLanguages,
	getProfileLikeTexts,
	getProfileLookingForTexts,
	getProfileIdentificationTexts,
	normalizeHereToAliases,
	normalizeWantToMeetAliases,
};
