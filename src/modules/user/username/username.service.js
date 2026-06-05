const usernameRepository = require('./username.repository');

function normalize(username) {
	return String(username || '').trim().toLowerCase();
}

function generateCandidates(base) {
	const cleaned = base.replace(/[^a-z0-9_.]/g, '').slice(0, 15);
	const suffixes = ['', '1', '2', '3', '10', '11', '22', '99', '123', 'x', 'hq', '_', '.', '_1', '_2'];
	const variants = new Set();
	for (const suffix of suffixes) {
		variants.add(`${cleaned}${suffix}`);
	}
	if (cleaned.length >= 3) {
		variants.add(`${cleaned}${Math.floor(Math.random() * 90 + 10)}`);
	}
	return Array.from(variants).filter(Boolean).slice(0, 20);
}

async function checkAvailability(query = {}) {
	const candidate = query.u || query.username;
	if (!candidate) {
		return { ok: false, statusCode: 400, message: 'username is required' };
	}

	const norm = normalize(candidate);
	const exists = await usernameRepository.findByUsernameNorm(norm);

	return {
		ok: true,
		data: {
			username: candidate,
			normalized: norm,
			available: !exists,
		},
	};
}

async function suggest(query = {}) {
	const base = query.base || query.username || '';
	if (!base) {
		return { ok: false, statusCode: 400, message: 'base is required' };
	}

	const candidates = generateCandidates(normalize(base));
	const norms = candidates.map(normalize);
	const existing = await usernameRepository.findTakenUsernameNorms(norms);
	const taken = new Set(existing.map((row) => row.usernameNorm));
	const available = candidates.filter((candidate) => !taken.has(normalize(candidate)));

	return {
		ok: true,
		data: { suggestions: available.slice(0, 10) },
	};
}

module.exports = {
	checkAvailability,
	suggest,
};
