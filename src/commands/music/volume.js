const { 
    SlashCommandBuilder, 
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the volume of the music player')
        .addIntegerOption(option => 
            option.setName('level')
                .setDescription('The volume level (0-100)')
                .setMinValue(0)
                .setMaxValue(100)
                .setRequired(true)),
    
    async execute(interaction, client) {
        try {
            // Check if user is in a voice channel
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: '❌ | You must be in a voice channel to adjust the volume!',
                    ephemeral: true
                });
            }
            
            // Check if player is initialized
            if (!global.player) {
                return interaction.reply({
                    content: '❌ | Music player is not properly initialized.',
                    ephemeral: true
                });
            }
            
            // Get the queue for this guild
            const player = global.player;
            const queue = player.nodes.get(interaction.guildId);
            
            // Check if there is an active queue
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({
                    content: '❌ | There is no music currently playing!',
                    ephemeral: true
                });
            }
            
            // Get the volume level from the command options
            const volumeLevel = interaction.options.getInteger('level');
            
            // Get current volume for comparison
            const currentVolume = queue.node.volume;
            
            // Set the volume
            queue.node.setVolume(volumeLevel);
            
            // Determine emoji based on volume level
            let volumeEmoji;
            if (volumeLevel === 0) {
                volumeEmoji = '🔇';
            } else if (volumeLevel < 30) {
                volumeEmoji = '🔈';
            } else if (volumeLevel < 70) {
                volumeEmoji = '🔉';
            } else {
                volumeEmoji = '🔊';
            }
            
            // Create embed for better visual feedback
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`${volumeEmoji} Volume Adjusted`)
                .setDescription(`Volume has been set to **${volumeLevel}%**`)
                .addFields(
                    { 
                        name: 'Previous Volume', 
                        value: `${currentVolume}%`, 
                        inline: true 
                    },
                    { 
                        name: 'New Volume', 
                        value: `${volumeLevel}%`, 
                        inline: true 
                    },
                    {
                        name: 'Change',
                        value: volumeLevel > currentVolume 
                            ? `+${volumeLevel - currentVolume}%` 
                            : `-${currentVolume - volumeLevel}%`,
                        inline: true
                    }
                )
                .setTimestamp();
            
            // Reply with the embed
            return interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error executing volume command:', error);
            
            return interaction.reply({
                content: `❌ | An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    }
}; 