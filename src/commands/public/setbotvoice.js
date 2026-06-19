const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    VoiceChannel,
    joinVoiceChannel,
    getVoiceConnection
} = require('discord.js');
const { 
    joinVoiceChannel: joinVoice, 
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    getVoiceConnection: getVoice,
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setbotvoice')
        .setDescription('Set the bot to join a voice channel')
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Make the bot join a voice channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The voice channel to join')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Make the bot leave the current voice channel'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'join') {
            await handleJoinCommand(interaction, client);
        } else if (subcommand === 'leave') {
            await handleLeaveCommand(interaction, client);
        }
    }
};

async function handleJoinCommand(interaction, client) {
    try {
        const channel = interaction.options.getChannel('channel');
        
        // Check if channel is a voice channel
        if (channel.type !== ChannelType.GuildVoice) {
            return interaction.reply({
                content: 'Please select a valid voice channel.',
                ephemeral: true
            });
        }
        
        // Leave any existing voice connection
        const existingConnection = getVoice(interaction.guild.id);
        if (existingConnection) {
            existingConnection.destroy();
        }
        
        // Join the voice channel
        const connection = joinVoice({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true
        });
        
        // Create a silent audio player to keep the bot in the channel
        const player = createAudioPlayer();
        connection.subscribe(player);
        
        // Handle connection errors
        connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            try {
                // Try to reconnect if disconnected
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Connection is reconnecting
            } catch (error) {
                // Connection failed to reconnect, destroy it
                connection.destroy();
            }
        });
        
        // Send success message
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🎙️ Voice Channel Joined')
            .setDescription(`Successfully joined the voice channel: **${channel.name}**`)
            .setTimestamp();
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error joining voice channel:', error);
        
        await interaction.reply({
            content: 'There was an error joining the voice channel.',
            ephemeral: true
        });
    }
}

async function handleLeaveCommand(interaction, client) {
    try {
        // Get the current voice connection
        const connection = getVoice(interaction.guild.id);
        
        if (!connection) {
            return interaction.reply({
                content: 'I am not in a voice channel.',
                ephemeral: true
            });
        }
        
        // Destroy the connection
        connection.destroy();
        
        // Send success message
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🎙️ Voice Channel Left')
            .setDescription('Successfully left the voice channel.')
            .setTimestamp();
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error leaving voice channel:', error);
        
        await interaction.reply({
            content: 'There was an error leaving the voice channel.',
            ephemeral: true
        });
    }
} 