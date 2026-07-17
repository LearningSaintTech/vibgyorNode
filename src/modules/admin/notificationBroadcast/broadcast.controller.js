const ApiResponse = require('../../../utils/apiResponse');
const broadcastService = require('./broadcast.service');

async function createBroadcast(req, res) {
	try {
		const result = await broadcastService.createBroadcast(req.user, req.body);
		return ApiResponse.custom(res, 202, {
			success: true,
			message: 'Broadcast accepted and is being processed',
			data: {
				broadcast: result.broadcast,
				readiness: result.readiness,
			},
		});
	} catch (error) {
		console.error('[BROADCAST] createBroadcast error:', error);
		return ApiResponse.badRequest(res, error.message || 'Failed to create broadcast');
	}
}

async function listBroadcasts(req, res) {
	try {
		const { page = 1, limit = 10 } = req.query;
		const result = await broadcastService.listBroadcasts({
			page: parseInt(page, 10),
			limit: parseInt(limit, 10),
		});
		return ApiResponse.success(res, result, 'Broadcast history fetched');
	} catch (error) {
		console.error('[BROADCAST] listBroadcasts error:', error);
		return ApiResponse.serverError(res, 'Failed to fetch broadcast history');
	}
}

async function getBroadcast(req, res) {
	try {
		const broadcast = await broadcastService.getBroadcastById(req.params.broadcastId);
		return ApiResponse.success(res, broadcast, 'Broadcast details fetched');
	} catch (error) {
		if (error.message === 'Broadcast not found' || error.message === 'Invalid broadcast id') {
			return ApiResponse.notFound(res, error.message);
		}
		console.error('[BROADCAST] getBroadcast error:', error);
		return ApiResponse.serverError(res, 'Failed to fetch broadcast');
	}
}

async function getDeliveryStatus(req, res) {
	try {
		const readiness = broadcastService.getDeliveryReadiness();
		const recipientCount = await broadcastService.countRecipients({
			isActive: true,
			verifiedOnly: false,
		});
		return ApiResponse.success(
			res,
			{ ...readiness, activeUserCount: recipientCount },
			'Notification delivery status'
		);
	} catch (error) {
		console.error('[BROADCAST] getDeliveryStatus error:', error);
		return ApiResponse.serverError(res, 'Failed to fetch delivery status');
	}
}

module.exports = {
	createBroadcast,
	listBroadcasts,
	getBroadcast,
	getDeliveryStatus,
};
