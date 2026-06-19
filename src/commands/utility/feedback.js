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
const Feedback = require('../../database/schemas/Feedback');
const { createFeedbackModal } = require('../../utils/feedbackUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Submit or manage server feedback')
        .addSubcommand(subcommand =>
            subcommand
                .setName('submit')
                .setDescription('Submit feedback to the server staff'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List your submitted feedback'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure the feedback system')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether to enable the feedback system')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send feedback to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('dm_reply')
                        .setDescription('Whether to DM users when their feedback gets a response')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('allow_anonymous')
                        .setDescription('Whether to allow anonymous feedback')
                        .setRequired(false))
                .addNumberOption(option =>
                    option.setName('cooldown')
                        .setDescription('Cooldown in hours between feedback submissions')
                        .setMinValue(0)
                        .setMaxValue(168)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Create a feedback submission panel')),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'submit':
                await handleSubmit(interaction, client);
                break;
            case 'list':
                await handleList(interaction, client);
                break;
            case 'config':
                await handleConfig(interaction, client);
                break;
            case 'panel':
                await handlePanel(interaction, client);
                break;
        }
    }
};

async function handleSubmit(interaction, client) {
    await createFeedbackModal(interaction, client);
}

async function handleList(interaction, client) {
    try {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        
        const feedbackList = await Feedback.find({ 
            guildId, 
            userId 
        }).sort({ createdAt: -1 }).limit(10);
        
        if (feedbackList.length === 0) {
            return interaction.reply({
                content: 'You have not submitted any feedback in this server.',
                ephemeral: true
            });
        }
        
        let description = '';
        
        for (const feedback of feedbackList) {
            const date = new Date(feedback.createdAt).toLocaleDateString();
            const status = feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1);
            
            description += `**ID:** ${feedback.feedbackId} | **Category:** ${feedback.category} | **Status:** ${status} | **Date:** ${date}\n`;
            
            if (feedback.staffResponse) {
                description += `**Response:** ${feedback.staffResponse.substring(0, 100)}${feedback.staffResponse.length > 100 ? '...' : ''}\n`;
            }
            
            description += '\n';
        }
        
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('Your Feedback Submissions')
            .setDescription(description)
            .setTimestamp();
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error listing feedback:', error);
        await interaction.reply({
            content: 'An error occurred while retrieving your feedback submissions.',
            ephemeral: true
        });
    }
}

async function handleConfig(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
            content: '❌ You need the Manage Server permission to configure the feedback system.',
            ephemeral: true
        });
    }
    
    const guildId = interaction.guild.id;
    const enabled = interaction.options.getBoolean('enabled');
    const channel = interaction.options.getChannel('channel');
    const dmReply = interaction.options.getBoolean('dm_reply');
    const allowAnonymous = interaction.options.getBoolean('allow_anonymous');
    const cooldown = interaction.options.getNumber('cooldown');
    
    try {
        let guildConfig = await GuildConfig.findOne({ guildId });
        
        if (!guildConfig) {
            guildConfig = new GuildConfig({ guildId });
        }
        
        if (!guildConfig.feedback) {
            guildConfig.feedback = {
                enabled: false,
                channelId: null,
                dmReply: true,
                allowAnonymous: true,
                cooldown: 24 * 60 * 60 * 1000,
                categories: ['General', 'Suggestion', 'Bug Report', 'Complaint']
            };
        }
        
        guildConfig.feedback.enabled = enabled;
        
        if (channel) {
            guildConfig.feedback.channelId = channel.id;
        }
        
        if (dmReply !== null) {
            guildConfig.feedback.dmReply = dmReply;
        }
        
        if (allowAnonymous !== null) {
            guildConfig.feedback.allowAnonymous = allowAnonymous;
        }
        
        if (cooldown !== null) {
            guildConfig.feedback.cooldown = cooldown * 60 * 60 * 1000; // Convert hours to milliseconds
        }
        
        await guildConfig.save();
        
        const embed = new EmbedBuilder()
            .setColor(enabled ? '#2ecc71' : '#e74c3c')
            .setTitle('Feedback System Configuration')
            .setDescription(`The feedback system has been ${enabled ? 'enabled' : 'disabled'}.`)
            .setTimestamp();
        
        if (channel) {
            embed.addFields({ name: 'Feedback Channel', value: channel.toString() });
        }
        
        if (dmReply !== null) {
            embed.addFields({ name: 'DM Replies', value: dmReply ? 'Enabled' : 'Disabled' });
        }
        
        if (allowAnonymous !== null) {
            embed.addFields({ name: 'Anonymous Feedback', value: allowAnonymous ? 'Allowed' : 'Not Allowed' });
        }
        
        if (cooldown !== null) {
            embed.addFields({ name: 'Cooldown', value: `${cooldown} hour(s)` });
        }
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error configuring feedback system:', error);
        await interaction.reply({
            content: 'An error occurred while configuring the feedback system.',
            ephemeral: true
        });
    }
}

async function handlePanel(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
            content: '❌ You need the Manage Server permission to create a feedback panel.',
            ephemeral: true
        });
    }
    
    const guildId = interaction.guild.id;
    
    try {
        const guildConfig = await GuildConfig.findOne({ guildId });
        
        if (!guildConfig || !guildConfig.feedback || !guildConfig.feedback.enabled) {
            return interaction.reply({
                content: '❌ The feedback system is not enabled in this server. Use `/feedback config` to enable it first.',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('Server Feedback')
            .setDescription('Click the button below to submit feedback to the server staff.')
            .addFields(
                { name: 'What is feedback?', value: 'Feedback can be suggestions, bug reports, complaints, or general comments about the server.' },
                { name: 'How does it work?', value: 'Click the button below, select a category, and submit your feedback. Staff will review it and may respond.' }
            )
            .setTimestamp();
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('feedback')
                .setLabel('Submit Feedback')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );
        
        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
        
        await interaction.reply({
            content: '✅ Feedback panel created successfully!',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error creating feedback panel:', error);
        await interaction.reply({
            content: 'An error occurred while creating the feedback panel.',
            ephemeral: true
        });
    }
} 