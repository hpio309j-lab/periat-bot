const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    balance: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    job: { type: String, default: null },
    cooldowns: {
        work: { type: Number, default: 0 },
        daily: { type: Number, default: 0 },
        crime: { type: Number, default: 0 },
        rob: { type: Number, default: 0 },
        salary: { type: Number, default: 0 }
    },
    marriage: {
        partnerId: { type: String, default: null },
        since: { type: Date },
        ring: { type: String }
    },
    inventory: [{
        itemId: String,
        amount: Number
    }],
    protection: {
        active: { type: Boolean, default: false },
        expiresAt: { type: Date }
    },
    stats: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        crimesCommitted: { type: Number, default: 0 },
        robberies: { type: Number, default: 0 },
        totalSalary: { type: Number, default: 0 }
    },
    loan: {
        amount: { type: Number, default: 0 },
        dueDate: { type: Date },
        payments: [{
            amount: Number,
            date: Date
        }]
    }
}, { timestamps: true });

// Compound index for faster lookups
userProfileSchema.index({ userId: 1, guildId: 1 });

module.exports = mongoose.model('UserProfile', userProfileSchema);
