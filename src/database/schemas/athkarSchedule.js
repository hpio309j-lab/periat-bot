const mongoose = require('mongoose');

const athkarScheduleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    interval: { type: Number, required: true, default: 3600000 }, // Default: 1 hour in milliseconds
    categories: [{ type: String, enum: ['quran', 'hadith', 'dua', 'morning', 'evening', 'general', 'sleep'] }],
    lastSent: { type: Date, default: Date.now },
    lastCategory: { type: String, enum: ['quran', 'hadith', 'dua', 'morning', 'evening', 'general', 'sleep'] },
    isEnabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('AthkarSchedule', athkarScheduleSchema);
