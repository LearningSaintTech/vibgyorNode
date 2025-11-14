const Call = require('../userModel/callModel');
const Chat = require('../userModel/chatModel');
const User = require('../../auth/model/userAuthModel');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
const { v4: uuidv4 } = require('uuid');

/**
 * Enhanced Call Service with comprehensive error handling and edge cases
 */
class CallService {
  
  /**
   * Initiate a new call
   * @param {string} chatId - Chat ID
   * @param {string} initiatorId - Initiator user ID
   * @param {string} type - Call type (audio/video)
   * @returns {Promise<Object>} Call object
   */
  static async initiateCall(chatId, initiatorId, type = 'audio') {
    try {
      // Input validation
      if (!chatId || !initiatorId) {
        throw new Error('Chat ID and Initiator ID are required');
      }
      
      if (!['audio', 'video'].includes(type)) {
        throw new Error('Invalid call type. Must be audio or video');
      }
      
      // Validate chat exists and user is participant
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const isParticipant = chat.participants.some(p => p.toString() === initiatorId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      // Check if there's already an active call in this chat
      const existingCall = await Call.findActiveCall(chatId);
      console.log('[CallService] Checking for existing call in chat:', chatId);
      console.log('[CallService] Existing call found:', !!existingCall);
      if (existingCall) {
        console.log('[CallService] Existing call details:', {
          callId: existingCall.callId,
          status: existingCall.status,
          startedAt: existingCall.startedAt
        });
        
        // Check if the existing call is stale (older than 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (existingCall.startedAt < fiveMinutesAgo) {
          console.log('[CallService] Existing call is stale, cleaning up...');
          // Directly update the call status to ended (bypassing endCall method restrictions)
          await Call.findOneAndUpdate(
            { callId: existingCall.callId },
            {
              status: 'ended',
              endedAt: new Date(),
              endReason: 'timeout'
            }
          );
          console.log('[CallService] Stale call cleaned up successfully');
          // Continue to create new call
        } else {
          // Return the existing call instead of throwing an error
          return {
            callId: existingCall.callId,
            chatId: existingCall.chatId,
            type: existingCall.type,
            status: existingCall.status,
            initiator: existingCall.initiator,
            participants: existingCall.participants,
            otherParticipant: {
              id: existingCall.participants.find(p => p._id.toString() !== initiatorId.toString())?._id.toString(),
              username: existingCall.participants.find(p => p._id.toString() !== initiatorId.toString())?.username,
              fullName: existingCall.participants.find(p => p._id.toString() !== initiatorId.toString())?.fullName,
              profilePictureUrl: existingCall.participants.find(p => p._id.toString() !== initiatorId.toString())?.profilePictureUrl
            },
            isExistingCall: true
          };
        }
      }
      
      // Rate limiting check (5 calls per minute per user)
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentCalls = await Call.countDocuments({
        initiator: initiatorId,
        startedAt: { $gte: oneMinuteAgo }
      });
      
      if (recentCalls >= 5) {
        throw new Error('Rate limit exceeded. Please wait before initiating another call.');
      }
      
      // Generate unique call ID
      const callId = `call_${Date.now()}_${uuidv4().substring(0, 8)}`;
      
      // Find other participant
      const otherParticipant = chat.participants.find(p => p.toString() !== initiatorId.toString());
      if (!otherParticipant) {
        throw new Error('No other participant found in chat');
      }
      
      // Create call record
      const call = new Call({
        callId,
        chatId,
        initiator: initiatorId,
        participants: [initiatorId, otherParticipant],
        type,
        status: 'ringing',
        startedAt: new Date()
      });
      
      await call.save();
      console.log('[CallService] New call created:', {
        callId: call.callId,
        chatId: call.chatId,
        status: call.status,
        initiator: initiatorId
      });
      
      // Update chat with active call info
      await chat.setActiveCall({
        callId,
        type,
        status: 'ringing',
        startedAt: call.startedAt
      });
      
      // Populate call data for response
      await call.populate([
        { path: 'initiator', select: 'username fullName profilePictureUrl' },
        { path: 'participants', select: 'username fullName profilePictureUrl' }
      ]);
      
      return {
        callId: call.callId,
        chatId: call.chatId,
        type: call.type,
        status: call.status,
        startedAt: call.startedAt,
        initiator: call.initiator,
        participants: call.participants,
        otherParticipant: {
          id: otherParticipant.toString(),
          username: call.participants.find(p => p._id.toString() !== initiatorId.toString())?.username,
          fullName: call.participants.find(p => p._id.toString() !== initiatorId.toString())?.fullName,
          profilePictureUrl: call.participants.find(p => p._id.toString() !== initiatorId.toString())?.profilePictureUrl
        }
      };
      
    } catch (error) {
      console.error('[CallService] initiateCall error:', error);
      throw error;
    }
  }
  
