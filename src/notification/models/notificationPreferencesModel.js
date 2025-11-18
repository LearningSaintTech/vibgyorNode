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
    
    // Context-based settings
    contexts: {
      social: {
        enabled: {
          type: Boolean,
          default: true
        },
        types: {
          type: Map,
          of: {
            enabled: Boolean,
            channels: {
              inApp: Boolean,
              push: Boolean,
              email: Boolean,
              sms: Boolean
            }
          },
          default: {}
        }
      },
      dating: {
        enabled: {
          type: Boolean,
          default: true
        },
        types: {
          type: Map,
          of: {
            enabled: Boolean,
            channels: {
              inApp: Boolean,
              push: Boolean,
              email: Boolean,
              sms: Boolean
            }
          },
          default: {}
        }
      }
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
NotificationPreferencesSchema.methods.isNotificationEnabled = function(context, type, channel = 'inApp') {
  // Check global settings first
  if (!this.globalSettings.enableNotifications) {
    return false;
  }
  
  // Check context-specific settings
  const contextSettings = this.contexts[context];
  if (!contextSettings || !contextSettings.enabled) {
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
      const urgentTypes = ['call_incoming', 'system_announcement', 'match'];
      if (!urgentTypes.includes(type)) {
        return false;
      }
    }
  }
  
  // Check channel settings
  if (!this.channels[channel]?.enabled) {
    return false;
  }
  
  // Check type-specific settings in context
  const typeSettings = contextSettings.types.get(type);
  if (!typeSettings || !typeSettings.enabled) {
    // If type not configured, use default (enabled for inApp)
    return channel === 'inApp';
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

NotificationPreferencesSchema.methods.updateContextPreference = function(context, settings) {
  if (!this.contexts[context]) {
    this.contexts[context] = {
      enabled: true,
      types: new Map()
    };
  }
  
  if (settings.enabled !== undefined) {
    this.contexts[context].enabled = settings.enabled;
  }
  
  if (settings.types) {
    Object.keys(settings.types).forEach(type => {
      if (!this.contexts[context].types.has(type)) {
        this.contexts[context].types.set(type, {
          enabled: true,
          channels: {
            inApp: true,
            push: true,
            email: true,
            sms: false
          }
        });
      }
      
      const typeSettings = settings.types[type];
      const currentTypeSettings = this.contexts[context].types.get(type);
      
      if (typeSettings.enabled !== undefined) {
        currentTypeSettings.enabled = typeSettings.enabled;
      }
      
      if (typeSettings.channels) {
        Object.assign(currentTypeSettings.channels, typeSettings.channels);
      }
      
      this.contexts[context].types.set(type, currentTypeSettings);
    });
  }
  
  this.updatedAt = new Date();
  return this.save();
};

NotificationPreferencesSchema.methods.updateTypePreference = function(context, type, settings) {
  if (!this.contexts[context]) {
    this.contexts[context] = {
      enabled: true,
      types: new Map()
    };
  }
  
  if (!this.contexts[context].types.has(type)) {
    this.contexts[context].types.set(type, {
      enabled: true,
      channels: {
        inApp: true,
        push: true,
        email: true,
        sms: false
      }
    });
  }
  
  const typeSettings = this.contexts[context].types.get(type);
  
  if (settings.enabled !== undefined) {
    typeSettings.enabled = settings.enabled;
  }
  
  if (settings.channels) {
    Object.assign(typeSettings.channels, settings.channels);
  }
  
  this.contexts[context].types.set(type, typeSettings);
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
    { 
      $unset: { 
        'contexts.social.types': 1,
        'contexts.dating.types': 1
      } 
    },
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

