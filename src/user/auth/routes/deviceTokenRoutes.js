const express = require('express');
const router = express.Router();
const { authorize } = require('../../../middleware/authMiddleware');
const User = require('../model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');

/**
 * @route   POST /api/v1/user/device-token
 * @desc    Register device token for push notifications
 * @access  Private
 */
router.post('/', authorize, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, platform, deviceId, deviceName, appVersion } = req.body;

    if (!token || !platform) {
      return ApiResponse.badRequest(res, 'Token and platform are required');
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return ApiResponse.badRequest(res, 'Invalid platform. Must be ios, android, or web');
    }

    const user = await User.findById(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    await user.addDeviceToken(token, platform, {
      deviceId,
      deviceName,
      appVersion
    });

    return ApiResponse.success(res, {
      message: 'Device token registered successfully'
    }, 'Device token registered');
  } catch (error) {
    console.error('[DEVICE TOKEN] Error registering token:', error);
    return ApiResponse.serverError(res, 'Failed to register device token');
  }
});

/**
 * @route   DELETE /api/v1/user/device-token/:token
 * @desc    Remove device token
 * @access  Private
 */
router.delete('/:token', authorize, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    await user.removeDeviceToken(token);

    return ApiResponse.success(res, {
      message: 'Device token removed successfully'
    }, 'Device token removed');
  } catch (error) {
    console.error('[DEVICE TOKEN] Error removing token:', error);
    return ApiResponse.serverError(res, 'Failed to remove device token');
  }
});

/**
 * @route   GET /api/v1/user/device-tokens
 * @desc    Get user's device tokens
 * @access  Private
 */
router.get('/', authorize, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('deviceTokens');
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    return ApiResponse.success(res, {
      tokens: user.deviceTokens.filter(dt => dt.isActive)
    }, 'Device tokens retrieved');
  } catch (error) {
    console.error('[DEVICE TOKEN] Error getting tokens:', error);
    return ApiResponse.serverError(res, 'Failed to get device tokens');
  }
});

module.exports = router;