  /**
   * Accept a call
   * @param {string} callId - Call ID
   * @param {string} userId - User ID accepting the call
   * @param {Object} signalingData - Optional signaling data
   * @returns {Promise<Object>} Call acceptance result
   */
  static async acceptCall(callId, userId, signalingData = {}) {
    try {
      // Input validation
      if (!callId || !userId) {
        throw new Error('Call ID and User ID are required');
      }
      
      // Find call
      const call = await Call.findOne({ callId }).populate('chatId');
      if (!call) {
        throw new Error('Call not found');
      }
      
      // Check if user is participant
      const isParticipant = call.participants.includes(userId);
      if (!isParticipant) {
        throw new Error('You are not a participant in this call');
      }
      
      // Check if user is not the initiator (can't accept own call)
      if (call.initiator.toString() === userId.toString()) {
        throw new Error('Cannot accept your own call');
      }
      
      // Check call status
      if (call.status !== 'ringing') {
        throw new Error(`Call is not in ringing state. Current status: ${call.status}`);
      }
      
      // Update call status
      await call.acceptCall(userId);
      
      // Update chat
      const chat = await Chat.findById(call.chatId);
      if (chat && chat.activeCall) {
        chat.activeCall.status = 'connected';
        await chat.save();
      }
      
      // Store signaling data if provided
      if (signalingData && signalingData.answer) {
        call.webrtcData.answer = {
          sdp: signalingData.answer.sdp,
          type: signalingData.answer.type
        };
        await call.save();
      }
      
      return {
        callId: call.callId,
        status: 'connected',
        signalingData: call.webrtcData,
        acceptedAt: call.answeredAt
      };
      
    } catch (error) {
      console.error('[CallService] acceptCall error:', error);
      throw error;
    }
  }
  
  /**
   * Reject a call
   * @param {string} callId - Call ID
   * @param {string} userId - User ID rejecting the call
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Call rejection result
   */
  static async rejectCall(callId, userId, reason = 'Call rejected') {
    try {
      // Input validation
      if (!callId || !userId) {
        throw new Error('Call ID and User ID are required');
      }
      
      // Find call
      const call = await Call.findOne({ callId }).populate('chatId');
      if (!call) {
        throw new Error('Call not found');
      }
      
      // Check if user is participant
      const isParticipant = call.participants.includes(userId);
      if (!isParticipant) {
        throw new Error('You are not a participant in this call');
      }
      
      // Check if user is not the initiator
      if (call.initiator.toString() === userId.toString()) {
        throw new Error('Cannot reject your own call');
      }
      
      // Update call status
      await call.rejectCall(reason);
      
      // Clear active call from chat
      const chat = await Chat.findById(call.chatId);
      if (chat && chat.activeCall) {
        chat.activeCall = null;
        await chat.save();
      }
      
      return {
        callId: call.callId,
        status: 'rejected',
        rejectedAt: call.endedAt,
        reason: call.rejectionReason
      };
      
    } catch (error) {
      console.error('[CallService] rejectCall error:', error);
      throw error;
    }
  }
  
