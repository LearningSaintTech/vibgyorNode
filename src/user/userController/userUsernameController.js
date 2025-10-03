const User = require('../userModel/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');

function normalize(u) { return String(u || '').trim().toLowerCase(); }

async function checkAvailability(req, res) {
	try {
		const candidate = req.query.u || req.query.username;
		if (!candidate) return ApiResponse.badRequest(res, 'username is required');
		const norm = normalize(candidate);
		const exists = await User.findOne({ usernameNorm: norm }).lean();
		return ApiResponse.success(res, { username: candidate, normalized: norm, available: !exists });
	} catch (e) {
		return ApiResponse.serverError(res, 'Failed to check username');
	}
}

function generateCandidates(base) {
	const b = base.replace(/[^a-z0-9_\.]/g, '').slice(0, 15);
	const suffixes = ['', '1', '2', '3', '10', '11', '22', '99', '123', 'x', 'hq', '_', '.', '_1', '_2'];
	const variants = new Set();
	for (const s of suffixes) variants.add(`${b}${s}`);
	if (b.length >= 3) variants.add(`${b}${Math.floor(Math.random() * 90 + 10)}`);
	return Array.from(variants).filter(Boolean).slice(0, 20);
}

async function suggest(req, res) {
	try {
		const base = req.query.base || req.query.username || '';
		if (!base) return ApiResponse.badRequest(res, 'base is required');
		const candidates = generateCandidates(normalize(base));
		const norms = candidates.map(normalize);
		const existing = await User.find({ usernameNorm: { $in: norms } }).select('usernameNorm').lean();
		const taken = new Set(existing.map((e) => e.usernameNorm));
		const available = candidates.filter((c) => !taken.has(normalize(c)));
		return ApiResponse.success(res, { suggestions: available.slice(0, 10) });
	} catch (e) {
		return ApiResponse.serverError(res, 'Failed to suggest usernames');
	}
}

module.exports = { checkAvailability, suggest };


