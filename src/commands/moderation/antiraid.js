const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Configure anti-raid protection settings')
        
        // Toggle subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle anti-raid protection on/off')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether anti-raid protection is enabled')
                        .setRequired(true)))
        
        // Settings subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Configure anti-raid protection settings')
                .addIntegerOption(option =>
                    option.setName('join_threshold')
                        .setDescription('Number of joins in the timeframe to trigger auto-actions')
                        .setRequired(false)
                        .setMinValue(2)
                        .setMaxValue(100))
                .addIntegerOption(option =>
                    option.setName('timeframe')
                        .setDescription('Timeframe in seconds to monitor joins')
                        .setRequired(false)
                        .setMinValue(5)
                        .setMaxValue(300))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to take when raid is detected')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Log Only', value: 'log' },
                            { name: 'Lockdown', value: 'lockdown' },
                            { name: 'Kick New Members', value: 'kick' },
                            { name: 'Ban New Members', value: 'ban' }
                        ))
                .addIntegerOption(option =>
                    option.setName('account_age')
                        .setDescription('Minimum account age in days to bypass the anti-raid')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(90))
                .addRoleOption(option =>
                    option.setName('alert_role')
                        .setDescription('Role to ping when raid is detected')
                        .setRequired(false)))
        
        // Status subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current anti-raid protection settings'))
        
        // Lockdown subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('lockdown')
                .setDescription('Manually lockdown the server')
                .addBooleanOption(option =>
                    option.setName('enable')
                        .setDescription('Enable or disable lockdown')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the lockdown')
                        .setRequired(false))),
    
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'toggle':
                await toggleAntiRaid(interaction);
                break;
            case 'settings':
                await configureSettings(interaction);
                break;
            case 'status':
                await checkStatus(interaction);
                break;
            case 'lockdown':
                await handleLockdown(interaction, client);
                break;
        }
    },
};

