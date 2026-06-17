const { EmbedBuilder } = require('discord.js');
const { createTicket } = require('../utils/ticketUtils');
const TicketConfig = require('../database/models/TicketConfig');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Skip non-select menu interactions
        if (!interaction.isStringSelectMenu()) return;
        
        // Get the select menu customId
        const { customId, values } = interaction;
        
        try {
            // Handle game selection menu
            if (customId === 'game_select') {
                await handleGameSelect(interaction, values[0], client);
                return;
            }
            
            // Handle help category menu
            if (customId === 'help_category_menu') {
                await handleHelpCategorySelect(interaction, values[0], client);
                return;
            }

            // Handle ticket type selection
            if (customId === 'create_ticket') {
                await handleTicketTypeSelect(interaction, values[0], client);
                return;
            }

            // Add more select menu handlers here
            
        } catch (error) {
            console.error(`Error handling select menu interaction:`, error);
            
            // Handle error response
            try {
                // Only reply if hasn't been replied to
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while processing this selection.',
                        ephemeral: true
                    });
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.followUp({
                        content: 'An error occurred while processing this selection.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    },
};

// Handle game selection
async function handleGameSelect(interaction, gameValue, client) {
    try {
        // Handle different game selections
        switch (gameValue) {
            case 'tictactoe':
                await interaction.reply({
                    content: 'Please use the `/tictactoe` command and mention an opponent to play with!',
                    ephemeral: true
                });
                break;
                
            case 'connect4':
                await interaction.reply({
                    content: 'Please use the `/connect4` command and mention an opponent to play with!',
                    ephemeral: true
                });
                break;
                
            case 'hangman':
                // Simulate hangman game start
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#3498db')
                            .setTitle('🪢 Hangman Game')
                            .setDescription('Use the `/hangman` command to start a proper game of Hangman!')
                            .addFields(
                                { name: 'How to Play', value: 'Guess letters to uncover a hidden word.' },
                                { name: 'Difficulty Levels', value: 'Easy, Medium, and Hard' }
                            )
                    ],
                    ephemeral: true
                });
                break;
                
            case 'wordsearch':
                await interaction.reply({
                    content: 'Use the `/wordsearch` command to start a Word Search game!',
                    ephemeral: true
                });
                break;
                
            case 'trivia':
                await interaction.reply({
                    content: 'Use the `/trivia` command to start a Trivia game!',
                    ephemeral: true
                });
                break;
                
            default:
                await interaction.reply({
                    content: `Game "${gameValue}" is not available yet. Please try another game!`,
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('Error handling game select:', error);
        throw error; // Rethrow to be caught by the main handler
    }
}

// Handle help category select
async function handleHelpCategorySelect(interaction, categoryValue, client) {
    try {
        // Get the help command
        const helpCommand = client.commands.get('help');
        if (!helpCommand) {
            return await interaction.update({
                content: 'Help command not found.',
                components: []
            });
        }

        // Call the showCategoryCommands function
        const helpModule = require('../commands/public/help');
        
        // Create a fake interaction object with the category option to pass directly to showCategoryCommands
        const fakeInteraction = {
            ...interaction,
            isChatInputCommand: () => false,
            isButton: () => false,
            isStringSelectMenu: () => true,
            options: {
                getString: (name) => {
                    if (name === 'category') return categoryValue;
                    return null;
                }
            }
        };

        await helpModule.showCategoryCommands(fakeInteraction, categoryValue, client);
    } catch (error) {
        console.error('Error handling help category select:', error);
        
        // This error will be caught by the main handler in the module.exports section
        throw error;
    }
}

// Handle ticket type selection
async function handleTicketTypeSelect(interaction, typeId, client) {
    try {
        // Find the ticket type in the config
        const ticketConfig = await TicketConfig.findOne({ guildId: interaction.guild.id });
        if (!ticketConfig) {
            await interaction.reply({
                content: '❌ | Ticket system is not set up for this server.',
                ephemeral: true
            });
            return;
        }

        let selectedType;
        if (typeId === 'default') {
            selectedType = {
                name: 'General Support',
                description: 'General support ticket'
            };
        } else {
            selectedType = ticketConfig.ticketTypes.find(type => 
                type.name.toLowerCase().replace(/\s+/g, '_') === typeId
            );
            if (!selectedType) {
                await interaction.reply({
                    content: '❌ | Invalid ticket type selected.',
                    ephemeral: true
                });
                return;
            }
        }

        // Create the ticket with required fields
        const ticketData = {
            title: `${selectedType.name} Ticket`,
            description: selectedType.description || 'No description provided',
            priority: 'medium',
            category: selectedType.name
        };

        // Create ticket and handle response
        const result = await createTicket(interaction, selectedType.name, client, ticketData);
        
        // Only reply if createTicket hasn't handled the response
        if (!result.responded) {
            await interaction.reply({
                content: result.success ? `✅ | ${result.message}` : `❌ | ${result.message}`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error handling ticket type select:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ | An error occurred while creating the ticket.',
                ephemeral: true
            });
        }
    }
}