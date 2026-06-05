/**
 * Dating module route exports (Khush-style aggregator).
 * Mount paths unchanged — wired in app.js.
 */
const { mediaRoutes } = require('./media');
const { profileRoutes } = require('./profile');
const { interactionRoutes } = require('./interaction');
const { chatRoutes } = require('./chat');
const { messageRoutes } = require('./message');
const { callRoutes } = require('./call');

module.exports = {
	mediaRoutes,
	profileRoutes,
	interactionRoutes,
	chatRoutes,
	messageRoutes,
	callRoutes,
};
