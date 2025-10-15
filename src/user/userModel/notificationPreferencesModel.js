const mongoose = require('mongoose');

const NotificationPreferencesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    
    // General Settings
    globalSettings: {
      enableNotifications: {
        type: Boolean,
        default: true
      },
      quietHours: {
        enabled: {
          type: Boolean,
          default: false
        },
        startTime: {
          type: String,
          default: '22:00' // 10 PM
        },
        endTime: {
          type: String,
          default: '08:00' // 8 AM
        },
        timezone: {
          type: String,
          default: 'UTC'
        }
      },
      frequency: {
        type: String,
        enum: ['immediate', 'hourly', 'daily', 'weekly'],
        default: 'immediate'
      }
    },
    
    // Channel Preferences
    channels: {
      inApp: {
        enabled: {
          type: Boolean,
          default: true
        },
        sound: {
          type: Boolean,
          default: true
        },
        vibration: {
          type: Boolean,
          default: true
        }
      },
      push: {
        enabled: {
          type: Boolean,
          default: true
        },
        sound: {
          type: Boolean,
          default: true
        },
        badge: {
          type: Boolean,
          default: true
        }
      },
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        frequency: {
          type: String,
          enum: ['immediate', 'daily', 'weekly'],
          default: 'daily'
        }
      },
      sms: {
        enabled: {
          type: Boolean,
          default: false
        },
        emergencyOnly: {
          type: Boolean,
          default: true
        }
      }
    },
    
    // Type-specific Preferences
    notificationTypes: {
      // Post notifications
      post_like: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      post_comment: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: false }
        }
      },
      post_share: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      post_mention: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true }
        }
      },
      
      // Story notifications
      story_view: {
        enabled: {
          type: Boolean,
          default: false
        },
        channels: {
          inApp: { type: Boolean, default: false },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      story_reaction: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      story_reply: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: false }
        }
      },
      story_mention: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true }
        }
      },
      
      // Follow notifications
      follow_request: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true }
        }
      },
      follow_accepted: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      follow: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      
      // Message notifications
      message_received: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: false }
        }
      },
      message_request: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true }
        }
      },
      
      // Call notifications
      call_incoming: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: false }
        }
      },
      call_missed: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true }
        }
      },
      call_ended: {
        enabled: {
          type: Boolean,
          default: false
        },
        channels: {
          inApp: { type: Boolean, default: false },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      
      // System notifications
      system_announcement: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true }
        }
      },
      content_moderation: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true }
        }
      },
      account_update: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true }
        }
      },
      
      // Highlight notifications
      highlight_added: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      highlight_view: {
        enabled: {
          type: Boolean,
          default: false
        },
        channels: {
          inApp: { type: Boolean, default: false },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      
      // Poll notifications
      poll_vote: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      poll_ended: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      },
      
      // Question notifications
      question_answer: {
        enabled: {
          type: Boolean,
          default: true
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: false }
        }
      }
    },
    
    // Advanced Settings
    advanced: {
      groupSimilar: {
        type: Boolean,
        default: true
      },
      maxNotificationsPerHour: {
        type: Number,
        default: 10,
        min: 1,
        max: 100
      },
      digestNotifications: {
        type: Boolean,
        default: false
      },
      digestFrequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly'],
        default: 'daily'
      }
    },
    
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
NotificationPreferencesSchema.index({ user: 1 });

// Methods
NotificationPreferencesSchema.methods.isNotificationEnabled = function(type, channel = 'inApp') {
  // Check global settings first
  if (!this.globalSettings.enableNotifications) {
    return false;
  }
  
  // Check quiet hours
  if (this.globalSettings.quietHours.enabled) {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
    const startTime = this.globalSettings.quietHours.startTime;
    const endTime = this.globalSettings.quietHours.endTime;
    
    if (this.isInQuietHours(currentTime, startTime, endTime)) {
      // Only allow urgent notifications during quiet hours
      return ['call_incoming', 'system_announcement'].includes(type);
    }
  }
  
  // Check channel settings
  if (!this.channels[channel]?.enabled) {
    return false;
  }
  
  // Check type-specific settings
  const typeSettings = this.notificationTypes[type];
  if (!typeSettings || !typeSettings.enabled) {
    return false;
  }
  
  // Check channel-specific settings for this type
  return typeSettings.channels[channel] || false;
};

NotificationPreferencesSchema.methods.isInQuietHours = function(currentTime, startTime, endTime) {
  const current = this.timeToMinutes(currentTime);
  const start = this.timeToMinutes(startTime);
  const end = this.timeToMinutes(endTime);
  
  if (start <= end) {
    // Same day quiet hours (e.g., 22:00 to 08:00)
    return current >= start || current <= end;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00)
    return current >= start || current <= end;
  }
};

NotificationPreferencesSchema.methods.timeToMinutes = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

NotificationPreferencesSchema.methods.updateTypePreference = function(type, settings) {
  if (!this.notificationTypes[type]) {
    this.notificationTypes[type] = {
      enabled: true,
      channels: {
        inApp: true,
        push: true,
        email: true
      }
    };
  }
  
  if (settings.enabled !== undefined) {
    this.notificationTypes[type].enabled = settings.enabled;
  }
  
  if (settings.channels) {
    Object.assign(this.notificationTypes[type].channels, settings.channels);
  }
  
  this.updatedAt = new Date();
  return this.save();
};

NotificationPreferencesSchema.methods.updateChannelPreference = function(channel, settings) {
  if (!this.channels[channel]) {
    this.channels[channel] = {
      enabled: true
    };
  }
  
  Object.assign(this.channels[channel], settings);
  this.updatedAt = new Date();
  return this.save();
};

NotificationPreferencesSchema.methods.updateGlobalSettings = function(settings) {
  Object.assign(this.globalSettings, settings);
  this.updatedAt = new Date();
  return this.save();
};

// Static methods
NotificationPreferencesSchema.statics.getUserPreferences = async function(userId) {
  let preferences = await this.findOne({ user: userId });
  
  if (!preferences) {
    // Create default preferences for new user
    preferences = new this({ user: userId });
    await preferences.save();
  }
  
  return preferences;
};

NotificationPreferencesSchema.statics.resetToDefaults = async function(userId) {
  return await this.findOneAndUpdate(
    { user: userId },
    { $unset: { notificationTypes: 1 } },
    { new: true, upsert: true }
  );
};

// Pre-save middleware
NotificationPreferencesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const NotificationPreferences = mongoose.models.NotificationPreferences || mongoose.model('NotificationPreferences', NotificationPreferencesSchema);

module.exports = NotificationPreferences;
