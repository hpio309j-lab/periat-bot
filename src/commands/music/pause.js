const { 
    SlashCommandBuilder, 
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    
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
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({
                    content: '❌ | There is nothing playing right now!',
                    ephemeral: true
                });
            }
            
            // Check if already paused
            if (queue.node.isPaused()) {
                return interaction.reply({
                    content: '⚠️ | The music is already paused!',
                    ephemeral: true
                });
            }
            
            // Pause the queue
            const success = queue.node.pause();
            
            // Create embed response
            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('⏸️ Music Paused')
                .setDescription(success 
                    ? `**${queue.currentTrack.title}** has been paused!` 
                    : 'Failed to pause the track')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error pausing track:', error);
            return interaction.reply({
                content: `❌ | An error occurred while trying to pause the track: ${error.message}`,
                ephemeral: true
            });
        }
    }
}; 