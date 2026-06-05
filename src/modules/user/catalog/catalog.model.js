const mongoose = require('mongoose');

const CatalogIconTextSchema = new mongoose.Schema(
	{
		icon: { type: String, default: '' },
		text: { type: String, required: true },
	},
	{ _id: false }
);

const CatalogIdentificationSchema = new mongoose.Schema(
	{
		icon: { type: String, default: '' },
		text: { type: String, required: true },
		description: { type: String, default: '' },
	},
	{ _id: false }
);

const CatalogCommunitySchema = new mongoose.Schema(
	{
		icon: { type: String, default: '' },
		community: { type: String, required: true },
	},
	{ _id: false }
);

const CatalogRelationshipStyleSchema = new mongoose.Schema(
	{
		text: { type: String, required: true },
		subtext: { type: String, default: '' },
	},
	{ _id: false }
);

/** Legacy interest/like shape — migrated on read to icon+text */
const LegacyInterestItemSchema = new mongoose.Schema(
	{
		name: { type: String },
		svgUrl: { type: String },
		svgData: { type: String },
		icon: { type: String },
		text: { type: String },
	},
	{ _id: false }
);

const CatalogSchema = new mongoose.Schema(
	{
		identificationList: [CatalogIdentificationSchema],
		orientationList: [{ type: String }],
		lookingForList: [CatalogIconTextSchema],
		likeList: [CatalogIconTextSchema],
		whatBringsYouToVibgyorList: [CatalogCommunitySchema],
		relationshipStyleList: [CatalogRelationshipStyleSchema],
		// Legacy fields (optional; not returned on public GET)
		genderList: [{ type: String }],
		pronounList: [{ type: String }],
		interestList: [LegacyInterestItemSchema],
		hereForList: [{ type: String }],
		languageList: [{ type: String }],
		version: { type: Number, default: 1 },
	},
	{ timestamps: true }
);

const UserCatalog = mongoose.models.UserCatalog || mongoose.model('UserCatalog', CatalogSchema);

module.exports = UserCatalog;
