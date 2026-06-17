const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout (mute) a user for a specified duration')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Duration of timeout (e.g. 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction, client) {
        // Check if the bot has permission to moderate members
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                content: 'I don\'t have permission to timeout members!',
                ephemeral: true
            });
        }
        
        const targetUser = interaction.options.getUser('user');
        const durationString = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Parse duration
        let durationMs;
        try {
            durationMs = ms(durationString);
            if (!durationMs) throw new Error('Invalid duration');
            
            // Discord maximum timeout duration is 28 days
            const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000;
            if (durationMs > maxTimeoutMs) {
                return interaction.reply({
                    content: 'The maximum timeout duration is 28 days. Please specify a shorter duration.',
                    ephemeral: true
                });
            }
        } catch (error) {
            return interaction.reply({
                content: 'Invalid duration format. Examples: 10s, 5m, 1h, 1d',
                ephemeral: true
            });
        }
        
        // Get the target member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        // Check if the user is in the server
        if (!targetMember) {
            return interaction.reply({
                content: `${targetUser.tag} is not a member of this server.`,
                ephemeral: true
            });
        }
        
        // Check if the target user can be timed out
        if (!targetMember.moderatable) {
            return interaction.reply({
                content: `I can't timeout ${targetMember.user.tag} because they have higher permissions than me.`,
                ephemeral: true
            });
        }
        
        // Check if the user trying to timeout has a higher role than the target
        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return interaction.reply({
                content: `You can't timeout ${targetMember.user.tag} because they have higher or equal permissions.`,
                ephemeral: true
            });
        }
        
        // Apply timeout
        try {
            await targetMember.timeout(durationMs, `${reason} (Timed out by ${interaction.user.tag})`);
            
            // Format duration for display
            const formattedDuration = formatDuration(durationMs);
            
            // Create timeout success embed
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('User Timed Out')
                .setDescription(`Successfully timed out ${targetMember.user.tag} for ${formattedDuration}.`)
                .addFields(
                    { name: 'User', value: `${targetMember.user.tag} (${targetMember.user.id})` },
                    { name: 'Duration', value: formattedDuration },
                    { name: 'Reason', value: reason },
                    { name: 'Timed out by', value: interaction.user.tag }
                )
                .setTimestamp();
            
            // Reply with success message
            await interaction.reply({ embeds: [timeoutEmbed] });
            
            // Log the timeout if log channel is set up
            await logModAction(interaction, 'Timeout', targetMember.user, reason, formattedDuration);
            
            // Try to DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle(`You have been timed out in ${interaction.guild.name}`)
                    .addFields(
                        { name: 'Duration', value: formattedDuration },
                        { name: 'Reason', value: reason },
                        { name: 'Timed out by', value: interaction.user.tag }
                    )
                    .setTimestamp();
                
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                // Unable to DM the user, but timeout was successful
                console.log(`Could not DM user ${targetUser.tag}: ${error.message}`);
            }
            
        } catch (error) {
            console.error(`Error timing out user: ${error}`);
            return interaction.reply({
                content: `Failed to timeout ${targetMember.user.tag}: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

// Function to log moderation actions
async function logModAction(interaction, action, targetUser, reason, duration) {
    try {
        // Find modlog channel
        const GuildConfig = require('../../database/schemas/guildConfig');
        const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (!guildConfig || !guildConfig.moderation || !guildConfig.moderation.logChannelId) {
            return; // No mod log channel configured
        }
        
        const logChannel = interaction.guild.channels.cache.get(guildConfig.moderation.logChannelId);
        if (!logChannel) return;
        
        // Create log embed
        const logEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle(`${action} | Case #${guildConfig.moderation.caseCount || 0 + 1}`)
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})` },
                { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: 'Duration', value: duration },
                { name: 'Reason', value: reason }
            )
            .setTimestamp();
        
        // Send log message
        await logChannel.send({ embeds: [logEmbed] });
        
        // Increment case count
        if (guildConfig.moderation.caseCount !== undefined) {
            guildConfig.moderation.caseCount += 1;
            await guildConfig.save();
        }
    } catch (error) {
        console.error(`Error logging moderation action: ${error}`);
    }
}

// Function to format duration in a human-readable format
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
} 