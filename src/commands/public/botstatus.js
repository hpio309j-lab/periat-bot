const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    PermissionFlagsBits,
    ActivityType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botstatus')
        .setDescription('Change the bot\'s status')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('The status to set for the bot')
                .setRequired(true)
                .addChoices(
                    { name: 'Online', value: 'online' },
                    { name: 'Idle', value: 'idle' },
                    { name: 'Do Not Disturb', value: 'dnd' },
                    { name: 'Invisible', value: 'invisible' }
                ))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of status activity')
                .setRequired(false)
                .addChoices(
                    { name: 'Playing', value: 'PLAYING' },
                    { name: 'Watching', value: 'WATCHING' },
                    { name: 'Listening', value: 'LISTENING' },
                    { name: 'Competing', value: 'COMPETING' }
                ))
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The status text to display')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        // Get options
        const status = interaction.options.getString('status');
        const type = interaction.options.getString('type');
        const text = interaction.options.getString('text') || 'with commands';
        
        try {
            // Set presence status
            await client.user.setStatus(status);
            
            // Set activity if provided
            if (type) {
                const activityType = getActivityType(type);
                await client.user.setActivity(text, { type: activityType });
            }
            
            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🤖 Bot Status Updated')
                .setDescription(`The bot's status has been updated successfully!`)
                .addFields(
                    { name: 'Status', value: `\`${status}\``, inline: true },
                    { name: 'Activity', value: type ? `\`${type}\`` : 'Not Changed', inline: true },
                    { name: 'Text', value: `\`${text}\``, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting bot status:', error);
            
            await interaction.reply({
                content: 'There was an error setting the bot status.',
                ephemeral: true
            });
        }
    },
};

// Helper function to convert string activity type to ActivityType enum
function getActivityType(typeString) {
    switch (typeString) {
        case 'PLAYING':
            return ActivityType.Playing;
        case 'WATCHING':
            return ActivityType.Watching;
        case 'LISTENING':
            return ActivityType.Listening;
        case 'COMPETING':
            return ActivityType.Competing;
        default:
            return ActivityType.Playing;
    }
} 