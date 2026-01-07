const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getCloudFrontUrl, getResponsiveUrls } = require('./cloudfrontService');
require('dotenv').config();

const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
const USE_CLOUDFRONT = process.env.USE_CLOUDFRONT === 'true' || process.env.USE_CLOUDFRONT === '1';

console.log(`[S3] Initializing S3 service - Bucket: ${BUCKET}, Region: ${REGION}, Use CloudFront: ${USE_CLOUDFRONT}`);

if (!BUCKET) {
	console.warn('⚠️ [S3] AWS_S3_BUCKET is not set. S3 operations will fail.');
}

if (!REGION) {
	console.warn('⚠️ [S3] AWS_REGION is not set. Defaulting behavior may be incorrect.');
}

const s3 = new S3Client({
	region: REGION,
	forcePathStyle: false,
});

console.log('[S3] S3Client initialized successfully');

function buildKey({ userId, category = 'post', type = 'images', filename }) {
	const safeUserId = String(userId || '').trim();
	const safeCategory = String(category || 'post').trim();
	const safeType = String(type || 'images').trim();
	const timestamp = Date.now();
	const name = `${timestamp}-${filename}`;

	const key = `${safeUserId}/${safeCategory}-${safeType}/${name}`;

	console.log('[S3] Built key', { userId: safeUserId, category: safeCategory, type: safeType, filename, key });
	return key;
}

function normalizeMetadata(input = {}) {
	const normalized = {};
	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === null) continue;
		normalized[key] = typeof value === 'string' ? value : String(value);
	}
	console.log('[S3] Normalized metadata', { inputCount: Object.keys(input).length, outputCount: Object.keys(normalized).length });
	return normalized;
}

