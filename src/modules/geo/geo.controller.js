const ApiResponse = require('../../utils/apiResponse');
const geoService = require('./geo.service');

/**
 * GET /api/v1/geo/reverse?lat=&lon=
 * Converts GPS coordinates from the device into a structured address.
 */
async function reverseGeocode(req, res) {
	try {
		const lat = geoService.parseCoordinate(req.query.lat);
		const lon = geoService.parseCoordinate(req.query.lon);

		const result = await geoService.reverseGeocode(lat, lon);
		if (!result.success) {
			if (result.status === 404) {
				return ApiResponse.notFound(res, result.message, result.code);
			}
			if (result.status === 502) {
				return ApiResponse.serverError(res, result.message, result.code);
			}
			return ApiResponse.badRequest(res, result.message, result.code);
		}

		return ApiResponse.success(res, {
			...result.data,
			provider: result.provider,
			profileLocation: geoService.toProfileLocation(result.data),
		}, 'Location resolved');
	} catch (err) {
		console.error('[GEO] reverseGeocode error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to resolve location');
	}
}

/**
 * GET /api/v1/geo/search?q=
 * Search places by name or address (autocomplete / manual entry).
 */
async function searchPlaces(req, res) {
	try {
		const result = await geoService.searchPlaces(req.query.q);
		if (!result.success) {
			if (result.status === 502) {
				return ApiResponse.serverError(res, result.message, result.code);
			}
			return ApiResponse.badRequest(res, result.message, result.code);
		}

		return ApiResponse.success(res, {
			results: result.data,
			provider: result.provider,
		}, 'Places found');
	} catch (err) {
		console.error('[GEO] searchPlaces error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to search places');
	}
}

module.exports = {
	reverseGeocode,
	searchPlaces,
};
