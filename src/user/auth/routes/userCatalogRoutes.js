const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { 
	getCatalog, 
	createCatalog, 
	updateCatalog, 
	addToList, 
	removeFromList, 
	deleteCatalog, 
	getList 
} = require('../controller/userCatalogController');

// Public routes (no auth required)
router.get('/', getCatalog);
router.get('/:listType', getList);

// Admin/SubAdmin protected routes
router.post('/', authorize([Roles.ADMIN, Roles.SUBADMIN]), createCatalog);
router.put('/', authorize([Roles.ADMIN, Roles.SUBADMIN]), updateCatalog);
router.patch('/add', authorize([Roles.ADMIN, Roles.SUBADMIN]), addToList);
router.patch('/remove', authorize([Roles.ADMIN, Roles.SUBADMIN]), removeFromList);
router.delete('/', authorize([Roles.ADMIN, Roles.SUBADMIN]), deleteCatalog);

module.exports = router;
