const mongoose = require('mongoose');

const ticketTemplateSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    questions: [{
        question: String,
        required: Boolean,
        type: {
            type: String,
            enum: ['text', 'number', 'boolean', 'select'],
            default: 'text'
        },
        options: [String] // For select type questions
    }],
    autoAssignRoles: [{
        type: String // Role IDs that should be automatically assigned
    }],
    defaultResponse: {
        type: String // Template response for support staff
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('TicketTemplate', ticketTemplateSchema);
