const { EmbedBuilder } = require('discord.js');
const AutoRoleConfig = require('../database/schemas/AutoRoleConfig');

async function setupAutoRoleSystem(client) {
    if (!client.autoRoles) {
        client.autoRoles = new Map();
    }
    
    if (!client.roleButtons) {
        client.roleButtons = new Map();
    }
    
    try {
        const autoRoleConfigs = await AutoRoleConfig.find({});
        
        for (const config of autoRoleConfigs) {
            if (config.autoRoleId) {
                client.autoRoles.set(config.guildId, config.autoRoleId);
            }
            
            if (config.roleButtons && config.roleButtons.length > 0) {
                client.roleButtons.set(config.guildId, config.roleButtons);
            }
        }
        
        console.log(`Loaded auto role configurations for ${autoRoleConfigs.length} guilds.`);
    } catch (error) {
        console.error('Error loading auto role configurations:', error);
    }
}

async function assignAutoRole(member, client) {
    try {
        const guildId = member.guild.id;
        const roleId = client.autoRoles.get(guildId);
        
        if (!roleId) return;
        
        const role = member.guild.roles.cache.get(roleId);
        
        if (!role) {
            client.autoRoles.delete(guildId);
            await AutoRoleConfig.findOneAndUpdate(
                { guildId },
                { $set: { autoRoleId: null } },
                { upsert: true }
            );
            return;
        }
        
        if (role.position >= member.guild.members.me.roles.highest.position) {
            return;
        }
        
        await member.roles.add(role);
        
        const logChannel = member.guild.channels.cache.find(
            channel => channel.name.includes('log') || channel.name.includes('audit')
        );
        
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('Auto Role Assigned')
                .setDescription(`${member.user.tag} was automatically given the ${role.name} role.`)
                .setTimestamp();
            
            await logChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error assigning auto role:', error);
    }
}

async function setGuildAutoRole(guildId, roleId, client) {
    try {
        client.autoRoles.set(guildId, roleId);
        
        await AutoRoleConfig.findOneAndUpdate(
            { guildId },
            { $set: { autoRoleId: roleId } },
            { upsert: true }
        );
        
        return true;
    } catch (error) {
        console.error('Error setting guild auto role:', error);
        return false;
    }
}

async function removeGuildAutoRole(guildId, client) {
    try {
        client.autoRoles.delete(guildId);
        
        await AutoRoleConfig.findOneAndUpdate(
            { guildId },
            { $set: { autoRoleId: null } },
            { upsert: true }
        );
        
        return true;
    } catch (error) {
        console.error('Error removing guild auto role:', error);
        return false;
    }
}

async function addRoleToPanel(guildId, roleData, client) {
    try {
        if (!client.roleButtons.has(guildId)) {
            client.roleButtons.set(guildId, []);
        }
        
        const roleButtons = client.roleButtons.get(guildId);
        roleButtons.push(roleData);
        
        await AutoRoleConfig.findOneAndUpdate(
            { guildId },
            { $push: { roleButtons: roleData } },
            { upsert: true }
        );
        
        return true;
    } catch (error) {
        console.error('Error adding role to panel:', error);
        return false;
    }
}

async function handleRoleButtonInteraction(interaction, client) {
    try {
        if (!interaction.isButton() || !interaction.customId.startsWith('role_')) {
            return false;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const roleId = interaction.customId.replace('role_', '');
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            return interaction.editReply({
                content: '❌ This role no longer exists.',
                ephemeral: true
            });
        }
        
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.editReply({
                content: '❌ I cannot assign this role due to role hierarchy.',
                ephemeral: true
            });
        }
        
        const member = interaction.member;
        
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            return interaction.editReply({
                content: `✅ Removed the ${role.name} role.`,
                ephemeral: true
            });
        } else {
            await member.roles.add(role);
            return interaction.editReply({
                content: `✅ Added the ${role.name} role.`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error handling role button:', error);
        
        if (interaction.deferred && !interaction.replied) {
            return interaction.editReply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
        
        return false;
    }
}

module.exports = {
    setupAutoRoleSystem,
    assignAutoRole,
    handleRoleButtonInteraction,
    setGuildAutoRole,
    removeGuildAutoRole,
    addRoleToPanel
}; 