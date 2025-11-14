const User = require('../../auth/model/userAuthModel');
const Post = require('../userModel/postModel');
const ApiResponse = require('../../../utils/apiResponse');

// Helper function to process search input
// Extracts hashtags (with #) and separates them from keywords
// Used by hashtag search to determine if # is present or not
function processSearchInput(input) {
	const searchTerm = input?.trim() || '';
	// Extract hashtags that start with # (e.g., #travel, #adventure)
	const hashtags = searchTerm.match(/#\w+/g) || [];
	// Remove hashtags from search term to get remaining keywords
	const keywords = searchTerm.replace(/#\w+/g, '').trim();
	
	return {
		originalInput: input,
		keywords: keywords, // Text without hashtags (used when # is not present)
		hashtags: hashtags, // Array of hashtags with # symbol (e.g., ["#travel", "#adventure"])
		hasHashtags: hashtags.length > 0, // True if # symbols found
		hasKeywords: keywords.length > 0 // True if text remains after removing hashtags
	};
}

// Helper function to get mentioned user IDs from keyword
async function getMentionedUserIds(keyword) {
	if (!keyword) return [];
	
	// Extract usernames from mentions (e.g., @username)
	const mentions = keyword.match(/@\w+/g) || [];
	const usernames = mentions.map(mention => mention.replace('@', ''));
	
	if (usernames.length === 0) return [];
	
	const users = await User.find({ 
		username: { $in: usernames } 
	}).select('_id');
	
	return users.map(user => user._id);
}

// Search People
async function searchPeople(req, res) {
	try {
		console.log('[USER][SEARCH] searchPeople request started');
		console.log('[USER][SEARCH] Request query:', req.query);
		console.log('[USER][SEARCH] Current user info:', req.user);
		
		const { q: keyword = '', page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;
		
		console.log('[USER][SEARCH] Extracted data:', { keyword, page, limit, currentUserId });

		if (!keyword.trim()) {
			console.log('[USER][SEARCH] No search keyword provided');
			return ApiResponse.success(res, {
				results: [],
				count: 0,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total: 0,
					pages: 0
				}
			}, 'No search keyword provided');
		}

		// Get user's blocked users and users who blocked them
		const user = await User.findById(currentUserId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const blockedUsers = user.blockedUsers || [];
		const blockedBy = user.blockedBy || [];
		
		const searchQuery = {
			$and: [
				{ _id: { $nin: [...blockedUsers, ...blockedBy] } }, // Exclude blocked users
				{ isActive: true }, // Only active users
				{
					$or: [
						{ fullName: { $regex: keyword, $options: 'i' } },
						{ username: { $regex: keyword, $options: 'i' } }
					]
				}
			]
		};
		
		const skip = (parseInt(page) - 1) * parseInt(limit);
		
		console.log('[USER][SEARCH] People search query:', searchQuery);
		
		const [results, total] = await Promise.all([
			User.find(searchQuery)
				.select('username fullName profilePictureUrl verificationStatus')
				.sort({ verificationStatus: -1, createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean(),
			User.countDocuments(searchQuery)
		]);
		
		console.log('[USER][SEARCH] People search results:', {
			count: results.length,
			total: total
		});

		const responseData = {
			type: 'people',
			results: results,
			count: results.length,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: total,
				pages: Math.ceil(total / parseInt(limit))
			}
		};

		console.log('[USER][SEARCH] People search completed successfully');
		return ApiResponse.success(res, responseData);
	} catch (e) {
		console.error('[USER][SEARCH] searchPeople error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to search people');
	}
}

// Search Posts
async function searchPosts(req, res) {
	try {
		console.log('[USER][SEARCH] searchPosts request started');
		console.log('[USER][SEARCH] Request query:', req.query);
		console.log('[USER][SEARCH] Current user info:', req.user);
		
		const { q: keyword = '', page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;
		
		console.log('[USER][SEARCH] Extracted data:', { keyword, page, limit, currentUserId });

		// Get user's blocked users
		const user = await User.findById(currentUserId);
		if (!user) {
			console.log('[USER][SEARCH] User not found:', currentUserId);
			return ApiResponse.notFound(res, 'User not found');
		}

		const blockedUsers = user.blockedUsers || [];
		const blockedBy = user.blockedBy || [];
		console.log('[USER][SEARCH] Blocked users:', blockedUsers.length, 'Blocked by:', blockedBy.length);

		let searchQuery;
		
		// If no keyword, return all public posts
		if (!keyword.trim()) {
			console.log('[USER][SEARCH] No search keyword - returning all public posts');
			searchQuery = {
				$and: [
					{ status: 'published' },
					{ visibility: 'public' },
					{ author: { $nin: [...blockedUsers, ...blockedBy] } }
				]
			};
		} else {
			console.log('[USER][SEARCH] Searching posts with keyword:', keyword);
			const mentionedUserIds = await getMentionedUserIds(keyword);
			console.log('[USER][SEARCH] Mentioned user IDs:', mentionedUserIds.length);
			
			searchQuery = {
				$and: [
					{ status: 'published' },
					{ visibility: 'public' },
					{ author: { $nin: [...blockedUsers, ...blockedBy] } },
					{
						$or: [
							{ content: { $regex: keyword, $options: 'i' } },
							{ caption: { $regex: keyword, $options: 'i' } },
							{ hashtags: { $in: [new RegExp(keyword, 'i')] } },
							{ 'location.name': { $regex: keyword, $options: 'i' } },
							...(mentionedUserIds.length > 0 ? [{ 'mentions.user': { $in: mentionedUserIds } }] : [])
						]
					}
				]
			};
		}
		
		const skip = (parseInt(page) - 1) * parseInt(limit);
		
		console.log('[USER][SEARCH] Posts search query:', JSON.stringify(searchQuery));
		console.log('[USER][SEARCH] Pagination - skip:', skip, 'limit:', limit);
		
		const [results, total] = await Promise.all([
			Post.find(searchQuery)
				.populate('author', 'username fullName profilePictureUrl verificationStatus')
				.populate('mentions.user', 'username fullName')
				.sort({ publishedAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean(),
			Post.countDocuments(searchQuery)
		]);
		
		console.log('[USER][SEARCH] Posts search results:', {
			count: results.length,
			total: total
		});

		const responseData = {
			type: 'posts',
			results: results,
			count: results.length,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: total,
				pages: Math.ceil(total / parseInt(limit))
			}
		};

		console.log('[USER][SEARCH] Posts search completed successfully');
		return ApiResponse.success(res, responseData);
	} catch (e) {
		console.error('[USER][SEARCH] searchPosts error:', e?.message || e);
		console.error('[USER][SEARCH] searchPosts error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to search posts');
	}
}

// Search Hashtags
async function searchHashtags(req, res) {
	try {
		console.log('[USER][SEARCH] searchHashtags request started');
		console.log('[USER][SEARCH] Request query:', req.query);
		console.log('[USER][SEARCH] Current user info:', req.user);
		
		const { q: keyword = '', page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;
		
		console.log('[USER][SEARCH] Extracted data:', { keyword, page, limit, currentUserId });

		const trimmedKeyword = keyword.trim();
		
		if (!trimmedKeyword) {
			console.log('[USER][SEARCH] No search keyword provided');
			return ApiResponse.success(res, {
				results: [],
				count: 0,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total: 0,
					pages: 0
				}
			}, 'No search keyword provided');
		}

		const processed = processSearchInput(keyword);
		
		// Get user's blocked users
		const user = await User.findById(currentUserId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const blockedUsers = user.blockedUsers || [];
		
		// Process hashtag search terms
		// IMPORTANT: When filter=hashtags, we ALWAYS search the hashtags column,
		// regardless of whether # symbol is present in the query. We search both
		// the normalized form (without #) and the # prefixed form to support data
		// stored in either format.
		const hashtagNamesSet = new Set();
		
		if (processed.hasHashtags) {
			// If # symbols are present: extract hashtags and add both variants
			processed.hashtags.forEach(tag => {
				const cleanTag = tag.replace('#', '').toLowerCase();
				if (cleanTag) {
					hashtagNamesSet.add(cleanTag);
					hashtagNamesSet.add(`#${cleanTag}`);
				}
			});
			console.log('[USER][SEARCH] Extracted hashtags from query:', Array.from(hashtagNamesSet));
		} else {
			// If # symbol is NOT present: use the original trimmed keyword
			const cleanTag = trimmedKeyword.toLowerCase();
			if (cleanTag) {
				hashtagNamesSet.add(cleanTag);
				hashtagNamesSet.add(`#${cleanTag}`);
			}
			console.log('[USER][SEARCH] No # found, using original keyword variants for hashtag search:', Array.from(hashtagNamesSet));
		}

		const hashtagNames = Array.from(hashtagNamesSet);
		
		// Ensure we have hashtag names to search
		if (hashtagNames.length === 0 || hashtagNames.some(tag => !tag || tag.trim() === '')) {
			console.log('[USER][SEARCH] No valid hashtag names to search');
			return ApiResponse.success(res, {
				results: [],
				count: 0,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total: 0,
					pages: 0
				}
			}, 'No valid hashtag names to search');
		}
		
		// Always search the hashtags column in posts
		const searchQuery = {
			$and: [
				{ status: 'published' }, // Only published posts
				{ visibility: 'public' }, // Only public posts
				{ author: { $nin: blockedUsers } }, // Exclude blocked users' posts
				{ hashtags: { $in: hashtagNames } } // Search hashtags column (always, regardless of # presence)
			]
		};
		
		const skip = (parseInt(page) - 1) * parseInt(limit);
		
		console.log('[USER][SEARCH] Hashtags search query:', JSON.stringify(searchQuery, null, 2));
		console.log('[USER][SEARCH] Searching for hashtags:', hashtagNames);
		console.log('[USER][SEARCH] Query details:', {
			hashtagNames: hashtagNames,
			hashtagNamesLength: hashtagNames.length,
			blockedUsersCount: blockedUsers.length
		});
		
		// Debug: Check if any posts have hashtags at all
		const postsWithHashtagsCount = await Post.countDocuments({
			status: 'published',
			visibility: 'public',
			hashtags: { $exists: true, $ne: [] }
		});
		console.log('[USER][SEARCH] Total posts with hashtags:', postsWithHashtagsCount);
		
		// Debug: Check for the specific hashtag
		const exactHashtagCount = await Post.countDocuments({
			status: 'published',
			visibility: 'public',
			hashtags: { $in: hashtagNames }
		});
		console.log('[USER][SEARCH] Posts with exact hashtag match:', exactHashtagCount);
		const sampleHashtagPost = await Post.findOne({
			status: 'published',
			visibility: 'public',
			hashtags: { $exists: true, $ne: [] }
		})
			.sort({ createdAt: -1 })
			.select('hashtags');
		if (sampleHashtagPost) {
			console.log('[USER][SEARCH] Sample post hashtags:', sampleHashtagPost.hashtags);
		} else {
			console.log('[USER][SEARCH] No sample posts with hashtags found');
		}
		
		const [results, total] = await Promise.all([
			Post.find(searchQuery)
				.populate('author', 'username fullName profilePictureUrl verificationStatus')
				.sort({ publishedAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean(),
			Post.countDocuments(searchQuery)
		]);
		
		console.log('[USER][SEARCH] Hashtags search results:', {
			count: results.length,
			total: total
		});
		
		// Debug: Show sample hashtags from results (if any)
		if (results.length > 0) {
			console.log('[USER][SEARCH] Sample hashtags from results:', results[0].hashtags);
		}

		const responseData = {
			type: 'hashtags',
			results: results,
			count: results.length,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: total,
				pages: Math.ceil(total / parseInt(limit))
			}
		};

		console.log('[USER][SEARCH] Hashtags search completed successfully');
		return ApiResponse.success(res, responseData);
	} catch (e) {
		console.error('[USER][SEARCH] searchHashtags error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to search hashtags');
	}
}

// Search Location
async function searchLocation(req, res) {
	try {
		console.log('[USER][SEARCH] searchLocation request started');
		console.log('[USER][SEARCH] Request query:', req.query);
		console.log('[USER][SEARCH] Current user info:', req.user);
		
		const { q: keyword = '', page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;
		
		console.log('[USER][SEARCH] Extracted data:', { keyword, page, limit, currentUserId });

		if (!keyword.trim()) {
			console.log('[USER][SEARCH] No search keyword provided');
			return ApiResponse.success(res, {
				results: [],
				count: 0,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total: 0,
					pages: 0
				}
			}, 'No search keyword provided');
		}

		// Get user's blocked users
		const user = await User.findById(currentUserId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const blockedUsers = user.blockedUsers || [];
		
		const searchQuery = {
			$and: [
				{ status: 'published' }, // Only published posts
				{ visibility: 'public' }, // Only public posts
				{ author: { $nin: blockedUsers } }, // Exclude blocked users' posts
				{
					$or: [
						{ 'location.name': { $regex: keyword, $options: 'i' } },
						{ 'location.address': { $regex: keyword, $options: 'i' } },
						{ 'location.city': { $regex: keyword, $options: 'i' } },
						{ 'location.country': { $regex: keyword, $options: 'i' } }
					]
				}
			]
		};
		
		const skip = (parseInt(page) - 1) * parseInt(limit);
		
		console.log('[USER][SEARCH] Location search query:', searchQuery);
		
		const [results, total] = await Promise.all([
			Post.find(searchQuery)
				.populate('author', 'username fullName profilePictureUrl verificationStatus')
				.sort({ publishedAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean(),
			Post.countDocuments(searchQuery)
		]);
		
		console.log('[USER][SEARCH] Location search results:', {
			count: results.length,
			total: total
		});

		const responseData = {
			type: 'location',
			results: results,
			count: results.length,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: total,
				pages: Math.ceil(total / parseInt(limit))
			}
		};

		console.log('[USER][SEARCH] Location search completed successfully');
		return ApiResponse.success(res, responseData);
	} catch (e) {
		console.error('[USER][SEARCH] searchLocation error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to search location');
	}
}

// Search All (Combined)
async function searchAll(req, res) {
	try {
		console.log('[USER][SEARCH] searchAll request started');
		console.log('[USER][SEARCH] Request query:', req.query);
		console.log('[USER][SEARCH] Request params:', req.params);
		console.log('[USER][SEARCH] Request body:', req.body);
		console.log('[USER][SEARCH] Current user info:', req.user);
		
		const { q: keyword = '', filter = 'all', page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;
		
		console.log('[USER][SEARCH] Extracted data:', { keyword, filter, page, limit, currentUserId });

		const processed = processSearchInput(keyword);
		console.log('[USER][SEARCH] Processed search input:', processed);
		
		// Get user's blocked users
		const user = await User.findById(currentUserId);
		if (!user) {
			console.log('[USER][SEARCH] User not found:', currentUserId);
			return ApiResponse.notFound(res, 'User not found');
		}

		const blockedUsers = user.blockedUsers || [];
		const blockedBy = user.blockedBy || [];
		console.log('[USER][SEARCH] Blocked users:', blockedUsers.length, 'Blocked by:', blockedBy.length);
		
		// If no search term provided, return all public posts (explore/discovery feed)
		if (!processed.hasKeywords && !processed.hasHashtags) {
			console.log('[USER][SEARCH] No search keyword - returning all public posts (explore feed)');
			
			const skip = (parseInt(page) - 1) * parseInt(limit);
			console.log('[USER][SEARCH] Pagination - skip:', skip, 'limit:', limit);
			
			const defaultPostsQuery = {
				$and: [
					{ status: 'published' },
					{ visibility: 'public' },
					{ author: { $nin: [...blockedUsers, ...blockedBy] } }
				]
			};
			console.log('[USER][SEARCH] Default posts query:', JSON.stringify(defaultPostsQuery));
			
			const [posts, total] = await Promise.all([
				Post.find(defaultPostsQuery)
					.populate('author', 'username fullName profilePictureUrl verificationStatus')
					.populate('mentions.user', 'username fullName')
					.sort({ publishedAt: -1 })
					.skip(skip)
					.limit(parseInt(limit))
					.lean(),
				Post.countDocuments(defaultPostsQuery)
			]);
			
			console.log('[USER][SEARCH] Default posts results:', {
				count: posts.length,
				total: total
			});
			
			const responseData = {
				type: 'posts',
				results: posts,
				count: posts.length,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total: total,
					pages: Math.ceil(total / parseInt(limit))
				}
			};
			
			console.log('[USER][SEARCH] Returning default explore feed');
			return ApiResponse.success(res, responseData, 'Explore feed - all public posts');
		}

		// Route to specific filter if requested
		if (filter !== 'all') {
			console.log('[USER][SEARCH] Routing to specific filter:', filter);
			switch (filter) {
				case 'people':
					return await searchPeople(req, res);
				case 'posts':
					return await searchPosts(req, res);
				case 'hashtags':
					return await searchHashtags(req, res);
				case 'location':
					return await searchLocation(req, res);
				default:
					console.log('[USER][SEARCH] Invalid filter type:', filter);
					return ApiResponse.badRequest(res, 'Invalid filter type');
			}
		}

		// Search all categories
		console.log('[USER][SEARCH] Searching all categories...');
		
		const mentionedUserIds = await getMentionedUserIds(keyword);
		console.log('[USER][SEARCH] Mentioned user IDs:', mentionedUserIds.length);
		
		// Search People
		console.log('[USER][SEARCH] Searching people...');
		const peopleQuery = {
			$and: [
				{ _id: { $nin: [...blockedUsers, ...blockedBy] } },
				{ isActive: true },
				{
					$or: [
						{ fullName: { $regex: keyword, $options: 'i' } },
						{ username: { $regex: keyword, $options: 'i' } }
					]
				}
			]
		};
		console.log('[USER][SEARCH] People query:', JSON.stringify(peopleQuery));
		
		// Search Posts
		console.log('[USER][SEARCH] Searching posts...');
		const postsQuery = {
			$and: [
				{ status: 'published' },
				{ visibility: 'public' },
				{ author: { $nin: blockedUsers } },
				{
					$or: [
						{ content: { $regex: keyword, $options: 'i' } },
						{ caption: { $regex: keyword, $options: 'i' } },
						{ hashtags: { $in: [new RegExp(keyword, 'i')] } },
						{ 'location.name': { $regex: keyword, $options: 'i' } },
						...(mentionedUserIds.length > 0 ? [{ 'mentions.user': { $in: mentionedUserIds } }] : [])
					]
				}
			]
		};
		console.log('[USER][SEARCH] Posts query:', JSON.stringify(postsQuery));
		
		// Search Hashtags
		console.log('[USER][SEARCH] Searching hashtags...');
		// IMPORTANT: When searching hashtags, we ALWAYS search the hashtags column,
		// regardless of whether # symbol is present in the query
		const hashtagNamesSet = new Set();
		if (processed.hasHashtags) {
			processed.hashtags.forEach(tag => {
				const cleanTag = tag.replace('#', '').toLowerCase();
				if (cleanTag) {
					hashtagNamesSet.add(cleanTag);
					hashtagNamesSet.add(`#${cleanTag}`);
				}
			});
		} else if (keyword.trim()) {
			const cleanTag = keyword.trim().toLowerCase();
			hashtagNamesSet.add(cleanTag);
			hashtagNamesSet.add(`#${cleanTag}`);
		}
		const hashtagNames = Array.from(hashtagNamesSet);
		console.log('[USER][SEARCH] Hashtag names (always searches hashtags column):', hashtagNames);
		
		const hashtagsQuery = {
			$and: [
				{ status: 'published' },
				{ visibility: 'public' },
				{ author: { $nin: blockedUsers } },
				{ hashtags: { $in: hashtagNames } }
			]
		};
		console.log('[USER][SEARCH] Hashtags query:', JSON.stringify(hashtagsQuery));
		
		// Search Location
		console.log('[USER][SEARCH] Searching location...');
		const locationQuery = {
			$and: [
				{ status: 'published' },
				{ visibility: 'public' },
				{ author: { $nin: blockedUsers } },
				{
					$or: [
						{ 'location.name': { $regex: keyword, $options: 'i' } },
						{ 'location.address': { $regex: keyword, $options: 'i' } }
					]
				}
			]
		};
		console.log('[USER][SEARCH] Location query:', JSON.stringify(locationQuery));
		
		const skip = (parseInt(page) - 1) * parseInt(limit);
		console.log('[USER][SEARCH] Pagination - skip:', skip, 'limit:', limit);
		
		const [people, posts, hashtagPosts, locationPosts] = await Promise.all([
			User.find(peopleQuery)
				.select('username fullName profilePictureUrl verificationStatus')
				.sort({ verificationStatus: -1, createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean(),
			Post.find(postsQuery)
				.populate('author', 'username fullName profilePictureUrl verificationStatus')
				.populate('mentions.user', 'username fullName')
				.sort({ publishedAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean(),
			Post.find(hashtagsQuery)
				.populate('author', 'username fullName profilePictureUrl verificationStatus')
				.sort({ publishedAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean(),
			Post.find(locationQuery)
				.populate('author', 'username fullName profilePictureUrl verificationStatus')
				.sort({ publishedAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean()
		]);
		
		console.log('[USER][SEARCH] Search results counts:', {
			people: people.length,
			posts: posts.length,
			hashtags: hashtagPosts.length,
			location: locationPosts.length
		});

		const totalResults = people.length + posts.length + hashtagPosts.length + locationPosts.length;
		
		console.log('[USER][SEARCH] Total results across all categories:', totalResults);

		const responseData = {
			people: {
				results: people,
				count: people.length
			},
			posts: {
				results: posts,
				count: posts.length
			},
			hashtags: {
				results: hashtagPosts,
				count: hashtagPosts.length
			},
			location: {
				results: locationPosts,
				count: locationPosts.length
			},
			totalResults: totalResults,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit)
			}
		};

		console.log('[USER][SEARCH] All search completed successfully');
		console.log('[USER][SEARCH] Response data structure:', {
			peopleCount: responseData.people.count,
			postsCount: responseData.posts.count,
			hashtagsCount: responseData.hashtags.count,
			locationCount: responseData.location.count,
			total: responseData.totalResults
		});
		
		return ApiResponse.success(res, responseData);
	} catch (e) {
		console.error('[USER][SEARCH] searchAll error:', e?.message || e);
		console.error('[USER][SEARCH] searchAll error stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to search');
	}
}

module.exports = {
	searchPeople,
	searchPosts,
	searchHashtags,
	searchLocation,
	searchAll
};
