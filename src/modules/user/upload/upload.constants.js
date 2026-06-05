const ACCEPTED_IMAGE_MIME = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'image/gif',
];

const ACCEPTED_ID_PROOF_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const ACCEPTED_VIDEO_MIME = [
	'video/mp4',
	'video/quicktime',
	'video/mov',
	'video/avi',
	'video/webm',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_ID_PROOF_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 5;
const MAX_VIDEOS = 5;
const ID_PROOF_FILE_COUNT = 2;

module.exports = {
	ACCEPTED_IMAGE_MIME,
	ACCEPTED_ID_PROOF_MIME,
	ACCEPTED_VIDEO_MIME,
	MAX_FILE_SIZE,
	MAX_ID_PROOF_FILE_SIZE,
	MAX_PHOTOS,
	MAX_VIDEOS,
	ID_PROOF_FILE_COUNT,
};
