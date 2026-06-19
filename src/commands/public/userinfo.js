const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display information about a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to display information about (defaults to yourself)')
                .setRequired(false)),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        try {
            // Fetch the member if the user is in the server
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            
            // Create base embed
            const embed = new EmbedBuilder()
                .setColor(member ? member.displayHexColor : '#3498db')
                .setTitle(`${targetUser.bot ? '🤖 Bot' : '👤 User'} Information: ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: 'User ID', value: targetUser.id, inline: true },
                    { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setTimestamp();
            
            // Add member-specific information if the user is in the server
            if (member) {
                // Get join position
                const members = await interaction.guild.members.fetch();
                const sortedMembers = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
                const joinPosition = Array.from(sortedMembers.keys()).indexOf(targetUser.id) + 1;
                
                // Get roles (excluding @everyone)
                const roles = member.roles.cache
                    .filter(role => role.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position);
                
                const rolesString = roles.size 
                    ? roles.map(role => `<@&${role.id}>`).join(', ')
                    : 'None';
                
                // Add member fields
                embed.addFields(
                    { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Join Position', value: `#${joinPosition}`, inline: true },
                    { name: 'Nickname', value: member.nickname || 'None', inline: true },
                    { name: `Roles (${roles.size})`, value: rolesString.length > 1024 ? `${rolesString.substring(0, 1020)}...` : rolesString }
                );
                
                // Add permissions field if they have important permissions
                const importantPermissions = [
                    'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
                    'BanMembers', 'KickMembers', 'ManageMessages', 'MentionEveryone'
                ];
                
                const memberPermissions = member.permissions.toArray();
                const permissionsString = importantPermissions
                    .filter(perm => memberPermissions.includes(perm))
                    .map(formatPermission)
                    .join(', ');
                
                if (permissionsString) {
                    embed.addFields({ name: 'Key Permissions', value: permissionsString });
                }
                
                // Add presence information if available
                if (member.presence) {
                    let statusText = '';
                    
                    switch (member.presence.status) {
                        case 'online': statusText = '🟢 Online'; break;
                        case 'idle': statusText = '🟡 Idle'; break;
                        case 'dnd': statusText = '🔴 Do Not Disturb'; break;
                        case 'offline': statusText = '⚫ Offline'; break;
                        default: statusText = '❓ Unknown';
                    }
                    
                    embed.addFields({ name: 'Status', value: statusText, inline: true });
                    
                    // Add activity information if available
                    if (member.presence.activities && member.presence.activities.length > 0) {
                        const activity = member.presence.activities[0];
                        let activityText = '';
                        
                        switch (activity.type) {
                            case 0: activityText = `Playing ${activity.name}`; break;
                            case 1: activityText = `Streaming ${activity.name}`; break;
                            case 2: activityText = `Listening to ${activity.name}`; break;
                            case 3: activityText = `Watching ${activity.name}`; break;
                            case 4: activityText = `${activity.name}`; break;
                            case 5: activityText = `Competing in ${activity.name}`; break;
                            default: activityText = activity.name;
                        }
                        
                        embed.addFields({ name: 'Activity', value: activityText, inline: true });
                    }
                }
            } else {
                embed.setDescription('*This user is not a member of this server.*');
            }
            
            // Add avatar and banner information
            const actionRow = { type: 1, components: [] };
            
            // Avatar and banner buttons
            if (targetUser.avatarURL()) {
                actionRow.components.push({
                    type: 2,
                    style: 5,
                    label: 'Avatar',
                    url: targetUser.avatarURL({ dynamic: true, size: 4096 })
                });
            }
            
            if (targetUser.bannerURL()) {
                embed.setImage(targetUser.bannerURL({ dynamic: true, size: 1024 }));
                
                actionRow.components.push({
                    type: 2,
                    style: 5,
                    label: 'Banner',
                    url: targetUser.bannerURL({ dynamic: true, size: 4096 })
                });
            }
            
            const components = actionRow.components.length > 0 ? [actionRow] : [];
            
            // Send the embed
            await interaction.reply({
                embeds: [embed],
                components: components
            });
            
        } catch (error) {
            console.error('Error in userinfo command:', error);
            await interaction.reply({
                content: 'An error occurred while fetching user information.',
                ephemeral: true
            });
        }
    },
};

// Format permission names for easier reading
function formatPermission(permission) {
    return permission
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, match => match.toUpperCase())
        .trim();
} 