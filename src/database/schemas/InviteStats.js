const mongoose = require('mongoose');

const inviteStatsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true
    },
    invites: {
        total: {
            type: Number,
            default: 0
        },
        regular: {
            type: Number,
            default: 0
        },
        left: {
            type: Number,
            default: 0
        },
        fake: {
            type: Number,
            default: 0
        },
        bonus: {
            type: Number,
            default: 0
        }
    },
    invitedBy: {
        userId: {
            type: String,
            default: null
        },
        inviteCode: {
            type: String,
            default: null
        }
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

inviteStatsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

inviteStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('InviteStats', inviteStatsSchema); 