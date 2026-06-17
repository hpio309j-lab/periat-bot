const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');

// Helper function to create a progress bar
function createProgressBar(current, total) {
    if (!current || !total) return '`[—————————]`';
    
    try {
        // Convert to milliseconds if they are provided as strings like "00:00"
        if (typeof current === 'string') {
            const currentParts = current.split(':').map(Number);
            current = (currentParts[0] * 60 + currentParts[1]) * 1000;
        }
        
        if (typeof total === 'string') {
            const totalParts = total.split(':').map(Number);
            total = (totalParts[0] * 60 + totalParts[1]) * 1000;
        }
        
        // Ensure we have valid numbers
        current = Number(current) || 0;
        total = Number(total) || 1; // Avoid division by zero
        
        const progress = Math.min(Math.max(current / total, 0), 1);
        const progressBars = Math.floor(progress * 10);
        
        let progressBar = '`[';
        
        for (let i = 0; i < 10; i++) {
            if (i < progressBars) {
                progressBar += '▬';
            } else if (i === progressBars) {
                progressBar += '🔘';
            } else {
                progressBar += '—';
            }
        }
        
        progressBar += ']`';
        
        return progressBar;
    } catch (error) {
        console.error('Error creating progress bar:', error);
        return '`[—————————]`';
    }
}

// Create a formatted time string from milliseconds
function formatTime(ms) {
    if (!ms) return '00:00';
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('View information about the currently playing song'),
    
    async execute(interaction, client) {
        try {
            // Check if user is in a voice channel
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: '❌ | You must be in a voice channel to use this command!',
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
            
            // Get the current track
            const currentTrack = queue.currentTrack;
            if (!currentTrack) {
                return interaction.reply({
                    content: '❌ | Could not retrieve the current track information.',
                    ephemeral: true
                });
            }
            
            // Calculate progress bar
            const progress = queue.node.getTimestamp();
            const progressBar = createProgressBar(progress.current, progress.total);
            
            // Get loop mode status
            let loopStatus = "Disabled";
            switch(queue.repeatMode) {
                case 0: loopStatus = "Disabled"; break;
                case 1: loopStatus = "Track"; break;
                case 2: loopStatus = "Queue"; break;
            }
            
            // Create embed for current track
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🎵 Now Playing')
                .setDescription(`**[${currentTrack.title}](${currentTrack.url})**`)
                .setThumbnail(currentTrack.thumbnail || 'https://i.imgur.com/GGKye05.png')
                .addFields(
                    { name: 'Progress', value: progressBar, inline: false },
                    { name: 'Duration', value: `\`${progress.current}\` / \`${currentTrack.duration}\``, inline: true },
                    { name: 'Author', value: currentTrack.author || 'Unknown', inline: true },
                    { name: 'Requested by', value: `<@${currentTrack.requestedBy.id}>`, inline: true },
                    { name: 'Volume', value: `${queue.node.volume}%`, inline: true },
                    { name: 'Queue Length', value: `${queue.tracks.size} song(s)`, inline: true },
                    { name: 'Loop Mode', value: loopStatus, inline: true }
                )
                .setTimestamp();
            
            // Create control buttons
            const controlRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setLabel(queue.node.isPaused() ? 'Resume' : 'Pause')
                        .setStyle(queue.node.isPaused() ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji(queue.node.isPaused() ? '▶️' : '⏸️'),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setLabel('Skip')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⏭️'),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setLabel('Stop')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏹️'),
                    new ButtonBuilder()
                        .setCustomId('music_volume_down')
                        .setLabel('-10%')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔉'),
                    new ButtonBuilder()
                        .setCustomId('music_volume_up')
                        .setLabel('+10%')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔊')
                );
            
            // Create advanced control buttons
            const advancedRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_shuffle')
                        .setLabel('Shuffle')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔀'),
                    new ButtonBuilder()
                        .setCustomId('music_loop')
                        .setLabel('Loop Mode')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔁'),
                    new ButtonBuilder()
                        .setCustomId('queue_page')
                        .setLabel('View Queue')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📜')
                );
            
            // Reply with the embed and buttons
            return interaction.reply({
                embeds: [embed],
                components: [controlRow, advancedRow]
            });
            
        } catch (error) {
            console.error('Error executing nowplaying command:', error);
            
            return interaction.reply({
                content: `❌ | An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
    
    // Export the helper functions so they can be used by other files
    createProgressBar,
    formatTime
}; 