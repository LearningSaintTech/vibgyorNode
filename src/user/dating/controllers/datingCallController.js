const DatingCallService = require('../services/datingCallService');
const { createResponse, createErrorResponse } = require('../../../utils/apiResponse');
const DatingCall = require('../models/datingCallModel');
const User = require('../../auth/model/userAuthModel');

/**
 * Enhanced Dating Call Controller with comprehensive error handling
 */
class DatingCallController {
  
  /**
   * Initiate a new call
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async initiateCall(req, res) {
    try {
      const { chatId, type = 'audio' } = req.body;
      const userId = req.user.userId;
      
      console.log(`[DATING_CALL_CONTROLLER] 📞 Call initiation request received:`, {
        chatId,
        type,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Input validation
      if (!chatId) {
        console.log(`[DATING_CALL_CONTROLLER] ❌ Validation failed: Chat ID is required`);
        return res.status(400).json(createErrorResponse('Chat ID is required'));
      }
      
      if (!['audio', 'video'].includes(type)) {
        console.log(`[DATING_CALL_CONTROLLER] ❌ Validation failed: Invalid call type`, { type });
        return res.status(400).json(createErrorResponse('Invalid call type. Must be audio or video'));
      }
      
      console.log(`[DATING_CALL_CONTROLLER] ✅ Input validation passed`);
      console.log(`[DATING_CALL_CONTROLLER] 🔄 Processing call initiation via DatingCallService...`);
      
      const call = await DatingCallService.initiateCall(chatId, userId, type);
      console.log(`[DATING_CALL_CONTROLLER] ✅ Call service processing completed:`, { 
        callId: call.callId, 
        isExistingCall: call.isExistingCall,
        otherParticipant: call.otherParticipant,
        callStatus: call.status
      });
      
      // Emit WebSocket event to notify other participant (for both new and existing calls)
      console.log('[DatingCallController] Emitting WebSocket event for call:', call.isExistingCall ? 'existing' : 'new');
      const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
      console.log('[DatingCallController] WebSocket service available:', !!enhancedRealtimeService.io);
      const otherParticipant = call.otherParticipant;
      console.log('[DatingCallController] Other participant:', otherParticipant);
        
        // Emit incoming call event to the other participant
        const callEventData = {
          callId: call.callId,
          chatId: call.chatId,
          type: call.type,
          otherUser: {
            _id: call.initiator._id,
            username: call.initiator.username,
            fullName: call.initiator.fullName,
            profilePictureUrl: call.initiator.profilePictureUrl
          },
          timestamp: new Date()
        };
        
        console.log('[DatingCallController] Emitting dating:call:incoming event to user:', otherParticipant.id);
        console.log('[DatingCallController] Event data:', callEventData);
        
        enhancedRealtimeService.io.to(`user:${otherParticipant.id}`).emit('dating:call:incoming', callEventData);
        
        // Store the call in active calls (for both new and existing calls)
        enhancedRealtimeService.activeCalls.set(call.callId, {
          callId: call.callId,
          chatId: call.chatId,
          initiator: call.initiator._id,
          participants: [call.initiator._id, otherParticipant.id],
          type: call.type,
          status: call.status,
          startedAt: call.startedAt
        });
        
        console.log(`[DatingCallController] Call ${call.callId} initiated and WebSocket event emitted to user ${otherParticipant.id}`);
      
      if (call.isExistingCall) {
        res.status(200).json(createResponse(
          'Joined existing call',
          { call },
          { callId: call.callId, chatId }
        ));
      } else {
        res.status(201).json(createResponse(
          'Call initiated successfully',
          { call },
          { callId: call.callId, chatId }
        ));
      }
      
    } catch (error) {
      console.error('[DatingCallController] initiateCall error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('active call')) {
        statusCode = 400;
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Accept a call
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async acceptCall(req, res) {
    try {
      const { callId } = req.params;
      const { signalingData = {} } = req.body;
      const userId = req.user.userId;
      
      const result = await DatingCallService.acceptCall(callId, userId, signalingData);
      
      // Emit WebSocket event to notify the caller that their call was accepted
      const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
      const call = await DatingCall.findOne({ callId });
      
      if (call && call.initiator) {
        console.log('[DatingCallController] Emitting dating:call:accepted event to caller:', call.initiator.toString());
        
        // Get the other participant details
        const otherParticipantId = call.participants.find(p => p.toString() !== call.initiator.toString());
        const otherParticipant = await User.findById(otherParticipantId);
        
        enhancedRealtimeService.io.to(`user:${call.initiator.toString()}`).emit('dating:call:accepted', {
          callId: callId,
          status: 'connected',
          timestamp: new Date(),
          chatId: call.chatId.toString(),
          type: call.type,
          otherUser: otherParticipant ? {
            _id: otherParticipant._id,
            username: otherParticipant.username,
            fullName: otherParticipant.fullName,
            profilePictureUrl: otherParticipant.profilePictureUrl
          } : null
        });
      }
      
      res.status(200).json(createResponse(
        'Call accepted successfully',
        result,
        { callId }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] acceptCall error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Cannot accept your own') || error.message.includes('not in ringing state')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Reject a call
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async rejectCall(req, res) {
    try {
      const { callId } = req.params;
      const { reason = 'Call rejected' } = req.body;
      const userId = req.user.userId;
      
      const result = await DatingCallService.rejectCall(callId, userId, reason);
      
      // Emit WebSocket event to notify the caller that their call was rejected
      const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
      const call = await DatingCall.findOne({ callId });
      
      if (call && call.initiator) {
        console.log('[DatingCallController] Emitting dating:call:rejected event to caller:', call.initiator.toString());
        enhancedRealtimeService.io.to(`user:${call.initiator.toString()}`).emit('dating:call:rejected', {
          callId: callId,
          reason: reason,
          timestamp: new Date()
        });
      }
      
      res.status(200).json(createResponse(
        'Call rejected successfully',
        result,
        { callId }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] rejectCall error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Cannot reject your own') || error.message.includes('not in ringing state')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * End a call
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async endCall(req, res) {
    try {
      const { callId } = req.params;
      const { reason = 'user_ended' } = req.body;
      const userId = req.user.userId;
      
      const result = await DatingCallService.endCall(callId, userId, reason);
      
      // Emit WebSocket event to notify all participants that the call ended
      const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
      const call = await DatingCall.findOne({ callId });
      
      if (call && call.participants) {
        console.log('[DatingCallController] Emitting dating:call:ended event to all participants');
        call.participants.forEach(participantId => {
          enhancedRealtimeService.io.to(`user:${participantId.toString()}`).emit('dating:call:ended', {
            callId: callId,
            reason: reason,
            timestamp: new Date()
          });
        });
      }
      
      res.status(200).json(createResponse(
        'Call ended successfully',
        result,
        { callId }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] endCall error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('not in connected state')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get call status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getCallStatus(req, res) {
    try {
      const { callId } = req.params;
      const userId = req.user.userId;
      
      const callStatus = await DatingCallService.getCallStatus(callId, userId);
      
      res.status(200).json(createResponse(
        'Call status retrieved successfully',
        { call: callStatus },
        { callId }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] getCallStatus error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get call history for a chat
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getCallHistory(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const { 
        page = 1, 
        limit = 20, 
        type = null,
        startDate = null,
        endDate = null
      } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        type,
        dateRange: null
      };
      
      // Parse date range if provided
      if (startDate && endDate) {
        options.dateRange = {
          start: new Date(startDate),
          end: new Date(endDate)
        };
      }
      
      const result = await DatingCallService.getCallHistory(chatId, userId, options);
      
      res.status(200).json(createResponse(
        'Call history retrieved successfully',
        result,
        { chatId, pagination: result.pagination }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] getCallHistory error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get user's call statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getCallStats(req, res) {
    try {
      const userId = req.user.userId;
      const { startDate = null, endDate = null } = req.query;
      
      let dateRange = null;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate),
          end: new Date(endDate)
        };
      }
      
      const stats = await DatingCallService.getCallStats(userId, dateRange);
      
      res.status(200).json(createResponse(
        'Call statistics retrieved successfully',
        { stats },
        { userId }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] getCallStats error:', error);
      
      let statusCode = 500;
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Update call settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateCallSettings(req, res) {
    try {
      const { callId } = req.params;
      const { 
        isMuted, 
        isVideoEnabled, 
        isScreenSharing, 
        isSpeakerEnabled,
        audioInput,
        audioOutput,
        videoInput
      } = req.body;
      const userId = req.user.userId;
      
      // Validate at least one setting is provided
      const hasSettings = Object.values({
        isMuted, 
        isVideoEnabled, 
        isScreenSharing, 
        isSpeakerEnabled,
        audioInput,
        audioOutput,
        videoInput
      }).some(value => value !== undefined);
      
      if (!hasSettings) {
        return res.status(400).json(createErrorResponse('At least one setting must be provided'));
      }
      
      const settings = {};
      if (typeof isMuted === 'boolean') settings.isMuted = isMuted;
      if (typeof isVideoEnabled === 'boolean') settings.isVideoEnabled = isVideoEnabled;
      if (typeof isScreenSharing === 'boolean') settings.isScreenSharing = isScreenSharing;
      if (typeof isSpeakerEnabled === 'boolean') settings.isSpeakerEnabled = isSpeakerEnabled;
      if (audioInput) settings.audioInput = audioInput;
      if (audioOutput) settings.audioOutput = audioOutput;
      if (videoInput) settings.videoInput = videoInput;
      
      const result = await DatingCallService.updateCallSettings(callId, userId, settings);
      
      res.status(200).json(createResponse(
        'Call settings updated successfully',
        result,
        { callId }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] updateCallSettings error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Handle WebRTC signaling
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleSignaling(req, res) {
    try {
      const { callId } = req.params;
      const { type, data } = req.body;
      const userId = req.user.userId;
      
      console.log(`[DATING_CALL_CONTROLLER] 📡 WebRTC Signaling Request Received:`, {
        callId,
        type,
        userId,
        timestamp: new Date().toISOString(),
        dataSize: JSON.stringify(data).length,
        hasSDP: type === 'offer' || type === 'answer' ? !!data.sdp : false,
        hasCandidate: type === 'ice-candidate' ? !!data.candidate : false
      });
      
      // Input validation
      if (!type || !data) {
        console.log(`[DATING_CALL_CONTROLLER] ❌ Validation failed: Missing type or data`, { type: !!type, data: !!data });
        return res.status(400).json(createErrorResponse('Signaling type and data are required'));
      }
      
      if (!['offer', 'answer', 'ice-candidate'].includes(type)) {
        console.log(`[DATING_CALL_CONTROLLER] ❌ Validation failed: Invalid signaling type`, { type });
        return res.status(400).json(createErrorResponse('Invalid signaling type'));
      }
      
      console.log(`[DATING_CALL_CONTROLLER] ✅ Input validation passed for ${type}`);
      
      const signalingData = { type, data };
      console.log(`[DATING_CALL_CONTROLLER] 🔄 Processing signaling data via DatingCallService...`);
      const result = await DatingCallService.handleSignaling(callId, userId, signalingData);
      console.log(`[DATING_CALL_CONTROLLER] ✅ DatingCallService processing completed:`, result);
      
      // Emit WebSocket event to notify other participant
      const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
      console.log(`[DATING_CALL_CONTROLLER] 🔍 Checking Socket.IO availability:`, { 
        hasIO: !!enhancedRealtimeService.io,
        isConnected: enhancedRealtimeService.io?.engine?.clientsCount || 0
      });
      
      if (enhancedRealtimeService.io) {
        // Get the call to find the other participant
        console.log(`[DATING_CALL_CONTROLLER] 🔍 Looking up call in database:`, { callId });
        const call = await DatingCall.findOne({ callId });
        
        if (call) {
          console.log(`[DATING_CALL_CONTROLLER] ✅ Call found:`, {
            callId: call.callId,
            status: call.status,
            participants: call.participants.map(p => p.toString()),
            participantCount: call.participants.length
          });
          
          const otherParticipantId = call.participants.find(p => p.toString() !== userId);
          console.log(`[DATING_CALL_CONTROLLER] 🔍 Finding other participant:`, {
            userId,
            allParticipants: call.participants.map(p => p.toString()),
            otherParticipantId: otherParticipantId?.toString()
          });
          
          if (otherParticipantId) {
            const targetRoom = `user:${otherParticipantId}`;
            console.log(`[DATING_CALL_CONTROLLER] 📡 Emitting WebRTC signaling event:`, { 
              type, 
              callId, 
              targetUserId: otherParticipantId.toString(),
              targetRoom,
              from: userId,
              timestamp: new Date().toISOString()
            });
            
                  // Emit the appropriate WebRTC event using the enhanced logging method
                  if (type === 'offer') {
                    const offerData = {
                      callId,
                      offer: data,
                      from: userId,
                      timestamp: new Date()
                    };
                    console.log(`[DATING_CALL_CONTROLLER] 📤 Sending offer to ${targetRoom}:`, {
                      callId,
                      from: userId,
                      to: otherParticipantId.toString(),
                      sdpType: data.type,
                      sdpLength: data.sdp?.length || 0,
                      mLineCount: data.sdp ? (data.sdp.match(/^m=/gm) || []).length : 0
                    });
                    enhancedRealtimeService.emitWebRTCEvent('dating:webrtc:offer', targetRoom, offerData);
                  } else if (type === 'answer') {
                    const answerData = {
                      callId,
                      answer: data,
                      from: userId,
                      timestamp: new Date()
                    };
                    console.log(`[DATING_CALL_CONTROLLER] 📥 Sending answer to ${targetRoom}:`, {
                      callId,
                      from: userId,
                      to: otherParticipantId.toString(),
                      sdpType: data.type,
                      sdpLength: data.sdp?.length || 0,
                      mLineCount: data.sdp ? (data.sdp.match(/^m=/gm) || []).length : 0
                    });
                    enhancedRealtimeService.emitWebRTCEvent('dating:webrtc:answer', targetRoom, answerData);
                  } else if (type === 'ice-candidate') {
                    const candidateData = {
                      callId,
                      candidate: data,
                      from: userId,
                      timestamp: new Date()
                    };
                    console.log(`[DATING_CALL_CONTROLLER] 🧊 Sending ICE candidate to ${targetRoom}:`, {
                      callId,
                      from: userId,
                      to: otherParticipantId.toString(),
                      candidate: data.candidate?.substring(0, 50) + '...',
                      sdpMLineIndex: data.sdpMLineIndex,
                      sdpMid: data.sdpMid
                    });
                    enhancedRealtimeService.emitWebRTCEvent('dating:webrtc:ice-candidate', targetRoom, candidateData);
                  }
            
            console.log(`[DATING_CALL_CONTROLLER] ✅ WebRTC event emitted successfully to room: ${targetRoom}`);
          } else {
            console.log(`[DATING_CALL_CONTROLLER] ⚠️ No other participant found for call:`, { callId, userId });
          }
        } else {
          console.log(`[DATING_CALL_CONTROLLER] ❌ Call not found in database:`, { callId });
        }
      } else {
        console.log(`[DATING_CALL_CONTROLLER] ❌ Socket.IO not available - cannot emit WebRTC event`);
      }
      
      console.log(`[DATING_CALL_CONTROLLER] ✅ Signaling request completed successfully:`, { callId, type });
      res.status(200).json(createResponse(
        'Signaling handled successfully',
        result,
        { callId, type }
      ));
      
    } catch (error) {
      console.error(`[DATING_CALL_CONTROLLER] ❌ handleSignaling error:`, {
        error: error.message,
        stack: error.stack,
        callId: req.params.callId,
        type: req.body.type,
        userId: req.user?.userId,
        timestamp: new Date().toISOString()
      });
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get active call for a chat
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getActiveCall(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await DatingCallService.getActiveCall(chatId, userId);
      
      res.status(200).json(createResponse(
        'Active call status retrieved successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] getActiveCall error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Force cleanup calls for a chat
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async forceCleanupCalls(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await DatingCallService.forceCleanupChatCalls(chatId, userId);
      
      res.status(200).json(createResponse(
        'Calls cleanup completed successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      console.error('[DatingCallController] forceCleanupCalls error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
}

module.exports = DatingCallController;

