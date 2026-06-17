const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Ticket categories with emojis and descriptions
const TICKET_CATEGORIES = {
    GENERAL: {
        name: 'General Support',
        emoji: '🔧',
        description: 'Get help with general questions',
        color: '#3498db'
    },
    TECHNICAL: {
        name: 'Technical Support',
        emoji: '💻',
        description: 'Get help with technical issues',
        color: '#2ecc71'
    },
    REPORT: {
        name: 'Report User',
        emoji: '🛡️',
        description: 'Report a user breaking rules',
        color: '#e74c3c'
    },
    BILLING: {
        name: 'Billing Issues',
        emoji: '💰',
        description: 'Get help with payment or subscription issues',
        color: '#f1c40f'
    },
    FEATURE: {
        name: 'Feature Request',
        emoji: '✨',
        description: 'Suggest new features or improvements',
        color: '#9b59b6'
    },
    BUG: {
        name: 'Bug Report',
        emoji: '🐛',
        description: 'Report bugs or technical problems',
        color: '#e67e22'
    }
};

// Create a new ticket
async function createTicket(interaction, ticketType, client) {
    try {
        // Defer the reply to give time for processing
        await interaction.deferReply({ ephemeral: true });

        // Check if user already has an open ticket
        const existingTicket = interaction.guild.channels.cache.find(
            channel => channel.name.includes(interaction.user.username.toLowerCase()) && 
                      channel.name.startsWith('ticket-')
        );

        if (existingTicket) {
            return interaction.editReply({
                content: `❌ You already have an open ticket: ${existingTicket}`,
                ephemeral: true
            });
        }
        
        // Get ticket counter or create one
        let ticketCounter = 1;
        // In a real implementation, you would get this from a database
        
        // Get category info
        const categoryInfo = Object.values(TICKET_CATEGORIES).find(cat => cat.name === ticketType) || TICKET_CATEGORIES.GENERAL;

        // Create ticket channel
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username.toLowerCase()}-${ticketCounter}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ]
        });

        // Find support role and give access
        const supportRole = interaction.guild.roles.cache.find(role => 
            role.name.toLowerCase().includes('support') || role.name.toLowerCase().includes('staff')
        );
        
        if (supportRole) {
            await ticketChannel.permissionOverwrites.create(supportRole, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                EmbedLinks: true
            });
        }
        
        // Create welcome embed
        const embed = new EmbedBuilder()
            .setColor(categoryInfo.color)
            .setTitle(`${categoryInfo.emoji} ${ticketType} Ticket`)
            .setDescription('Thank you for creating a ticket! Support staff will be with you shortly.')
            .addFields(
                { name: 'User', value: `${interaction.user}`, inline: true },
                { name: 'Type', value: ticketType, inline: true },
                { name: 'Status', value: '🟢 Open', inline: true }
            )
            .setTimestamp();

        // Create primary action buttons row
        const primaryRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim')
                    .setEmoji('👋')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_add_user')
                    .setLabel('Add User')
                    .setEmoji('👥')
                    .setStyle(ButtonStyle.Success)
            );
        
        // Create secondary action buttons row
        const secondaryRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Transcript')
                    .setEmoji('📑')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_lock')
                    .setLabel('Lock')
                    .setEmoji('🔐')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_delete')
                    .setLabel('Delete')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Create priority select menu
        const priorityRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_priority')
                    .setPlaceholder('Set ticket priority')
                    .addOptions([
                        {
                            label: 'Low',
                            value: 'low',
                            description: 'Low priority issue',
                            emoji: '🟢'
                        },
                        {
                            label: 'Medium',
                            value: 'medium',
                            description: 'Medium priority issue',
                            emoji: '🟡'
                        },
                        {
                            label: 'High',
                            value: 'high',
                            description: 'High priority issue',
                            emoji: '🟠'
                        },
                        {
                            label: 'Urgent',
                            value: 'urgent',
                            description: 'Urgent priority issue',
                            emoji: '🔴'
                        }
                    ])
            );
        
        // Send welcome message in ticket channel
        await ticketChannel.send({
            content: `Welcome ${interaction.user}! Please describe your issue and wait for support staff.`,
            embeds: [embed],
            components: [primaryRow, secondaryRow, priorityRow]
        });
        
        // Reply to user
        return interaction.editReply({
            content: `✅ Your ticket has been created: ${ticketChannel}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        if (interaction.deferred) {
            return interaction.editReply({
                content: '❌ An error occurred while creating your ticket.',
                ephemeral: true
            });
        } else {
            return interaction.reply({
                content: '❌ An error occurred while creating your ticket.',
                ephemeral: true
            });
        }
    }
}

// Close a ticket
async function closeTicket(interaction) {
    try {
        const channel = interaction.channel;
        const reason = interaction.options?.getString('reason') || 'No reason provided';
        
        // Check if channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: '❌ This command can only be used in ticket channels!',
                ephemeral: true
            });
        }
        
        // Create closed embed
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('Ticket Closed')
            .setDescription(`This ticket has been closed by ${interaction.user}`)
            .addFields(
                { name: 'Reason', value: reason }
            )
            .setTimestamp();
        
        // Create button row
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_delete')
                    .setLabel('Delete Ticket')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Save Transcript')
                    .setEmoji('📑')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_reopen')
                    .setLabel('Reopen')
                    .setEmoji('🔓')
                    .setStyle(ButtonStyle.Success)
            );
        
        // Update channel permissions
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: false
        });
        
        // Get ticket creator from channel name
        const ticketUsername = channel.name.split('-')[1];
        const ticketCreator = interaction.guild.members.cache.find(
            member => member.user.username.toLowerCase() === ticketUsername.toLowerCase()
        );
        
        if (ticketCreator) {
            await channel.permissionOverwrites.edit(ticketCreator.user, {
                SendMessages: false
            });
        }
        
        // Reply with closed message
        return interaction.reply({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error closing ticket:', error);
        return interaction.reply({
            content: '❌ An error occurred while closing the ticket.',
            ephemeral: true
        });
    }
}

// Create a transcript
async function createTranscript(interaction) {
    try {
        await interaction.reply({
            content: '📑 Creating transcript... This may take a moment.',
            ephemeral: true
        });
        
        // In a real implementation, you would use discord-html-transcripts
        // For this example, we'll just simulate it
        
        setTimeout(async () => {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('Ticket Transcript')
                .setDescription(`Transcript for ticket ${interaction.channel.name}`)
                .setTimestamp();
            
            await interaction.editReply({
                content: '✅ Transcript created successfully!',
                embeds: [embed],
                ephemeral: true
            });
        }, 2000);
    } catch (error) {
        console.error('Error creating transcript:', error);
        return interaction.reply({
            content: '❌ An error occurred while creating the transcript.',
            ephemeral: true
        });
    }
}

// Delete a ticket
async function deleteTicket(interaction) {
    try {
        // Confirm deletion
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_delete')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_delete')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('⚠️ Delete Ticket')
            .setDescription('Are you sure you want to delete this ticket? This action cannot be undone.')
                    .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        return interaction.reply({
            content: '❌ An error occurred while deleting the ticket.',
            ephemeral: true
                });
            }
        }

// Confirm ticket deletion
async function confirmDelete(interaction) {
    try {
        await interaction.update({
            content: '🗑️ Deleting ticket...',
            embeds: [],
            components: [],
            ephemeral: true
        });
        
        // Delete the channel after a short delay
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error('Error deleting channel:', error);
            }
        }, 2000);
    } catch (error) {
        console.error('Error confirming deletion:', error);
        return interaction.reply({
            content: '❌ An error occurred while deleting the ticket.',
            ephemeral: true
        });
    }
}

// Add user to ticket
async function addUserToTicket(interaction, user) {
    try {
        const channel = interaction.channel;
        
        // Check if current channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Add user to channel
        await channel.permissionOverwrites.create(user, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
        
        return interaction.reply({ 
            content: `✅ ${user} has been added to the ticket.` 
        });
    } catch (error) {
        console.error('Error adding user to ticket:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while adding the user to the ticket.', 
            ephemeral: true 
        });
    }
}

// Remove user from ticket
async function removeUserFromTicket(interaction, user) {
    try {
        const channel = interaction.channel;
        
        // Check if current channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Remove user from channel
        await channel.permissionOverwrites.delete(user);
        
        return interaction.reply({ 
            content: `✅ ${user} has been removed from the ticket.` 
        });
    } catch (error) {
        console.error('Error removing user from ticket:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while removing the user from the ticket.', 
            ephemeral: true 
        });
    }
}

// Reopen ticket
async function reopenTicket(interaction) {
    try {
        const channel = interaction.channel;
        
        // Check if current channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Update channel permissions
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: false
        });
        
        // Get ticket creator (from channel name)
        const ticketUsername = channel.name.split('-')[1];
        const ticketCreator = interaction.guild.members.cache.find(
            member => member.user.username.toLowerCase() === ticketUsername.toLowerCase()
        );
        
        if (ticketCreator) {
            await channel.permissionOverwrites.edit(ticketCreator.user, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }
        
        // Create reopened embed
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Ticket Reopened')
            .setDescription(`This ticket has been reopened by ${interaction.user}`)
            .setTimestamp();

        // Create button row
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim Ticket')
                    .setEmoji('👋')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Transcript')
                    .setEmoji('📑')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        return interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error reopening ticket:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while reopening the ticket.', 
            ephemeral: true 
        });
    }
}

// Claim a ticket
async function claimTicket(interaction) {
    try {
        const channel = interaction.channel;
        
        // Check if current channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Create claimed embed
        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('Ticket Claimed')
            .setDescription(`This ticket has been claimed by ${interaction.user}`)
            .addFields(
                { name: 'Staff Member', value: `${interaction.user}`, inline: true },
                { name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        // Create button row
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Transcript')
                    .setEmoji('📑')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_unclaim')
                    .setLabel('Unclaim')
                    .setEmoji('↩️')
                    .setStyle(ButtonStyle.Primary)
            );
        
        return interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error claiming ticket:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while claiming the ticket.', 
            ephemeral: true 
        });
    }
}

// Unclaim a ticket
async function unclaimTicket(interaction) {
    try {
        const channel = interaction.channel;
        
        // Check if current channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Create unclaimed embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('Ticket Unclaimed')
            .setDescription(`This ticket has been unclaimed by ${interaction.user}`)
            .setTimestamp();

        // Create button row
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim Ticket')
                    .setEmoji('👋')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Transcript')
                    .setEmoji('📑')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        return interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error unclaiming ticket:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while unclaiming the ticket.', 
            ephemeral: true 
        });
    }
}

// Set ticket priority
async function setTicketPriority(interaction, priority) {
    try {
        const channel = interaction.channel;
        
        // Check if current channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Priority emojis and colors
        const priorities = {
            low: { emoji: '🟢', color: '#2ecc71', name: 'Low' },
            medium: { emoji: '🟡', color: '#f1c40f', name: 'Medium' },
            high: { emoji: '🟠', color: '#e67e22', name: 'High' },
            urgent: { emoji: '🔴', color: '#e74c3c', name: 'Urgent' }
        };
        
        const priorityInfo = priorities[priority] || priorities.medium;
        
        // Create priority embed
        const embed = new EmbedBuilder()
            .setColor(priorityInfo.color)
            .setTitle(`Priority Updated: ${priorityInfo.emoji} ${priorityInfo.name}`)
            .setDescription(`Ticket priority has been set to ${priorityInfo.name} by ${interaction.user}`)
            .setTimestamp();
        
        return interaction.reply({ 
            embeds: [embed]
        });
    } catch (error) {
        console.error('Error setting ticket priority:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while setting the ticket priority.', 
            ephemeral: true 
        });
    }
}

// Get all ticket categories
function getTicketCategories() {
    return TICKET_CATEGORIES;
}

// Lock a ticket
async function lockTicket(interaction) {
    try {
        const channel = interaction.channel;
        
        // Check if current channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Get ticket creator from channel name
        const ticketUsername = channel.name.split('-')[1];
        const ticketCreator = interaction.guild.members.cache.find(
            member => member.user.username.toLowerCase() === ticketUsername.toLowerCase()
        );
        
        // Update channel permissions for ticket creator
        if (ticketCreator) {
            await channel.permissionOverwrites.edit(ticketCreator.user, {
                SendMessages: false
            });
        }
        
        // Create locked embed
        const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('Ticket Locked')
            .setDescription(`This ticket has been locked by ${interaction.user}. Users can no longer send messages.`)
            .setTimestamp();
        
        // Create button row with unlock option
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_unlock')
                    .setLabel('Unlock')
                    .setEmoji('🔓')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Transcript')
                    .setEmoji('📑')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        return interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error locking ticket:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while locking the ticket.', 
            ephemeral: true 
        });
    }
}

// Unlock a ticket
async function unlockTicket(interaction) {
    try {
        const channel = interaction.channel;
        
        // Check if current channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Get ticket creator from channel name
        const ticketUsername = channel.name.split('-')[1];
        const ticketCreator = interaction.guild.members.cache.find(
            member => member.user.username.toLowerCase() === ticketUsername.toLowerCase()
        );
        
        // Update channel permissions for ticket creator
        if (ticketCreator) {
            await channel.permissionOverwrites.edit(ticketCreator.user, {
                SendMessages: true
            });
        }
        
        // Create unlocked embed
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Ticket Unlocked')
            .setDescription(`This ticket has been unlocked by ${interaction.user}. Users can now send messages again.`)
            .setTimestamp();
        
        // Create button row with lock option
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_lock')
                    .setLabel('Lock')
                    .setEmoji('🔐')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Transcript')
                    .setEmoji('📑')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        return interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error unlocking ticket:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while unlocking the ticket.', 
            ephemeral: true 
        });
    }
}

// Show add user modal
async function showAddUserModal(interaction) {
    try {
        // Check if current channel is a ticket
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: '❌ This command can only be used in ticket channels!', 
                ephemeral: true 
            });
        }
        
        // Create a modal
        const modal = new ModalBuilder()
            .setCustomId('add_user_modal')
            .setTitle('Add User to Ticket');
        
        // Add input components
        const userIdInput = new TextInputBuilder()
            .setCustomId('user_id')
            .setLabel('User ID or @mention')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter user ID or @mention')
            .setRequired(true);
        
        // Add inputs to the modal
        const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
        modal.addComponents(firstActionRow);
        
        // Show the modal
        await interaction.showModal(modal);
        
        return;
    } catch (error) {
        console.error('Error showing add user modal:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while showing the modal.', 
            ephemeral: true 
        });
    }
}

// Process add user from modal
async function processAddUserModal(interaction) {
    try {
        // Get the user ID from the modal
        const userId = interaction.fields.getTextInputValue('user_id');
        
        // Extract the user ID if it's a mention
        let cleanUserId = userId.replace(/[<@!>]/g, '');
        
        // Try to fetch the user
        let user;
        try {
            user = await interaction.client.users.fetch(cleanUserId);
        } catch (error) {
            return interaction.reply({
                content: '❌ Invalid user ID. Please provide a valid user ID or mention.',
                ephemeral: true
            });
        }
        
        // Add the user to the ticket
        await interaction.channel.permissionOverwrites.create(user, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
        
        return interaction.reply({
            content: `✅ Successfully added ${user} to the ticket.`,
            ephemeral: false
        });
    } catch (error) {
        console.error('Error processing add user modal:', error);
        return interaction.reply({ 
            content: '❌ An error occurred while adding the user.', 
            ephemeral: true 
        });
    }
}

module.exports = {
    createTicket,
    closeTicket,
    createTranscript,
    deleteTicket,
    confirmDelete,
    addUserToTicket,
    removeUserFromTicket,
    reopenTicket,
    claimTicket,
    unclaimTicket,
    setTicketPriority,
    getTicketCategories,
    lockTicket,
    unlockTicket,
    showAddUserModal,
    processAddUserModal
};