  /**
   * End a call
   * @param {string} callId - Call ID
   * @param {string} userId - User ID ending the call
   * @param {string} reason - End reason
   * @returns {Promise<Object>} Call end result
   */
  static async endCall(callId, userId, reason = 'user_ended') {
    try {
      // Input validation
      if (!callId || !userId) {
        throw new Error('Call ID and User ID are required');
      }
      
      // Find call
      const call = await Call.findOne({ callId }).populate('chatId');
      if (!call) {
        throw new Error('Call not found');
      }
      
      // Check if user is participant
      const isParticipant = call.participants.includes(userId);
      if (!isParticipant) {
        throw new Error('You are not a participant in this call');
      }
      
      // Update call status
      await call.endCall(reason, userId);
      
      // Clear active call from chat
      const chat = await Chat.findById(call.chatId);
      if (chat && chat.activeCall) {
        chat.activeCall = null;
        await chat.save();
      }
      
      return {
        callId: call.callId,
        status: 'ended',
        endedAt: call.endedAt,
        duration: call.duration,
        endReason: call.endReason
      };
      
    } catch (error) {
      console.error('[CallService] endCall error:', error);
      throw error;
    }
  }
  
  /**
   * Get call status
   * @param {string} callId - Call ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Call status
   */
  static async getCallStatus(callId, userId) {
    try {
      // Input validation
      if (!callId || !userId) {
        throw new Error('Call ID and User ID are required');
      }
      
      // Find call
      const call = await Call.findOne({ callId })
        .populate('initiator', 'username fullName profilePictureUrl')
        .populate('participants', 'username fullName profilePictureUrl');
      
      if (!call) {
        throw new Error('Call not found');
      }
      
      // Check if user is participant
      const isParticipant = call.participants.some(p => p._id.toString() === userId);
      if (!isParticipant) {
        throw new Error('You are not a participant in this call');
      }
      
      return {
        callId: call.callId,
        type: call.type,
        status: call.status,
        duration: call.duration,
        startedAt: call.startedAt,
        answeredAt: call.answeredAt,
        endedAt: call.endedAt,
        initiator: call.initiator,
        participants: call.participants,
        settings: call.settings,
        webrtcData: call.webrtcData,
        quality: call.quality,
        endReason: call.endReason
      };
      
    } catch (error) {
      console.error('[CallService] getCallStatus error:', error);
      throw error;
    }
  }
  
