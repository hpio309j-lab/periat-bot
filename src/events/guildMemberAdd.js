const { EmbedBuilder, AttachmentBuilder, Events } = require('discord.js');
const GuildConfig = require('../database/schemas/guildConfig');
const { assignAutoRole } = require('../utils/autoRoleUtils');
const { handleGuildMemberAdd } = require('../utils/inviteTracker');
const { sendWelcomeMessage } = require('../utils/welcomeUtils');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        try {
            const inviteData = await handleGuildMemberAdd(member, client);
            await sendWelcomeMessage(member, client);
            await assignAutoRole(member, client);
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
}; 