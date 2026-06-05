/**
 * Post-login profile onboarding (14 screens + completed).
 * Required: name_username, short_bio, birthday, looking_for_distance, location.
 * Skippable (Next without data): orientation, likes, photos, what_brings_you,
 * relationship_style, preferences. Other screens before orientation are optional.
 */

const PROFILE_STEPS = {
	NAME_USERNAME: 'name_username',
	SHORT_BIO: 'short_bio',
	BIRTHDAY: 'birthday',
	ABOUT_PHYSICAL: 'about_physical',
	IDENTIFICATION: 'identification',
	PRONOUNS: 'pronouns',
	ORIENTATION: 'orientation',
	LOOKING_FOR_DISTANCE: 'looking_for_distance',
	LIKES: 'likes',
	PHOTOS: 'photos',
	WHAT_BRINGS_YOU: 'what_brings_you',
	RELATIONSHIP_STYLE: 'relationship_style',
	PREFERENCES: 'preferences',
	LOCATION: 'location',
	COMPLETED: 'completed',
};

const PROFILE_STEP_ORDER = [
	PROFILE_STEPS.NAME_USERNAME,
	PROFILE_STEPS.SHORT_BIO,
	PROFILE_STEPS.BIRTHDAY,
	PROFILE_STEPS.ABOUT_PHYSICAL,
	PROFILE_STEPS.IDENTIFICATION,
	PROFILE_STEPS.PRONOUNS,
	PROFILE_STEPS.ORIENTATION,
	PROFILE_STEPS.LOOKING_FOR_DISTANCE,
	PROFILE_STEPS.LIKES,
	PROFILE_STEPS.PHOTOS,
	PROFILE_STEPS.WHAT_BRINGS_YOU,
	PROFILE_STEPS.RELATIONSHIP_STYLE,
	PROFILE_STEPS.PREFERENCES,
	PROFILE_STEPS.LOCATION,
	PROFILE_STEPS.COMPLETED,
];

const ONBOARDING_STEPS = PROFILE_STEP_ORDER.filter((s) => s !== PROFILE_STEPS.COMPLETED);

const REQUIRED_STEPS = new Set([
	PROFILE_STEPS.NAME_USERNAME,
	PROFILE_STEPS.SHORT_BIO,
	PROFILE_STEPS.BIRTHDAY,
	PROFILE_STEPS.LOOKING_FOR_DISTANCE,
	PROFILE_STEPS.LOCATION,
]);

/** May advance with empty data; resume does not force user back after they move on */
const SKIPPABLE_WITHOUT_DATA = new Set([
	PROFILE_STEPS.ORIENTATION,
	PROFILE_STEPS.LIKES,
	PROFILE_STEPS.PHOTOS,
	PROFILE_STEPS.WHAT_BRINGS_YOU,
	PROFILE_STEPS.RELATIONSHIP_STYLE,
	PROFILE_STEPS.PREFERENCES,
]);

const LEGACY_STEP_MAP = {
	basic_info: PROFILE_STEPS.NAME_USERNAME,
	gender: PROFILE_STEPS.IDENTIFICATION,
	likes_interests: PROFILE_STEPS.LIKES,
	id_upload: PROFILE_STEPS.PHOTOS,
};

const PROFILE_STEP_CONFIG = {
	[PROFILE_STEPS.NAME_USERNAME]: {
		title: 'Name & Username',
		fields: ['fullName', 'username'],
	},
	[PROFILE_STEPS.SHORT_BIO]: {
		title: 'Short Bio',
		fields: ['bio'],
	},
	[PROFILE_STEPS.BIRTHDAY]: {
		title: 'Birthday',
		fields: ['dob'],
	},
	[PROFILE_STEPS.ABOUT_PHYSICAL]: {
		title: 'About You',
		fields: ['heightCm', 'profession', 'longDesc'],
	},
	[PROFILE_STEPS.IDENTIFICATION]: {
		title: 'Identification',
		fields: ['identification'],
	},
	[PROFILE_STEPS.PRONOUNS]: {
		title: 'Pronouns',
		fields: ['pronouns'],
	},
	[PROFILE_STEPS.ORIENTATION]: {
		title: 'Orientation',
		fields: ['orientation'],
		skippable: true,
	},
	[PROFILE_STEPS.LOOKING_FOR_DISTANCE]: {
		title: 'Looking For',
		fields: ['lookingFor', 'distance'],
		required: true,
	},
	[PROFILE_STEPS.LIKES]: {
		title: 'Likes',
		fields: ['likes'],
		skippable: true,
	},
	[PROFILE_STEPS.PHOTOS]: {
		title: 'Photos',
		fields: ['dating.photos'],
		skippable: true,
	},
	[PROFILE_STEPS.WHAT_BRINGS_YOU]: {
		title: 'What Brings You To Vibgyor',
		fields: ['whatBringsYouToVibgyor'],
		skippable: true,
	},
	[PROFILE_STEPS.RELATIONSHIP_STYLE]: {
		title: 'Relationship Style',
		fields: ['relationshipStyle'],
		skippable: true,
	},
	[PROFILE_STEPS.PREFERENCES]: {
		title: 'Preferences',
		fields: ['preferences'],
		skippable: true,
	},
	[PROFILE_STEPS.LOCATION]: {
		title: 'Location',
		fields: ['location.lat', 'location.lng', 'location.city', 'location.country', 'location.address'],
		required: true,
	},
};

