/**
 * Geocoding service: GPS / search text → structured address for profile location.
 * Uses Google when GOOGLE_GEO_API_KEY is set; otherwise OpenStreetMap Nominatim.
 */

const {
	NOMINATIM_USER_AGENT,
	NOMINATIM_REVERSE_URL,
	NOMINATIM_SEARCH_URL,
	SEARCH_LIMIT,
} = require('./geo.constants');

const {
	reverseGeocodeGoogle,
	searchPlacesGoogle,
	fetchNominatim,
	mapNominatimReverse,
	mapNominatimSearchResult,
} = require('./geo.providers');

const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LON = -180;
const MAX_LON = 180;

function parseCoordinate(value) {
	if (value === undefined || value === null || value === '') return null;
	const num = Number.parseFloat(String(value).trim());
	return Number.isFinite(num) ? num : null;
}

function validateCoordinates(lat, lon) {
	if (lat == null || lon == null) {
		return { valid: false, message: 'Query parameters lat and lon are required' };
	}
	if (lat < MIN_LAT || lat > MAX_LAT || lon < MIN_LON || lon > MAX_LON) {
		return { valid: false, message: 'Invalid coordinates' };
	}
	return { valid: true };
}

function useGoogleProvider() {
	return Boolean(process.env.GOOGLE_GEO_API_KEY && String(process.env.GOOGLE_GEO_API_KEY).trim());
}

/**
 * Reverse geocode: device GPS → city, state, country, label.
 */
async function reverseGeocode(lat, lon) {
	const validation = validateCoordinates(lat, lon);
	if (!validation.valid) {
		return { success: false, status: 400, code: 'INVALID_COORDINATES', message: validation.message };
	}

	if (useGoogleProvider()) {
		const result = await reverseGeocodeGoogle(lat, lon);
		if (result.ok) {
			return { success: true, data: result.data, provider: 'google' };
		}
		if (result.reason === 'NO_RESULTS') {
			return {
				success: false,
				status: 404,
				code: 'LOCATION_NOT_FOUND',
				message: 'No address found for these coordinates',
			};
		}
		return {
			success: false,
			status: 502,
			code: 'GEOCODE_UNAVAILABLE',
			message: 'Reverse geocode service unavailable',
		};
	}

	const params = new URLSearchParams({
		lat: String(lat),
		lon: String(lon),
		format: 'json',
		addressdetails: '1',
	});
	const url = `${NOMINATIM_REVERSE_URL}?${params.toString()}`;
	const nominatim = await fetchNominatim(url, NOMINATIM_USER_AGENT);

	if (!nominatim.ok) {
		return {
			success: false,
			status: 502,
			code: 'GEOCODE_UNAVAILABLE',
			message: 'Reverse geocode service unavailable',
		};
	}

	if (!nominatim.json || nominatim.json.error) {
		return {
			success: false,
			status: 404,
			code: 'LOCATION_NOT_FOUND',
			message: 'No address found for these coordinates',
		};
	}

	return {
		success: true,
		data: mapNominatimReverse(lat, lon, nominatim.json),
		provider: 'nominatim',
	};
}

/**
 * Forward geocode: search by place name or address string.
 */
async function searchPlaces(query) {
	const q = typeof query === 'string' ? query.trim() : '';
	if (!q) {
		return {
			success: false,
			status: 400,
			code: 'QUERY_REQUIRED',
			message: 'Query parameter q is required',
		};
	}

	if (useGoogleProvider()) {
		const result = await searchPlacesGoogle(q);
		if (result.ok) {
			return { success: true, data: result.data, provider: 'google' };
		}
		return {
			success: false,
			status: 502,
			code: 'GEOCODE_UNAVAILABLE',
			message: 'Place search service unavailable',
		};
	}

	const params = new URLSearchParams({
		q,
		format: 'json',
		addressdetails: '1',
		limit: String(SEARCH_LIMIT),
	});
	const url = `${NOMINATIM_SEARCH_URL}?${params.toString()}`;
	const nominatim = await fetchNominatim(url, NOMINATIM_USER_AGENT);

	if (!nominatim.ok) {
		return {
			success: false,
			status: 502,
			code: 'GEOCODE_UNAVAILABLE',
			message: 'Place search service unavailable',
		};
	}

	const results = Array.isArray(nominatim.json) ? nominatim.json : [];
	return {
		success: true,
		data: results.map(mapNominatimSearchResult),
		provider: 'nominatim',
	};
}

/** Map geo result → profile PUT location body */
function toProfileLocation(geoData) {
	if (!geoData) return null;
	const address =
		(geoData.address && String(geoData.address).trim())
		|| (geoData.addressLabel && String(geoData.addressLabel).trim())
		|| '';
	return {
		lat: geoData.latitude ?? null,
		lng: geoData.longitude ?? null,
		city: geoData.city || '',
		country: geoData.country || '',
		address,
	};
}

module.exports = {
	parseCoordinate,
	reverseGeocode,
	searchPlaces,
	toProfileLocation,
	useGoogleProvider,
};
