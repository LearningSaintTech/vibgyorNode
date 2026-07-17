const {
	getPeriodRange,
	normalizeGranularity,
} = require('./statistics.utils');
const sharedRepo = require('./repositories/shared.repository');
const datingRepo = require('./repositories/dating.repository');
const socialRepo = require('./repositories/social.repository');

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(prefix, period, granularity) {
	return `${prefix}:${period}:${granularity || ''}`;
}

function getCached(key) {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.at > CACHE_TTL_MS) {
		cache.delete(key);
		return null;
	}
	return entry.value;
}

function setCached(key, value) {
	cache.set(key, { at: Date.now(), value });
}

async function getOverview(query = {}) {
	const { period, start, end } = getPeriodRange(query.period);
	const key = cacheKey('overview', period);
	const cached = getCached(key);
	if (cached) return { ok: true, message: 'Overview statistics fetched', data: cached };

	const [shared, dating, social] = await Promise.all([
		sharedRepo.getSharedOverview({ start, end }),
		datingRepo.getDatingStats({ start, end }),
		socialRepo.getSocialStats({ start, end }),
	]);

	const data = {
		period,
		generatedAt: new Date().toISOString(),
		shared,
		summary: {
			users: shared.users.total,
			activeUsers: shared.users.active,
			datingProfilesActive: dating.profiles.active,
			matches: dating.matches.total,
			datingMessages: dating.chats.messagesTotal,
			postsPublished: social.content.posts.published,
			storiesActive: social.content.stories.active,
			socialMessages: social.messaging.messages.total,
			userTypes: shared.userTypes,
		},
	};

	setCached(key, data);
	return { ok: true, message: 'Overview statistics fetched', data };
}

async function getDating(query = {}) {
	const { period, start, end } = getPeriodRange(query.period);
	const key = cacheKey('dating', period);
	const cached = getCached(key);
	if (cached) return { ok: true, message: 'Dating statistics fetched', data: cached };

	const dating = await datingRepo.getDatingStats({ start, end });
	const data = {
		period,
		generatedAt: new Date().toISOString(),
		...dating,
	};
	setCached(key, data);
	return { ok: true, message: 'Dating statistics fetched', data };
}

async function getSocial(query = {}) {
	const { period, start, end } = getPeriodRange(query.period);
	const key = cacheKey('social', period);
	const cached = getCached(key);
	if (cached) return { ok: true, message: 'Social statistics fetched', data: cached };

	const social = await socialRepo.getSocialStats({ start, end });
	const data = {
		period,
		generatedAt: new Date().toISOString(),
		...social,
	};
	setCached(key, data);
	return { ok: true, message: 'Social statistics fetched', data };
}

async function getDatingTrends(query = {}) {
	const { period, start, end } = getPeriodRange(query.period);
	const granularity = normalizeGranularity(query.granularity);
	const key = cacheKey('dating-trends', period, granularity);
	const cached = getCached(key);
	if (cached) return { ok: true, message: 'Dating trends fetched', data: cached };

	const trends = await datingRepo.getDatingTrends({ start, end, granularity });
	const data = {
		period,
		generatedAt: new Date().toISOString(),
		...trends,
	};
	setCached(key, data);
	return { ok: true, message: 'Dating trends fetched', data };
}

async function getSocialTrends(query = {}) {
	const { period, start, end } = getPeriodRange(query.period);
	const granularity = normalizeGranularity(query.granularity);
	const key = cacheKey('social-trends', period, granularity);
	const cached = getCached(key);
	if (cached) return { ok: true, message: 'Social trends fetched', data: cached };

	const trends = await socialRepo.getSocialTrends({ start, end, granularity });
	const data = {
		period,
		generatedAt: new Date().toISOString(),
		...trends,
	};
	setCached(key, data);
	return { ok: true, message: 'Social trends fetched', data };
}

module.exports = {
	getOverview,
	getDating,
	getSocial,
	getDatingTrends,
	getSocialTrends,
};
