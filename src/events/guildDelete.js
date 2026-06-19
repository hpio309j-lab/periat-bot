const { EmbedBuilder, Events } = require('discord.js');
const { handleGuildDelete } = require('../utils/inviteTracker');

module.exports = {
    name: Events.GuildDelete,
    once: false,
    async execute(guild, client) {
        try {
            console.log(`Left guild: ${guild.name} (${guild.id})`);
            
            await handleGuildDelete(guild);
            
            const ownerEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('Guild Left')
                .setDescription(`Left ${guild.name}`)
                .addFields(
                    { name: 'Guild ID', value: guild.id, inline: true },
                    { name: 'Members', value: guild.memberCount.toString(), inline: true }
                )
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setTimestamp();
            
            const owner = await client.users.fetch(process.env.OWNER_ID).catch(() => null);
            if (owner) {
                await owner.send({ embeds: [ownerEmbed] }).catch(() => null);
            }
        } catch (error) {
            console.error('Error in guildDelete event:', error);
        }
    },
}; 