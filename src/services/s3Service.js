const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION;

if (!BUCKET) {
	// eslint-disable-next-line no-console
	console.warn('AWS_S3_BUCKET is not set. S3 service will not function properly.');
}

const s3 = new S3Client({ 
	region: REGION,
	forcePathStyle: false, // Use virtual-hosted-style URLs
});

function buildKey({ userId, category = 'post', type = 'images', filename }) {
	// example: 12345/post-images/1699999999-filename.jpg
	const safeUserId = String(userId).trim();
	const safeCategory = String(category).trim();
	const safeType = String(type).trim();
	const joined = `${safeCategory}-${safeType}`; // e.g., post-images, story-images, profile-images
	const prefix = `${safeUserId}/${joined}`;
	const name = `${Date.now()}-${filename}`;
	return `${prefix}/${name}`;
}

async function uploadBuffer({ buffer, contentType, userId, category, type, filename, acl = 'public-read', metadata = {} }) {
	const Key = buildKey({ userId, category, type, filename });
	const params = {
		Bucket: BUCKET,
		Key,
		Body: buffer,
		ContentType: contentType,
		// ACL removed - bucket has ACL disabled for security
		Metadata: metadata,
	};
	// eslint-disable-next-line no-console
	console.log('[S3] PutObject', { Key, ContentType: contentType });
	await s3.send(new PutObjectCommand(params));
	// Generate proper S3 URL based on region
	let url;
	if (REGION === 'us-east-1') {
		url = `https://${BUCKET}.s3.amazonaws.com/${Key}`;
	} else {
		url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${Key}`;
	}
	return { key: Key, bucket: BUCKET, region: REGION, url };
}

async function deleteObject(key) {
	// eslint-disable-next-line no-console
	console.log('[S3] DeleteObject', { Key: key });
	await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
	return { key };
}

async function getObjectUrl(key, expiresIn = 3600) {
	const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
	// eslint-disable-next-line no-console
	console.log('[S3] GetSignedUrl', { Key: key, expiresIn });
	return await getSignedUrl(s3, command, { expiresIn });
}

async function listByPrefix(prefix, maxKeys = 1000) {
	const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, MaxKeys: maxKeys });
	// eslint-disable-next-line no-console
	console.log('[S3] ListObjectsV2', { Prefix: prefix });
	const result = await s3.send(command);
	return result?.Contents || [];
}

// Enhanced upload function for posts with media type detection
async function uploadToS3({ buffer, contentType, userId, category, type, filename, metadata = {} }) {
	const Key = buildKey({ userId, category, type, filename });
	const params = {
		Bucket: BUCKET,
		Key,
		Body: buffer,
		ContentType: contentType,
		Metadata: {
			...metadata,
			originalName: filename,
			uploadedAt: new Date().toISOString(),
			userId: String(userId)
		},
	};

	console.log('[S3] Uploading to S3:', { Key, ContentType: contentType, Size: buffer.length });
	await s3.send(new PutObjectCommand(params));

	// Generate proper S3 URL based on region
	let url;
	if (REGION === 'us-east-1') {
		url = `https://${BUCKET}.s3.amazonaws.com/${Key}`;
	} else {
		url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${Key}`;
	}

	// Detect media type and return appropriate data
	const mediaType = contentType.startsWith('image/') ? 'image' : 
	                 contentType.startsWith('video/') ? 'video' : 
	                 contentType.startsWith('audio/') ? 'audio' : 'document';

	return {
		key: Key,
		bucket: BUCKET,
		region: REGION,
		url,
		type: mediaType,
		contentType,
		filename,
		size: buffer.length
	};
}

// Delete from S3 (alias for deleteObject)
async function deleteFromS3(key) {
	return await deleteObject(key);
}

module.exports = {
	uploadBuffer,
	uploadToS3,
	deleteObject,
	deleteFromS3,
	getObjectUrl,
	listByPrefix,
	buildKey,
};


