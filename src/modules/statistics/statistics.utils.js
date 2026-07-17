/**
 * Period helpers and safe aggregation utilities for statistics module.
 */

const PERIOD_MS = {
	'7d': 7 * 24 * 60 * 60 * 1000,
	'30d': 30 * 24 * 60 * 60 * 1000,
	'90d': 90 * 24 * 60 * 60 * 1000,
	'6m': 182 * 24 * 60 * 60 * 1000,
	'1y': 365 * 24 * 60 * 60 * 1000,
};

const EXCLUDED_ROLES = { role: { $nin: ['admin', 'subadmin'] } };

function normalizePeriod(period) {
	const p = String(period || '30d').toLowerCase();
	if (p === 'all') return 'all';
	return PERIOD_MS[p] ? p : '30d';
}

function normalizeGranularity(granularity) {
	const g = String(granularity || 'day').toLowerCase();
	return ['day', 'week', 'month'].includes(g) ? g : 'day';
}

function getPeriodRange(period = '30d') {
	const normalized = normalizePeriod(period);
	const end = new Date();
	if (normalized === 'all') {
		return { period: 'all', start: null, end };
	}
	const start = new Date(end.getTime() - PERIOD_MS[normalized]);
	return { period: normalized, start, end };
}

function dateMatch(field, start, end) {
	if (!start) return {};
	return { [field]: { $gte: start, $lte: end } };
}

function safeRatio(numerator, denominator) {
	if (!denominator) return 0;
	return Math.round((Number(numerator) / Number(denominator)) * 10000) / 100;
}

function countMapFromAggregate(rows, keyField = '_id', valueField = 'count') {
	const out = {};
	for (const row of rows || []) {
		const key = row[keyField] == null || row[keyField] === '' ? 'unknown' : String(row[keyField]);
		out[key] = row[valueField] || 0;
	}
	return out;
}

function ageFromDob(dob) {
	if (!dob) return null;
	const birth = new Date(dob);
	if (Number.isNaN(birth.getTime())) return null;
	const now = new Date();
	let age = now.getFullYear() - birth.getFullYear();
	const m = now.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
	return age;
}

function ageBand(age) {
	if (age == null || age < 0) return 'unknown';
	if (age < 18) return 'under_18';
	if (age <= 24) return '18_24';
	if (age <= 34) return '25_34';
	if (age <= 44) return '35_44';
	if (age <= 54) return '45_54';
	return '55_plus';
}

function dateGroupId(granularity) {
	if (granularity === 'month') {
		return { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
	}
	if (granularity === 'week') {
		return { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } };
	}
	return {
		year: { $year: '$createdAt' },
		month: { $month: '$createdAt' },
		day: { $dayOfMonth: '$createdAt' },
	};
}

function formatTrendBucket(id, granularity) {
	if (!id) return null;
	if (granularity === 'month') {
		return `${id.year}-${String(id.month).padStart(2, '0')}`;
	}
	if (granularity === 'week') {
		return `${id.year}-W${String(id.week).padStart(2, '0')}`;
	}
	return `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
}

module.exports = {
	EXCLUDED_ROLES,
	normalizePeriod,
	normalizeGranularity,
	getPeriodRange,
	dateMatch,
	safeRatio,
	countMapFromAggregate,
	ageFromDob,
	ageBand,
	dateGroupId,
	formatTrendBucket,
};
