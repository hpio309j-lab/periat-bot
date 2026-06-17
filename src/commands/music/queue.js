const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the current music queue')
        .addNumberOption(option => 
            option.setName('page')
                .setDescription('Page number of the queue')
                .setRequired(false)),
    
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
            
            // Get the tracks in the queue
            const queueTracks = queue.tracks.toArray();
            const currentTrack = queue.currentTrack;
            
            // Check if there is a current track
            if (!currentTrack) {
                return interaction.reply({
                    content: '❌ | There is no track currently playing!',
                    ephemeral: true
                });
            }
            
            // Calculate total queue time
            let totalDuration = 0;
            queueTracks.forEach(track => {
                if (track.duration) {
                    const parts = track.duration.split(':');
                    if (parts.length === 2) { // MM:SS format
                        totalDuration += parseInt(parts[0]) * 60 + parseInt(parts[1]);
                    } else if (parts.length === 3) { // HH:MM:SS format
                        totalDuration += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                    }
                }
            });
            
            // Add current track duration too
            if (currentTrack.duration) {
                const parts = currentTrack.duration.split(':');
                if (parts.length === 2) { // MM:SS format
                    totalDuration += parseInt(parts[0]) * 60 + parseInt(parts[1]);
                } else if (parts.length === 3) { // HH:MM:SS format
                    totalDuration += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                }
            }
            
            // Format total queue time
            const totalHours = Math.floor(totalDuration / 3600);
            const totalMinutes = Math.floor((totalDuration % 3600) / 60);
            const totalSeconds = totalDuration % 60;
            const formattedTotalTime = totalHours > 0 
                ? `${totalHours}h ${totalMinutes}m ${totalSeconds}s` 
                : `${totalMinutes}m ${totalSeconds}s`;
            
            // Set up pagination
            const tracksPerPage = 10;
            const totalPages = Math.ceil((queueTracks.length + 1) / tracksPerPage) || 1;
            const pageOption = interaction.options.getNumber('page');
            let currentPage = pageOption ? Math.min(Math.max(pageOption, 1), totalPages) : 1;
            
            // Create queue embed
            const queueEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🎵 Music Queue')
                .setDescription(`**Currently Playing:**\n` +
                               `**[${currentTrack.title}](${currentTrack.url})** - ${currentTrack.duration}\n` +
                               `Requested by: <@${currentTrack.requestedBy.id}>\n\n` +
                               `**Queue List:**` +
                               `${queueTracks.length === 0 ? '\nNo tracks in queue.' : ''}`)
                .setThumbnail(currentTrack.thumbnail || 'https://i.imgur.com/GGKye05.png')
                .setFooter({ text: `Page ${currentPage} of ${totalPages} • ${queueTracks.length} track(s) in queue • Total Queue Time: ${formattedTotalTime}` });
            
            // Add tracks for the current page
            const startIdx = (currentPage - 1) * tracksPerPage;
            const endIdx = Math.min(startIdx + tracksPerPage, queueTracks.length);
            
            // Start indexing from 1 since current track is displayed separately
            if (queueTracks.length > 0) {
                let tracksDescription = '';
                
                for (let i = startIdx; i < endIdx; i++) {
                    const track = queueTracks[i];
                    tracksDescription += `**${i + 1}.** [${track.title}](${track.url}) - ${track.duration}\n`;
                    tracksDescription += `Requested by: <@${track.requestedBy.id}>\n\n`;
                }
                
                queueEmbed.addFields({ name: 'Queue Tracks', value: tracksDescription });
            }
            
            // Add queue stats
            queueEmbed.addFields(
                { name: 'Volume', value: `${queue.node.volume}%`, inline: true },
                { name: 'Loop Mode', value: queue.repeatMode ? (queue.repeatMode === 2 ? 'Queue' : 'Track') : 'Off', inline: true },
                { name: 'Autoplay', value: queue.autoplay ? 'On' : 'Off', inline: true }
            );
            
            // Create pagination buttons if needed
            const buttons = [];
            
            if (totalPages > 1) {
                // First page button
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('queue_first')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1)
                );
                
                // Previous page button
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('queue_prev')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1)
                );
                
                // Page display button (non-functional, just for display)
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('queue_page')
                        .setLabel(`${currentPage}/${totalPages}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
                
                // Next page button
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('queue_next')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );
                
                // Last page button
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('queue_last')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );
            }
            
            // Add music control buttons
            const controlButtons = [
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji('🔀')
                    .setLabel('Shuffle')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setEmoji('🔁')
                    .setLabel(queue.repeatMode ? (queue.repeatMode === 2 ? 'Loop: Queue' : 'Loop: Track') : 'Loop: Off')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_clear')
                    .setEmoji('🗑️')
                    .setLabel('Clear Queue')
                    .setStyle(ButtonStyle.Danger)
            ];
            
            // Create button rows
            const components = [];
            
            // Add pagination row if needed
            if (buttons.length > 0) {
                components.push(new ActionRowBuilder().addComponents(buttons));
            }
            
            // Add control buttons row
            components.push(new ActionRowBuilder().addComponents(controlButtons));
            
            // Send the reply with pagination and control buttons
            return interaction.reply({
                embeds: [queueEmbed],
                components: components
            });
            
        } catch (error) {
            console.error('Error displaying queue:', error);
            
            return interaction.reply({
                content: `❌ | An error occurred while displaying the queue: ${error.message}`,
                ephemeral: true
            });
        }
    }
}; 