const profileSteps = require('../../../utils/profileSteps');

function defaultDistance() {
	return { min: 0, max: 100, unit: 'km' };
}

function defaultRelationshipStyle() {
	return { text: '', subtext: '' };
}

function buildDatingProfile(user, extras = {}) {
	return {
		photos: user.dating?.photos || [],
		videos: user.dating?.videos || [],
		isDatingProfileActive: user.dating?.isDatingProfileActive || false,
		preferences: user.dating?.preferences || {},
		lastUpdatedAt: user.dating?.lastUpdatedAt || null,
		...extras,
	};
}

/**
 * Full authenticated user profile for GET /me, GET /profile, GET /profile/step.
 */
function buildAuthenticatedUserProfile(user, extras = {}) {
	const { dating: datingExtras, ...restExtras } = extras;
	const step = profileSteps.buildStepResponse(user);

	return {
		id: user._id,
		phoneNumber: typeof user.maskedPhone === 'function' ? user.maskedPhone() : user.phoneNumber,
		countryCode: user.countryCode,
		email: user.email,
		emailVerified: user.emailVerified,
		username: user.username,
		fullName: user.fullName,
		dob: user.dob,
		bio: user.bio || '',
		longDesc: user.longDesc || '',
		heightCm: user.heightCm ?? null,
		profession: user.profession || '',
		gender: user.gender || '',
		pronouns: user.pronouns || '',
		identification: user.identification || [],
		orientation: user.orientation || '',
		lookingFor: user.lookingFor || [],
		relationshipStyle: user.relationshipStyle || defaultRelationshipStyle(),
		whatBringsYouToVibgyor: user.whatBringsYouToVibgyor || [],
		distance: user.distance || defaultDistance(),
		likes: user.likes || [],
		preferences: Array.isArray(user.preferences) ? user.preferences : [],
		profilePictureUrl: user.profilePictureUrl || '',
		idProofUrl: user.idProofUrl || '',
		location: user.location || {},
		role: user.role,
		isProfileCompleted: user.isProfileCompleted,
		profileCompletionStep: user.profileCompletionStep,
		isActive: user.isActive,
		verificationStatus: user.verificationStatus,
		verificationDocument: user.verificationDocument,
		following: user.following || [],
		followers: user.followers || [],
		blockedUsers: user.blockedUsers || [],
		privacySettings: user.privacySettings,
		lastLoginAt: user.lastLoginAt,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		dating: buildDatingProfile(user, datingExtras || {}),
		...step,
		...restExtras,
	};
}

module.exports = {
	buildAuthenticatedUserProfile,
	buildDatingProfile,
};