// Toggle anti-raid protection
async function toggleAntiRaid(interaction) {
    try {
        const enabled = interaction.options.getBoolean('enabled');
        
        // Get guild config
        let guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (!guildConfig) {
            guildConfig = new GuildConfig({ guildId: interaction.guild.id });
        }
        
        // Initialize antiRaid section if it doesn't exist
        if (!guildConfig.antiRaid) {
            guildConfig.antiRaid = {
                enabled: false,
                joinThreshold: 5,
                timeframeSeconds: 10,
                action: 'log',
                minAccountAgeDays: 7,
                alertRoleId: null
            };
        }
        
        // Update setting
        guildConfig.antiRaid.enabled = enabled;
        await guildConfig.save();
        
        // Create embed response
        const embed = new EmbedBuilder()
            .setColor(enabled ? '#2ecc71' : '#e74c3c')
            .setTitle('🛡️ Anti-Raid Protection')
            .setDescription(`Anti-raid protection has been **${enabled ? 'enabled' : 'disabled'}**.`)
            .addFields(
                { name: 'Server', value: interaction.guild.name, inline: true },
                { name: 'Enabled by', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (error) {
        console.error('Error toggling anti-raid:', error);
        await interaction.reply({
            content: 'An error occurred while toggling anti-raid protection.',
            ephemeral: true
        });
    }
}

// Configure anti-raid settings
async function configureSettings(interaction) {
    try {
        // Get options
        const joinThreshold = interaction.options.getInteger('join_threshold');
        const timeframe = interaction.options.getInteger('timeframe');
        const action = interaction.options.getString('action');
        const accountAge = interaction.options.getInteger('account_age');
        const alertRole = interaction.options.getRole('alert_role');
        
        // Get guild config
        let guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (!guildConfig) {
            guildConfig = new GuildConfig({ guildId: interaction.guild.id });
        }
        
        // Initialize antiRaid section if it doesn't exist
        if (!guildConfig.antiRaid) {
            guildConfig.antiRaid = {
                enabled: false,
                joinThreshold: 5,
                timeframeSeconds: 10,
                action: 'log',
                minAccountAgeDays: 7,
                alertRoleId: null
            };
        }
        
        // Update settings if provided
        const changes = [];
        
        if (joinThreshold !== null) {
            guildConfig.antiRaid.joinThreshold = joinThreshold;
            changes.push(`Join threshold set to ${joinThreshold} members`);
        }
        
        if (timeframe !== null) {
            guildConfig.antiRaid.timeframeSeconds = timeframe;
            changes.push(`Timeframe set to ${timeframe} seconds`);
        }
        
        if (action) {
            guildConfig.antiRaid.action = action;
            changes.push(`Action set to "${action}"`);
        }
        
        if (accountAge !== null) {
            guildConfig.antiRaid.minAccountAgeDays = accountAge;
            changes.push(`Minimum account age set to ${accountAge} days`);
        }
        
        if (alertRole) {
            guildConfig.antiRaid.alertRoleId = alertRole.id;
            changes.push(`Alert role set to ${alertRole.name}`);
        }
        
        if (changes.length === 0) {
            return interaction.reply({
                content: 'No changes were made to the anti-raid settings. Please provide at least one setting to change.',
                ephemeral: true
            });
        }
        
        // Save changes
        await guildConfig.save();
        
        // Create embed response
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🛡️ Anti-Raid Settings Updated')
            .setDescription(`Anti-raid protection settings have been updated.`)
            .addFields(
                { name: 'Changes', value: changes.map(c => `• ${c}`).join('\n') },
                { name: 'Updated by', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (error) {
        console.error('Error configuring anti-raid settings:', error);
        await interaction.reply({
            content: 'An error occurred while configuring anti-raid settings.',
            ephemeral: true
        });
    }
}

// Check anti-raid status
async function checkStatus(interaction) {
    try {
        // Get guild config
        const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (!guildConfig || !guildConfig.antiRaid) {
            return interaction.reply({
                content: 'Anti-raid protection has not been configured for this server. Use `/antiraid settings` to configure it.',
                ephemeral: true
            });
        }
        
        const antiRaid = guildConfig.antiRaid;
        
        // Format action for display
        let actionDisplay;
        switch (antiRaid.action) {
            case 'log': actionDisplay = 'Log Only'; break;
            case 'lockdown': actionDisplay = 'Lockdown Server'; break;
            case 'kick': actionDisplay = 'Kick New Members'; break;
            case 'ban': actionDisplay = 'Ban New Members'; break;
            default: actionDisplay = antiRaid.action;
        }
        
        // Get alert role name if exists
        let alertRoleName = 'None';
        if (antiRaid.alertRoleId) {
            const role = interaction.guild.roles.cache.get(antiRaid.alertRoleId);
            if (role) {
                alertRoleName = role.name;
            } else {
                alertRoleName = 'Invalid Role';
            }
        }
        
        // Create embed response
        const embed = new EmbedBuilder()
            .setColor(antiRaid.enabled ? '#2ecc71' : '#e74c3c')
            .setTitle('🛡️ Anti-Raid Protection Status')
            .setDescription(`Status: **${antiRaid.enabled ? 'Enabled' : 'Disabled'}**`)
            .addFields(
                { name: 'Join Threshold', value: `${antiRaid.joinThreshold} members`, inline: true },
                { name: 'Timeframe', value: `${antiRaid.timeframeSeconds} seconds`, inline: true },
                { name: 'Action', value: actionDisplay, inline: true },
                { name: 'Minimum Account Age', value: `${antiRaid.minAccountAgeDays} days`, inline: true },
                { name: 'Alert Role', value: alertRoleName, inline: true },
                { name: 'Server', value: interaction.guild.name, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error checking anti-raid status:', error);
        await interaction.reply({
            content: 'An error occurred while checking anti-raid status.',
            ephemeral: true
        });
    }
}

// Handle server lockdown
async function handleLockdown(interaction, client) {
    try {
        const enable = interaction.options.getBoolean('enable');
        const reason = interaction.options.getString('reason') || (enable ? 'Security measures' : 'Lockdown lifted');
        
        // Defer reply as this might take some time
        await interaction.deferReply();
        
        // Get all channels
        const channels = interaction.guild.channels.cache.filter(
            ch => ch.type === 0 && ch.permissionsFor(interaction.guild.members.me).has('ManageChannels')
        );
        
        if (channels.size === 0) {
            return interaction.editReply({
                content: 'I don\'t have permission to modify any channels in this server.',
                ephemeral: true
            });
        }
        
        // Track progress
        let updatedCount = 0;
        let failedCount = 0;
        const everyone = interaction.guild.roles.everyone;
        
        // Update permissions for each channel
        for (const [, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(everyone, {
                    SendMessages: enable ? false : null
                }, { reason });
                updatedCount++;
            } catch (error) {
                console.error(`Error updating permissions for channel ${channel.name}:`, error);
                failedCount++;
            }
        }
        
        // Log the lockdown
        try {
            const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
            if (guildConfig && guildConfig.moderation && guildConfig.moderation.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(guildConfig.moderation.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(enable ? '#e74c3c' : '#2ecc71')
                        .setTitle(`Server ${enable ? 'Lockdown' : 'Lockdown Lifted'}`)
                        .addFields(
                            { name: 'Moderator', value: `<@${interaction.user.id}>` },
                            { name: 'Reason', value: reason },
                            { name: 'Channels Affected', value: `${updatedCount} (${failedCount} failed)` }
                        )
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error('Error logging lockdown:', error);
        }
        
        // Create embed response
        const embed = new EmbedBuilder()
            .setColor(enable ? '#e74c3c' : '#2ecc71')
            .setTitle(`🔒 Server ${enable ? 'Lockdown' : 'Lockdown Lifted'}`)
            .setDescription(`${enable ? 'Enabled' : 'Disabled'} lockdown for ${updatedCount} channels.`)
            .addFields(
                { name: 'Reason', value: reason },
                { name: 'Status', value: `${updatedCount} channels updated, ${failedCount} failed` },
                { name: 'Moderator', value: `<@${interaction.user.id}>` }
            )
            .setTimestamp();
        
        // If alert role is configured and lockdown is enabled, ping the role
        let content = '';
        if (enable) {
            try {
                const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
                if (guildConfig && guildConfig.antiRaid && guildConfig.antiRaid.alertRoleId) {
                    content = `<@&${guildConfig.antiRaid.alertRoleId}> Server has been placed on lockdown!`;
                }
            } catch (error) {
                console.error('Error getting alert role:', error);
            }
        }
        
        await interaction.editReply({ 
            content: content || null,
            embeds: [embed] 
        });
    } catch (error) {
        console.error('Error handling lockdown:', error);
        await interaction.editReply({
            content: 'An error occurred while handling the server lockdown.',
            ephemeral: true
        });
    }
} 