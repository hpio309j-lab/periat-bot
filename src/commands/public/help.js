const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Helper function to show commands in a specific category
async function showCategoryCommands(interaction, category, client) {
    // Get commands in the category
    const commandsPath = path.join(__dirname, '..', category);
    let commandFiles;
    
    try {
        commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    } catch (error) {
        // Handle different interaction types for errors
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            return interaction.update({ 
                content: `Category "${category}" not found or has no commands.`, 
                embeds: [],
                components: []
            });
        } else {
            return interaction.reply({ 
                content: `Category "${category}" not found or has no commands.`, 
                ephemeral: true 
            });
        }
    }
    
    // Create embed based on category
    const categoryIcons = {
        public: '📚',
        games: '🎮',
        tickets: '🎫',
        giveaway: '🎉',
        moderation: '🛡️',
        music: '🎵'
    };
    
    const categoryNames = {
        public: 'Public Commands',
        games: 'Game Commands',
        tickets: 'Ticket Commands',
        giveaway: 'Giveaway Commands',
        moderation: 'Moderation Commands',
        music: 'Music Commands'
    };

    const categoryColors = {
        public: '#3498db',
        games: '#2ecc71',
        tickets: '#9b59b6',
        giveaway: '#f1c40f',
        moderation: '#e74c3c',
        music: '#8e44ad'
    };
    
    const embed = new EmbedBuilder()
        .setColor(categoryColors[category] || '#3498db')
        .setTitle(`${categoryIcons[category] || '📚'} ${categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
        .setDescription(`Here are the available commands in the ${categoryNames[category] ? categoryNames[category].toLowerCase() : category} category:`)
        .setFooter({ text: `${client.user.username} | Use /help <command> for details on a specific command`, iconURL: client.user.displayAvatarURL() });
    
    // Add each command to the embed
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data && command.data.name) {
            let commandDescription = command.data.description || 'No description provided';
            
            // Handle subcommands
            if (command.data.options && command.data.options.some(opt => opt.type === 1)) {
                // If has subcommands, just list main command and suggest viewing details
                commandDescription += `\n*Use \`/help ${command.data.name}\` to see subcommands*`;
            }
            
            embed.addFields({ name: `/${command.data.name}`, value: commandDescription });
        }
    }
    
    // Create navigation components
    const categoryRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_category_menu')
                .setPlaceholder('Select a command category')
                .addOptions([
                    { label: 'Public Commands', description: 'General utility commands', value: 'public', emoji: '📚' },
                    { label: 'Game Commands', description: 'Fun games to play in your server', value: 'games', emoji: '🎮' },
                    { label: 'Ticket Commands', description: 'Support ticket system', value: 'tickets', emoji: '🎫' },
                    { label: 'Giveaway Commands', description: 'Create and manage giveaways', value: 'giveaway', emoji: '🎉' },
                    { label: 'Moderation Commands', description: 'Keep your server safe and organized', value: 'moderation', emoji: '🛡️' },
                    { label: 'Music Commands', description: 'Play music in voice channels', value: 'music', emoji: '🎵' }
                ])
        );
    
    const buttonsRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('help_home')
                .setLabel('Home')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🏠'),
            new ButtonBuilder()
                .setCustomId('help_all')
                .setLabel('All Commands')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setURL('https://discord.gg/DDeS8m2jus')  // Replace with your actual support server link
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setEmoji('🔗')
        );
    
    // Handle different types of interactions
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        return interaction.update({ embeds: [embed], components: [categoryRow, buttonsRow] });
    } else {
        return interaction.reply({ embeds: [embed], components: [categoryRow, buttonsRow] });
    }
}

// Helper function to show detailed help for a specific command
async function showCommandHelp(interaction, commandName, client) {
    // Search for the command in all categories
    const categories = ['public', 'games', 'tickets', 'giveaway', 'moderation', 'music'];
    let commandFound = false;
    let commandData = null;
    let commandPath = '';
    
    // Look for the command in each category
    for (const category of categories) {
        const categoryPath = path.join(__dirname, '..', category);
        
        try {
            const files = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
            
            for (const file of files) {
                const command = require(path.join(categoryPath, file));
                
                if (command.data && command.data.name === commandName) {
                    commandFound = true;
                    commandData = command.data;
                    commandPath = `${category}/${file}`;
                    break;
                }
            }
            
            if (commandFound) break;
        } catch (error) {
            // Skip if directory doesn't exist
            continue;
        }
    }
    
    if (!commandFound) {
        // Handle different interaction types for errors
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            return interaction.update({ 
                content: `Command "${commandName}" was not found.`, 
                embeds: [],
                components: []
            });
        } else {
            return interaction.reply({
                content: `Command "${commandName}" was not found.`,
                ephemeral: true
            });
        }
    }
    
    // Build the command help embed
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`Command: /${commandName}`)
        .setDescription(commandData.description || 'No description provided');
    
    // Add command options if they exist
    if (commandData.options && commandData.options.length > 0) {
        // Check if command has subcommands
        const hasSubCommands = commandData.options.some(option => option.type === 1);
        
        if (hasSubCommands) {
            // Handle subcommands display
            embed.addFields({ name: '🔹 Subcommands', value: '\u200B' });
            
            for (const option of commandData.options) {
                if (option.type === 1) { // Subcommand
                    let subcommandText = option.description || 'No description provided';
                    
                    // Add subcommand options if they exist
                    if (option.options && option.options.length > 0) {
                        subcommandText += '\n**Options:**';
                        for (const subOption of option.options) {
                            subcommandText += `\n• \`${subOption.name}\`: ${subOption.description || 'No description'}`;
                            if (subOption.required) subcommandText += ' *(required)*';
                        }
                    }
                    
                    embed.addFields({ name: `/${commandName} ${option.name}`, value: subcommandText });
                }
            }
        } else {
            // Handle regular command options
            let optionsText = '';
            
            for (const option of commandData.options) {
                optionsText += `• \`${option.name}\`: ${option.description || 'No description'}`;
                if (option.required) optionsText += ' *(required)*';
                optionsText += '\n';
                
                // If the option has choices, list them
                if (option.choices && option.choices.length > 0) {
                    optionsText += '  **Choices:** ';
                    optionsText += option.choices.map(choice => `\`${choice.name}\``).join(', ');
                    optionsText += '\n';
                }
            }
            
            if (optionsText) {
                embed.addFields({ name: '🔹 Options', value: optionsText });
            }
        }
    }
    
    // Add source file info
    embed.addFields({ name: '🔹 Source', value: `\`${commandPath}\`` });
    
    // Set footer with bot info
    embed.setFooter({ text: `${client.user.username} | Use /help to see all commands`, iconURL: client.user.displayAvatarURL() });
    
    // Create button to go back to help menu
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('help_home')
                .setLabel('Back to Help Menu')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔙')
        );
    
    // Handle different types of interactions
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        return interaction.update({ embeds: [embed], components: [row] });
    } else {
        return interaction.reply({ embeds: [embed], components: [row] });
    }
}

