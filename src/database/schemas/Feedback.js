const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    feedbackId: {
        type: String,
        required: true,
        unique: true
    },
    category: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    anonymous: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'implemented', 'rejected'],
        default: 'pending'
    },
    staffResponse: {
        type: String,
        default: ''
    },
    respondedBy: {
        type: String,
        default: null
    },
    respondedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

feedbackSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

feedbackSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema); 