const PROFILE_STEP_ENUM = [...ONBOARDING_STEPS, PROFILE_STEPS.COMPLETED, ...Object.keys(LEGACY_STEP_MAP)];

function normalizeProfileStep(step) {
	if (!step) return PROFILE_STEPS.NAME_USERNAME;
	if (LEGACY_STEP_MAP[step]) return LEGACY_STEP_MAP[step];
	if (PROFILE_STEP_ORDER.includes(step)) return step;
	return PROFILE_STEPS.NAME_USERNAME;
}

function getNextStep(currentStep) {
	const normalized = normalizeProfileStep(currentStep);
	const index = PROFILE_STEP_ORDER.indexOf(normalized);
	if (index === -1 || index >= PROFILE_STEP_ORDER.length - 1) {
		return PROFILE_STEPS.COMPLETED;
	}
	return PROFILE_STEP_ORDER[index + 1];
}

function getPreviousStep(currentStep) {
	const normalized = normalizeProfileStep(currentStep);
	const index = PROFILE_STEP_ORDER.indexOf(normalized);
	if (index <= 0) return null;
	return PROFILE_STEP_ORDER[index - 1];
}

/** Required steps need data; optional steps may be skipped empty */
function isStepCompleted(user, step) {
	const normalized = normalizeProfileStep(step);
	if (normalized === PROFILE_STEPS.COMPLETED) return true;
	if (isRequiredStep(normalized)) {
		return hasRequiredStepData(user, normalized);
	}
	return true;
}

function canAdvanceFromStep(user, step) {
	return isStepCompleted(user, step);
}

function getStepIndex(currentStep) {
	const normalized = normalizeProfileStep(currentStep);
	return ONBOARDING_STEPS.indexOf(normalized);
}

function getStepProgress(currentStep) {
	const index = getStepIndex(currentStep);
	if (index < 0) return 0;
	return Math.round((index / ONBOARDING_STEPS.length) * 100);
}

function getStepConfig(step) {
	const normalized = normalizeProfileStep(step);
	const config = PROFILE_STEP_CONFIG[normalized] || {};
	return {
		...config,
		required: isRequiredStep(normalized),
		skippable: isSkippableWithoutData(normalized) || config.skippable === true,
	};
}

/**
 * Step after the current screen (when user taps Next on currentStep).
 * Not the screen to render now — use buildStepResponse().nextStep for that.
 */
function getFollowingStep(currentStep) {
	return getNextStep(currentStep);
}

function isRequiredStep(step) {
	return REQUIRED_STEPS.has(normalizeProfileStep(step));
}

function hasRequiredStepData(user, step) {
	switch (normalizeProfileStep(step)) {
		case PROFILE_STEPS.NAME_USERNAME:
			return !!(user.fullName && user.username);
		case PROFILE_STEPS.SHORT_BIO:
			return !!(user.bio && String(user.bio).trim());
		case PROFILE_STEPS.BIRTHDAY:
			return !!user.dob;
		case PROFILE_STEPS.LOOKING_FOR_DISTANCE:
			return Array.isArray(user.lookingFor) && user.lookingFor.length > 0;
		case PROFILE_STEPS.LOCATION:
			return !!(
				user.location
				&& (
					(user.location.address && String(user.location.address).trim())
					|| (user.location.city && String(user.location.city).trim())
					|| (user.location.country && String(user.location.country).trim())
					|| (user.location.lat != null && user.location.lng != null)
				)
			);
		default:
			return false;
	}
}

