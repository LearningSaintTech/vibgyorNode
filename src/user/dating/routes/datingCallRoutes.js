const express = require('express');
const router = express.Router();
const DatingCallController = require('../controllers/datingCallController');
const { authorize } = require('../../../middleware/authMiddleware');
const { validateRequest } = require('../../../middleware/validationMiddleware');

/**
 * Enhanced Dating Call Routes with comprehensive middleware and validation
 */

// Apply authentication middleware to all routes
router.use(authorize());

/**
 * @route   POST /api/user/dating/calls
 * @desc    Initiate a new call
 * @access  Private
 * @body    { chatId: string, type: string }
 */
router.post('/',
  validateRequest({
    body: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 },
      type: { type: 'string', required: true, enum: ['audio', 'video'] }
    }
  }),
  DatingCallController.initiateCall
);

/**
 * @route   GET /api/user/dating/calls/stats
 * @desc    Get user's call statistics
 * @access  Private
 * @query   { startDate?: string, endDate?: string }
 */
router.get('/stats',
  validateRequest({
    query: {
      startDate: { type: 'string', optional: true, format: 'date' },
      endDate: { type: 'string', optional: true, format: 'date' }
    }
  }),
  DatingCallController.getCallStats
);

/**
 * @route   GET /api/user/dating/calls/:callId/status
 * @desc    Get call status
 * @access  Private
 * @params  { callId: string }
 */
router.get('/:callId/status',
  validateRequest({
    params: {
      callId: { type: 'string', required: true, minLength: 10, maxLength: 50 }
    }
  }),
  DatingCallController.getCallStatus
);

/**
 * @route   POST /api/user/dating/calls/:callId/accept
 * @desc    Accept a call
 * @access  Private
 * @params  { callId: string }
 * @body    { signalingData?: object }
 */
router.post('/:callId/accept',
  validateRequest({
    params: {
      callId: { type: 'string', required: true, minLength: 10, maxLength: 50 }
    },
    body: {
      signalingData: { type: 'object', optional: true }
    }
  }),
  DatingCallController.acceptCall
);

/**
 * @route   POST /api/user/dating/calls/:callId/reject
 * @desc    Reject a call
 * @access  Private
 * @params  { callId: string }
 * @body    { reason?: string }
 */
router.post('/:callId/reject',
  validateRequest({
    params: {
      callId: { type: 'string', required: true, minLength: 10, maxLength: 50 }
    },
    body: {
      reason: { type: 'string', optional: true, maxLength: 200 }
    }
  }),
  DatingCallController.rejectCall
);

/**
 * @route   POST /api/user/dating/calls/:callId/end
 * @desc    End a call
 * @access  Private
 * @params  { callId: string }
 * @body    { reason?: string }
 */
router.post('/:callId/end',
  validateRequest({
    params: {
      callId: { type: 'string', required: true, minLength: 10, maxLength: 50 }
    },
    body: {
      reason: { 
        type: 'string', 
        optional: true, 
        enum: ['user_ended', 'network_error', 'timeout', 'device_error', 'permission_denied', 'user_busy', 'user_offline', 'system_error']
      }
    }
  }),
  DatingCallController.endCall
);

/**
 * @route   PUT /api/user/dating/calls/:callId/settings
 * @desc    Update call settings
 * @access  Private
 * @params  { callId: string }
 * @body    { isMuted?: boolean, isVideoEnabled?: boolean, isScreenSharing?: boolean, isSpeakerEnabled?: boolean, audioInput?: string, audioOutput?: string, videoInput?: string }
 */
router.put('/:callId/settings',
  validateRequest({
    params: {
      callId: { type: 'string', required: true, minLength: 10, maxLength: 50 }
    },
    body: {
      isMuted: { type: 'boolean', optional: true },
      isVideoEnabled: { type: 'boolean', optional: true },
      isScreenSharing: { type: 'boolean', optional: true },
      isSpeakerEnabled: { type: 'boolean', optional: true },
      audioInput: { type: 'string', optional: true, maxLength: 100 },
      audioOutput: { type: 'string', optional: true, maxLength: 100 },
      videoInput: { type: 'string', optional: true, maxLength: 100 }
    }
  }),
  DatingCallController.updateCallSettings
);

/**
 * @route   POST /api/user/dating/calls/:callId/signaling
 * @desc    Handle WebRTC signaling
 * @access  Private
 * @params  { callId: string }
 * @body    { type: string, data: object }
 */
router.post('/:callId/signaling',
  validateRequest({
    params: {
      callId: { type: 'string', required: true, minLength: 10, maxLength: 50 }
    },
    body: {
      type: { type: 'string', required: true, enum: ['offer', 'answer', 'ice-candidate'] },
      data: { type: 'object', required: true }
    }
  }),
  DatingCallController.handleSignaling
);

/**
 * @route   GET /api/user/dating/calls/chat/:chatId/history
 * @desc    Get call history for a chat
 * @access  Private
 * @params  { chatId: string }
 * @query   { page: number, limit: number, type?: string, startDate?: string, endDate?: string }
 */
router.get('/chat/:chatId/history',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    },
    query: {
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 },
      type: { type: 'string', optional: true, enum: ['audio', 'video'] },
      startDate: { type: 'string', optional: true, format: 'date' },
      endDate: { type: 'string', optional: true, format: 'date' }
    }
  }),
  DatingCallController.getCallHistory
);

/**
 * @route   GET /api/user/dating/calls/chat/:chatId/active
 * @desc    Get active call for a chat
 * @access  Private
 * @params  { chatId: string }
 */
router.get('/chat/:chatId/active',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  DatingCallController.getActiveCall
);

/**
 * @route   POST /api/user/dating/calls/chat/:chatId/cleanup
 * @desc    Force cleanup calls for a chat
 * @access  Private
 * @params  { chatId: string }
 */
router.post('/chat/:chatId/cleanup',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  DatingCallController.forceCleanupCalls
);

module.exports = router;

