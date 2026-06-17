const { 
    SlashCommandBuilder, 
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip to the next song in the queue'),
    
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
            
            // Check if there's a queue and music is playing
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({
                    content: '❌ | There is nothing playing right now!',
                    ephemeral: true
                });
            }

            // Get the current track title before skipping
            const currentTrack = queue.currentTrack;
            
            // Skip the current track
            const success = queue.node.skip();
            
            // Create embed response
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('⏭️ Track Skipped')
                .setDescription(success 
                    ? `Skipped **${currentTrack.title}**` 
                    : 'Failed to skip the current track')
                .setTimestamp();
            
            // If this was the last track
            if (queue.tracks.data.length === 0 && !queue.currentTrack) {
                embed.setDescription(`Skipped **${currentTrack.title}**. The queue is now empty.`);
            }
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error skipping track:', error);
            return interaction.reply({
                content: `❌ | An error occurred while trying to skip the track: ${error.message}`,
                ephemeral: true
            });
        }
    }
}; 