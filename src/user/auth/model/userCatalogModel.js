const mongoose = require('mongoose');

// Schema for interest/like items with SVG support
const InterestItemSchema = new mongoose.Schema({
	name: { type: String, required: true },
	svgUrl: { type: String }, // URL to uploaded SVG file (preferred)
	svgData: { type: String }, // Inline SVG string (fallback)
}, { _id: false });

const CatalogSchema = new mongoose.Schema(
	{
		genderList: [{ type: String }],
		pronounList: [{ type: String }],
		// Changed from String array to InterestItemSchema array to support SVG
		likeList: [InterestItemSchema],
		interestList: [InterestItemSchema],
		hereForList: [{ type: String }],
		languageList: [{ type: String }],
		version: { type: Number, default: 1 },
	},
	{ timestamps: true }
);

const UserCatalog = mongoose.models.UserCatalog || mongoose.model('UserCatalog', CatalogSchema);

module.exports = UserCatalog;


