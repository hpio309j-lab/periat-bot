const { Events, ActivityType } = require('discord.js');
const { checkGiveaways } = require('../utils/giveawayManager');
const { setupAutoRoleSystem } = require('../utils/autoRoleUtils');
const { initializeInviteTracker } = require('../utils/inviteTracker');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        
        // Set bot activity
        client.user.setPresence({
            activities: [
                {
                    name: '/help | Serving your community',
                    type: ActivityType.Playing
                }
            ],
            status: 'online'
        });
        
        // Start giveaway check interval
        setInterval(() => checkGiveaways(client), 30000); // Check every 30 seconds
        
        // Initialize auto role system
        await setupAutoRoleSystem(client);
        
        await initializeInviteTracker(client);
        
        const guildCount = client.guilds.cache.size;
        const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        console.log(`Bot is ready and serving ${guildCount} servers with a total of ${memberCount} members.`);
    }
}; 