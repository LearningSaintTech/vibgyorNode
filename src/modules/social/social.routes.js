/**
 * Social module route exports (Khush-style aggregator).
 * Mount paths unchanged — wired in app.js.
 */
const { statusRoutes } = require('./status');
const { messageRequestRoutes } = require('./messageRequest');
const { graphRoutes } = require('./graph');
const { searchRoutes } = require('./search');
const { storyRoutes } = require('./story');
const { callRoutes } = require('./call');
const { chatRoutes } = require('./chat');
const { messageRoutes } = require('./message');
const { postRoutes } = require('./post');
const { apiV1Routes } = require('./apiV1');

module.exports = {
	statusRoutes,
	messageRequestRoutes,
	graphRoutes,
	searchRoutes,
	storyRoutes,
	callRoutes,
	chatRoutes,
	messageRoutes,
	postRoutes,
	apiV1Routes,
};
