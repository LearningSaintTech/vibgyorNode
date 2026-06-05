const mongoose = require('mongoose');
const { Schema } = mongoose;

// Enhanced Call Schema with comprehensive validation and edge cases
const callSchema = new Schema({
  // Core call properties
  callId: {
    type: String,
    unique: true,
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        return v && v.length >= 10 && v.length <= 50;
      },
      message: 'Call ID must be between 10 and 50 characters'
    }
  },
  
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  
  initiator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Call type and status
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['initiating', 'ringing', 'connected', 'ended', 'missed', 'rejected', 'failed', 'timeout'],
    default: 'initiating',
    index: true
  },
  
  // Call timing
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  answeredAt: {
    type: Date,
    default: null
  },
  
  endedAt: {
    type: Date,
    default: null
  },
  
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Call quality and statistics
  quality: {
    audio: {
      score: { type: Number, min: 0, max: 5 },
      bitrate: { type: Number, min: 0 },
      packetLoss: { type: Number, min: 0, max: 100 }
    },
    video: {
      score: { type: Number, min: 0, max: 5 },
      bitrate: { type: Number, min: 0 },
      resolution: { type: String },
      frameRate: { type: Number, min: 0 }
    }
  },
  
  // WebRTC signaling data
  webrtcData: {
    offer: {
      sdp: String,
      type: { type: String, enum: ['offer'] }
    },
    answer: {
      sdp: String,
      type: { type: String, enum: ['answer'] }
    },
    iceCandidates: [{
      candidate: String,
      sdpMLineIndex: Number,
      sdpMid: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  
  // Call settings
  settings: {
    isMuted: { type: Boolean, default: false },
    isVideoEnabled: { type: Boolean, default: true },
    isScreenSharing: { type: Boolean, default: false },
    isSpeakerEnabled: { type: Boolean, default: true },
    audioInput: String, // Device ID
    audioOutput: String, // Device ID
    videoInput: String  // Device ID
  },
  
  // Call end reasons
  endReason: {
    type: String,
    enum: [
      'user_ended',
      'user_rejected', 
      'network_error',
      'timeout',
      'device_error',
      'permission_denied',
      'user_busy',
      'user_offline',
      'system_error'
    ]
  },
  
  rejectionReason: String,
  
  // Call recording (optional feature)
  recording: {
    isRecording: {
      type: Boolean,
      default: false
    },
    recordingUrl: String,
    recordingDuration: Number,
    recordingSize: Number,
    startedAt: Date,
    endedAt: Date
  },
  
  // Network information
  networkInfo: {
    initiator: {
      connectionType: String,
      bandwidth: Number,
      latency: Number,
      iceConnectionState: String
    },
    participant: {
      connectionType: String,
      bandwidth: Number,
      latency: Number,
      iceConnectionState: String
    }
  },
  
  // Error tracking
  errors: [{
    type: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] }
  }],
  
  // Call metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for optimal performance
callSchema.index({ initiator: 1, status: 1 });
callSchema.index({ participants: 1, status: 1 });
callSchema.index({ startedAt: -1 });
callSchema.index({ type: 1, status: 1 });
callSchema.index({ chatId: 1, status: 1 });
callSchema.index({ 'webrtcData.offer.sdp': 1 });

// Pre-save middleware
callSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Validate participants
  if (this.participants.length !== 2) {
    return next(new Error('Call must have exactly 2 participants'));
  }
  
  // Ensure initiator is in participants
  if (!this.participants.some(p => p.toString() === this.initiator.toString())) {
    return next(new Error('Initiator must be a participant'));
  }
  
  // Calculate duration when call ends
  if (this.endedAt && this.startedAt && this.status === 'ended') {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  
  // Validate call timing
  if (this.endedAt && this.startedAt && this.endedAt < this.startedAt) {
    return next(new Error('End time cannot be before start time'));
  }
  
  next();
});

// Static methods
callSchema.statics.findActiveCall = async function(chatId) {
  try {
    return await this.findOne({
      chatId: chatId,
      status: { $in: ['initiating', 'ringing', 'connected'] }
    }).populate('initiator participants', 'username fullName profilePictureUrl');
  } catch (error) {
    throw new Error(`Failed to find active call: ${error.message}`);
  }
};

