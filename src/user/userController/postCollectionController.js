const PostCollection = require('../userModel/postCollectionModel');
const Post = require('../userModel/postModel');
const ApiResponse = require('../../utils/apiResponse');

// Create a new post collection
async function createCollection(req, res) {
  try {
    const { name, description, isPublic, tags, coverImage, settings } = req.body;
    const userId = req.user?.userId;

    if (!name) {
      return ApiResponse.badRequest(res, 'Collection name is required');
    }

    const collectionData = {
      name,
      description: description || '',
      owner: userId,
      isPublic: isPublic || false,
      tags: tags || [],
      coverImage: coverImage || '',
      settings: {
        allowPublicViewing: settings?.allowPublicViewing || false,
        allowPublicContributions: settings?.allowPublicContributions || false,
        autoApprovePosts: settings?.autoApprovePosts !== undefined ? settings.autoApprovePosts : true,
        maxPosts: settings?.maxPosts || 1000
      }
    };

    const newCollection = new PostCollection(collectionData);
    await newCollection.save();

    console.log('[COLLECTION] Collection created successfully:', newCollection._id);
    return ApiResponse.success(res, newCollection, 'Collection created successfully');
  } catch (error) {
    console.error('[COLLECTION] Create collection error:', error);
    return ApiResponse.serverError(res, 'Failed to create collection');
  }
}

// Get user's collections
async function getUserCollections(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    const collections = await PostCollection.getUserCollections(userId, parseInt(limit));

    return ApiResponse.success(res, {
      collections,
      pagination: {
        currentPage: parseInt(page),
        totalCollections: collections.length,
        hasNext: collections.length === limit,
        hasPrev: page > 1
      }
    }, 'User collections retrieved successfully');
  } catch (error) {
    console.error('[COLLECTION] Get user collections error:', error);
    return ApiResponse.serverError(res, 'Failed to get user collections');
  }
}

// Get public collections
async function getPublicCollections(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const collections = await PostCollection.getPublicCollections(parseInt(limit));

    return ApiResponse.success(res, {
      collections,
      pagination: {
        currentPage: parseInt(page),
        totalCollections: collections.length,
        hasNext: collections.length === limit,
        hasPrev: page > 1
      }
    }, 'Public collections retrieved successfully');
  } catch (error) {
    console.error('[COLLECTION] Get public collections error:', error);
    return ApiResponse.serverError(res, 'Failed to get public collections');
  }
}

// Search collections
async function searchCollections(req, res) {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Search query is required');
    }

    const collections = await PostCollection.searchCollections(q.trim(), parseInt(limit));

    return ApiResponse.success(res, {
      collections,
      query: q,
      pagination: {
        currentPage: parseInt(page),
        totalCollections: collections.length,
        hasNext: collections.length === limit,
        hasPrev: page > 1
      }
    }, 'Collection search results retrieved successfully');
  } catch (error) {
    console.error('[COLLECTION] Search collections error:', error);
    return ApiResponse.serverError(res, 'Failed to search collections');
  }
}

// Get single collection
async function getCollection(req, res) {
  try {
    const { collectionId } = req.params;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId)
      .populate('owner', 'username fullName profilePictureUrl')
      .populate('posts.post', 'content media likesCount commentsCount publishedAt author')
      .populate('collaborators.user', 'username fullName profilePictureUrl');

    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    // Check if user can view this collection
    if (!collection.isPublic && collection.owner._id.toString() !== userId && 
        !collection.collaborators.find(c => c.user._id.toString() === userId)) {
      return ApiResponse.forbidden(res, 'You cannot view this collection');
    }

    return ApiResponse.success(res, collection, 'Collection retrieved successfully');
  } catch (error) {
    console.error('[COLLECTION] Get collection error:', error);
    return ApiResponse.serverError(res, 'Failed to get collection');
  }
}

// Update collection
async function updateCollection(req, res) {
  try {
    const { collectionId } = req.params;
    const { name, description, isPublic, tags, coverImage, settings } = req.body;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    // Check if user can update this collection
    if (collection.owner.toString() !== userId && 
        !collection.collaborators.find(c => c.user.toString() === userId && c.permissions.canEditCollection)) {
      return ApiResponse.forbidden(res, 'You cannot update this collection');
    }

    // Update collection fields
    if (name !== undefined) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (isPublic !== undefined) collection.isPublic = isPublic;
    if (tags !== undefined) collection.tags = tags;
    if (coverImage !== undefined) collection.coverImage = coverImage;
    if (settings !== undefined) {
      collection.settings = { ...collection.settings, ...settings };
    }

    await collection.save();

    console.log('[COLLECTION] Collection updated successfully:', collectionId);
    return ApiResponse.success(res, collection, 'Collection updated successfully');
  } catch (error) {
    console.error('[COLLECTION] Update collection error:', error);
    return ApiResponse.serverError(res, 'Failed to update collection');
  }
}

// Delete collection
async function deleteCollection(req, res) {
  try {
    const { collectionId } = req.params;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    // Check if user can delete this collection
    if (collection.owner.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only delete your own collections');
    }

    collection.isActive = false;
    await collection.save();

    console.log('[COLLECTION] Collection deleted successfully:', collectionId);
    return ApiResponse.success(res, null, 'Collection deleted successfully');
  } catch (error) {
    console.error('[COLLECTION] Delete collection error:', error);
    return ApiResponse.serverError(res, 'Failed to delete collection');
  }
}

