const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    hostId: {
        type: String,
        required: true
    },
    prize: {
        type: String,
        required: true
    },
    winnerCount: {
        type: Number,
        required: true,
        min: 1
    },
    winners: {
        type: [String],
        default: []
    },
    endTime: {
        type: Date,
        required: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    ended: {
        type: Boolean,
        default: false
    },
    paused: {
        type: Boolean,
        default: false
    },
    pausedAt: {
        type: Date
    },
    requirements: {
        roles: {
            type: [String],
            default: []
        },
        minAccountAge: {
            type: Number,
            default: 0
        },
        minServerTime: {
            type: Number,
            default: 0
        }
    },
    bonusEntries: {
        type: [{
            roleId: String,
            multiplier: Number
        }],
        default: []
    },
    participants: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Giveaway', giveawaySchema); 