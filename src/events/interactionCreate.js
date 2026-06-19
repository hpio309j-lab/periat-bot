const { Events, InteractionType, Collection, EmbedBuilder, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { 
    createTicket, 
    closeTicket, 
    createTranscript, 
    deleteTicket, 
    confirmDelete, 
    reopenTicket, 
    claimTicket,
    unclaimTicket,
    setTicketPriority,
    getTicketCategories,
    lockTicket,
    unlockTicket,
    showAddUserModal,
    processAddUserModal
} = require('../utils/ticketUtils');
const { handleRoleButtonInteraction } = require('../utils/autoRoleUtils');
const { 
    createFeedbackModal,
    handleFeedbackCategorySelect,
    handleFeedbackAnonymousSelect,
    submitFeedback,
    handleFeedbackResponse,
    submitFeedbackResponse,
    updateFeedbackStatus
} = require('../utils/feedbackUtils');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                await handleCommand(interaction, client);
            } else if (interaction.isButton()) {
                await handleButtonInteraction(interaction, client);
            } else if (interaction.isStringSelectMenu()) {
                await handleSelectMenuInteraction(interaction, client);
            } else if (interaction.isModalSubmit()) {
                await handleModalSubmit(interaction, client);
            }
        } catch (error) {
            console.error('Error in interactionCreate event:', error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while processing this interaction.',
                        ephemeral: true
                    });
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.followUp({
                        content: 'An error occurred while processing this interaction.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    }
};

// Handle slash commands
async function handleCommand(interaction, client) {
    try {
        const commandName = interaction.commandName;
        console.log(`Executing command: ${commandName}`);
        
        const command = client.commands.get(commandName);
        
        console.log(`Interaction state before execution - replied: ${interaction.replied}, deferred: ${interaction.deferred}`);
        
        if (!command) {
            console.error(`Command '${commandName}' not found.`);
            return await interaction.reply({ 
                content: 'This command does not exist or has been disabled.',
                ephemeral: true 
            });
        }
        
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;
        
        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                
                return await interaction.reply({
                    content: `Please wait ${timeLeft.toFixed(1)} more second(s) before using the '${command.data.name}' command again.`,
                    ephemeral: true
                });
            }
        }
        
        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            
            try {
                if (interaction.replied) {
                    try {
                        await interaction.followUp({ 
                            content: 'There was an error executing this command.',
                            ephemeral: true 
                        });
                    } catch (followUpError) {
                        console.warn('Could not follow up after error:', followUpError.message);
                    }
                } else if (interaction.deferred) {
                    try {
                        await interaction.editReply({ 
                            content: 'There was an error executing this command.' 
                        });
                    } catch (editError) {
                        console.warn('Could not edit reply after error:', editError.message);
                    }
                } else {
                    try {
                        await interaction.reply({ 
                            content: 'There was an error executing this command.',
                            ephemeral: true 
                        });
                    } catch (replyError) {
                        if (replyError.code === 10062) {
                            console.warn('Interaction expired before reply could be sent');
                        } else if (replyError.code === 40060) {
                            console.warn('Interaction was already acknowledged');
                        } else {
                            console.error('Error replying to command error:', replyError);
                        }
                    }
                }
            } catch (outerError) {
                console.error('Unhandled error in error handling:', outerError);
            }
        }
    } catch (error) {
        console.error('Error in handleCommand function:', error);
    }
}

// Handle modal submissions
async function handleModalSubmit(interaction, client) {
    const modalId = interaction.customId;
    
    if (modalId === 'add_user_modal') {
        await processAddUserModal(interaction);
    } else if (modalId.startsWith('feedback_submit_')) {
        await submitFeedback(interaction, client);
    } else if (modalId.startsWith('feedback_response_')) {
        await submitFeedbackResponse(interaction, client);
    }
}

// Handle button interactions
async function handleButtonInteraction(interaction, client) {
    try {
        const customId = interaction.customId;
        
        if (await handleRoleButtonInteraction(interaction, client)) {
            return;
        }
        
        if (customId === 'feedback') {
            await createFeedbackModal(interaction, client);
            return;
        }
        
        if (customId === 'feedback_anonymous_yes') {
            await handleFeedbackAnonymousSelect(interaction, client, true);
            return;
        }
        
        if (customId === 'feedback_anonymous_no') {
            await handleFeedbackAnonymousSelect(interaction, client, false);
            return;
        }
        
        if (customId.startsWith('feedback_respond_')) {
            await handleFeedbackResponse(interaction, client);
            return;
        }
        
        if (customId.startsWith('feedback_status_')) {
            await updateFeedbackStatus(interaction, client);
            return;
        }
        
        // Ticket creation buttons
        if (customId.startsWith('create_') && customId.endsWith('_ticket')) {
            const ticketType = customId.replace('create_', '').replace('_ticket', '');
            const formattedType = ticketType
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            await createTicket(interaction, formattedType + ' Support', client);
            return;
        }
        
        // Handle ticket management buttons
        switch (customId) {
            case 'ticket_close':
                await closeTicket(interaction);
                break;
            case 'ticket_reopen':
                await reopenTicket(interaction);
                break;
            case 'ticket_transcript':
                await createTranscript(interaction);
                break;
            case 'ticket_delete':
                await deleteTicket(interaction);
                break;
            case 'confirm_delete':
                await confirmDelete(interaction);
                break;
            case 'cancel_delete':
                await interaction.update({
                    content: '❌ Ticket deletion cancelled.',
                    embeds: [],
                    components: [],
                    ephemeral: true
                });
                break;
            case 'ticket_claim':
                await claimTicket(interaction);
                break;
            case 'ticket_unclaim':
                await unclaimTicket(interaction);
                break;
            case 'ticket_lock':
                await lockTicket(interaction);
                break;
            case 'ticket_unlock':
                await unlockTicket(interaction);
                break;
            case 'ticket_add_user':
                await showAddUserModal(interaction);
                break;
        }
    } catch (error) {
        console.error('Error handling button interaction:', error);
    }
}

// Handle select menu interactions
async function handleSelectMenuInteraction(interaction, client) {
    const customId = interaction.customId;
    
    if (customId === 'feedback_category') {
        await handleFeedbackCategorySelect(interaction, client);
        return;
    }
    
    if (customId === 'create_ticket_menu') {
        const selectedValue = interaction.values[0];
        const categories = getTicketCategories();
        
        const selectedCategory = Object.values(categories).find(
            cat => cat.name.toLowerCase().replace(/\s+/g, '_') === selectedValue
        );
        
        if (selectedCategory) {
            await createTicket(interaction, selectedCategory.name, client);
        } else {
            await interaction.reply({
                content: '❌ Invalid ticket category selected.',
                ephemeral: true
            });
        }
        return;
    }
    
    if (customId === 'ticket_priority') {
        const selectedPriority = interaction.values[0];
        await setTicketPriority(interaction, selectedPriority);
        return;
    }
}