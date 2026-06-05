const User = require('../../user/user.model');
const DatingInteraction = require('./datingInteraction.model');
const DatingMatch = require('./datingMatch.model');
const DatingProfileComment = require('../profile/datingProfileComment.model');
const FollowRequest = require('../../social/graph/followRequest.model');
const Report = require('../../social/graph/userReport.model');

module.exports = {
	User,
	DatingInteraction,
	DatingMatch,
	DatingProfileComment,
	FollowRequest,
	Report,
};
