const { EmbedBuilder, Events } = require('discord.js');
const GuildConfig = require('../database/schemas/guildConfig');
const { handleGuildMemberRemove } = require('../utils/inviteTracker');
const { sendGoodbyeMessage } = require('../utils/welcomeUtils');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member, client) {
        try {
            await handleGuildMemberRemove(member, client);
            await sendGoodbyeMessage(member, client);
            
            const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
            
            if (!guildConfig) return;
            
            if (guildConfig.logging && guildConfig.logging.memberLog && guildConfig.logging.memberLog.enabled) {
                const logChannel = member.guild.channels.cache.get(guildConfig.logging.memberLog.channelId);
                
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('Member Left')
                        .setDescription(`${member.user.tag} left the server`)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: 'User ID', value: member.id, inline: true },
                            { name: 'Joined At', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                        )
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error in guildMemberRemove event:', error);
        }
    },
}; 