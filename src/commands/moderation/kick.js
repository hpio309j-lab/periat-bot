const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction, client) {
        // Check if the bot has permission to kick members
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({
                content: 'I don\'t have permission to kick members!',
                ephemeral: true
            });
        }
        
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Get the target member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        // Check if the user is in the server
        if (!targetMember) {
            return interaction.reply({
                content: `${targetUser.tag} is not a member of this server.`,
                ephemeral: true
            });
        }
        
        // Check if the target user is kickable
        if (!targetMember.kickable) {
            return interaction.reply({
                content: `I can't kick ${targetMember.user.tag} because they have higher permissions than me.`,
                ephemeral: true
            });
        }
        
        // Check if the user trying to kick has a higher role than the target
        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return interaction.reply({
                content: `You can't kick ${targetMember.user.tag} because they have higher or equal permissions.`,
                ephemeral: true
            });
        }
        
        // Try to DM the user before kicking
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle(`You have been kicked from ${interaction.guild.name}`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Kicked by', value: interaction.user.tag }
                )
                .setTimestamp();
            
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            // Unable to DM the user, continue with kick
            console.log(`Could not DM user ${targetUser.tag}: ${error.message}`);
        }
        
        // Kick the user
        try {
            await targetMember.kick(`${reason} (Kicked by ${interaction.user.tag})`);
            
            // Create kick success embed
            const kickEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('User Kicked')
                .setDescription(`Successfully kicked ${targetMember.user.tag} from the server.`)
                .addFields(
                    { name: 'User', value: `${targetMember.user.tag} (${targetMember.user.id})` },
                    { name: 'Reason', value: reason },
                    { name: 'Kicked by', value: interaction.user.tag }
                )
                .setTimestamp();
            
            // Reply with success message
            await interaction.reply({ embeds: [kickEmbed] });
            
            // Log the kick if log channel is set up
            await logModAction(interaction, 'Kick', targetMember.user, reason);
            
        } catch (error) {
            console.error(`Error kicking user: ${error}`);
            return interaction.reply({
                content: `Failed to kick ${targetMember.user.tag}: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

// Function to log moderation actions
async function logModAction(interaction, action, targetUser, reason) {
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