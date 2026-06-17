const mongoose = require('mongoose');

const autoRoleSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    autoRoleId: {
        type: String,
        default: null
    },
    roleButtons: [{
        roleId: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        emoji: {
            type: String,
            default: ''
        }
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

autoRoleSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('AutoRoleConfig', autoRoleSchema); 