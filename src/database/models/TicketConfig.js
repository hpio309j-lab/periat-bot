const mongoose = require('mongoose');

const ticketConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: false
    },
    supportRoleIds: {
        type: [String],
        default: []
    },
    logChannelId: {
        type: String
    },
    categoryId: {
        type: String
    },
    ticketCounter: {
        type: Number,
        default: 0
    },
    ticketTypes: {
        type: [{
            name: String,
            description: String,
            emoji: String
        }],
        default: [
            {
                name: 'General Support',
                description: 'Get help with general questions',
                emoji: '🔧'
            },
            {
                name: 'Technical Support',
                description: 'Get help with technical issues',
                emoji: '💻'
            },
            {
                name: 'Report User',
                description: 'Report a user breaking rules',
                emoji: '🛡️'
            }
        ]
    },
    welcomeMessage: {
        type: String,
        default: 'Thank you for creating a ticket! Support staff will be with you shortly.'
    },
    ticketNameFormat: {
        type: String,
        default: 'ticket-{username}-{id}'
    }
});

module.exports = mongoose.model('TicketConfig', ticketConfigSchema); 