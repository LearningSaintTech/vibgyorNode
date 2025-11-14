const mongoose = require('mongoose');

const CatalogSchema = new mongoose.Schema(
	{
		genderList: [{ type: String }],
		pronounList: [{ type: String }],
		likeList: [{ type: String }],
		interestList: [{ type: String }],
		hereForList: [{ type: String }],
		languageList: [{ type: String }],
		version: { type: Number, default: 1 },
	},
	{ timestamps: true }
);

const UserCatalog = mongoose.models.UserCatalog || mongoose.model('UserCatalog', CatalogSchema);

module.exports = UserCatalog;


