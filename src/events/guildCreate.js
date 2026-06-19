const { EmbedBuilder, Events } = require('discord.js');
const { handleGuildCreate } = require('../utils/inviteTracker');

module.exports = {
    name: Events.GuildCreate,
    once: false,
    async execute(guild, client) {
        try {
            console.log(`Joined new guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
            
            await handleGuildCreate(guild);
            
            const defaultChannel = guild.channels.cache.find(
                channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
            );
            
            if (defaultChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('Thank you for adding me!')
                    .setDescription('I am a multipurpose bot with moderation, economy, auto roles, invite tracking and more!')
                    .addFields(
                        { name: 'Getting Started', value: 'Use `/help` to see all available commands.' },
                        { name: 'Setup', value: 'Configure the bot using `/config` commands.' },
                        { name: 'Support', value: 'If you need help, join our support server or contact Periat.' }
                    )
                    .setTimestamp();
                
                await defaultChannel.send({ embeds: [embed] });
            }
            
            const ownerEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('New Guild Joined')
                .setDescription(`Joined ${guild.name}`)
                .addFields(
                    { name: 'Guild ID', value: guild.id, inline: true },
                    { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                    { name: 'Members', value: guild.memberCount.toString(), inline: true }
                )
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setTimestamp();
            
            const owner = await client.users.fetch(process.env.OWNER_ID).catch(() => null);
            if (owner) {
                await owner.send({ embeds: [ownerEmbed] }).catch(() => null);
            }
        } catch (error) {
            console.error('Error in guildCreate event:', error);
        }
    },
}; 