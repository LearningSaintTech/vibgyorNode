const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const {
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
} = require('../userController/postCollectionController');

// Validation middleware
const validateCreateCollection = (req, res, next) => {
  const { name } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Collection name is required'
    });
  }
  
  next();
};

// Collection CRUD Routes
router.post('/', 
  authorize([Roles.USER]), 
  validateCreateCollection, 
  createCollection
);

router.get('/user', 
  authorize([Roles.USER]), 
  getUserCollections
);

router.get('/public', 
  authorize([Roles.USER]), 
  getPublicCollections
);

router.get('/search', 
  authorize([Roles.USER]), 
  searchCollections
);

router.get('/:collectionId', 
  authorize([Roles.USER]), 
  getCollection
);

router.put('/:collectionId', 
  authorize([Roles.USER]), 
  validateCreateCollection, 
  updateCollection
);

router.delete('/:collectionId', 
  authorize([Roles.USER]), 
  deleteCollection
);

// Post management
router.post('/:collectionId/posts', 
  authorize([Roles.USER]), 
  addPostToCollection
);

router.delete('/:collectionId/posts', 
  authorize([Roles.USER]), 
  removePostFromCollection
);

// Collaboration management
router.post('/:collectionId/collaborators', 
  authorize([Roles.USER]), 
  addCollaborator
);

router.post('/:collectionId/collaborators/accept', 
  authorize([Roles.USER]), 
  acceptCollaboration
);

router.delete('/:collectionId/collaborators', 
  authorize([Roles.USER]), 
  removeCollaborator
);

// Tag management
router.post('/:collectionId/tags', 
  authorize([Roles.USER]), 
  addTag
);

router.delete('/:collectionId/tags', 
  authorize([Roles.USER]), 
  removeTag
);

module.exports = router;
