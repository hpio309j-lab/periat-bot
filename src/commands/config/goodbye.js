const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('goodbye')
        .setDescription('Configure the goodbye system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable or disable the goodbye system')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether to enable the goodbye system')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the goodbye channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send goodbye messages to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('message')
                .setDescription('Set the goodbye message')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The goodbye message (use {user}, {username}, {server}, {memberCount})')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('card')
                .setDescription('Configure goodbye card settings')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether to enable goodbye cards')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('background')
                        .setDescription('URL for the background image (or "default")')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('text_color')
                        .setDescription('Text color in hex format (e.g. #ffffff)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test the goodbye message')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        
        try {
            let guildConfig = await GuildConfig.findOne({ guildId });
            
            if (!guildConfig) {
                guildConfig = new GuildConfig({ guildId });
            }
            
            if (!guildConfig.goodbye) {
                guildConfig.goodbye = {
                    enabled: false,
                    channelId: null,
                    message: 'Goodbye {user}! We will miss you.',
                    cardEnabled: false,
                    cardBackground: 'default',
                    cardTextColor: '#ffffff'
                };
            }
            
            switch (subcommand) {
                case 'enable':
                    await handleEnableSubcommand(interaction, guildConfig);
                    break;
                case 'channel':
                    await handleChannelSubcommand(interaction, guildConfig);
                    break;
                case 'message':
                    await handleMessageSubcommand(interaction, guildConfig);
                    break;
                case 'card':
                    await handleCardSubcommand(interaction, guildConfig);
                    break;
                case 'test':
                    await handleTestSubcommand(interaction, guildConfig);
                    break;
            }
        } catch (error) {
            console.error('Error in goodbye command:', error);
            await interaction.reply({
                content: 'An error occurred while configuring the goodbye system.',
                ephemeral: true
            });
        }
    }
};

async function handleEnableSubcommand(interaction, guildConfig) {
    const enabled = interaction.options.getBoolean('enabled');
    
    guildConfig.goodbye.enabled = enabled;
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor(enabled ? '#2ecc71' : '#e74c3c')
        .setTitle('Goodbye System Configuration')
        .setDescription(`The goodbye system has been ${enabled ? 'enabled' : 'disabled'}.`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleChannelSubcommand(interaction, guildConfig) {
    const channel = interaction.options.getChannel('channel');
    
    guildConfig.goodbye.channelId = channel.id;
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Goodbye System Configuration')
        .setDescription(`Goodbye channel set to ${channel}.`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleMessageSubcommand(interaction, guildConfig) {
    const message = interaction.options.getString('message');
    
    guildConfig.goodbye.message = message;
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Goodbye System Configuration')
        .setDescription('Goodbye message updated.')
        .addFields(
            { name: 'New Message', value: message },
            { name: 'Available Placeholders', value: '{user}, {username}, {server}, {memberCount}' }
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleCardSubcommand(interaction, guildConfig) {
    const enabled = interaction.options.getBoolean('enabled');
    const background = interaction.options.getString('background');
    const textColor = interaction.options.getString('text_color');
    
    guildConfig.goodbye.cardEnabled = enabled;
    
    if (background) {
        guildConfig.goodbye.cardBackground = background;
    }
    
    if (textColor) {
        guildConfig.goodbye.cardTextColor = textColor;
    }
    
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Goodbye System Configuration')
        .setDescription(`Goodbye cards have been ${enabled ? 'enabled' : 'disabled'}.`)
        .setTimestamp();
    
    if (background) {
        embed.addFields({ name: 'Background', value: background === 'default' ? 'Default gradient' : background });
    }
    
    if (textColor) {
        embed.addFields({ name: 'Text Color', value: textColor });
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function handleTestSubcommand(interaction, guildConfig) {
    await interaction.deferReply();
    
    const { sendGoodbyeMessage } = require('../../utils/welcomeUtils');
    
    try {
        await sendGoodbyeMessage(interaction.member, interaction.client);
        
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Goodbye Test')
            .setDescription('Goodbye message sent successfully!')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error testing goodbye message:', error);
        
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('Goodbye Test')
            .setDescription('Failed to send goodbye message. Make sure the goodbye system is properly configured.')
            .addFields({ name: 'Error', value: error.message })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
} 