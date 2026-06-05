/**
 * Maps onboarding API payloads onto the User document.
 */

function assignNested(target, key, value) {
	if (value === undefined) return;
	target[key] = value;
}

function assignIconTextArray(user, field, value) {
	if (!Array.isArray(value)) return;
	user[field] = value.map((item) => ({
		icon: item?.icon != null ? String(item.icon) : '',
		text: item?.text != null ? String(item.text) : '',
	}));
}

function assignLocation(user, location) {
	if (location == null || typeof location !== 'object') return;
	if (!user.location) {
		user.location = { lat: null, lng: null, city: '', country: '', address: '' };
	}
	if (location.lat !== undefined) user.location.lat = location.lat;
	if (location.lng !== undefined) user.location.lng = location.lng;
	if (location.city !== undefined) user.location.city = location.city;
	if (location.country !== undefined) user.location.country = location.country;
	if (location.address !== undefined) {
		user.location.address = location.address != null ? String(location.address) : '';
	} else if (location.addressLabel !== undefined) {
		user.location.address = location.addressLabel != null ? String(location.addressLabel) : '';
	}
}

function assignRelationshipStyle(user, value) {
	if (value == null || typeof value !== 'object') return;
	if (!user.relationshipStyle) user.relationshipStyle = {};
	if (value.text !== undefined) user.relationshipStyle.text = value.text;
	if (value.subtext !== undefined) user.relationshipStyle.subtext = value.subtext;
}

function assignPreferences(user, preferences) {
	if (preferences === undefined) return;

	if (Array.isArray(preferences)) {
		user.preferences = preferences
			.map((item) => (item != null ? String(item).trim() : ''))
			.filter(Boolean);
		return;
	}

	if (typeof preferences === 'string') {
		const trimmed = preferences.trim();
		if (!trimmed) {
			user.preferences = [];
			return;
		}
		if (trimmed.startsWith('[')) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					user.preferences = parsed
						.map((item) => (item != null ? String(item).trim() : ''))
						.filter(Boolean);
				}
			} catch {
				user.preferences = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
			}
			return;
		}
		user.preferences = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
	}
}

function assignDatingPhotos(user, photos) {
	if (!Array.isArray(photos)) return;
	if (!user.dating) {
		user.dating = {
			photos: [],
			videos: [],
			isDatingProfileActive: false,
			lastUpdatedAt: null,
		};
	}
	user.dating.photos = photos;
	user.dating.lastUpdatedAt = new Date();
}

function applyProfileFieldUpdates(user, data) {
	const {
		fullName,
		username,
		email,
		dob,
		bio,
		longDesc,
		heightCm,
		profession,
		gender,
		pronouns,
		orientation,
		identification,
		lookingFor,
		whatBringsYouToVibgyor,
		relationshipStyle,
		distance,
		likes,
		preferences,
		idProofUrl,
		profilePictureUrl,
		location,
		photos,
		datingPhotos,
	} = data;

	if (fullName !== undefined) user.fullName = fullName;
	if (username !== undefined) user.username = username;
	if (email !== undefined && user.emailVerified === false) user.email = email;
	if (bio !== undefined) user.bio = bio;
	if (longDesc !== undefined) user.longDesc = longDesc;
	if (heightCm !== undefined) user.heightCm = heightCm;
	if (profession !== undefined) user.profession = profession;
	if (gender !== undefined) user.gender = gender;
	if (pronouns !== undefined) user.pronouns = pronouns;
	if (orientation !== undefined) user.orientation = orientation;
	if (idProofUrl !== undefined) user.idProofUrl = idProofUrl;
	if (profilePictureUrl !== undefined) user.profilePictureUrl = profilePictureUrl;
	if (location !== undefined) assignLocation(user, location);

	if (distance !== undefined) {
		if (!user.distance) user.distance = {};
		if (distance.min !== undefined) user.distance.min = distance.min;
		if (distance.max !== undefined) user.distance.max = distance.max;
		if (distance.unit !== undefined) user.distance.unit = distance.unit;
	}

	assignIconTextArray(user, 'identification', identification);
	assignIconTextArray(user, 'lookingFor', lookingFor);
	assignIconTextArray(user, 'whatBringsYouToVibgyor', whatBringsYouToVibgyor);
	assignIconTextArray(user, 'likes', likes);
	assignRelationshipStyle(user, relationshipStyle);
	assignPreferences(user, preferences);
	assignDatingPhotos(user, photos ?? datingPhotos);
}

module.exports = {
	applyProfileFieldUpdates,
};