// Add post to collection
async function addPostToCollection(req, res) {
  try {
    const { collectionId } = req.params;
    const { postId, notes = '' } = req.body;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    // Check if user can add posts to this collection
    if (collection.owner.toString() !== userId && 
        !collection.collaborators.find(c => c.user.toString() === userId && c.permissions.canAddPosts)) {
      return ApiResponse.forbidden(res, 'You cannot add posts to this collection');
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    await collection.addPost(postId, userId, notes);

    console.log('[COLLECTION] Post added to collection successfully');
    return ApiResponse.success(res, {
      posts: collection.posts
    }, 'Post added to collection successfully');
  } catch (error) {
    console.error('[COLLECTION] Add post to collection error:', error);
    return ApiResponse.serverError(res, 'Failed to add post to collection');
  }
}

// Remove post from collection
async function removePostFromCollection(req, res) {
  try {
    const { collectionId } = req.params;
    const { postId } = req.body;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    // Check if user can remove posts from this collection
    if (collection.owner.toString() !== userId && 
        !collection.collaborators.find(c => c.user.toString() === userId && c.permissions.canRemovePosts)) {
      return ApiResponse.forbidden(res, 'You cannot remove posts from this collection');
    }

    await collection.removePost(postId);

    console.log('[COLLECTION] Post removed from collection successfully');
    return ApiResponse.success(res, {
      posts: collection.posts
    }, 'Post removed from collection successfully');
  } catch (error) {
    console.error('[COLLECTION] Remove post from collection error:', error);
    return ApiResponse.serverError(res, 'Failed to remove post from collection');
  }
}

// Add collaborator to collection
async function addCollaborator(req, res) {
  try {
    const { collectionId } = req.params;
    const { userId: collaboratorId, role = 'viewer', permissions = {} } = req.body;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    // Check if user can add collaborators
    if (collection.owner.toString() !== userId && 
        !collection.collaborators.find(c => c.user.toString() === userId && c.permissions.canInvite)) {
      return ApiResponse.forbidden(res, 'You cannot add collaborators to this collection');
    }

    await collection.addCollaborator(collaboratorId, role, permissions);

    console.log('[COLLECTION] Collaborator added successfully');
    return ApiResponse.success(res, {
      collaborators: collection.collaborators
    }, 'Collaborator added successfully');
  } catch (error) {
    console.error('[COLLECTION] Add collaborator error:', error);
    return ApiResponse.serverError(res, 'Failed to add collaborator');
  }
}

// Accept collaboration
async function acceptCollaboration(req, res) {
  try {
    const { collectionId } = req.params;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    await collection.acceptCollaboration(userId);

    console.log('[COLLECTION] Collaboration accepted successfully');
    return ApiResponse.success(res, null, 'Collaboration accepted successfully');
  } catch (error) {
    console.error('[COLLECTION] Accept collaboration error:', error);
    return ApiResponse.serverError(res, 'Failed to accept collaboration');
  }
}

// Remove collaborator from collection
async function removeCollaborator(req, res) {
  try {
    const { collectionId } = req.params;
    const { collaboratorId } = req.body;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    // Check if user can remove collaborators
    if (collection.owner.toString() !== userId && 
        !collection.collaborators.find(c => c.user.toString() === userId && c.permissions.canInvite)) {
      return ApiResponse.forbidden(res, 'You cannot remove collaborators from this collection');
    }

    await collection.removeCollaborator(collaboratorId);

    console.log('[COLLECTION] Collaborator removed successfully');
    return ApiResponse.success(res, {
      collaborators: collection.collaborators
    }, 'Collaborator removed successfully');
  } catch (error) {
    console.error('[COLLECTION] Remove collaborator error:', error);
    return ApiResponse.serverError(res, 'Failed to remove collaborator');
  }
}

// Add tag to collection
async function addTag(req, res) {
  try {
    const { collectionId } = req.params;
    const { tag } = req.body;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    if (collection.owner.toString() !== userId && 
        !collection.collaborators.find(c => c.user.toString() === userId && c.permissions.canEditCollection)) {
      return ApiResponse.forbidden(res, 'You cannot modify this collection');
    }

    await collection.addTag(tag);

    console.log('[COLLECTION] Tag added successfully');
    return ApiResponse.success(res, {
      tags: collection.tags
    }, 'Tag added successfully');
  } catch (error) {
    console.error('[COLLECTION] Add tag error:', error);
    return ApiResponse.serverError(res, 'Failed to add tag');
  }
}

// Remove tag from collection
async function removeTag(req, res) {
  try {
    const { collectionId } = req.params;
    const { tag } = req.body;
    const userId = req.user?.userId;

    const collection = await PostCollection.findById(collectionId);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    if (collection.owner.toString() !== userId && 
        !collection.collaborators.find(c => c.user.toString() === userId && c.permissions.canEditCollection)) {
      return ApiResponse.forbidden(res, 'You cannot modify this collection');
    }

    await collection.removeTag(tag);

    console.log('[COLLECTION] Tag removed successfully');
    return ApiResponse.success(res, {
      tags: collection.tags
    }, 'Tag removed successfully');
  } catch (error) {
    console.error('[COLLECTION] Remove tag error:', error);
    return ApiResponse.serverError(res, 'Failed to remove tag');
  }
}

module.exports = {
  createCollection,
  getUserCollections,
  getPublicCollections,
  searchCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addPostToCollection,
  removePostFromCollection,
  addCollaborator,
  acceptCollaboration,
  removeCollaborator,
  addTag,
  removeTag
};
