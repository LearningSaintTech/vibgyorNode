/**
 * AWS Rekognition moderation helpers for post media.
 *
 * Required IAM permissions on the app credentials:
 * - rekognition:DetectModerationLabels
 * - rekognition:StartContentModeration
 * - rekognition:GetContentModeration
 * S3 objects must be readable by Rekognition in the same account/region as AWS_REGION.
 *
 * Env:
 * - REKOGNITION_ENABLED=true
 * - REKOGNITION_MIN_CONFIDENCE=50
 * - REKOGNITION_BLOCK_THRESHOLD=80
 * - REKOGNITION_FLAG_THRESHOLD=40
 * - REKOGNITION_VIDEO_POLL_MS=3000
 * - REKOGNITION_VIDEO_MAX_WAIT_MS=120000
 */
const {
	RekognitionClient,
	DetectModerationLabelsCommand,
	StartContentModerationCommand,
	GetContentModerationCommand,
} = require('@aws-sdk/client-rekognition');
const {
	resolveRekognitionCategory,
	isHighRiskVisual,
} = require('./moderationPolicy');

const BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const MIN_CONFIDENCE = Number(process.env.REKOGNITION_MIN_CONFIDENCE || 50);
const BLOCK_THRESHOLD = Number(process.env.REKOGNITION_BLOCK_THRESHOLD || 80);
const FLAG_THRESHOLD = Number(process.env.REKOGNITION_FLAG_THRESHOLD || 40);
const VIDEO_POLL_MS = Number(process.env.REKOGNITION_VIDEO_POLL_MS || 3000);
const VIDEO_MAX_WAIT_MS = Number(process.env.REKOGNITION_VIDEO_MAX_WAIT_MS || 120000);

let client;

function isEnabled() {
	return String(process.env.REKOGNITION_ENABLED || '').toLowerCase() === 'true';
}

function getClient() {
	if (!client) {
		client = new RekognitionClient({ region: REGION });
	}
	return client;
}

/**
 * Map Rekognition moderation labels to app risk model.
 * Only Vibgyor policy categories are scored; alcohol/tobacco/gambling/etc. are ignored.
 * @param {Array<{ Name?: string, ParentName?: string, Confidence?: number }>} labels
 */
function labelsToRisk(labels = []) {
	const categories = [];
	let riskScore = 0;
	let flagged = false;
	let flagReason = null;
	const seen = new Set();

	for (const label of labels) {
		const name = label.Name || '';
		const parent = label.ParentName || '';
		const confidence = Number(label.Confidence || 0);
		if (!name || confidence < MIN_CONFIDENCE) continue;

		const category = resolveRekognitionCategory(name, parent);
		if (!category) {
			continue; // outside policy — do not ban
		}

		const key = `${category}:${name}`;
		if (!seen.has(key)) {
			seen.add(key);
			categories.push({
				category,
				confidence: Math.round(confidence),
				details: { label: name, parent },
			});
		}

		const highRisk = isHighRiskVisual(name, parent);
		let contribution = Math.round(confidence * 0.55);
		if (highRisk) {
			contribution = Math.round(confidence * 0.95);
		} else if (
			category === 'adult_content' ||
			category === 'violence' ||
			category === 'hate_speech' ||
			category === 'self_harm'
		) {
			contribution = Math.round(confidence * 0.85);
		} else if (category === 'dangerous_activities') {
			contribution = Math.round(confidence * 0.7);
		}

		riskScore = Math.max(riskScore, contribution);
		flagged = true;
		if (!flagReason || contribution >= riskScore) {
			flagReason = `${name} detected (${Math.round(confidence)}% confidence)`;
		}
	}

	if (categories.length === 0) {
		categories.push({ category: 'safe', confidence: 95, details: {} });
	}

	riskScore = Math.min(100, Math.max(0, riskScore));
	const shouldBlock = riskScore >= BLOCK_THRESHOLD;
	const shouldFlag = riskScore >= FLAG_THRESHOLD;

	return {
		confidence: Math.max(...categories.map((c) => c.confidence)),
		categories,
		flagged: flagged && shouldFlag,
		flagReason: flagged && shouldFlag ? flagReason : null,
		riskScore,
		shouldBlock,
		shouldFlag,
		rawLabels: labels.map((l) => ({
			name: l.Name,
			parent: l.ParentName,
			confidence: l.Confidence,
		})),
	};
}

