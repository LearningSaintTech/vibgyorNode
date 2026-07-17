const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const {
	createBroadcast,
	listBroadcasts,
	getBroadcast,
	getDeliveryStatus,
} = require('./broadcast.controller');

const broadcastRoles = [Roles.ADMIN, Roles.SUBADMIN];

router.get('/broadcast/status', authorize(broadcastRoles), getDeliveryStatus);
router.get('/broadcast', authorize(broadcastRoles), listBroadcasts);
router.post('/broadcast', authorize(broadcastRoles), createBroadcast);
router.get('/broadcast/:broadcastId', authorize(broadcastRoles), getBroadcast);

module.exports = router;
