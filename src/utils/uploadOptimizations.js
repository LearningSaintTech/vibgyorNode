const { generateBlurHash } = require('../services/blurhashService');

/** Run work after the HTTP response path (non-blocking for the client). */
function deferTask(task, label = 'upload') {
	setImmediate(() => {
		Promise.resolve()
			.then(task)
			.catch((err) => console.error(`[UPLOAD] Deferred ${label} failed:`, err));
	});
}

/** Resolve @usernames from text fields into unique user ObjectIds (single DB query). */
async function resolveMentionUserIds(texts, User, existingIds = []) {
	const usernames = new Set();
	const list = Array.isArray(texts) ? texts : [texts];

	for (const text of list) {
		if (!text || typeof text !== 'string') continue;
		const matches = text.match(/@\w+/g) || [];
		for (const mention of matches) {
			usernames.add(mention.replace('@', '').trim().toLowerCase());
		}
	}

	const seen = new Set(
		existingIds.map((id) => (id?.toString ? id.toString() : String(id)))
	);
	const result = [...existingIds];

	if (usernames.size === 0) {
		return result;
	}

	const users = await User.find({ username: { $in: [...usernames] } })
		.select('_id username')
		.lean();

	for (const user of users) {
		const id = user._id.toString();
		if (!seen.has(id)) {
			seen.add(id);
			result.push(user._id);
		}
	}

	return result;
}

/** Resolve @mentions in story content into mention objects (single DB query). */
async function resolveStoryMentions(content, mentionsInput, User) {
	const processed = [];

	if (Array.isArray(mentionsInput)) {
		for (const mention of mentionsInput) {
			if (mention?.user) processed.push(mention);
		}
	}

	if (!content || typeof content !== 'string') {
		return processed;
	}

	const contentMentions = content.match(/@\w+/g) || [];
	if (contentMentions.length === 0) {
		return processed;
	}

	const usernames = [...new Set(
		contentMentions.map((m) => m.replace('@', '').trim().toLowerCase())
	)];

	const users = await User.find({ username: { $in: usernames } })
		.select('_id username')
		.lean();

	const userByUsername = new Map(
		users.map((u) => [u.username.toLowerCase(), u])
	);

	const seenUserIds = new Set(
		processed.map((m) => (m.user?.toString ? m.user.toString() : String(m.user)))
	);

	for (const mention of contentMentions) {
		const username = mention.replace('@', '').trim().toLowerCase();
		const user = userByUsername.get(username);
		if (!user) continue;

		const userId = user._id.toString();
		if (seenUserIds.has(userId)) continue;

		seenUserIds.add(userId);
		processed.push({
			user: user._id,
			position: {
				start: content.indexOf(mention),
				end: content.indexOf(mention) + mention.length,
			},
			notified: false,
		});
	}

	return processed;
}

function schedulePostMediaBlurhash(Post, postId, mediaIndex, imageBuffer) {
	deferTask(async () => {
		const blurhash = await generateBlurHash(imageBuffer);
		if (!blurhash) return;
		await Post.updateOne(
			{ _id: postId },
			{ $set: { [`media.${mediaIndex}.blurhash`]: blurhash } }
		);
	}, `post-blurhash:${postId}:${mediaIndex}`);
}

function scheduleStoryMediaBlurhash(Story, storyId, imageBuffer) {
	deferTask(async () => {
		const blurhash = await generateBlurHash(imageBuffer);
		if (!blurhash) return;
		await Story.updateOne(
			{ _id: storyId },
			{ $set: { 'media.blurhash': blurhash } }
		);
	}, `story-blurhash:${storyId}`);
}

module.exports = {
	deferTask,
	resolveMentionUserIds,
	resolveStoryMentions,
	schedulePostMediaBlurhash,
	scheduleStoryMediaBlurhash,
};
