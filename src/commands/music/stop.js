const { 
    SlashCommandBuilder, 
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing music and clear the queue'),
    
    async execute(interaction, client) {
        // Check if user is in a voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ | You must be in a voice channel to use this command!',
                ephemeral: true
            });
        }

        try {
            // Use the global player instance
            const player = global.player;
            
            // Get the queue for this guild
            const queue = player.nodes.get(interaction.guildId);
            
            // Check if there's a queue
            if (!queue) {
                return interaction.reply({
                    content: '❌ | There is nothing playing right now!',
                    ephemeral: true
                });
            }

            // Stop the queue and destroy it
            queue.delete();
            
            // Create embed response
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🛑 Music Stopped')
                .setDescription('The music has been stopped and the queue has been cleared.')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error stopping playback:', error);
            return interaction.reply({
                content: `❌ | An error occurred while trying to stop the playback: ${error.message}`,
                ephemeral: true
            });
        }
    }
}; 