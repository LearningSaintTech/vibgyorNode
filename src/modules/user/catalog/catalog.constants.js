const DEFAULT_CATALOG = {
	identificationList: [
		{ text: 'Man', icon: '', description: '' },
		{ text: 'Woman', icon: '', description: '' },
		{ text: 'Non-binary', icon: '', description: '' },
	],
	orientationList: ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Queer', 'Prefer not to say'],
	lookingForList: [
		{ text: 'Friendship', icon: '' },
		{ text: 'Dating', icon: '' },
		{ text: 'Long-term', icon: '' },
	],
	likeList: [
		{ text: 'Music', icon: '' },
		{ text: 'Travel', icon: '' },
		{ text: 'Movies', icon: '' },
		{ text: 'Fitness', icon: '' },
	],
	whatBringsYouToVibgyorList: [
		{ community: 'Meet new people', icon: '' },
		{ community: 'Dating', icon: '' },
		{ community: 'Explore community', icon: '' },
	],
	relationshipStyleList: [
		{ text: 'Monogamous', subtext: 'One partner' },
		{ text: 'Open', subtext: 'Ethical non-monogamy' },
	],
};

/**
 * listType (API) → DB field, item normalizer, dedupe key, optional icon upload match field
 */
const CATALOG_LIST_REGISTRY = {
	identification: {
		dbField: 'identificationList',
		bodyField: 'identification',
		itemType: 'identification',
		uploadMatchKey: 'text',
	},
	pronouns: {
		dbField: 'pronounList',
		bodyField: 'pronouns',
		itemType: 'textOnly',
		uploadMatchKey: null,
	},
	orientation: {
		dbField: 'orientationList',
		bodyField: 'orientation',
		itemType: 'textOnly',
		uploadMatchKey: null,
	},
	lookingFor: {
		dbField: 'lookingForList',
		bodyField: 'lookingFor',
		itemType: 'iconText',
		uploadMatchKey: 'text',
	},
	likes: {
		dbField: 'likeList',
		bodyField: 'likes',
		itemType: 'iconText',
		uploadMatchKey: 'text',
	},
	whatBringsYouToVibgyor: {
		dbField: 'whatBringsYouToVibgyorList',
		bodyField: 'whatBringsYouToVibgyor',
		itemType: 'iconCommunity',
		uploadMatchKey: 'community',
	},
	relationshipStyle: {
		dbField: 'relationshipStyleList',
		bodyField: 'relationshipStyle',
		itemType: 'textSubtext',
		uploadMatchKey: null,
	},
	languages: {
		dbField: 'languageList',
		bodyField: 'languages',
		itemType: 'textOnly',
		uploadMatchKey: null,
	},
};

const VALID_LIST_TYPES = Object.keys(CATALOG_LIST_REGISTRY);

const LEGACY_LIST_TYPE_FIELD_MAP = {
	gender: 'genderList',
	pronouns: 'pronounList',
	interests: 'interestList',
	hereFor: 'hereForList',
	languages: 'languageList',
};

module.exports = {
	DEFAULT_CATALOG,
	CATALOG_LIST_REGISTRY,
	VALID_LIST_TYPES,
	LEGACY_LIST_TYPE_FIELD_MAP,
};