/** Whether an optional screen has user-provided data */
function hasOptionalStepData(user, step) {
	switch (normalizeProfileStep(step)) {
		case PROFILE_STEPS.ABOUT_PHYSICAL:
			return (
				(user.heightCm != null && Number(user.heightCm) > 0)
				|| !!(user.profession && String(user.profession).trim())
				|| !!(user.longDesc && String(user.longDesc).trim())
			);
		case PROFILE_STEPS.IDENTIFICATION:
			return Array.isArray(user.identification) && user.identification.length > 0;
		case PROFILE_STEPS.PRONOUNS:
			return !!(user.pronouns && String(user.pronouns).trim());
		case PROFILE_STEPS.ORIENTATION:
			return !!(user.orientation && String(user.orientation).trim());
		case PROFILE_STEPS.LOOKING_FOR_DISTANCE:
			return Array.isArray(user.lookingFor) && user.lookingFor.length > 0;
		case PROFILE_STEPS.LIKES:
			return Array.isArray(user.likes) && user.likes.length > 0;
		case PROFILE_STEPS.PHOTOS:
			return Array.isArray(user.dating?.photos) && user.dating.photos.length > 0;
		case PROFILE_STEPS.WHAT_BRINGS_YOU:
			return Array.isArray(user.whatBringsYouToVibgyor) && user.whatBringsYouToVibgyor.length > 0;
		case PROFILE_STEPS.RELATIONSHIP_STYLE:
			return !!(
				user.relationshipStyle
				&& (user.relationshipStyle.text || user.relationshipStyle.subtext)
			);
		case PROFILE_STEPS.PREFERENCES:
			return Array.isArray(user.preferences) && user.preferences.length > 0;
		default:
			return false;
	}
}

function isSkippableWithoutData(step) {
	return SKIPPABLE_WITHOUT_DATA.has(normalizeProfileStep(step));
}

/** Optional screen treated as done when resuming past it */
function isOptionalStepFilled(user, step) {
	if (isSkippableWithoutData(step)) {
		return true;
	}
	return hasOptionalStepData(user, step);
}

/**
 * Where the user should continue in the wizard (strict screen order).
 * Skippable steps are still shown in sequence; skippable only means Next without data.
 */
function getResumeStep(user) {
	if (user.isProfileCompleted) return PROFILE_STEPS.COMPLETED;

	const stored = normalizeProfileStep(user.profileCompletionStep);
	let storedIndex = getStepIndex(stored);

	if (storedIndex < 0) {
		for (const step of ONBOARDING_STEPS) {
			if (isRequiredStep(step) && !hasRequiredStepData(user, step)) {
				return step;
			}
			if (!isRequiredStep(step) && !hasOptionalStepData(user, step) && !isSkippableWithoutData(step)) {
				return step;
			}
		}
		return hasRequiredStepData(user, PROFILE_STEPS.LOCATION)
			? PROFILE_STEPS.COMPLETED
			: PROFILE_STEPS.LOCATION;
	}

	for (let i = 0; i <= storedIndex; i += 1) {
		const step = ONBOARDING_STEPS[i];
		if (isRequiredStep(step) && !hasRequiredStepData(user, step)) {
			return step;
		}
	}

	const onStored = ONBOARDING_STEPS[storedIndex];

	if (isRequiredStep(onStored) && !hasRequiredStepData(user, onStored)) {
		return onStored;
	}

	if (!isRequiredStep(onStored)) {
		return onStored;
	}

	return onStored;
}

function resolveAdvanceStep(body, explicitStep) {
	if (
		body.advanceStep !== undefined
		&& body.advanceStep !== null
		&& String(body.advanceStep).trim() !== ''
	) {
		return String(body.advanceStep).trim().toLowerCase() === 'true'
			|| body.advanceStep === true
			|| body.advanceStep === 1
			|| body.advanceStep === '1';
	}
	// Sending `step` = user tapped Next on that screen
	return Boolean(explicitStep);
}

/** API payload for onboarding step endpoints */
function buildStepResponse(user) {
	const currentStep = getResumeStep(user);
	const isDone = Boolean(user.isProfileCompleted);

	return {
		currentStep,
		profileCompletionStep: currentStep,
		// Screen the client should show now
		nextStep: isDone ? PROFILE_STEPS.COMPLETED : currentStep,
		// Screen that opens after user completes currentStep
		followingStep: isDone ? null : getFollowingStep(currentStep),
		previousStep: getPreviousStep(currentStep),
		isCurrentStepCompleted: isStepCompleted(user, currentStep),
		isProfileCompleted: isDone,
		stepIndex: getStepIndex(currentStep),
		totalSteps: ONBOARDING_STEPS.length,
		stepProgress: getStepProgress(currentStep),
		stepConfig: getStepConfig(currentStep),
		steps: ONBOARDING_STEPS,
	};
}

