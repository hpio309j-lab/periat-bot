const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createWelcomeCard, createGoodbyeCard } = require('./canvasUtils');
const GuildConfig = require('../database/schemas/guildConfig');

async function sendWelcomeMessage(member, client) {
    try {
        const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
        
        if (!guildConfig || !guildConfig.welcome.enabled) return;
        
        if (guildConfig.welcome.channelId) {
            const welcomeChannel = member.guild.channels.cache.get(guildConfig.welcome.channelId);
            
            if (welcomeChannel) {
                let welcomeMessage = guildConfig.welcome.message
                    .replace(/{user}/g, member.toString())
                    .replace(/{username}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount.toString());
                
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`Welcome to ${member.guild.name}!`)
                    .setDescription(welcomeMessage)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({ text: `User ID: ${member.id}` });
                
                if (guildConfig.welcome.cardEnabled) {
                    try {
                        const welcomeCard = await createWelcomeCard(member, guildConfig);
                        const attachment = new AttachmentBuilder(welcomeCard, { name: 'welcome-card.png' });
                        
                        embed.setImage('attachment://welcome-card.png');
                        
                        await welcomeChannel.send({ embeds: [embed], files: [attachment] });
                    } catch (error) {
                        console.error('Error creating welcome card:', error);
                        await welcomeChannel.send({ embeds: [embed] });
                    }
                } else {
                    await welcomeChannel.send({ embeds: [embed] });
                }
            }
        }
        
        if (guildConfig.welcome.dmEnabled) {
            try {
                let dmMessage = guildConfig.welcome.dmMessage
                    .replace(/{user}/g, member.toString())
                    .replace(/{username}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount.toString());
                
                const dmEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`Welcome to ${member.guild.name}!`)
                    .setDescription(dmMessage)
                    .setThumbnail(member.guild.iconURL({ dynamic: true }))
                    .setTimestamp();
                
                await member.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.error('Error sending welcome DM:', error);
            }
        }
        
        if (guildConfig.welcome.roleId) {
            try {
                const role = member.guild.roles.cache.get(guildConfig.welcome.roleId);
                if (role && member.guild.members.me.permissions.has('ManageRoles')) {
                    await member.roles.add(role);
                }
            } catch (error) {
                console.error('Error adding welcome role:', error);
            }
        }
    } catch (error) {
        console.error('Error in sendWelcomeMessage:', error);
    }
}

async function sendGoodbyeMessage(member, client) {
    try {
        const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
        
        if (!guildConfig || !guildConfig.goodbye || !guildConfig.goodbye.enabled) return;
        
        if (guildConfig.goodbye.channelId) {
            const goodbyeChannel = member.guild.channels.cache.get(guildConfig.goodbye.channelId);
            
            if (goodbyeChannel) {
                let goodbyeMessage = guildConfig.goodbye.message
                    .replace(/{user}/g, member.user.tag)
                    .replace(/{username}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount.toString());
                
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle(`Member Left`)
                    .setDescription(goodbyeMessage)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({ text: `User ID: ${member.id}` });
                
                if (guildConfig.goodbye.cardEnabled) {
                    try {
                        const goodbyeCard = await createGoodbyeCard(member, guildConfig);
                        const attachment = new AttachmentBuilder(goodbyeCard, { name: 'goodbye-card.png' });
                        
                        embed.setImage('attachment://goodbye-card.png');
                        
                        await goodbyeChannel.send({ embeds: [embed], files: [attachment] });
                    } catch (error) {
                        console.error('Error creating goodbye card:', error);
                        await goodbyeChannel.send({ embeds: [embed] });
                    }
                } else {
                    await goodbyeChannel.send({ embeds: [embed] });
                }
            }
        }
    } catch (error) {
        console.error('Error in sendGoodbyeMessage:', error);
    }
}

module.exports = {
    sendWelcomeMessage,
    sendGoodbyeMessage
}; 