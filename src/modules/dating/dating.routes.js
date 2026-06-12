/**
 * Dating module route exports (Khush-style aggregator).
 * Mount paths unchanged — wired in app.js.
 */
const mediaRoutes = require('./media/media.routes');
const profileRoutes = require('./profile/profile.routes');
const interactionRoutes = require('./interaction/interaction.routes');
const chatRoutes = require('./chat/chat.routes');
const messageRoutes = require('./message/message.routes');
const callRoutes = require('./call/call.routes');

module.exports = {
	mediaRoutes,
	profileRoutes,
	interactionRoutes,
	chatRoutes,
	messageRoutes,
	callRoutes,
};