function advanceFromStep(user, fromStep) {
	const normalized = normalizeProfileStep(fromStep);
	user.profileCompletionStep = normalized;

	if (!isStepCompleted(user, normalized)) {
		return normalized;
	}

	const next = getNextStep(normalized);
	user.profileCompletionStep = next;
	if (next === PROFILE_STEPS.COMPLETED) {
		user.isProfileCompleted = true;
	}
	return next;
}

/** Advance from whatever step is already stored on the user document */
function advanceProfileStep(user) {
	return advanceFromStep(user, user.profileCompletionStep);
}

function inferStepFromBody(body, files = []) {
	if (!body || typeof body !== 'object') return null;

	const has = (key) => body[key] !== undefined;
	const fileNames = (files || []).map((f) => f.fieldname || '');

	// Required onboarding screens (check before generic fields)
	if (has('bio')) return PROFILE_STEPS.SHORT_BIO;
	if (has('dob')) return PROFILE_STEPS.BIRTHDAY;
	if (has('fullName') || has('username')) return PROFILE_STEPS.NAME_USERNAME;

	if (has('location')) return PROFILE_STEPS.LOCATION;
	if (has('preferences')) return PROFILE_STEPS.PREFERENCES;
	if (has('relationshipStyle')) return PROFILE_STEPS.RELATIONSHIP_STYLE;
	if (has('whatBringsYouToVibgyor')) return PROFILE_STEPS.WHAT_BRINGS_YOU;
	if (
		has('photos')
		|| has('datingPhotos')
		|| fileNames.some((name) => /photos?/i.test(name))
	) {
		return PROFILE_STEPS.PHOTOS;
	}
	if (has('likes')) return PROFILE_STEPS.LIKES;
	if (has('lookingFor') || has('distance')) return PROFILE_STEPS.LOOKING_FOR_DISTANCE;
	if (has('orientation')) return PROFILE_STEPS.ORIENTATION;
	if (has('pronouns')) return PROFILE_STEPS.PRONOUNS;
	if (has('identification')) return PROFILE_STEPS.IDENTIFICATION;
	if (has('heightCm') || has('profession') || has('longDesc')) return PROFILE_STEPS.ABOUT_PHYSICAL;

	return null;
}

/**
 * Update onboarding pointer after profile PUT.
 * - advanceStep false (default): save fields; move stored step back if editing an earlier screen
 * - advanceStep true: advance from explicit step, inferred step, or stored step (in that order)
 */
function applyProfileStepUpdate(user, { explicitStep, body, files, advanceStep }) {
	if (user.isProfileCompleted) return;

	const activeStep = explicitStep
		? normalizeProfileStep(explicitStep)
		: inferStepFromBody(body, files);

	if (!activeStep) {
		if (advanceStep) advanceProfileStep(user);
		return;
	}

	const dbStep = normalizeProfileStep(user.profileCompletionStep);
	const activeIndex = getStepIndex(activeStep);
	const dbIndex = getStepIndex(dbStep);

	if (advanceStep) {
		if (!canAdvanceFromStep(user, activeStep)) {
			user.profileCompletionStep = activeStep;
			return { advanced: false, code: 'REQUIRED_STEP_INCOMPLETE' };
		}
		advanceFromStep(user, activeStep);
		return { advanced: true };
	}

	if (activeIndex < 0) return;

	// Back navigation: only move stored pointer backward
	if (activeIndex < dbIndex) {
		user.profileCompletionStep = activeStep;
		return;
	}

	// Same screen save without Next
	if (activeIndex === dbIndex) {
		user.profileCompletionStep = activeStep;
		return;
	}

	// Saved a later screen without Next — move pointer up to that screen
	if (activeIndex > dbIndex) {
		user.profileCompletionStep = activeStep;
	}
}

module.exports = {
	PROFILE_STEPS,
	PROFILE_STEP_ORDER,
	ONBOARDING_STEPS,
	PROFILE_STEP_ENUM,
	PROFILE_STEP_CONFIG,
	normalizeProfileStep,
	getNextStep,
	getPreviousStep,
	isStepCompleted,
	canAdvanceFromStep,
	getStepIndex,
	getStepProgress,
	getStepConfig,
	getFollowingStep,
	isRequiredStep,
	hasRequiredStepData,
	hasOptionalStepData,
	isOptionalStepFilled,
	isSkippableWithoutData,
	SKIPPABLE_WITHOUT_DATA,
	REQUIRED_STEPS,
	getResumeStep,
	resolveAdvanceStep,
	buildStepResponse,
	advanceFromStep,
	advanceProfileStep,
	inferStepFromBody,
	applyProfileStepUpdate,
};
