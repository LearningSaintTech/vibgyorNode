const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { uploadCatalogMedia } = require('../../../middleware/uploadMiddleware');
const {
	getCatalog,
	getCatalogAdmin,
	createCatalog,
	updateCatalog,
	addToList,
	removeFromList,
	deleteCatalog,
	getList,
} = require('./catalog.controller');

const adminAuth = authorize([Roles.ADMIN, Roles.SUBADMIN]);

// Public read (app users)
router.get('/', getCatalog);
router.get('/list/:listType', getList);

// Admin read (same data + id, timestamps)
router.get('/admin', adminAuth, getCatalogAdmin);

// Admin write
router.post('/', adminAuth, uploadCatalogMedia, createCatalog);
router.put('/', adminAuth, uploadCatalogMedia, updateCatalog);
router.patch('/add', adminAuth, uploadCatalogMedia, addToList);
router.patch('/remove', adminAuth, removeFromList);
router.delete('/', adminAuth, deleteCatalog);

module.exports = router;
