const { EmbedBuilder } = require('discord.js');
const AthkarSchedule = require('../database/schemas/athkarSchedule');
const { athkarData, athkarImages } = require('../commands/public/athkar');

class AthkarScheduler {
    constructor(client) {
        this.client = client;
        this.checkInterval = 60000; // Check every minute
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.check();
        console.log('🕌 Athkar scheduler started');
    }

    stop() {
        this.isRunning = false;
        console.log('🕌 Athkar scheduler stopped');
    }

    async check() {
        if (!this.isRunning) return;

        try {
            // Find all enabled schedules
            const schedules = await AthkarSchedule.find({ isEnabled: true });

            for (const schedule of schedules) {
                const now = new Date();
                const timeSinceLastSend = now - schedule.lastSent;

                // Check if it's time to send
                if (timeSinceLastSend >= schedule.interval) {
                    await this.sendAthkar(schedule);
                }
            }
        } catch (error) {
            console.error('Error in athkar scheduler:', error);
        }

        // Schedule next check
        setTimeout(() => this.check(), this.checkInterval);
    }

    async sendAthkar(schedule) {
        try {
            const channel = await this.client.channels.fetch(schedule.channelId);
            if (!channel) return;

            // Get next category in sequence or first if not set
            if (!schedule.lastCategory) {
                schedule.lastCategory = schedule.categories[0];
            } else {
                const currentIndex = schedule.categories.indexOf(schedule.lastCategory);
                schedule.lastCategory = schedule.categories[(currentIndex + 1) % schedule.categories.length];
            }

            const category = schedule.lastCategory;
            const categoryData = athkarData[category];

            // Get random thikr from category
            const thikr = categoryData.list[Math.floor(Math.random() * categoryData.list.length)];

            // Get random image for the category
            const randomImage = athkarImages[category][Math.floor(Math.random() * athkarImages[category].length)];

            const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle(categoryData.name)
                .setDescription(thikr)
                .setImage(randomImage)
                .setFooter({ text: 'اذكر الله يذكرك' })
                .setTimestamp();

            const message = await channel.send({ embeds: [embed] });
            // Add heart reaction
            await message.react('❤️');

            // Update last sent time
            schedule.lastSent = new Date();
            await schedule.save();
        } catch (error) {
            console.error('Error sending scheduled athkar:', error);
        }
    }
}

module.exports = AthkarScheduler;
