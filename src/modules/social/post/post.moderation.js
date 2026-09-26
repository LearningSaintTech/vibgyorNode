const { Post } = require('./post.repository');
const { deleteFromS3 } = require('../../../services/s3Service');
const notificationService = require('../../notification/services/notificationService');
const rekognitionService = require('../../../services/rekognitionService');
const { analyzeTextPolicy, buildModerationNotificationCopy } = require('../../../services/moderationPolicy');

const BLOCK_THRESHOLD = Number(process.env.REKOGNITION_BLOCK_THRESHOLD || 80);
const FLAG_THRESHOLD = Number(process.env.REKOGNITION_FLAG_THRESHOLD || 40);

function mergeAnalyses(mediaAnalysis, textAnalysis) {
	const media = mediaAnalysis || {
		confidence: 0,
		categories: [],
		flagged: false,
		flagReason: null,
		riskScore: 0,
	};
	const text = textAnalysis || {
		categories: [],
		flagged: false,
		flagReason: null,
		riskScore: 0,
	};

	const categories = [
		...(media.categories || []).filter((c) => c.category !== 'safe'),
		...(text.categories || []),
	];
	if (categories.length === 0) {
		categories.push({ category: 'safe', confidence: 95, details: {} });
	}

	const riskScore = Math.min(100, Math.max(media.riskScore || 0, text.riskScore || 0));
	const flagged = Boolean(media.flagged || text.flagged);

	return {
		confidence: Math.max(...categories.map((c) => c.confidence || 0)),
		categories,
		flagged,
		flagReason: media.flagReason || text.flagReason,
		riskScore,
		shouldBlock: riskScore >= BLOCK_THRESHOLD,
		shouldFlag: riskScore >= FLAG_THRESHOLD,
		rawLabels: media.rawLabels || [],
	};
}

/**
 * Apply Instagram-like outcomes after Rekognition analysis.
 * - high risk: soft-delete post, cleanup S3 for never-published videos, notify
 * - mid risk: publish if processing, leave flag to ContentModeration
 * - safe: publish if processing
 */
async function applyPostModerationOutcome(postId, analysis, media = []) {
	const post = await Post.findById(postId);
	if (!post) {
		console.warn('[POST][MODERATION] Post not found for outcome', { postId });
		return null;
	}

	const riskScore = Number(analysis?.riskScore || 0);
	const wasProcessing = post.status === 'processing';
	const neverPublished = wasProcessing;

	if (riskScore >= BLOCK_THRESHOLD) {
		post.status = 'deleted';
		await post.save();

		if (neverPublished && Array.isArray(media)) {
			await Promise.all(
				media
					.filter((m) => m?.s3Key)
					.map(async (m) => {
						try {
							await deleteFromS3(m.s3Key);
						} catch (err) {
							console.error('[POST][MODERATION] S3 cleanup failed', {
								key: m.s3Key,
								message: err.message,
							});
						}
					})
			);
		}

		try {
			const copy = buildModerationNotificationCopy('removed', analysis?.categories);
			await notificationService.create({
				context: 'social',
				type: 'content_moderation',
				recipientId: String(post.author),
				title: copy.title,
				message: copy.message,
				data: {
					postId: String(post._id),
					action: 'removed',
					category: copy.category,
					reason: analysis?.flagReason || copy.message,
					riskScore,
					title: copy.title,
					message: copy.message,
				},
			});
		} catch (notifyErr) {
			console.error('[POST][MODERATION] Notify failed', notifyErr?.message || notifyErr);
		}

		return { outcome: 'deleted', post };
	}

	if (wasProcessing) {
		post.status = 'published';
		post.publishedAt = post.publishedAt || new Date();
		await post.save();
	}

	if (riskScore >= FLAG_THRESHOLD) {
		try {
			const copy = buildModerationNotificationCopy('under_review', analysis?.categories);
			await notificationService.create({
				context: 'social',
				type: 'content_moderation',
				recipientId: String(post.author),
				title: copy.title,
				message: copy.message,
				data: {
					postId: String(post._id),
					action: 'under_review',
					category: copy.category,
					reason: analysis?.flagReason || copy.message,
					riskScore,
					title: copy.title,
					message: copy.message,
				},
			});
		} catch (notifyErr) {
			console.error('[POST][MODERATION] Under-review notify failed', notifyErr?.message || notifyErr);
		}
		return { outcome: 'flagged', post };
	}

	return { outcome: wasProcessing ? 'published' : 'unchanged', post };
}

/**
 * Run Rekognition (if enabled), create moderation record, apply post status outcomes.
 */
async function runPostModerationPipeline({
	postId,
	authorId,
	text,
	media,
	hashtags,
	mentions,
	ContentModeration,
}) {
	let analysis = null;
	let rekognitionResult = { ok: false, skipped: true };

	try {
		rekognitionResult = await rekognitionService.moderateMedia(media);
		analysis = mergeAnalyses(rekognitionResult.analysis, analyzeTextPolicy(text));
	} catch (err) {
		console.error('[POST][MODERATION] Rekognition error — falling back to text policy', {
			postId,
			message: err.message,
		});
		analysis = mergeAnalyses(
			{
				confidence: 0,
				categories: [],
				flagged: false,
				flagReason: null,
				riskScore: 0,
			},
			analyzeTextPolicy(text)
		);
		if (!analysis.flagged) {
			analysis = {
				...analysis,
				flagged: true,
				flagReason: `Moderation check failed: ${err.message}`,
				riskScore: Math.max(analysis.riskScore, FLAG_THRESHOLD),
				shouldFlag: true,
				categories: [
					...(analysis.categories || []).filter((c) => c.category !== 'safe'),
					{
						category: 'inappropriate',
						confidence: 0,
						details: { error: err.message },
					},
				],
			};
		}
	}

	const record = await ContentModeration.createModerationRecord(
		'post',
		postId,
		{
			author: authorId,
			text: text || '',
			media,
			hashtags: hashtags || [],
			mentions: mentions || [],
		},
		{ precomputedAnalysis: analysis, skipAutomatedAction: true }
	);

	const outcome = await applyPostModerationOutcome(postId, analysis, media);

	if (analysis?.flagged && record?.takeAutomatedAction) {
		try {
			record.moderationResults.aiAnalysis = {
				...record.moderationResults.aiAnalysis,
				...analysis,
				isAnalyzed: true,
				analyzedAt: new Date(),
			};
			await record.takeAutomatedAction('ai_analysis', analysis);
		} catch (actionErr) {
			console.error('[POST][MODERATION] Automated action error', actionErr?.message || actionErr);
		}
	}

	return { record, analysis, outcome, rekognitionResult };
}

module.exports = {
	applyPostModerationOutcome,
	runPostModerationPipeline,
	BLOCK_THRESHOLD,
	FLAG_THRESHOLD,
};
