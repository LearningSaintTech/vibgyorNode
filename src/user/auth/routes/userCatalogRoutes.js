const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { uploadMultiple } = require('../../../middleware/uploadMiddleware');
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

// Admin/SubAdmin protected routes with file upload support
router.post('/', authorize([Roles.ADMIN, Roles.SUBADMIN]), uploadMultiple, createCatalog);
router.put('/', authorize([Roles.ADMIN, Roles.SUBADMIN]), uploadMultiple, updateCatalog);
router.patch('/add', authorize([Roles.ADMIN, Roles.SUBADMIN]), addToList);
router.patch('/remove', authorize([Roles.ADMIN, Roles.SUBADMIN]), removeFromList);
router.delete('/', authorize([Roles.ADMIN, Roles.SUBADMIN]), deleteCatalog);

module.exports = router;
