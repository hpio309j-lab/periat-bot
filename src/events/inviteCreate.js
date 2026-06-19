const { EmbedBuilder, Events } = require('discord.js');
const GuildConfig = require('../database/schemas/guildConfig');
const { handleInviteCreate } = require('../utils/inviteTracker');

module.exports = {
    name: Events.InviteCreate,
    once: false,
    async execute(invite, client) {
        try {
            const guildConfig = await GuildConfig.findOne({ guildId: invite.guild.id });
            
            if (!guildConfig || !guildConfig.inviteTracking.enabled) return;
            
            await handleInviteCreate(invite);
            
            const logChannel = invite.guild.channels.cache.find(
                channel => channel.name.includes('log') || channel.name.includes('invite')
            );
            
            if (logChannel) {
                const inviter = invite.inviter ? `${invite.inviter.tag} (${invite.inviter.id})` : 'Unknown';
                
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('Invite Created')
                    .setDescription(`A new invite has been created`)
                    .addFields(
                        { name: 'Code', value: invite.code, inline: true },
                        { name: 'Created By', value: inviter, inline: true },
                        { name: 'Channel', value: `<#${invite.channel.id}>`, inline: true },
                        { name: 'Max Uses', value: invite.maxUses ? invite.maxUses.toString() : 'Unlimited', inline: true },
                        { name: 'Expires', value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never', inline: true },
                        { name: 'Temporary', value: invite.temporary ? 'Yes' : 'No', inline: true }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in inviteCreate event:', error);
        }
    },
}; 