const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency'),
    
    async execute(interaction, client) {
        const sent = await interaction.deferReply({ ephemeral: false, fetchReply: true });
        
        const pingEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('Ping !')
            .addFields(
                { name: 'Bot Latency', value: `${sent.createdTimestamp - interaction.createdTimestamp}ms` },
                { name: 'API Latency', value: `${Math.round(client.ws.ping)}ms` }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [pingEmbed] });
    },
}; 