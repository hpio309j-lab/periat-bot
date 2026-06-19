const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the ban')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction, client) {
        // Check if the bot has permission to ban members
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: 'I don\'t have permission to ban members!',
                ephemeral: true
            });
        }
        
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessageDays = interaction.options.getInteger('days') || 0;
        
        // Get the target member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        // Check if the user is in the server
        if (!targetMember) {
            // Ban user even if not in the server
            try {
                await interaction.guild.members.ban(targetUser.id, { 
                    deleteMessageDays, 
                    reason: `${reason} (Banned by ${interaction.user.tag})` 
                });
                
                // Create ban success embed
                const banEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('User Banned')
                    .setDescription(`Successfully banned user who is not a member of the server.`)
                    .addFields(
                        { name: 'User', value: `${targetUser.tag} (${targetUser.id})` },
                        { name: 'Reason', value: reason },
                        { name: 'Banned by', value: interaction.user.tag }
                    )
                    .setTimestamp();
                
                // Reply with success message
                await interaction.reply({ embeds: [banEmbed] });
                
                // Log the ban if log channel is set up
                await logModAction(interaction, 'Ban', targetUser, reason, deleteMessageDays);
                
                return;
            } catch (error) {
                console.error(`Error banning user: ${error}`);
                return interaction.reply({
                    content: `Failed to ban ${targetUser.tag}: ${error.message}`,
                    ephemeral: true
                });
            }
        }
        
        // Check if the target user is bannable
        if (!targetMember.bannable) {
            return interaction.reply({
                content: `I can't ban ${targetMember.user.tag} because they have higher permissions than me.`,
                ephemeral: true
            });
        }
        
        // Check if the user trying to ban has a higher role than the target
        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return interaction.reply({
                content: `You can't ban ${targetMember.user.tag} because they have higher or equal permissions.`,
                ephemeral: true
            });
        }
        
        // Ban the user
        try {
            await targetMember.ban({ 
                deleteMessageDays, 
                reason: `${reason} (Banned by ${interaction.user.tag})` 
            });
            
            // Create ban success embed
            const banEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('User Banned')
                .setDescription(`Successfully banned ${targetMember.user.tag} from the server.`)
                .addFields(
                    { name: 'User', value: `${targetMember.user.tag} (${targetMember.user.id})` },
                    { name: 'Reason', value: reason },
                    { name: 'Banned by', value: interaction.user.tag },
                    { name: 'Deleted Messages', value: `${deleteMessageDays} day(s)` }
                )
                .setTimestamp();
            
            // Reply with success message
            await interaction.reply({ embeds: [banEmbed] });
            
            // Log the ban if log channel is set up
            await logModAction(interaction, 'Ban', targetMember.user, reason, deleteMessageDays);
            
            // Try to DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle(`You have been banned from ${interaction.guild.name}`)
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'Banned by', value: interaction.user.tag }
                    )
                    .setTimestamp();
                
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                // Unable to DM the user, but ban was successful
                console.log(`Could not DM user ${targetUser.tag}: ${error.message}`);
            }
            
        } catch (error) {
            console.error(`Error banning user: ${error}`);
            return interaction.reply({
                content: `Failed to ban ${targetMember.user.tag}: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

// Function to log moderation actions
async function logModAction(interaction, action, targetUser, reason, days = null) {
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
        
        if (days !== null) {
            logEmbed.addFields({ name: 'Deleted Messages', value: `${days} day(s)` });
        }
        
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