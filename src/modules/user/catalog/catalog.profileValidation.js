const { UserCatalog } = require('./catalog.repository');
const {
	normalizeLinkedTextList,
	normalizeLinkedIconTextList,
	getPrimaryIdentificationText,
	identificationKey,
} = require('./catalog.normalize');

function trimStr(value) {
	if (value == null) return '';
	return String(value).trim();
}

function getUserIdentificationKey(user) {
	const items = user?.identification || [];
	if (!items.length) return '';
	const first = items[0];
	return trimStr(typeof first === 'object' ? first.text : first);
}

function catalogHasConfiguredLists(catalog) {
	if (!catalog) return false;
	return Boolean(
		(catalog.pronounList && catalog.pronounList.length > 0)
		|| (catalog.orientationList && catalog.orientationList.length > 0)
	);
}

function isPronounAllowed(catalog, identification, pronouns) {
	const value = trimStr(pronouns);
	if (!value) return true;

	const key = identificationKey(identification);
	if (!key) return false;

	const allowed = normalizeLinkedTextList(catalog?.pronounList || [])
		.filter((item) => identificationKey(item.identification) === key)
		.map((item) => trimStr(item.text).toLowerCase());

	if (!allowed.length) return true;
	return allowed.includes(value.toLowerCase());
}

function isOrientationAllowed(catalog, identification, orientation) {
	const value = trimStr(orientation);
	if (!value) return true;

	const key = identificationKey(identification);
	if (!key) return false;

	const allowed = normalizeLinkedIconTextList(catalog?.orientationList || [])
		.filter((item) => identificationKey(item.identification) === key)
		.map((item) => trimStr(item.text).toLowerCase());

	if (!allowed.length) return true;
	return allowed.includes(value.toLowerCase());
}

/**
 * Validate incoming pronouns/orientation against catalog before persisting.
 */
async function validateIncomingProfileCatalogFields(user, updates = {}) {
	const catalog = await UserCatalog.findOne({}).lean();
	if (!catalog || !catalogHasConfiguredLists(catalog)) {
		return { ok: true };
	}

	const activeIdentification = updates.identification !== undefined
		? getPrimaryIdentificationText(updates.identification)
		: getUserIdentificationKey(user);

	if (updates.pronouns !== undefined) {
		const pronouns = trimStr(updates.pronouns);
		if (pronouns && !isPronounAllowed(catalog, activeIdentification, pronouns)) {
			return {
				ok: false,
				code: 'INVALID_PRONOUNS',
				message: `Pronouns "${pronouns}" are not available for the selected identity.`,
			};
		}
	}

	if (updates.orientation !== undefined) {
		const orientation = trimStr(updates.orientation);
		if (orientation && !isOrientationAllowed(catalog, activeIdentification, orientation)) {
			return {
				ok: false,
				code: 'INVALID_ORIENTATION',
				message: `Orientation "${orientation}" is not available for the selected identity.`,
			};
		}
	}

	return { ok: true };
}

/**
 * After profile fields are applied: reset dependents when identity changes or values are invalid.
 */
async function syncProfileCatalogDependentFields(user, previousIdentification) {
	const catalog = await UserCatalog.findOne({}).lean();
	const currentIdentification = getUserIdentificationKey(user);

	if (
		identificationKey(previousIdentification) !== identificationKey(currentIdentification)
	) {
		user.pronouns = '';
		user.orientation = '';
		return;
	}

	if (!catalog || !catalogHasConfiguredLists(catalog)) return;

	if (user.pronouns && !isPronounAllowed(catalog, currentIdentification, user.pronouns)) {
		user.pronouns = '';
	}
	if (user.orientation && !isOrientationAllowed(catalog, currentIdentification, user.orientation)) {
		user.orientation = '';
	}
}

module.exports = {
	getUserIdentificationKey,
	isPronounAllowed,
	isOrientationAllowed,
	validateIncomingProfileCatalogFields,
	syncProfileCatalogDependentFields,
};
