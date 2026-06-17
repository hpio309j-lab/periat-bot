const { 
    SlashCommandBuilder, 
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the current paused song'),
    
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
            if (!queue || !queue.node.isPlaying()) {
                return interaction.reply({
                    content: '❌ | There is nothing in the queue right now!',
                    ephemeral: true
                });
            }
            
            // Check if not paused
            if (!queue.node.isPaused()) {
                return interaction.reply({
                    content: '⚠️ | The music is already playing!',
                    ephemeral: true
                });
            }
            
            // Resume the queue
            const success = queue.node.resume();
            
            // Create embed response
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('▶️ Music Resumed')
                .setDescription(success 
                    ? `**${queue.currentTrack.title}** has been resumed!` 
                    : 'Failed to resume the track')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error resuming track:', error);
            return interaction.reply({
                content: `❌ | An error occurred while trying to resume the track: ${error.message}`,
                ephemeral: true
            });
        }
    }
}; 