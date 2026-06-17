const mongoose = require('mongoose');

const inviteTrackerSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    inviteCode: {
        type: String,
        required: true
    },
    inviterId: {
        type: String,
        required: true
    },
    uses: {
        type: Number,
        default: 0
    },
    maxUses: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null
    },
    isTemporary: {
        type: Boolean,
        default: false
    },
    invitedUsers: [{
        userId: String,
        joinedAt: {
            type: Date,
            default: Date.now
        },
        leftAt: Date,
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

inviteTrackerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

inviteTrackerSchema.index({ guildId: 1, inviteCode: 1 }, { unique: true });

module.exports = mongoose.model('InviteTracker', inviteTrackerSchema); 