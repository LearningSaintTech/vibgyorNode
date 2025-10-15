const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const {
	searchPeople,
	searchPosts,
	searchHashtags,
	searchLocation,
	searchAll
} = require('../userController/userSearchController');

// Search Routes (User only)
// Main search endpoint with filters
router.get('/', authorize([Roles.USER]), searchAll);

// Individual filter endpoints
router.get('/people', authorize([Roles.USER]), searchPeople);
router.get('/posts', authorize([Roles.USER]), searchPosts);
router.get('/hashtags', authorize([Roles.USER]), searchHashtags);
router.get('/location', authorize([Roles.USER]), searchLocation);

module.exports = router;
