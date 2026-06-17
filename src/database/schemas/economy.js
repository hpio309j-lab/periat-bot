const mongoose = require('mongoose');

const economySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    balance: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date },
    lastWork: { type: Date },
    lastRob: { type: Date },
    inventory: [{
        itemId: String,
        amount: Number
    }],
    transactions: [{
        type: { type: String, enum: ['deposit', 'withdraw', 'transfer', 'daily', 'work', 'rob'] },
        amount: Number,
        timestamp: { type: Date, default: Date.now },
        description: String
    }]
});

// Compound index for faster lookups
economySchema.index({ userId: 1, guildId: 1 });

module.exports = mongoose.model('Economy', economySchema);
