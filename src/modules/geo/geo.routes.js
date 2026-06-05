const express = require('express');
const rateLimit = require('express-rate-limit');
const { reverseGeocode, searchPlaces } = require('./geo.controller');

const router = express.Router();

/** Limit abuse of third-party geocoding APIs (skipped on localhost). */
const geoRateLimit = rateLimit({
	windowMs: 60 * 1000,
	max: 60,
	message: {
		success: false,
		message: 'Too many location requests. Please try again shortly.',
		code: 'GEO_RATE_LIMIT',
	},
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
});

router.use(geoRateLimit);
router.get('/reverse', reverseGeocode);
router.get('/search', searchPlaces);

module.exports = router;
