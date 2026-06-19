const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Name or URL of the song to play')
                .setRequired(true)),
    cooldown: 5,

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

            // Check permissions
            const permissions = voiceChannel.permissionsFor(interaction.client.user);
            if (!permissions.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
                return interaction.reply({
                    content: '❌ | I need permission to join and speak in your voice channel!',
                    ephemeral: true
                });
            }

            // Defer reply to give time for processing
            await interaction.deferReply();

            // Get and validate the search query
            console.log('Getting query from options:', interaction.options);
            const query = interaction.options.getString('url');
            console.log('Raw query value:', query);
            if (!query || query.trim().length === 0) {
                return interaction.editReply('❌ | Please provide a song name or URL to play!');
            }
            console.log('Query received:', query);

            try {
                // Check if player is initialized
                if (!global.player) {
                    console.error('Player not initialized');
                    return interaction.editReply('❌ | Music player is not initialized.');
                }

                // Get or create queue
                let queue = global.player.nodes.get(interaction.guildId);
                if (!queue) {
                    console.log('Creating new queue for guild');
                    queue = global.player.nodes.create(interaction.guild, {
                        metadata: interaction.channel,
                        selfDeaf: true,
                        volume: 80,
                        leaveOnEmpty: true,
                        leaveOnEnd: true
                    });
                }

                // Connect to voice channel
                if (!queue.connection) {
                    console.log('Connecting to voice channel');
                    await queue.connect(voiceChannel);
                }

                // Search for the track
                console.log('Searching with discord-player for:', query);
                
                let result = await global.player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.AUTO
                });

                if (!result || !result.tracks.length) {
                    return interaction.editReply('❌ | No results found! Try a different search.');
                }

                const track = result.tracks[0];
                console.log('Track found:', track.title);

                try {
                    // Add track to queue
                    await queue.addTrack(track);

                    // Start playing if not already
                    if (!queue.isPlaying()) {
                        await queue.node.play();
                    }

                    // Create an embed to show the track info
                    const embed = new EmbedBuilder()
                        .setColor('#3498db')
                        .setTitle('🎵 Added to Queue')
                        .setDescription(`**[${track.title}](${track.url})**`)
                        .setThumbnail(track.thumbnail)
                        .addFields(
                            { name: 'Duration', value: track.duration, inline: true },
                            { name: 'Requested By', value: `<@${track.requestedBy.id}>`, inline: true }
                        )
                        .setTimestamp();

                    // Send the embed
                    return interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error('Error in play command:', error);
                    return interaction.editReply(`❌ | Error: ${error.message}`);
                }
            } catch (error) {
                console.error('Error in play command:', error);
                return interaction.editReply(`❌ | Error: ${error.message}`);
            }
        } catch (error) {
            console.error('Error in play command:', error);
            if (interaction.deferred) {
                return interaction.editReply(`❌ | Error: ${error.message}`);
            }
            return interaction.reply({
                content: `❌ | Error: ${error.message}`,
                ephemeral: true
            });
        }
    },
};