/**
 * External geocoding providers. Normalized shapes are consumed by geo.service.js.
 */

const { SEARCH_LIMIT } = require('./geo.constants');

function getComponent(components, type) {
	const c = (components || []).find((x) => (x.types || []).includes(type));
	return c?.long_name || c?.short_name || null;
}

function getCountryCode(components) {
	const c = (components || []).find((x) => (x.types || []).includes('country'));
	return (c?.short_name || '').toLowerCase() || null;
}

function normalizePincode(value) {
	if (value == null || value === '') return null;
	return String(value).replace(/\s+/g, '').slice(0, 12) || null;
}

function buildAddressLabel(parts, fallback) {
	const filtered = parts.filter(Boolean);
	if (filtered.length) return filtered.join(', ');
	return fallback || null;
}

/**
 * @returns {Promise<{ ok: true, data: object } | { ok: false, reason: 'NO_RESULTS' | 'UPSTREAM_ERROR' }>}
 */
async function reverseGeocodeGoogle(lat, lon) {
	const key = process.env.GOOGLE_GEO_API_KEY;
	if (!key) return { ok: false, reason: 'UPSTREAM_ERROR' };

	const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${key}`;
	let res;
	try {
		res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
	} catch {
		return { ok: false, reason: 'UPSTREAM_ERROR' };
	}

	if (!res.ok) return { ok: false, reason: 'UPSTREAM_ERROR' };

	const json = await res.json();
	if (json.status === 'ZERO_RESULTS' || !json.results?.length) {
		return { ok: false, reason: 'NO_RESULTS' };
	}
	if (json.status !== 'OK') {
		return { ok: false, reason: 'UPSTREAM_ERROR' };
	}

	const first = json.results[0];
	const addr = first.address_components || [];
	const pincode = normalizePincode(getComponent(addr, 'postal_code'));
	const city =
		getComponent(addr, 'locality')
		|| getComponent(addr, 'postal_town')
		|| getComponent(addr, 'administrative_area_level_2');
	const state = getComponent(addr, 'administrative_area_level_1');
	const country = getComponent(addr, 'country');
	const countryCode = getCountryCode(addr);
	const addressLabel =
		first.formatted_address
		|| buildAddressLabel([city, state, pincode, country], null);

	return {
		ok: true,
		data: {
			latitude: lat,
			longitude: lon,
			pincode,
			addressLabel: addressLabel || null,
			city: city || null,
			state: state || null,
			country: country || null,
			countryCode,
		},
	};
}

/**
 * @returns {Promise<{ ok: true, data: object[] } | { ok: false, reason: string }>}
 */
async function searchPlacesGoogle(query) {
	const key = process.env.GOOGLE_GEO_API_KEY;
	if (!key) return { ok: false, reason: 'UPSTREAM_ERROR' };

	const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
	let res;
	try {
		res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
	} catch {
		return { ok: false, reason: 'UPSTREAM_ERROR' };
	}

	if (!res.ok) return { ok: false, reason: 'UPSTREAM_ERROR' };

	const json = await res.json();
	if (json.status === 'ZERO_RESULTS') {
		return { ok: true, data: [] };
	}
	if (json.status !== 'OK' || !json.results?.length) {
		return { ok: false, reason: 'UPSTREAM_ERROR' };
	}

	const data = json.results.slice(0, SEARCH_LIMIT).map((r) => {
		const addr = r.address_components || [];
		const pincode = normalizePincode(getComponent(addr, 'postal_code'));
		const city =
			getComponent(addr, 'locality')
			|| getComponent(addr, 'postal_town')
			|| getComponent(addr, 'administrative_area_level_2');
		const state = getComponent(addr, 'administrative_area_level_1');
		const country = getComponent(addr, 'country');
		const countryCode = getCountryCode(addr);
		const road = getComponent(addr, 'route');
		const area = getComponent(addr, 'sublocality') || getComponent(addr, 'neighborhood');
		const addressLine = road || area || null;
		const loc = r.geometry?.location;

		return {
			label: r.formatted_address
				|| buildAddressLabel([addressLine, city, state, pincode, country], ''),
			pincode,
			latitude: loc?.lat != null ? Number(loc.lat) : null,
			longitude: loc?.lng != null ? Number(loc.lng) : null,
			addressLine,
			city: city || null,
			state: state || null,
			country: country || null,
			countryCode,
		};
	});

	return { ok: true, data };
}

async function fetchNominatim(url, userAgent) {
	const response = await fetch(url, {
		method: 'GET',
		headers: { Accept: 'application/json', 'User-Agent': userAgent },
	});
	if (!response.ok) {
		return { ok: false, reason: 'UPSTREAM_ERROR' };
	}
	try {
		const json = await response.json();
		return { ok: true, json };
	} catch {
		return { ok: false, reason: 'UPSTREAM_ERROR' };
	}
}

function mapNominatimReverse(lat, lon, data) {
	const addr = data?.address ?? {};
	const pincode = normalizePincode(addr.postcode ?? addr.pin_code ?? addr.pincode);
	const streetPart = [addr.house_number, addr.road].filter(Boolean).join(' ');
	const areaPart = addr.suburb ?? addr.neighbourhood ?? addr.village ?? addr.town ?? addr.locality;
	const city =
		addr.city ?? addr.town ?? addr.village ?? addr.state_district ?? addr.county ?? null;
	const state = addr.state ?? null;
	const country = addr.country ?? null;
	const countryCode = (addr.country_code ?? '').toLowerCase() || null;
	const addressLabel = buildAddressLabel(
		[
			streetPart || areaPart,
			streetPart && areaPart ? areaPart : null,
			city,
			state,
			pincode,
			country,
		],
		data?.display_name ?? (pincode ? `Pin ${pincode}` : null)
	);

	return {
		latitude: lat,
		longitude: lon,
		pincode,
		addressLabel,
		city: city || null,
		state: state || null,
		country: country || null,
		countryCode,
	};
}

function mapNominatimSearchResult(item) {
	const addr = item?.address ?? {};
	const pincode = normalizePincode(addr.postcode ?? addr.pin_code ?? addr.pincode);
	const city =
		addr.city ?? addr.town ?? addr.village ?? addr.state_district ?? addr.county ?? null;
	const state = addr.state ?? null;
	const country = addr.country ?? null;
	const countryCode = (addr.country_code ?? '').toLowerCase() || null;
	const addressLine =
		addr.road ?? addr.suburb ?? addr.neighbourhood ?? addr.locality ?? item?.display_name ?? null;

	return {
		label: item?.display_name
			?? buildAddressLabel([addressLine, city, state, pincode, country], ''),
		pincode,
		latitude: item?.lat != null ? parseFloat(item.lat) : null,
		longitude: item?.lon != null ? parseFloat(item.lon) : null,
		addressLine: addressLine || null,
		city: city || null,
		state: state || null,
		country: country || null,
		countryCode,
	};
}

module.exports = {
	reverseGeocodeGoogle,
	searchPlacesGoogle,
	fetchNominatim,
	mapNominatimReverse,
	mapNominatimSearchResult,
};
