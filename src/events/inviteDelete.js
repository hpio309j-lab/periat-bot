const { EmbedBuilder, Events } = require('discord.js');
const GuildConfig = require('../database/schemas/guildConfig');
const { handleInviteDelete } = require('../utils/inviteTracker');

module.exports = {
    name: Events.InviteDelete,
    once: false,
    async execute(invite, client) {
        try {
            const guildConfig = await GuildConfig.findOne({ guildId: invite.guild.id });
            
            if (!guildConfig || !guildConfig.inviteTracking.enabled) return;
            
            await handleInviteDelete(invite);
            
            const logChannel = invite.guild.channels.cache.find(
                channel => channel.name.includes('log') || channel.name.includes('invite')
            );
            
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('Invite Deleted')
                    .setDescription(`An invite has been deleted`)
                    .addFields(
                        { name: 'Code', value: invite.code, inline: true },
                        { name: 'Channel', value: `<#${invite.channel.id}>`, inline: true }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in inviteDelete event:', error);
        }
    },
}; 