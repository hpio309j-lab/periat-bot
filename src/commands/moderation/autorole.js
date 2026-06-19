const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
const { setGuildAutoRole, removeGuildAutoRole, addRoleToPanel } = require('../../utils/autoRoleUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Manage automatic role assignments')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set an automatic role for new members')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign automatically')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an automatic role'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all automatic roles'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Create a role selection panel')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title for the panel')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description for the panel')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to the selection panel')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to add')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description for this role')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji for this role')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'set':
                await setAutorole(interaction, client);
                break;
            case 'remove':
                await removeAutorole(interaction, client);
                break;
            case 'list':
                await listAutoroles(interaction, client);
                break;
            case 'panel':
                await createRolePanel(interaction, client);
                break;
            case 'add':
                await addRoleToSelection(interaction, client);
                break;
        }
    }
};

async function setAutorole(interaction, client) {
    const role = interaction.options.getRole('role');
    
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: `❌ I cannot assign roles that are higher than or equal to my highest role.`,
            ephemeral: true
        });
    }
    
    const guildId = interaction.guild.id;
    
    try {
        await setGuildAutoRole(guildId, role.id, client);
        
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Auto Role Set')
            .setDescription(`New members will now automatically receive the ${role} role.`)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error setting auto role:', error);
        await interaction.reply({
            content: '❌ An error occurred while setting the auto role.',
            ephemeral: true
        });
    }
}

async function removeAutorole(interaction, client) {
    const guildId = interaction.guild.id;
    
    try {
        const roleId = client.autoRoles.get(guildId);
        
        if (!roleId) {
            return interaction.reply({
                content: '❌ There is no auto role set for this server.',
                ephemeral: true
            });
        }
        
        await removeGuildAutoRole(guildId, client);
        
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('Auto Role Removed')
            .setDescription('New members will no longer automatically receive a role.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error removing auto role:', error);
        await interaction.reply({
            content: '❌ An error occurred while removing the auto role.',
            ephemeral: true
        });
    }
}

async function listAutoroles(interaction, client) {
    const guildId = interaction.guild.id;
    
    try {
        const roleId = client.autoRoles.get(guildId);
        
        if (!roleId) {
            return interaction.reply({
                content: '❌ There is no auto role set for this server.',
                ephemeral: true
            });
        }
        
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            client.autoRoles.delete(guildId);
            return interaction.reply({
                content: '❌ The previously set auto role no longer exists. It has been removed.',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('Auto Role')
            .setDescription(`New members automatically receive the ${role} role.`)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error listing auto roles:', error);
        await interaction.reply({
            content: '❌ An error occurred while listing the auto roles.',
            ephemeral: true
        });
    }
}

async function createRolePanel(interaction, client) {
    const title = interaction.options.getString('title') || '🎭 Role Selection';
    const description = interaction.options.getString('description') || 'Click the buttons below to receive or remove roles.';
    
    try {
        const guildId = interaction.guild.id;
        const roleButtons = client.roleButtons.get(guildId) || [];
        
        if (roleButtons.length === 0) {
            return interaction.reply({
                content: '❌ No roles have been added to the panel yet. Add roles using `/autorole add`.',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
        
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;
        
        for (const roleButton of roleButtons) {
            if (buttonCount === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }
            
            const role = interaction.guild.roles.cache.get(roleButton.roleId);
            
            if (!role) continue;
            
            const button = new ButtonBuilder()
                .setCustomId(`role_${role.id}`)
                .setLabel(role.name)
                .setStyle(ButtonStyle.Primary);
                
            if (roleButton.emoji) {
                button.setEmoji(roleButton.emoji);
            }
            
            currentRow.addComponents(button);
            buttonCount++;
        }
        
        if (buttonCount > 0) {
            rows.push(currentRow);
        }
        
        await interaction.channel.send({ embeds: [embed], components: rows });
        await interaction.reply({
            content: '✅ Role selection panel created successfully!',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error creating role panel:', error);
        await interaction.reply({
            content: '❌ An error occurred while creating the role panel.',
            ephemeral: true
        });
    }
}

async function addRoleToSelection(interaction, client) {
    const role = interaction.options.getRole('role');
    const description = interaction.options.getString('description') || '';
    const emoji = interaction.options.getString('emoji') || '';
    
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: `❌ I cannot assign roles that are higher than or equal to my highest role.`,
            ephemeral: true
        });
    }
    
    try {
        const guildId = interaction.guild.id;
        
        if (!client.roleButtons.has(guildId)) {
            client.roleButtons.set(guildId, []);
        }
        
        const roleButtons = client.roleButtons.get(guildId);
        
        if (roleButtons.length >= 25) {
            return interaction.reply({
                content: '❌ You can only have up to 25 roles in a panel.',
                ephemeral: true
            });
        }
        
        if (roleButtons.some(rb => rb.roleId === role.id)) {
            return interaction.reply({
                content: '❌ This role is already in the panel.',
                ephemeral: true
            });
        }
        
        const roleData = {
            roleId: role.id,
            description,
            emoji
        };
        
        await addRoleToPanel(guildId, roleData, client);
        
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Role Added')
            .setDescription(`The ${role} role has been added to the panel.`)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error adding role to panel:', error);
        await interaction.reply({
            content: '❌ An error occurred while adding the role to the panel.',
            ephemeral: true
        });
    }
} 