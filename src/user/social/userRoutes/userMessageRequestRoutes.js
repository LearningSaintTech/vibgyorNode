const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const {
	sendMessageRequest,
	getPendingRequests,
	getSentRequests,
	acceptMessageRequest,
	rejectMessageRequest,
	deleteMessageRequest,
	getMessageRequestDetails,
	getMessageRequestStats,
	getRequestBetweenUsers
} = require('../userController/messageRequestController');

// Message request routes (User only)
router.post('/:userId', authorize([Roles.USER]), sendMessageRequest);
router.get('/pending', authorize([Roles.USER]), getPendingRequests);
router.get('/sent', authorize([Roles.USER]), getSentRequests);
router.post('/:requestId/accept', authorize([Roles.USER]), acceptMessageRequest);
router.post('/:requestId/reject', authorize([Roles.USER]), rejectMessageRequest);
router.delete('/:requestId', authorize([Roles.USER]), deleteMessageRequest);
router.get('/:requestId', authorize([Roles.USER]), getMessageRequestDetails);
router.get('/stats', authorize([Roles.USER]), getMessageRequestStats);
router.get('/between/:userId', authorize([Roles.USER]), getRequestBetweenUsers);

module.exports = router;
