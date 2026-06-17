const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelType,
    StringSelectMenuBuilder
} = require('discord.js');
const { 
    createTicket, 
    closeTicket, 
    createTranscript, 
    deleteTicket, 
    addUserToTicket, 
    removeUserFromTicket, 
    reopenTicket,
    claimTicket,
    unclaimTicket,
    setTicketPriority,
    getTicketCategories,
    lockTicket,
    unlockTicket
} = require('../../utils/ticketUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the ticket system')
        
        // Setup subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup the ticket system')
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('The category to create tickets in')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory))
                .addChannelOption(option =>
                    option.setName('log-channel')
                        .setDescription('Channel for ticket logs')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText))
                .addRoleOption(option =>
                    option.setName('support-role')
                        .setDescription('Role for support staff')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('welcome-message')
                        .setDescription('Message to send when a ticket is created')
                        .setRequired(false)))
        
        // Create panel subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Create a ticket panel in the current channel')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title for the ticket panel')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description for the ticket panel')
                        .setRequired(false)))
        
        // Add subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to a ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add to the ticket')
                        .setRequired(true)))
        
        // Remove subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from a ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove from the ticket')
                        .setRequired(true)))
        
        // Close subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for closing the ticket')
                        .setRequired(false)))
        
        // Reopen subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('reopen')
                .setDescription('Reopen a closed ticket'))
        
        // Transcript subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('transcript')
                .setDescription('Generate a transcript of the current ticket'))
        
        // Delete subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete the current ticket permanently'))
                
        // Claim subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('claim')
                .setDescription('Claim the current ticket as a staff member'))
                
        // Unclaim subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('unclaim')
                .setDescription('Unclaim the current ticket'))
                
        // Priority subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('priority')
                .setDescription('Set the priority of the current ticket')
                .addStringOption(option =>
                    option.setName('level')
                        .setDescription('The priority level')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 Low', value: 'low' },
                            { name: '🟡 Medium', value: 'medium' },
                            { name: '🟠 High', value: 'high' },
                            { name: '🔴 Urgent', value: 'urgent' }
                        )))
                        
        // Lock subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('Lock the current ticket to prevent users from sending messages'))
                
        // Unlock subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Unlock the current ticket to allow users to send messages again'))
        
        // Set permission for the command
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        // Handle different subcommands
        switch (subcommand) {
            case 'setup':
                await setupTicketSystem(interaction, client);
                break;
            case 'panel':
                await createTicketPanel(interaction, client);
                break;
            case 'add':
                const userToAdd = interaction.options.getUser('user');
                await addUserToTicket(interaction, userToAdd);
                break;
            case 'remove':
                const userToRemove = interaction.options.getUser('user');
                await removeUserFromTicket(interaction, userToRemove);
                break;
            case 'close':
                await closeTicket(interaction);
                break;
            case 'reopen':
                await reopenTicket(interaction);
                break;
            case 'transcript':
                await createTranscript(interaction);
                break;
            case 'delete':
                await deleteTicket(interaction);
                break;
            case 'claim':
                await claimTicket(interaction);
                break;
            case 'unclaim':
                await unclaimTicket(interaction);
                break;
            case 'priority':
                const priority = interaction.options.getString('level');
                await setTicketPriority(interaction, priority);
                break;
            case 'lock':
                await lockTicket(interaction);
                break;
            case 'unlock':
                await unlockTicket(interaction);
                break;
        }
    }
};

// Setup ticket system
async function setupTicketSystem(interaction, client) {
    try {
        // Get options
        const category = interaction.options.getChannel('category');
        const logChannel = interaction.options.getChannel('log-channel');
        const supportRole = interaction.options.getRole('support-role');
        const welcomeMessage = interaction.options.getString('welcome-message') || 
            'Thank you for creating a ticket! Support staff will be with you shortly.';
        
        // Save ticket configuration to database (simulated)
        const ticketConfig = {
            guildId: interaction.guild.id,
            enabled: true,
            categoryId: category.id,
            logChannelId: logChannel.id,
            supportRoleId: supportRole.id,
            welcomeMessage: welcomeMessage,
            ticketCounter: 0,
            ticketNameFormat: 'ticket-{username}-{id}'
        };
        
        // Store in "database" (for this example, we'll just log it)
        console.log('Ticket system configured:', ticketConfig);
        
        // Send success message
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ Ticket System Setup')
            .setDescription('The ticket system has been successfully configured.')
            .addFields(
                { name: 'Category', value: `${category}`, inline: true },
                { name: 'Log Channel', value: `${logChannel}`, inline: true },
                { name: 'Support Role', value: `${supportRole}`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error setting up ticket system:', error);
        await interaction.reply({ 
            content: '❌ An error occurred while setting up the ticket system.', 
            ephemeral: true 
        });
    }
}

// Create ticket panel
async function createTicketPanel(interaction, client) {
    try {
        const title = interaction.options.getString('title') || '🎫 Create a Ticket';
        const description = interaction.options.getString('description') || 
            'Select a category below to create a support ticket.';
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(title)
            .setDescription(description)
            .setFooter({ 
                text: interaction.guild.name, 
                iconURL: interaction.guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();
        
        // Get ticket categories
        const categories = getTicketCategories();
        
        // Create select menu for ticket types
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('create_ticket_menu')
                    .setPlaceholder('Select ticket type')
                    .addOptions(
                        Object.values(categories).map(category => ({
                            label: category.name,
                            value: category.name.toLowerCase().replace(/\s+/g, '_'),
                            description: category.description,
                            emoji: category.emoji
                        }))
                    )
            );
        
        // Send panel
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ 
            content: '✅ Ticket panel created successfully!', 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error creating ticket panel:', error);
        await interaction.reply({ 
            content: '❌ An error occurred while creating the ticket panel.', 
            ephemeral: true 
        });
    }
} 