async function detectImageModeration({ bucket = BUCKET, key, minConfidence = MIN_CONFIDENCE }) {
	if (!key) {
		throw new Error('s3Key is required for image moderation');
	}
	if (!bucket) {
		throw new Error('S3 bucket is not configured');
	}

	const response = await getClient().send(
		new DetectModerationLabelsCommand({
			Image: {
				S3Object: {
					Bucket: bucket,
					Name: key,
				},
			},
			MinConfidence: minConfidence,
		})
	);

	return labelsToRisk(response.ModerationLabels || []);
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startVideoModeration({ bucket = BUCKET, key, minConfidence = MIN_CONFIDENCE }) {
	if (!key) {
		throw new Error('s3Key is required for video moderation');
	}
	if (!bucket) {
		throw new Error('S3 bucket is not configured');
	}

	const response = await getClient().send(
		new StartContentModerationCommand({
			Video: {
				S3Object: {
					Bucket: bucket,
					Name: key,
				},
			},
			MinConfidence: minConfidence,
		})
	);

	return response.JobId;
}

async function getVideoModeration(jobId) {
	const response = await getClient().send(
		new GetContentModerationCommand({
			JobId: jobId,
			MaxResults: 1000,
			SortBy: 'TIMESTAMP',
		})
	);

	return {
		status: response.JobStatus,
		statusMessage: response.StatusMessage,
		labels: (response.ModerationLabels || []).map((entry) => ({
			Timestamp: entry.Timestamp,
			...(entry.ModerationLabel || {}),
		})),
	};
}

/**
 * Start video moderation and poll until SUCCEEDED/FAILED or timeout.
 */
async function moderateVideo({ bucket = BUCKET, key, minConfidence = MIN_CONFIDENCE }) {
	const jobId = await startVideoModeration({ bucket, key, minConfidence });
	const started = Date.now();

	while (Date.now() - started < VIDEO_MAX_WAIT_MS) {
		const result = await getVideoModeration(jobId);
		if (result.status === 'SUCCEEDED') {
			return labelsToRisk(result.labels);
		}
		if (result.status === 'FAILED') {
			throw new Error(result.statusMessage || 'Rekognition video moderation failed');
		}
		await sleep(VIDEO_POLL_MS);
	}

	throw new Error('Rekognition video moderation timed out');
}

function mergeRiskResults(results = []) {
	if (results.length === 0) {
		return labelsToRisk([]);
	}

	const allCategories = [];
	let riskScore = 0;
	let flagged = false;
	let flagReason = null;
	const rawLabels = [];

	for (const result of results) {
		riskScore = Math.max(riskScore, result.riskScore || 0);
		if (result.flagged) {
			flagged = true;
			flagReason = result.flagReason || flagReason;
		}
		if (Array.isArray(result.categories)) {
			allCategories.push(...result.categories.filter((c) => c.category !== 'safe'));
		}
		if (Array.isArray(result.rawLabels)) {
			rawLabels.push(...result.rawLabels);
		}
	}

	if (allCategories.length === 0) {
		allCategories.push({ category: 'safe', confidence: 95, details: {} });
	}

	return {
		confidence: Math.max(...allCategories.map((c) => c.confidence || 0)),
		categories: allCategories,
		flagged,
		flagReason,
		riskScore,
		shouldBlock: riskScore >= BLOCK_THRESHOLD,
		shouldFlag: riskScore >= FLAG_THRESHOLD,
		rawLabels,
	};
}

/**
 * Moderate a list of post media items (parallel images; videos polled sequentially).
 * @param {Array<{ type?: string, s3Key?: string, mimeType?: string }>} media
 */
async function moderateMedia(media = []) {
	if (!isEnabled()) {
		return {
			ok: false,
			skipped: true,
			reason: 'REKOGNITION_ENABLED is not true',
			analysis: labelsToRisk([]),
		};
	}

	const items = (media || []).filter((m) => m && m.s3Key);
	if (items.length === 0) {
		return {
			ok: true,
			skipped: true,
			reason: 'No media with s3Key',
			analysis: labelsToRisk([]),
		};
	}

	const results = [];

	const imageItems = items.filter(
		(m) => m.type === 'image' || (m.mimeType && String(m.mimeType).startsWith('image/'))
	);
	const videoItems = items.filter(
		(m) => m.type === 'video' || (m.mimeType && String(m.mimeType).startsWith('video/'))
	);

	const imageResults = await Promise.all(
		imageItems.map(async (item) => {
			try {
				return await detectImageModeration({ key: item.s3Key });
			} catch (err) {
				console.error('[REKOGNITION] Image moderation failed', {
					key: item.s3Key,
					message: err.message,
				});
				throw err;
			}
		})
	);
	results.push(...imageResults);

	for (const item of videoItems) {
		try {
			const videoResult = await moderateVideo({ key: item.s3Key });
			results.push(videoResult);
		} catch (err) {
			console.error('[REKOGNITION] Video moderation failed', {
				key: item.s3Key,
				message: err.message,
			});
			throw err;
		}
	}

	return {
		ok: true,
		skipped: false,
		analysis: mergeRiskResults(results),
	};
}

module.exports = {
	isEnabled,
	labelsToRisk,
	detectImageModeration,
	startVideoModeration,
	getVideoModeration,
	moderateVideo,
	moderateMedia,
	mergeRiskResults,
	MIN_CONFIDENCE,
	BLOCK_THRESHOLD,
	FLAG_THRESHOLD,
	BUCKET,
};
