const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const {
	updateUserStatus,
	getUserStatus,
	getOnlineUsers,
	getRecentlyActiveUsers,
	getUserStatuses,
	updatePrivacySettings,
	getTypingUsers,
	getStatusStats
} = require('../userController/userStatusController');
const UserStatus = require('../userModel/userStatusModel');

// User status routes (User only)
router.put('/', authorize([Roles.USER]), updateUserStatus);
router.get('/online', authorize([Roles.USER]), (req, res, next) => {
  console.log('[ROUTE] /online endpoint called');
  console.log('[ROUTE] User:', req.user);
  next();
}, getOnlineUsers);
router.get('/recent', authorize([Roles.USER]), getRecentlyActiveUsers);
router.post('/batch', authorize([Roles.USER]), getUserStatuses);
router.put('/privacy', authorize([Roles.USER]), updatePrivacySettings);
router.get('/stats', authorize([Roles.USER]), getStatusStats);
router.get('/:userId', authorize([Roles.USER]), getUserStatus);

// Special endpoint for offline status (used by sendBeacon)
router.post('/offline', async (req, res) => {
  try {
    // Handle FormData, JSON, and string data from sendBeacon
    let token;
    
    if (req.body && req.body.token) {
      // FormData format
      token = req.body.token;
    } else if (req.body && typeof req.body === 'string') {
      // JSON string format
      try {
        const parsed = JSON.parse(req.body);
        token = parsed.token;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid request body format' });
      }
    } else if (req.body) {
      // JSON object format
      token = req.body.token;
    } else {
      // No body data
      token = null;
    }
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    console.log('[OFFLINE_ENDPOINT] Processing offline request for token:', token ? 'present' : 'missing');
    
    // Verify token and get user ID
    const jwt = require('../../utils/Jwt');
    const decoded = jwt.verifyAccessToken(token);
    console.log('[OFFLINE_ENDPOINT] Decoded user ID:', decoded.userId);
    
    // Update user status to offline
    const userStatus = await UserStatus.getOrCreateUserStatus(decoded.userId);
    await userStatus.setOffline();
    console.log('[OFFLINE_ENDPOINT] User status set to offline');
    
    // Get user details for broadcast
    const User = require('../userModel/userAuthModel');
    const user = await User.findById(decoded.userId);
    console.log('[OFFLINE_ENDPOINT] User details:', user ? user.username : 'not found');
    
    // Trigger WebSocket broadcast to notify all users
    const enhancedRealtimeService = require('../../services/enhancedRealtimeService');
    enhancedRealtimeService.broadcastUserOffline(decoded.userId, user);
    
    console.log('[OFFLINE_ENDPOINT] Offline status processed successfully');
    res.status(200).json({ success: true, message: 'User status updated to offline' });
  } catch (error) {
    console.error('Error setting user offline:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;