callSchema.statics.findUserCalls = async function(userId, options = {}) {
  try {
    const query = {
      $or: [
        { initiator: userId },
        { participants: userId }
      ]
    };
    
    if (options.status) {
      query.status = options.status;
    }
    
    if (options.type) {
      query.type = options.type;
    }
    
    if (options.dateRange) {
      query.startedAt = {
        $gte: options.dateRange.start,
        $lte: options.dateRange.end
      };
    }
    
    const calls = await this.find(query)
      .populate('initiator', 'username fullName profilePictureUrl')
      .populate('participants', 'username fullName profilePictureUrl')
      .populate('chatId', 'participants')
      .sort({ startedAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0);
    
    return calls;
  } catch (error) {
    throw new Error(`Failed to find user calls: ${error.message}`);
  }
};

callSchema.statics.getCallStats = async function(userId, dateRange = null) {
  try {
    const matchQuery = {
      $or: [
        { initiator: mongoose.Types.ObjectId(userId) },
        { participants: mongoose.Types.ObjectId(userId) }
      ]
    };
    
    if (dateRange) {
      matchQuery.startedAt = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }
    
    const stats = await this.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          audioCalls: {
            $sum: { $cond: [{ $eq: ['$type', 'audio'] }, 1, 0] }
          },
          videoCalls: {
            $sum: { $cond: [{ $eq: ['$type', 'video'] }, 1, 0] }
          },
          connectedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] }
          },
          missedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] }
          },
          rejectedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          totalDuration: {
            $sum: '$duration'
          },
          averageDuration: {
            $avg: '$duration'
          },
          totalInitiations: {
            $sum: { $cond: [{ $eq: ['$initiator', mongoose.Types.ObjectId(userId)] }, 1, 0] }
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalCalls: 0,
      audioCalls: 0,
      videoCalls: 0,
      connectedCalls: 0,
      missedCalls: 0,
      rejectedCalls: 0,
      totalDuration: 0,
      averageDuration: 0,
      totalInitiations: 0
    };
  } catch (error) {
    throw new Error(`Failed to get call stats: ${error.message}`);
  }
};

callSchema.statics.cleanupStaleCalls = async function(maxAgeMinutes = 5) {
  try {
    const staleThreshold = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    
    const staleCalls = await this.find({
      status: { $in: ['initiating', 'ringing'] },
      startedAt: { $lt: staleThreshold }
    });
    
    for (const call of staleCalls) {
      call.status = 'timeout';
      call.endedAt = new Date();
      call.endReason = 'timeout';
      await call.save();
    }
    
    return staleCalls.length;
  } catch (error) {
    throw new Error(`Failed to cleanup stale calls: ${error.message}`);
  }
};

// Instance methods
callSchema.methods.acceptCall = async function(acceptedBy) {
  try {
    if (this.status !== 'ringing') {
      throw new Error(`Cannot accept call in status: ${this.status}`);
    }
    
    this.status = 'connected';
    this.answeredAt = new Date();
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to accept call: ${error.message}`);
  }
};

callSchema.methods.rejectCall = async function(reason = 'Call rejected') {
  try {
    if (!['initiating', 'ringing'].includes(this.status)) {
      throw new Error(`Cannot reject call in status: ${this.status}`);
    }
    
    this.status = 'rejected';
    this.endedAt = new Date();
    this.endReason = 'user_rejected';
    this.rejectionReason = reason;
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to reject call: ${error.message}`);
  }
};

callSchema.methods.endCall = async function(endReason = 'user_ended', endedBy = null) {
  try {
    if (!['connected', 'ringing'].includes(this.status)) {
      throw new Error(`Cannot end call in status: ${this.status}`);
    }
    
    this.status = 'ended';
    this.endedAt = new Date();
    this.endReason = endReason;
    
    if (this.startedAt) {
      this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    }
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to end call: ${error.message}`);
  }
};

callSchema.methods.addIceCandidate = async function(candidateData) {
  try {
    if (!this.webrtcData) {
      this.webrtcData = { iceCandidates: [] };
    }
    
    this.webrtcData.iceCandidates.push({
      candidate: candidateData.candidate,
      sdpMLineIndex: candidateData.sdpMLineIndex,
      sdpMid: candidateData.sdpMid,
      timestamp: new Date()
    });
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to add ICE candidate: ${error.message}`);
  }
};

callSchema.methods.updateCallQuality = async function(qualityData) {
  try {
    if (!this.quality) {
      this.quality = {};
    }
    
    if (qualityData.audio) {
      this.quality.audio = { ...this.quality.audio, ...qualityData.audio };
    }
    
    if (qualityData.video && this.type === 'video') {
      this.quality.video = { ...this.quality.video, ...qualityData.video };
    }
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to update call quality: ${error.message}`);
  }
};

callSchema.methods.logError = async function(errorType, message, severity = 'medium') {
  try {
    if (!this.errors) {
      this.errors = [];
    }
    
    this.errors.push({
      type: errorType,
      message: message,
      severity: severity,
      timestamp: new Date()
    });
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to log error: ${error.message}`);
  }
};

callSchema.methods.updateSettings = async function(settings) {
  try {
    this.settings = { ...this.settings, ...settings };
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to update call settings: ${error.message}`);
  }
};

// Virtual fields
callSchema.virtual('calculatedDuration').get(function() {
  if (this.endedAt && this.startedAt) {
    return Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  return 0;
});

callSchema.virtual('isActive').get(function() {
  return ['initiating', 'ringing', 'connected'].includes(this.status);
});

callSchema.virtual('otherParticipant').get(function() {
  return this.participants.find(p => p._id.toString() !== this.initiator.toString());
});

// Export model
const Call = mongoose.model('Call', callSchema);

module.exports = Call;