const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    prefix: {
        type: String,
        default: '!'
    },
    // Economy settings
    economyChannelId: { type: String },
    gameChannelId: { type: String },
    economy: {
        startingBalance: { type: Number, default: 1000 },
        dailyAmount: { type: Number, default: 500 },
        maxLoan: { type: Number, default: 10000 },
        interestRate: { type: Number, default: 0.1 },
        protectionCost: { type: Number, default: 1000 },
        protectionDuration: { type: Number, default: 24 * 60 * 60 * 1000 }, // 24 hours
        robSuccess: { type: Number, default: 0.4 }, // 40% success rate
        maxRobAmount: { type: Number, default: 0.3 }, // 30% of victim's wallet
        jobPayments: {
            programmer: {
                min: { type: Number, default: 400 },
                max: { type: Number, default: 800 }
            },
            doctor: {
                min: { type: Number, default: 500 },
                max: { type: Number, default: 1000 }
            },
            teacher: {
                min: { type: Number, default: 300 },
                max: { type: Number, default: 600 }
            },
            police: {
                min: { type: Number, default: 350 },
                max: { type: Number, default: 700 }
            },
            chef: {
                min: { type: Number, default: 250 },
                max: { type: Number, default: 500 }
            },
            driver: {
                min: { type: Number, default: 200 },
                max: { type: Number, default: 400 }
            }
        }
    },
    items: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        description: { type: String, required: true },
        emoji: { type: String, required: true },
        type: { type: String, required: true, enum: ['collectible', 'usable', 'ring'] },
        effect: {
            type: { type: String, required: true },
            value: { type: Number, required: true }
        }
    }],
    // Cooldowns in milliseconds
    cooldowns: {
        work: { type: Number, default: 30 * 60 * 1000 }, // 30 minutes
        daily: { type: Number, default: 24 * 60 * 60 * 1000 }, // 24 hours
        crime: { type: Number, default: 60 * 60 * 1000 }, // 1 hour
        rob: { type: Number, default: 2 * 60 * 60 * 1000 } // 2 hours
    },
    // Welcome system
    welcome: {
        enabled: {
            type: Boolean,
            default: false
        },
        channelId: String,
        message: {
            type: String,
            default: 'Welcome {user} to {server}! You are member #{memberCount}.'
        },
        cardEnabled: {
            type: Boolean,
            default: false
        },
        cardBackground: {
            type: String,
            default: 'default' // URL or 'default'
        },
        cardTextColor: {
            type: String,
            default: '#ffffff'
        },
        dmEnabled: {
            type: Boolean,
            default: false
        },
        dmMessage: {
            type: String,
            default: 'Welcome to {server}! We hope you enjoy your stay.'
        },
        roleId: {
            type: String,
            default: null
        }
    },
    // Logging system
    logging: {
        messageLog: {
            enabled: {
                type: Boolean,
                default: false
            },
            channelId: String
        },
        memberLog: {
            enabled: {
                type: Boolean,
                default: false
            },
            channelId: String
        },
        voiceLog: {
            enabled: {
                type: Boolean,
                default: false
            },
            channelId: String
        },
        serverLog: {
            enabled: {
                type: Boolean,
                default: false
            },
            channelId: String
        }
    },
    // Moderation settings
    moderation: {
        logChannelId: String,
        muteRoleId: String,
        automod: {
            enabled: {
                type: Boolean,
                default: false
            },
            bannedWords: {
                type: [String],
                default: []
            },
            spamProtection: {
                type: Boolean,
                default: false
            },
            inviteProtection: {
                type: Boolean,
                default: false
            },
            mentionProtection: {
                type: Boolean,
                default: false
            },
            maxMentions: {
                type: Number,
                default: 5
            }
        }
    },
    // Invite tracking
    inviteTracking: {
        enabled: {
            type: Boolean,
            default: false
        },
        invites: {
            type: Map,
            of: {
                uses: Number,
                inviter: String,
                createdAt: Date
            },
            default: new Map()
        }
    },
    feedback: {
        enabled: {
            type: Boolean,
            default: false
        },
        channelId: String,
        dmReply: {
            type: Boolean,
            default: true
        },
        allowAnonymous: {
            type: Boolean,
            default: true
        },
        requireReason: {
            type: Boolean,
            default: false
        },
        cooldown: {
            type: Number,
            default: 24 * 60 * 60 * 1000
        },
        categories: {
            type: [String],
            default: ['General', 'Suggestion', 'Bug Report', 'Complaint']
        }
    }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
