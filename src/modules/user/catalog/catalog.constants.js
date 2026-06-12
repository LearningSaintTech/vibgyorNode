const DEFAULT_CATALOG = {
	identificationList: [
		{ text: 'Man', description: '' },
		{ text: 'Woman', description: '' },
		{ text: 'Non-binary', description: '' },
	],
	orientationList: [
		{ identification: 'Man', icon: '', text: 'Straight' },
		{ identification: 'Man', icon: '', text: 'Gay' },
		{ identification: 'Woman', icon: '', text: 'Straight' },
		{ identification: 'Woman', icon: '', text: 'Lesbian' },
	],
	pronounList: [
		{ identification: 'Man', text: 'He/Him' },
		{ identification: 'Man', text: 'They/Them' },
		{ identification: 'Woman', text: 'She/Her' },
		{ identification: 'Woman', text: 'They/Them' },
	],
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
		uploadMatchKey: null,
		filterByIdentification: false,
	},
	pronouns: {
		dbField: 'pronounList',
		bodyField: 'pronouns',
		itemType: 'linkedText',
		uploadMatchKey: null,
		filterByIdentification: true,
	},
	orientation: {
		dbField: 'orientationList',
		bodyField: 'orientation',
		itemType: 'linkedIconText',
		uploadMatchKey: 'text',
		filterByIdentification: true,
	},
	lookingFor: {
		dbField: 'lookingForList',
		bodyField: 'lookingFor',
		itemType: 'iconText',
		uploadMatchKey: 'text',
		filterByIdentification: false,
	},
	likes: {
		dbField: 'likeList',
		bodyField: 'likes',
		itemType: 'iconText',
		uploadMatchKey: 'text',
		filterByIdentification: false,
	},
	whatBringsYouToVibgyor: {
		dbField: 'whatBringsYouToVibgyorList',
		bodyField: 'whatBringsYouToVibgyor',
		itemType: 'iconCommunity',
		uploadMatchKey: 'community',
		filterByIdentification: false,
	},
	relationshipStyle: {
		dbField: 'relationshipStyleList',
		bodyField: 'relationshipStyle',
		itemType: 'textSubtext',
		uploadMatchKey: null,
		filterByIdentification: false,
	},
	languages: {
		dbField: 'languageList',
		bodyField: 'languages',
		itemType: 'textOnly',
		uploadMatchKey: null,
		filterByIdentification: false,
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