  /**
   * Get call history for a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Call history
   */
  static async getCallHistory(chatId, userId, options = {}) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      const {
        page = 1,
        limit = 20,
        type = null,
        dateRange = null
      } = options;
      
      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        dateRange
      };
      
      const calls = await Call.findUserCalls(userId, {
        ...queryOptions,
        chatId: chatId
      });
      
      return {
        calls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: calls.length,
          hasMore: calls.length === parseInt(limit)
        }
      };
      
    } catch (error) {
      console.error('[CallService] getCallHistory error:', error);
      throw error;
    }
  }
  
  /**
   * Get user's call statistics
   * @param {string} userId - User ID
   * @param {Object} dateRange - Optional date range
   * @returns {Promise<Object>} Call statistics
   */
  static async getCallStats(userId, dateRange = null) {
    try {
      // Input validation
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const stats = await Call.getCallStats(userId, dateRange);
      
      return {
        totalCalls: stats.totalCalls || 0,
        audioCalls: stats.audioCalls || 0,
        videoCalls: stats.videoCalls || 0,
        connectedCalls: stats.connectedCalls || 0,
        missedCalls: stats.missedCalls || 0,
        rejectedCalls: stats.rejectedCalls || 0,
        totalDuration: stats.totalDuration || 0,
        averageDuration: stats.averageDuration || 0,
        totalInitiations: stats.totalInitiations || 0
      };
      
    } catch (error) {
      console.error('[CallService] getCallStats error:', error);
      throw error;
    }
  }
  
  /**
   * Update call settings
   * @param {string} callId - Call ID
   * @param {string} userId - User ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  static async updateCallSettings(callId, userId, settings) {
    try {
      // Input validation
      if (!callId || !userId) {
        throw new Error('Call ID and User ID are required');
      }
      
      // Find call
      const call = await Call.findOne({ callId });
      if (!call) {
        throw new Error('Call not found');
      }
      
      // Check if user is participant
      const isParticipant = call.participants.includes(userId);
      if (!isParticipant) {
        throw new Error('You are not a participant in this call');
      }
      
      // Update settings
      await call.updateSettings(settings);
      
      return {
        callId: call.callId,
        settings: call.settings
      };
      
    } catch (error) {
      console.error('[CallService] updateCallSettings error:', error);
      throw error;
    }
  }
  
  /**
   * Handle WebRTC signaling
   * @param {string} callId - Call ID
   * @param {string} userId - User ID
   * @param {Object} signalingData - Signaling data
   * @returns {Promise<Object>} Signaling result
   */
  static async handleSignaling(callId, userId, signalingData) {
    try {
      console.log(`[CALL_SERVICE] 🔄 Processing WebRTC signaling:`, {
        callId,
        userId,
        type: signalingData.type,
        timestamp: new Date().toISOString()
      });
      
      // Input validation
      if (!callId || !userId || !signalingData) {
        console.log(`[CALL_SERVICE] ❌ Validation failed: Missing required parameters`, {
          callId: !!callId,
          userId: !!userId,
          signalingData: !!signalingData
        });
        throw new Error('Call ID, User ID, and signaling data are required');
      }
      
      const { type, data } = signalingData;
      console.log(`[CALL_SERVICE] 📋 Signaling data received:`, {
        type,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        sdpLength: data?.sdp?.length || 0
      });
      
      if (!['offer', 'answer', 'ice-candidate'].includes(type)) {
        console.log(`[CALL_SERVICE] ❌ Invalid signaling type:`, { type });
        throw new Error('Invalid signaling type');
      }
      
      // Find call
      console.log(`[CALL_SERVICE] 🔍 Looking up call in database:`, { callId });
      const call = await Call.findOne({ callId });
      if (!call) {
        console.log(`[CALL_SERVICE] ❌ Call not found:`, { callId });
        throw new Error('Call not found');
      }
      
      console.log(`[CALL_SERVICE] ✅ Call found:`, {
        callId: call.callId,
        status: call.status,
        participants: call.participants.map(p => p.toString()),
        hasWebRTCData: !!call.webrtcData
      });
      
      // Check if user is participant
      const isParticipant = call.participants.includes(userId);
      console.log(`[CALL_SERVICE] 🔍 Checking participant status:`, {
        userId,
        isParticipant,
        allParticipants: call.participants.map(p => p.toString())
      });
      
      if (!isParticipant) {
        console.log(`[CALL_SERVICE] ❌ User is not a participant:`, { userId, callId });
        throw new Error('You are not a participant in this call');
      }
      
      console.log(`[CALL_SERVICE] ✅ User is authorized participant`);
      
      // Handle different signaling types
      console.log(`[CALL_SERVICE] 🔄 Processing ${type} signaling...`);
      switch (type) {
        case 'offer':
          console.log(`[CALL_SERVICE] 📤 Processing offer:`, {
            hasSDP: !!data.sdp,
            sdpLength: data.sdp?.length || 0,
            offerType: data.type,
            currentCallStatus: call.status
          });
          
          if (!data.sdp || !data.type) {
            console.log(`[CALL_SERVICE] ❌ Invalid offer data:`, { hasSDP: !!data.sdp, hasType: !!data.type });
            throw new Error('Invalid offer data');
          }
          
          if (!call.webrtcData) {
            console.log(`[CALL_SERVICE] 🔧 Initializing WebRTC data structure`);
            call.webrtcData = { iceCandidates: [] };
          }
          
          call.webrtcData.offer = {
            sdp: data.sdp,
            type: data.type
          };
          
          console.log(`[CALL_SERVICE] ✅ Offer stored in call data`);
          
          // Update call status to ringing
          if (call.status === 'initiating') {
            console.log(`[CALL_SERVICE] 🔄 Updating call status from ${call.status} to ringing`);
            call.status = 'ringing';
          } else {
            console.log(`[CALL_SERVICE] 📋 Call status remains: ${call.status}`);
          }
          break;
          
        case 'answer':
          console.log(`[CALL_SERVICE] 📥 Processing answer:`, {
            hasSDP: !!data.sdp,
            sdpLength: data.sdp?.length || 0,
            answerType: data.type,
            currentCallStatus: call.status
          });
          
          if (!data.sdp || !data.type) {
            console.log(`[CALL_SERVICE] ❌ Invalid answer data:`, { hasSDP: !!data.sdp, hasType: !!data.type });
            throw new Error('Invalid answer data');
          }
          
          if (!call.webrtcData) {
            console.log(`[CALL_SERVICE] 🔧 Initializing WebRTC data structure for answer`);
            call.webrtcData = { iceCandidates: [] };
          }
          
          call.webrtcData.answer = {
            sdp: data.sdp,
            type: data.type
          };
          
          console.log(`[CALL_SERVICE] ✅ Answer stored in call data`);
          break;
          
        case 'ice-candidate':
          console.log(`[CALL_SERVICE] 🧊 Processing ICE candidate:`, {
            hasCandidate: !!data.candidate,
            candidate: data.candidate?.substring(0, 50) + '...',
            sdpMLineIndex: data.sdpMLineIndex,
            sdpMid: data.sdpMid,
            currentCallStatus: call.status
          });
          
          if (!data.candidate) {
            console.log(`[CALL_SERVICE] ❌ Invalid ICE candidate data:`, { hasCandidate: !!data.candidate });
            throw new Error('Invalid ICE candidate data');
          }
          
          console.log(`[CALL_SERVICE] 🔄 Adding ICE candidate to call...`);
          await call.addIceCandidate(data);
          console.log(`[CALL_SERVICE] ✅ ICE candidate added successfully`);
          break;
          
        default:
          console.log(`[CALL_SERVICE] ❌ Invalid signaling type:`, { type });
          throw new Error('Invalid signaling type');
      }
      
      console.log(`[CALL_SERVICE] 💾 Saving call data to database...`);
      await call.save();
      console.log(`[CALL_SERVICE] ✅ Call data saved successfully`);
      
      const result = {
        callId: call.callId,
        type,
        processed: true
      };
      
      console.log(`[CALL_SERVICE] ✅ Signaling processing completed:`, result);
      return result;
      
    } catch (error) {
      console.error(`[CALL_SERVICE] ❌ handleSignaling error:`, {
        error: error.message,
        stack: error.stack,
        callId,
        userId,
        type: signalingData?.type,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  /**
   * Get active call for a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Active call info
   */
  static async getActiveCall(chatId, userId) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      // Find chat and validate access
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Check if user is participant
      const isParticipant = chat.participants.includes(userId);
      if (!isParticipant) {
        throw new Error('You are not a participant in this chat');
      }
      
      // Check for active call
      const activeCall = await Call.findActiveCall(chatId);
      if (!activeCall) {
        return { activeCall: null };
      }
      
      await activeCall.populate('initiator', 'username fullName profilePictureUrl');
      await activeCall.populate('participants', 'username fullName profilePictureUrl');
      
      return {
        activeCall: {
          callId: activeCall.callId,
          type: activeCall.type,
          status: activeCall.status,
          startedAt: activeCall.startedAt,
          initiator: activeCall.initiator,
          participants: activeCall.participants,
          settings: activeCall.settings
        }
      };
      
    } catch (error) {
      console.error('[CallService] getActiveCall error:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup stale calls
   * @param {number} maxAgeMinutes - Maximum age in minutes
   * @returns {Promise<number>} Number of cleaned calls
   */
  static async cleanupStaleCalls(maxAgeMinutes = 5) {
    try {
      return await Call.cleanupStaleCalls(maxAgeMinutes);
    } catch (error) {
      console.error('[CallService] cleanupStaleCalls error:', error);
      throw error;
    }
  }
  
  /**
   * Force cleanup all calls for a specific chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID requesting cleanup
   * @returns {Promise<Object>} Cleanup result
   */
  static async forceCleanupChatCalls(chatId, userId) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      // Find all calls for this chat
      const calls = await Call.find({
        chatId: chatId,
        status: { $in: ['initiating', 'ringing', 'connected'] }
      });
      
      // End all active calls
      for (const call of calls) {
        call.status = 'ended';
        call.endedAt = new Date();
        call.endReason = 'force_cleanup';
        await call.save();
      }
      
      // Clear chat's active call
      if (chat.activeCall) {
        chat.activeCall = null;
        await chat.save();
      }
      
      return {
        cleanedCalls: calls.length,
        chatId
      };
      
    } catch (error) {
      console.error('[CallService] forceCleanupChatCalls error:', error);
      throw error;
    }
  }
}

module.exports = CallService;
