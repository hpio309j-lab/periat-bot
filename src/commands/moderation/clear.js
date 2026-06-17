const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from the channel')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for clearing messages')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client) {
        try {
            // Check if the bot has permission to manage messages
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({
                    content: 'I don\'t have permission to delete messages!',
                    ephemeral: true
                });
            }
            
            // Get options
            const amount = interaction.options.getInteger('amount');
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            // Defer reply to buy time for message fetching
            await interaction.deferReply({ ephemeral: true });
            
            // Fetch messages
            const messages = await interaction.channel.messages.fetch({
                limit: 100
            });
            
            // Filter messages
            let messagesToDelete = messages;
            
            // Filter by user if specified
            if (user) {
                messagesToDelete = messages.filter(msg => msg.author.id === user.id);
            }
            
            // Filter messages younger than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            messagesToDelete = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            
            // Limit to requested amount
            messagesToDelete = [...messagesToDelete.values()].slice(0, amount);
            
            if (messagesToDelete.length === 0) {
                return interaction.editReply({
                    content: 'No messages found that can be deleted (messages must be less than 14 days old).',
                    ephemeral: true
                });
            }
            
            // Bulk delete if more than one message
            let deletedCount = 0;
            
            if (messagesToDelete.length > 1) {
                const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);
                deletedCount = deleted.size;
            } else {
                // Delete single message
                await messagesToDelete[0].delete();
                deletedCount = 1;
            }
            
            // Create result embed
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🧹 Messages Cleared')
                .setDescription(`Successfully deleted ${deletedCount} message(s)`)
                .addFields(
                    { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
                    { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();
                
            if (user) {
                embed.addFields({ name: 'Target User', value: `<@${user.id}>`, inline: true });
            }
            
            // Log action if log channel exists
            try {
                const GuildConfig = require('../../database/schemas/guildConfig');
                const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
                
                if (guildConfig && guildConfig.moderation && guildConfig.moderation.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.moderation.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#e74c3c')
                            .setTitle(`Messages Cleared | Case #${guildConfig.moderation.caseCount || 0 + 1}`)
                            .addFields(
                                { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
                                { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
                                { name: 'Amount', value: `${deletedCount}`, inline: true },
                                { name: 'Reason', value: reason }
                            )
                            .setTimestamp();
                            
                        if (user) {
                            logEmbed.addFields({ name: 'Target User', value: `<@${user.id}>` });
                        }
                        
                        await logChannel.send({ embeds: [logEmbed] });
                        
                        // Increment case count
                        if (guildConfig.moderation.caseCount !== undefined) {
                            guildConfig.moderation.caseCount += 1;
                            await guildConfig.save();
                        }
                    }
                }
            } catch (error) {
                console.error('Error logging clear action:', error);
            }
            
            // Reply with result
            await interaction.editReply({
                embeds: [embed],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error in clear command:', error);
            
            if (error.code === 10008) {
                // Unknown message error (probably already deleted)
                return interaction.editReply({
                    content: 'Some messages could not be deleted (they may have been deleted already or too old).',
                    ephemeral: true
                });
            }
            
            return interaction.editReply({
                content: `An error occurred while clearing messages: ${error.message}`,
                ephemeral: true
            });
        }
    },
}; 