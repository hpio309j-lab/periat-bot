const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    ticketId: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'Support'
    },
    status: {
        type: String,
        enum: ['open', 'pending', 'in-progress', 'on-hold', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    closedAt: {
        type: Date
    },
    closedBy: {
        type: String
    },
    claimedBy: {
        type: String
    },
    claimedAt: {
        type: Date
    },
    participants: {
        type: [String],
        default: []
    },
    transcriptUrl: {
        type: String
    },
    rating: {
        score: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String,
        ratedAt: Date
    },
    template: {
        type: String,
        ref: 'TicketTemplate'
    },
    lastResponseAt: {
        type: Date
    },
    responseTime: {
        type: Number // Time in milliseconds
    },
    tags: [String]
});

module.exports = mongoose.model('Ticket', ticketSchema); 