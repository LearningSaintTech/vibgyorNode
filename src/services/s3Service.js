const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getCloudFrontUrl, getResponsiveUrls } = require('./cloudfrontService');

const BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION;
const USE_CLOUDFRONT = process.env.USE_CLOUDFRONT === 'true' || process.env.USE_CLOUDFRONT === '1';

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

function normalizeMetadata(input = {}) {
	const normalized = {};
	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === null) continue;
		normalized[key] = typeof value === 'string' ? value : String(value);
	}
	return normalized;
}

async function uploadBuffer({ buffer, contentType, userId, category, type, filename, acl = 'public-read', metadata = {} }) {
	const Key = buildKey({ userId, category, type, filename });
	console.log("Key",Key);
	const params = {
		Bucket: BUCKET,
		Key,
		Body: buffer,
		ContentType: contentType,
		// ACL removed - bucket has ACL disabled for security
		Metadata: normalizeMetadata(metadata),
	};
	// eslint-disable-next-line no-console
	console.log('[S3] PutObject', { Key, ContentType: contentType });
	await s3.send(new PutObjectCommand(params));
	// Generate URL - use CloudFront if configured, otherwise S3
	let url;
	if (USE_CLOUDFRONT) {
		url = getCloudFrontUrl(Key);
	} else {
		// Generate proper S3 URL based on region
		if (REGION === 'us-east-1') {
			url = `https://${BUCKET}.s3.amazonaws.com/${Key}`;
		} else {
			url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${Key}`;
		}
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
	const baseMetadata = {
		...metadata,
		originalName: filename,
		uploadedAt: new Date().toISOString(),
		userId: String(userId)
	};
	const params = {
		Bucket: BUCKET,
		Key,
		Body: buffer,
		ContentType: contentType,
		Metadata: normalizeMetadata(baseMetadata),
	};

	console.log('[S3] Uploading to S3:', { Key, ContentType: contentType, Size: buffer.length });
	await s3.send(new PutObjectCommand(params));

	// Generate URL - use CloudFront if configured, otherwise S3
	let url;
	let responsiveUrls = null;
	
	if (USE_CLOUDFRONT) {
		url = getCloudFrontUrl(Key);
		// Generate responsive URLs for images
		if (contentType.startsWith('image/')) {
			responsiveUrls = getResponsiveUrls(Key);
		}
	} else {
		// Generate proper S3 URL based on region
		if (REGION === 'us-east-1') {
			url = `https://${BUCKET}.s3.amazonaws.com/${Key}`;
		} else {
			url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${Key}`;
		}
	}

	// Detect media type and return appropriate data
	const mediaType = contentType.startsWith('image/') ? 'image' : 
	                 contentType.startsWith('video/') ? 'video' : 
	                 contentType.startsWith('audio/') ? 'audio' : 'document';

	// Generate BlurHash for images
	// Note: For small images, we can generate synchronously. For large images, consider background job.
	let blurhash = null;
	if (contentType.startsWith('image/')) {
		try {
			const { generateBlurHash } = require('./blurhashService');
			// Generate BlurHash (await for small images, or use background job for large)
			// For now, we'll try to generate it, but won't block if it takes too long
			const blurhashPromise = generateBlurHash(buffer);
			
			// Set a timeout to avoid blocking upload
			const timeoutPromise = new Promise((resolve) => {
				setTimeout(() => resolve(null), 2000); // 2 second timeout
			});
			
			// Race between blurhash generation and timeout
			blurhash = await Promise.race([blurhashPromise, timeoutPromise]);
			
			if (blurhash) {
				console.log(`✅ BlurHash generated for ${Key}: ${blurhash.substring(0, 20)}...`);
			} else {
				console.log(`⏱️ BlurHash generation timed out for ${Key} (non-critical)`);
			}
		} catch (error) {
			console.warn('⚠️ BlurHash generation failed (non-critical):', error.message);
			// Continue without blurhash - non-critical feature
		}
	}

	return {
		key: Key,
		bucket: BUCKET,
		region: REGION,
		url,
		responsiveUrls, // Multiple sizes for images (thumbnail, small, medium, large, original)
		type: mediaType,
		contentType,
		filename,
		size: buffer.length,
		blurhash // BlurHash string for instant placeholders
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


