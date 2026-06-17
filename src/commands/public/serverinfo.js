const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display information about the current server'),
    
    async execute(interaction, client) {
        const guild = interaction.guild;
        
        try {
            await guild.fetch();
            
            // Get member stats
            const totalMembers = guild.memberCount;
            let humanCount = totalMembers;
            let botCount = 0;
            
            // Get full members if possible (requires GUILD_MEMBERS intent)
            if (guild.members.cache.size < totalMembers) {
                try {
                    const members = await guild.members.fetch();
                    botCount = members.filter(member => member.user.bot).size;
                    humanCount = totalMembers - botCount;
                } catch (error) {
                    console.error('Error fetching all members:', error);
                    // Fall back to cache
                    botCount = guild.members.cache.filter(member => member.user.bot).size;
                    humanCount = guild.members.cache.filter(member => !member.user.bot).size;
                }
            } else {
                botCount = guild.members.cache.filter(member => member.user.bot).size;
                humanCount = guild.members.cache.filter(member => !member.user.bot).size;
            }
            
            // Get online members count
            const onlineMembers = guild.members.cache.filter(m => 
                m.presence?.status === 'online' || 
                m.presence?.status === 'idle' || 
                m.presence?.status === 'dnd'
            ).size;
            
            // Get channel counts
            const textChannels = guild.channels.cache.filter(c => c.type === 0).size; // GUILD_TEXT
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size; // GUILD_VOICE
            const forumChannels = guild.channels.cache.filter(c => c.type === 15).size; // GUILD_FORUM
            const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size; // GUILD_CATEGORY
            const stageChannels = guild.channels.cache.filter(c => c.type === 13).size; // GUILD_STAGE_VOICE
            const totalChannels = guild.channels.cache.size;
            
            // Get emoji counts
            const totalEmojis = guild.emojis.cache.size;
            const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated).size;
            const staticEmojis = totalEmojis - animatedEmojis;
            
            // Get verification level
            const verificationLevels = {
                0: 'None',
                1: 'Low',
                2: 'Medium',
                3: 'High',
                4: 'Very High'
            };
            
            // Get server features
            const features = guild.features.length > 0 
                ? guild.features.map(f => formatFeature(f)).join(', ')
                : 'None';
            
            // Get boost stats
            const boostLevel = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount;
            const boostLevelEmoji = ['0️⃣', '1️⃣', '2️⃣', '3️⃣'][boostLevel];
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`${guild.name} - Server Information`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: 'Server ID', value: guild.id, inline: true },
                    { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                    { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    
                    { name: 'Members', value: `${totalMembers} Total\n${humanCount} Humans\n${botCount} Bots\n${onlineMembers || 'Unknown'} Online`, inline: true },
                    { name: 'Channels', value: `${totalChannels} Total\n${textChannels} Text\n${voiceChannels} Voice\n${forumChannels} Forums\n${stageChannels} Stage\n${categoryChannels} Categories`, inline: true },
                    { name: 'Emojis', value: `${totalEmojis} Total\n${staticEmojis} Static\n${animatedEmojis} Animated`, inline: true },
                    
                    { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: 'Verification Level', value: verificationLevels[guild.verificationLevel], inline: true },
                    { name: 'Boost Status', value: `${boostLevelEmoji} Level ${boostLevel} (${boostCount} Boosts)`, inline: true }
                )
                .setTimestamp();
            
            if (features !== 'None') {
                embed.addFields({ name: 'Server Features', value: features });
            }
            
            // Add server banner if available
            if (guild.bannerURL()) {
                embed.setImage(guild.bannerURL({ size: 1024 }));
            }
            
            // Create action row with links to server icon and banner
            const actionRow = { type: 1, components: [] };
            
            if (guild.iconURL()) {
                actionRow.components.push({
                    type: 2,
                    style: 5,
                    label: 'Server Icon',
                    url: guild.iconURL({ dynamic: true, size: 4096 })
                });
            }
            
            if (guild.bannerURL()) {
                actionRow.components.push({
                    type: 2,
                    style: 5,
                    label: 'Server Banner',
                    url: guild.bannerURL({ dynamic: true, size: 4096 })
                });
            }
            
            if (guild.splashURL()) {
                actionRow.components.push({
                    type: 2,
                    style: 5,
                    label: 'Invite Background',
                    url: guild.splashURL({ dynamic: true, size: 4096 })
                });
            }
            
            const components = actionRow.components.length > 0 ? [actionRow] : [];
            
            // Send the embed
            await interaction.reply({
                embeds: [embed],
                components: components
            });
            
        } catch (error) {
            console.error('Error in serverinfo command:', error);
            await interaction.reply({
                content: 'An error occurred while fetching server information.',
                ephemeral: true
            });
        }
    },
};

// Format server feature names for easier reading
function formatFeature(feature) {
    return feature
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase());
} 