async function uploadBuffer({ buffer, contentType, userId, category, type, filename, acl = 'public-read', metadata = {} }) {
	console.log('[S3] Starting uploadBuffer', { userId, category, type, filename, contentType, bufferSize: buffer.length });

	const Key = buildKey({ userId, category, type, filename });

	const params = {
		Bucket: BUCKET,
		Key,
		Body: buffer,
		ContentType: contentType,
		Metadata: normalizeMetadata(metadata),
	};

	console.log('[S3] Sending PutObjectCommand', { Key, ContentType: contentType, BufferSize: buffer.length });

	try {
		await s3.send(new PutObjectCommand(params));
		console.log('✅ [S3] Upload successful (uploadBuffer)', { Key });
	} catch (error) {
		console.error('❌ [S3] Upload failed (uploadBuffer)', {
			Key,
			error: error.name,
			message: error.message,
			code: error.$metadata?.httpStatusCode,
		});
		throw error;
	}

	let url;
	if (USE_CLOUDFRONT) {
		url = getCloudFrontUrl(Key);
		console.log('[S3] Using CloudFront URL', { url });
	} else {
		url = REGION === 'us-east-1'
			? `https://${BUCKET}.s3.amazonaws.com/${Key}`
			: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${Key}`;
		console.log('[S3] Using direct S3 URL', { url });
	}

	return { key: Key, bucket: BUCKET, region: REGION, url };
}

async function deleteObject(key) {
	if (!key) {
		console.warn('[S3] deleteObject called with empty key');
		return { key: null };
	}

	console.log('[S3] Deleting object', { Key: key });

	try {
		await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
		console.log('✅ [S3] Delete successful', { Key: key });
	} catch (error) {
		console.error('❌ [S3] Delete failed', {
			Key: key,
			error: error.name,
			message: error.message,
			code: error.$metadata?.httpStatusCode,
		});
		throw error;
	}

	return { key };
}

async function getObjectUrl(key, expiresIn = 3600) {
	if (!key) {
		console.warn('[S3] getObjectUrl called with empty key');
		return null;
	}

	console.log('[S3] Generating signed URL', { Key: key, expiresIn });

	try {
		const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
		const url = await getSignedUrl(s3, command, { expiresIn });
		console.log('✅ [S3] Signed URL generated', { Key: key, expiresIn });
		return url;
	} catch (error) {
		console.error('❌ [S3] Failed to generate signed URL', {
			Key: key,
			error: error.name,
			message: error.message,
		});
		throw error;
	}
}

async function listByPrefix(prefix, maxKeys = 1000) {
	if (!prefix) {
		console.warn('[S3] listByPrefix called with empty prefix');
		return [];
	}

	console.log('[S3] Listing objects by prefix', { Prefix: prefix, MaxKeys: maxKeys });

	try {
		const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, MaxKeys: maxKeys });
		const result = await s3.send(command);
		const count = (result?.Contents || []).length;
		console.log(`✅ [S3] List successful - Found ${count} objects`, { Prefix: prefix });
		return result?.Contents || [];
	} catch (error) {
		console.error('❌ [S3] List failed', {
			Prefix: prefix,
			error: error.name,
			message: error.message,
		});
		throw error;
	}
}

async function uploadToS3({ buffer, contentType, userId, category, type, filename, metadata = {} }) {
	console.log('[S3] Starting enhanced uploadToS3', {
		userId,
		category,
		type,
		filename,
		contentType,
		bufferSize: buffer.length,
	});

	const Key = buildKey({ userId, category, type, filename });

	const baseMetadata = {
		...metadata,
		originalName: filename,
		uploadedAt: new Date().toISOString(),
		userId: String(userId),
	};

	const params = {
		Bucket: BUCKET,
		Key,
		Body: buffer,
		ContentType: contentType,
		Metadata: normalizeMetadata(baseMetadata),
	};

	console.log('[S3] Sending PutObjectCommand (enhanced)', { Key, ContentType: contentType, BufferSize: buffer.length });

	try {
		await s3.send(new PutObjectCommand(params));
		console.log('✅ [S3] Upload successful (uploadToS3)', { Key });
	} catch (error) {
		console.error('❌ [S3] Upload failed (uploadToS3)', {
			Key,
			error: error.name,
			message: error.message,
			code: error.$metadata?.httpStatusCode,
		});
		throw error;
	}

	let url = null;
	let responsiveUrls = null;

	if (USE_CLOUDFRONT) {
		url = getCloudFrontUrl(Key);
		console.log('[S3] CloudFront URL assigned', { url });

		if (contentType.startsWith('image/')) {
			responsiveUrls = getResponsiveUrls(Key);
			console.log('[S3] Generated responsive URLs', { count: Object.keys(responsiveUrls).length });
		}
	} else {
		url = REGION === 'us-east-1'
			? `https://${BUCKET}.s3.amazonaws.com/${Key}`
			: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${Key}`;
		console.log('[S3] Direct S3 URL assigned', { url });
	}

	const mediaType = contentType.startsWith('image/') ? 'image' :
		contentType.startsWith('video/') ? 'video' :
			contentType.startsWith('audio/') ? 'audio' : 'document';

	console.log('[S3] Detected media type', { mediaType, contentType });

	let blurhash = null;
	if (contentType.startsWith('image/')) {
		console.log('[S3] Attempting BlurHash generation', { Key });
		try {
			const { generateBlurHash } = require('./blurhashService');
			const blurhashPromise = generateBlurHash(buffer);

			const timeoutPromise = new Promise((resolve) => {
				setTimeout(() => resolve(null), 2000);
			});

			blurhash = await Promise.race([blurhashPromise, timeoutPromise]);

			if (blurhash) {
				console.log('✅ [S3] BlurHash generated successfully', { Key, preview: blurhash.substring(0, 30) + '...' });
			} else {
				console.log('⏱️ [S3] BlurHash generation timed out (continuing)', { Key });
			}
		} catch (error) {
			console.warn('⚠️ [S3] BlurHash generation failed (non-critical)', { Key, error: error.message });
		}
	}

	console.log('🎉 [S3] Upload completed successfully', { Key, mediaType, hasBlurhash: !!blurhash, hasResponsive: !!responsiveUrls });

	return {
		key: Key,
		bucket: BUCKET,
		region: REGION,
		url,
		responsiveUrls,
		type: mediaType,
		contentType,
		filename,
		size: buffer.length,
		blurhash,
	};
}

async function deleteFromS3(key) {
	console.log('[S3] deleteFromS3 called (alias)', { Key: key });
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