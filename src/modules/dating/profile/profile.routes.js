const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const {
	getAllDatingProfiles,
	updateDatingPreferences,
	getDatingPreferences
} = require('./profile.controller');

// All routes require user authentication
router.use(authorize([Roles.USER]));

// Get all dating profiles with filters and search
// Query params: search, hereTo, lookingFor, wantToMeet, identification, ageMin, ageMax, languages, city, country, distanceMax, filter, page, limit
// Note: location schema only has city and country (no state field)
router.get('/profiles', getAllDatingProfiles);

// Get dating preferences
router.get('/preferences', getDatingPreferences);

// Update dating preferences
router.put('/preferences', updateDatingPreferences);

module.exports = router;

