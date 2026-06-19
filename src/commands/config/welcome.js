const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure the welcome system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable or disable the welcome system')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether to enable the welcome system')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the welcome channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send welcome messages to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('message')
                .setDescription('Set the welcome message')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The welcome message (use {user}, {username}, {server}, {memberCount})')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('card')
                .setDescription('Configure welcome card settings')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether to enable welcome cards')
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
                .setName('dm')
                .setDescription('Configure welcome DM settings')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether to send welcome DMs')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The DM message (use {user}, {username}, {server}, {memberCount})')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Set a role to give to new members')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to give to new members')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test the welcome message')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        
        try {
            let guildConfig = await GuildConfig.findOne({ guildId });
            
            if (!guildConfig) {
                guildConfig = new GuildConfig({ guildId });
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
                case 'dm':
                    await handleDmSubcommand(interaction, guildConfig);
                    break;
                case 'role':
                    await handleRoleSubcommand(interaction, guildConfig);
                    break;
                case 'test':
                    await handleTestSubcommand(interaction, guildConfig);
                    break;
            }
        } catch (error) {
            console.error('Error in welcome command:', error);
            await interaction.reply({
                content: 'An error occurred while configuring the welcome system.',
                ephemeral: true
            });
        }
    }
};

async function handleEnableSubcommand(interaction, guildConfig) {
    const enabled = interaction.options.getBoolean('enabled');
    
    guildConfig.welcome.enabled = enabled;
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor(enabled ? '#2ecc71' : '#e74c3c')
        .setTitle('Welcome System Configuration')
        .setDescription(`The welcome system has been ${enabled ? 'enabled' : 'disabled'}.`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleChannelSubcommand(interaction, guildConfig) {
    const channel = interaction.options.getChannel('channel');
    
    guildConfig.welcome.channelId = channel.id;
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Welcome System Configuration')
        .setDescription(`Welcome channel set to ${channel}.`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleMessageSubcommand(interaction, guildConfig) {
    const message = interaction.options.getString('message');
    
    guildConfig.welcome.message = message;
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Welcome System Configuration')
        .setDescription('Welcome message updated.')
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
    
    guildConfig.welcome.cardEnabled = enabled;
    
    if (background) {
        guildConfig.welcome.cardBackground = background;
    }
    
    if (textColor) {
        guildConfig.welcome.cardTextColor = textColor;
    }
    
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Welcome System Configuration')
        .setDescription(`Welcome cards have been ${enabled ? 'enabled' : 'disabled'}.`)
        .setTimestamp();
    
    if (background) {
        embed.addFields({ name: 'Background', value: background === 'default' ? 'Default gradient' : background });
    }
    
    if (textColor) {
        embed.addFields({ name: 'Text Color', value: textColor });
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function handleDmSubcommand(interaction, guildConfig) {
    const enabled = interaction.options.getBoolean('enabled');
    const message = interaction.options.getString('message');
    
    guildConfig.welcome.dmEnabled = enabled;
    
    if (message) {
        guildConfig.welcome.dmMessage = message;
    }
    
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Welcome System Configuration')
        .setDescription(`Welcome DMs have been ${enabled ? 'enabled' : 'disabled'}.`)
        .setTimestamp();
    
    if (message) {
        embed.addFields(
            { name: 'DM Message', value: message },
            { name: 'Available Placeholders', value: '{user}, {username}, {server}, {memberCount}' }
        );
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function handleRoleSubcommand(interaction, guildConfig) {
    const role = interaction.options.getRole('role');
    
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: '❌ I cannot assign roles that are higher than or equal to my highest role.',
            ephemeral: true
        });
    }
    
    guildConfig.welcome.roleId = role.id;
    await guildConfig.save();
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Welcome System Configuration')
        .setDescription(`Welcome role set to ${role}.`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleTestSubcommand(interaction, guildConfig) {
    await interaction.deferReply();
    
    const { sendWelcomeMessage } = require('../../utils/welcomeUtils');
    
    try {
        await sendWelcomeMessage(interaction.member, interaction.client);
        
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Welcome Test')
            .setDescription('Welcome message sent successfully!')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error testing welcome message:', error);
        
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('Welcome Test')
            .setDescription('Failed to send welcome message. Make sure the welcome system is properly configured.')
            .addFields({ name: 'Error', value: error.message })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
} 