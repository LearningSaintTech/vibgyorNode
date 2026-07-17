const mongoose = require('mongoose');
const User = require('../../user/user.model');
const notificationService = require('../../notification/services/notificationService');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
const pushNotificationService = require('../../../services/pushNotificationService');
const broadcastRepository = require('./broadcast.repository');

const USER_BATCH_SIZE = 100;
const CONCURRENCY = 10;

/** In-memory guard so the same broadcast is not processed twice in one process */
const activeBroadcastIds = new Set();

function getDeliveryReadiness() {
	return {
		socketReady: Boolean(enhancedRealtimeService?.io),
		fcmReady: pushNotificationService.isInitialized(),
		fcmConfigured: Boolean(process.env.FCM_SERVICE_ACCOUNT_PATH),
	};
}

function resolveCreator(reqUser) {
	const role = String(reqUser?.role || '').toLowerCase();
	const userId = reqUser?.userId || reqUser?.id || reqUser?._id;

	if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
		throw new Error('Invalid authenticated user');
	}

	return {
		createdBy: userId,
		createdByModel: role === 'subadmin' ? 'SubAdmin' : 'Admin',
		createdByRole: role === 'subadmin' ? 'subadmin' : 'admin',
	};
}

async function countRecipients(filters) {
	const userFilter = broadcastRepository.buildUserFilter(filters);
	return User.countDocuments(userFilter);
}

async function createBroadcast(reqUser, payload) {
	const { title, message, actionUrl = '', filters = {} } = payload;

	if (!title?.trim()) throw new Error('Title is required');
	if (!message?.trim()) throw new Error('Message is required');

	const creator = resolveCreator(reqUser);
	const normalizedFilters = {
		isActive: filters.isActive !== false,
		verifiedOnly: Boolean(filters.verifiedOnly),
	};

	const totalRecipients = await countRecipients(normalizedFilters);
	const readiness = getDeliveryReadiness();

	const broadcast = await broadcastRepository.createBroadcast({
		title: title.trim(),
		message: message.trim(),
		actionUrl: (actionUrl || '').trim(),
		filters: normalizedFilters,
		status: 'pending',
		...creator,
		stats: {
			totalRecipients,
			processed: 0,
			succeeded: 0,
			failed: 0,
		},
	});

	// Fire-and-forget background fan-out
	setImmediate(() => {
		processBroadcast(broadcast._id.toString()).catch((err) => {
			console.error('[BROADCAST] Background processing failed:', err);
		});
	});

	return {
		broadcast,
		readiness,
	};
}

async function processBroadcast(broadcastId) {
	if (activeBroadcastIds.has(broadcastId)) return;
	activeBroadcastIds.add(broadcastId);

	try {
		const claimed = await broadcastRepository.claimBroadcastForProcessing(broadcastId);
		if (!claimed) {
			console.log('[BROADCAST] Skipping — already processing or not pending:', broadcastId);
			return;
		}

		const userFilter = broadcastRepository.buildUserFilter(claimed.filters || {});
		let lastId = null;
		let processed = 0;
		let succeeded = 0;
		let failed = 0;

		while (true) {
			const query = { ...userFilter };
			if (lastId) query._id = { $gt: lastId };

			const users = await User.find(query)
				.select('_id')
				.sort({ _id: 1 })
				.limit(USER_BATCH_SIZE)
				.lean();

			if (!users.length) break;

			for (let i = 0; i < users.length; i += CONCURRENCY) {
				const chunk = users.slice(i, i + CONCURRENCY);
				const results = await Promise.allSettled(
					chunk.map((user) =>
						notificationService.create({
							context: 'social',
							type: 'system_announcement',
							recipientId: user._id.toString(),
							title: claimed.title,
							message: claimed.message,
							priority: 'high',
							data: {
								broadcastId: claimed._id.toString(),
								actionUrl: claimed.actionUrl || '',
							},
						})
					)
				);

				for (const result of results) {
					processed += 1;
					if (result.status === 'fulfilled') succeeded += 1;
					else failed += 1;
				}

				await broadcastRepository.updateBroadcast(broadcastId, {
					stats: {
						totalRecipients: claimed.stats?.totalRecipients || processed,
						processed,
						succeeded,
						failed,
					},
				});
			}

			lastId = users[users.length - 1]._id;
		}

		await broadcastRepository.updateBroadcast(broadcastId, {
			status: 'completed',
			completedAt: new Date(),
			stats: {
				totalRecipients: claimed.stats?.totalRecipients || processed,
				processed,
				succeeded,
				failed,
			},
		});

		console.log('[BROADCAST] Completed:', { broadcastId, processed, succeeded, failed });
	} catch (error) {
		console.error('[BROADCAST] Processing error:', error);
		await broadcastRepository.updateBroadcast(broadcastId, {
			status: 'failed',
			error: error.message || 'Broadcast processing failed',
			completedAt: new Date(),
		});
	} finally {
		activeBroadcastIds.delete(broadcastId);
	}
}

async function listBroadcasts(query) {
	return broadcastRepository.findBroadcasts(query);
}

async function getBroadcastById(id) {
	if (!mongoose.Types.ObjectId.isValid(id)) {
		throw new Error('Invalid broadcast id');
	}
	const broadcast = await broadcastRepository.findBroadcastById(id);
	if (!broadcast) throw new Error('Broadcast not found');
	return broadcast;
}

module.exports = {
	getDeliveryReadiness,
	createBroadcast,
	processBroadcast,
	listBroadcasts,
	getBroadcastById,
	countRecipients,
};
