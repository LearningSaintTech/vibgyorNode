const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    issuedAt: {
        type: Date,
        required: true,
    },
    isValid: {
        type: Boolean,
        default: false
    },
    ipAddress: {
        type: String,
        default: ''
    },
    expiresAt: {
        type: Date,
        required: true,
    }

}, { timestamps: true });

// Create TTL index to delete documents after expiresAt
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);