const helpCommand = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands')
        .addStringOption(option => 
            option.setName('category')
                .setDescription('The category of commands to show')
                .setRequired(false)
                .addChoices(
                    { name: 'Public', value: 'public' },
                    { name: 'Games', value: 'games' },
                    { name: 'Tickets', value: 'tickets' },
                    { name: 'Giveaway', value: 'giveaway' },
                    { name: 'Moderation', value: 'moderation' },
                    { name: 'Music', value: 'music' }
                ))
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed help for a specific command')
                .setRequired(false)),
    
    async execute(interaction, client) {
        // Check if this is a button interaction without options
        const isButtonInteraction = interaction.isButton();
        
        // For button interactions, we shouldn't try to get options that don't exist
        let category = null;
        let command = null;
        
        // Only try to get string options if this is a chat command interaction
        if (interaction.isChatInputCommand()) {
            category = interaction.options.getString('category');
            command = interaction.options.getString('command');
        }
        
        if (command) {
            return await showCommandHelp(interaction, command, client);
        }
        
        if (category) {
            return await showCategoryCommands(interaction, category, client);
        }
        
        // Create main help embed
        const helpEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📚 Bot Help Menu')
            .setDescription('Use the dropdown menu below to browse command categories or search for specific commands.')
            .addFields(
                { name: '📚 Public Commands', value: 'General utility commands for all members', inline: true },
                { name: '🎮 Game Commands', value: 'Fun games to play in your server', inline: true },
                { name: '🎫 Ticket Commands', value: 'Advanced support ticket system', inline: true },
                { name: '🎉 Giveaway Commands', value: 'Create and manage giveaways', inline: true },
                { name: '🛡️ Moderation Commands', value: 'Keep your server safe and organized', inline: true },
                { name: '🎵 Music Commands', value: 'Play music in voice channels', inline: true }
            )
            .setImage('https://i.imgur.com/GGKye05.png')
            .setFooter({ text: `${client.user.username} | Use /help <command> for details on a specific command`, iconURL: client.user.displayAvatarURL() });
        
        // Create dropdown menu
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_category_menu')
                    .setPlaceholder('Select a command category')
                    .addOptions([
                        {
                            label: 'Public Commands',
                            description: 'General utility commands',
                            value: 'public',
                            emoji: '📚'
                        },
                        {
                            label: 'Game Commands',
                            description: 'Fun games to play in your server',
                            value: 'games',
                            emoji: '🎮'
                        },
                        {
                            label: 'Ticket Commands',
                            description: 'Support ticket system',
                            value: 'tickets',
                            emoji: '🎫'
                        },
                        {
                            label: 'Giveaway Commands',
                            description: 'Create and manage giveaways',
                            value: 'giveaway',
                            emoji: '🎉'
                        },
                        {
                            label: 'Moderation Commands',
                            description: 'Keep your server safe and organized',
                            value: 'moderation',
                            emoji: '🛡️'
                        },
                        {
                            label: 'Music Commands',
                            description: 'Play music in voice channels',
                            value: 'music',
                            emoji: '🎵'
                        }
                    ])
            );
            
        // Create buttons row
        const buttonsRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_home')
                    .setLabel('Home')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏠'),
                new ButtonBuilder()
                    .setCustomId('help_all')
                    .setLabel('All Commands')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setURL('https://discord.gg/periat')  // Replace with your actual support server link
                    .setLabel('Support Server')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🔗')
            );
        
        // Check if we need to reply or update based on interaction type
        if (isButtonInteraction) {
            await interaction.update({ embeds: [helpEmbed], components: [row, buttonsRow] });
        } else {
            await interaction.reply({ embeds: [helpEmbed], components: [row, buttonsRow] });
        }
    },

    // Export helper functions
    showCategoryCommands,
    showCommandHelp
};

module.exports = helpCommand; 