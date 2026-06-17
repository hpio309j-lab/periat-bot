const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createTicket, closeTicket, claimTicket } = require('../utils/ticketUtils');
const Ticket = require('../database/models/Ticket');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Skip non-button interactions
        if (!interaction.isButton()) return;
        
        // Get the button customId
        const { customId } = interaction;
        
        try {
            // Handle ticket creation buttons
            if (customId.startsWith('ticket_create_')) {
                const ticketType = customId.replace('ticket_create_', '').replace(/_/g, ' ');
                await createTicket(interaction, ticketType, client);
                return;
            }
            
            // Handle ticket claim button
            if (customId === 'ticket_claim') {
                const result = await claimTicket(interaction.channel, interaction.user, client);
                return await interaction.reply({
                    content: result.message,
                    ephemeral: true
                });
            }

            // Handle ticket close button
            if (customId === 'ticket_close') {
                const result = await closeTicket(interaction.channel, interaction.user, client);
                if (!result.success) {
                    return await interaction.reply({
                        content: result.message,
                        ephemeral: true
                    });
                }
                // Don't reply since the channel will be deleted
                return;
            }

            // Handle ticket close button
            if (customId === 'ticket_close') {
                try {
                    // Get the ticket channel
                    const channel = interaction.channel;
                    if (!channel) {
                        return interaction.reply({
                            content: '❌ | Could not find the ticket channel.',
                            ephemeral: true
                        });
                    }
                    
                    // Close the ticket
                    const result = await closeTicket(channel, interaction.user, client);
                    
                    if (result.success) {
                        await interaction.reply({
                            content: '✅ | Ticket closed successfully.',
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: `❌ | ${result.message || 'An error occurred while closing the ticket.'}`,
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    console.error('Error closing ticket:', error);
                    await interaction.reply({
                        content: '❌ | An error occurred while closing the ticket.',
                        ephemeral: true
                    });
                }
                return;
            }
            
            // Handle giveaway buttons
            if (customId.startsWith('giveaway_enter_')) {
                const giveawayId = customId.replace('giveaway_enter_', '');
                await handleGiveawayEntry(interaction, giveawayId, client);
                return;
            }
            
            // Handle quick games
            switch (customId) {
                case 'coinflip':
                    await handleCoinFlip(interaction);
                    break;
                    
                case 'dice':
                    await handleDiceRoll(interaction);
                    break;
                    
                case 'rps':
                    await handleRockPaperScissors(interaction);
                    break;
                    
                case 'create_ticket':
                    await handleCreateTicketButton(interaction);
                    break;
                    
                case 'server_info':
                    await handleServerInfo(interaction);
                    break;
                    
                case 'user_info':
                    await handleUserInfo(interaction);
                    break;
                    
                case 'invite_leaderboard':
                    await handleInviteLeaderboard(interaction);
                    break;
                    
                case 'help_menu':
                    await handleHelpMenu(interaction, client);
                    break;
                    
                case 'bot_info':
                    await handleBotInfo(interaction, client);
                    break;
                    
                case 'help_home':
                    await handleHelpHomeButton(interaction, client);
                    break;
                    
                case 'help_all':
                    await handleHelpAllButton(interaction, client);
                    break;
            }
            
            // Add handler for music control buttons
            if (customId.startsWith('music_')) {
                await handleMusicControls(interaction, client);
                return;
            }

            // Add handler for queue control buttons
            if (customId.startsWith('queue_') || customId === 'music_shuffle' || customId === 'music_loop' || customId === 'music_clear') {
                await handleQueueControls(interaction, client);
                return;
            }
        } catch (error) {
            console.error(`Error handling button interaction: ${error}`);
            
            // Only reply if hasn't been replied to
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while processing this button.',
                    ephemeral: true
                }).catch(err => {}); // Ignore errors when replying to already-replied interactions
            }
        }
    },
};

// Function to handle giveaway entry
async function handleGiveawayEntry(interaction, giveawayId, client) {
    const Giveaway = require('../database/models/Giveaway');
    
    try {
        // Find the giveaway
        const giveaway = await Giveaway.findById(giveawayId);
        
        if (!giveaway || giveaway.ended || giveaway.paused) {
            return interaction.reply({
                content: 'This giveaway is no longer active.',
                ephemeral: true
            });
        }
        
        // Check if user is already entered
        if (giveaway.participants.includes(interaction.user.id)) {
            return interaction.reply({
                content: 'You have already entered this giveaway!',
                ephemeral: true
            });
        }
        
        // Add user to participants
        giveaway.participants.push(interaction.user.id);
        await giveaway.save();
        
        // Reply to user
        await interaction.reply({
            content: `You have successfully entered the giveaway for **${giveaway.prize}**! Good luck!`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling giveaway entry:', error);
        await interaction.reply({
            content: 'An error occurred while entering the giveaway.',
            ephemeral: true
        });
    }
}

// Function to handle coin flip
async function handleCoinFlip(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🪙' : '💿';
    
    const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle(`${emoji} Coin Flip`)
        .setDescription(`${interaction.user} flipped a coin and got: **${result}**!`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

// Function to handle dice roll
async function handleDiceRoll(interaction) {
    const result = Math.floor(Math.random() * 6) + 1;
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const emoji = diceEmojis[result - 1];
    
    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`${emoji} Dice Roll`)
        .setDescription(`${interaction.user} rolled a die and got: **${result}**!`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

// Function to handle rock paper scissors
async function handleRockPaperScissors(interaction) {
    const choices = ['Rock', 'Paper', 'Scissors'];
    const emojis = ['🪨', '📄', '✂️'];
    
    const userIndex = Math.floor(Math.random() * 3);
    const botIndex = Math.floor(Math.random() * 3);
    
    const userChoice = choices[userIndex];
    const botChoice = choices[botIndex];
    
    let result;
    if (userIndex === botIndex) {
        result = "It's a tie!";
    } else if (
        (userIndex === 0 && botIndex === 2) || // Rock beats Scissors
        (userIndex === 1 && botIndex === 0) || // Paper beats Rock
        (userIndex === 2 && botIndex === 1)    // Scissors beats Paper
    ) {
        result = "You win!";
    } else {
        result = "I win!";
    }
    
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('✂️ Rock Paper Scissors')
        .setDescription(`${interaction.user} played Rock Paper Scissors!`)
        .addFields(
            { name: 'You chose', value: `${emojis[userIndex]} ${userChoice}` },
            { name: 'I chose', value: `${emojis[botIndex]} ${botChoice}` },
            { name: 'Result', value: result }
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

// Function to handle create ticket button
async function handleCreateTicketButton(interaction) {
    try {
        // Show ticket category selection
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🎫 Create a Support Ticket')
            .setDescription('Please select the category for your ticket:')
            .setFooter({ text: 'Your ticket will be created in a new channel' });
            
        const TicketConfig = require('../database/models/TicketConfig');
        const ticketConfig = await TicketConfig.findOne({ guildId: interaction.guild.id });
        
        if (!ticketConfig || !ticketConfig.enabled) {
            return interaction.reply({
                content: 'The ticket system is not enabled on this server.',
                ephemeral: true
            });
        }
        
        // Get ticket type descriptions
        const fields = ticketConfig.ticketTypes.map(type => {
            return { name: `${type.emoji || '🎫'} ${type.name}`, value: type.description || 'No description provided.' };
        });
        
        embed.addFields(fields);
        
        // Create buttons for each ticket type
        const rows = [];
        let currentRow = { type: 1, components: [] };
        
        for (let i = 0; i < ticketConfig.ticketTypes.length; i++) {
            const type = ticketConfig.ticketTypes[i];
            
            const button = {
                type: 2,
                custom_id: `ticket_create_${type.name.replace(/\s+/g, '_')}`,
                label: type.name,
                style: 1 // Primary
            };
            
            if (type.emoji) {
                button.emoji = { name: type.emoji };
            }
            
            currentRow.components.push(button);
            
            // Create a new row after 5 buttons or when we reach the end
            if (currentRow.components.length === 5 || i === ticketConfig.ticketTypes.length - 1) {
                rows.push(currentRow);
                currentRow = { type: 1, components: [] };
            }
        }
        
        await interaction.reply({
            embeds: [embed],
            components: rows,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling create ticket button:', error);
        await interaction.reply({
            content: 'An error occurred while creating the ticket.',
            ephemeral: true
        });
    }
}

// Function to handle server info
async function handleServerInfo(interaction) {
    try {
        const guild = interaction.guild;
        
        // Get guild features in a readable format
        const features = guild.features.map(feature => 
            feature.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        );
        
        // Get member stats
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const humanCount = totalMembers - botCount;
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(`${guild.name} - Server Information`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'Server ID', value: guild.id, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Members', value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}`, inline: true },
                { name: 'Channels', value: `Text: ${guild.channels.cache.filter(c => c.type === 0).size}\nVoice: ${guild.channels.cache.filter(c => c.type === 2).size}\nCategories: ${guild.channels.cache.filter(c => c.type === 4).size}`, inline: true },
                { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true }
            )
            .setTimestamp();
            
        // Add server features if any
        if (features.length > 0) {
            embed.addFields({ name: 'Features', value: features.join(', ') });
        }
        
        // Add server banner if any
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling server info:', error);
        await interaction.reply({
            content: 'An error occurred while fetching server information.',
            ephemeral: true
        });
    }
}

// Function to handle user info
async function handleUserInfo(interaction) {
    try {
        const user = interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        
        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id) // Exclude @everyone
            .sort((a, b) => b.position - a.position)
            .map(role => `<@&${role.id}>`)
            .join(', ') || 'None';
        
        const embed = new EmbedBuilder()
            .setColor(member.displayHexColor)
            .setTitle(`${user.username} - User Information`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'User ID', value: user.id, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Display Name', value: member.displayName, inline: true },
                { name: 'Nickname', value: member.nickname || 'None', inline: true },
                { name: 'Roles', value: roles }
            )
            .setTimestamp();
            
        if (user.bannerURL()) {
            embed.setImage(user.bannerURL({ size: 1024 }));
        }
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling user info:', error);
        await interaction.reply({
            content: 'An error occurred while fetching user information.',
            ephemeral: true
        });
    }
}

// Function to handle invite leaderboard
async function handleInviteLeaderboard(interaction) {
    try {
        const GuildConfig = require('../database/schemas/guildConfig');
        const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (!guildConfig || !guildConfig.inviteTracking.enabled) {
            return interaction.reply({
                content: 'Invite tracking is not enabled on this server.',
                ephemeral: true
            });
        }
        
        // Get invites from database
        const invites = guildConfig.inviteTracking.invites || new Map();
        
        // Convert Map to array and sort by uses
        const inviteArray = [];
        for (const [code, data] of Object.entries(invites)) {
            if (data && data.inviter) {
                inviteArray.push({
                    code,
                    uses: data.uses || 0,
                    inviter: data.inviter
                });
            }
        }
        
        inviteArray.sort((a, b) => b.uses - a.uses);
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('🔗 Invite Leaderboard')
            .setDescription('Top inviters in this server:')
            .setTimestamp();
        
        // Add top inviters to embed
        if (inviteArray.length === 0) {
            embed.setDescription('No invites have been tracked yet.');
        } else {
            const topInviters = inviteArray.slice(0, 10); // Get top 10
            
            let description = '';
            for (let i = 0; i < topInviters.length; i++) {
                const invite = topInviters[i];
                description += `**${i + 1}.** <@${invite.inviter}> - ${invite.uses} invites\n`;
            }
            
            embed.setDescription(description);
        }
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling invite leaderboard:', error);
        await interaction.reply({
            content: 'An error occurred while fetching the invite leaderboard.',
            ephemeral: true
        });
    }
}

// Function to handle help menu
async function handleHelpMenu(interaction, client) {
    try {
        // Fetch the help command
        const helpCommand = client.commands.get('help');
        if (!helpCommand) {
            return await interaction.reply({
                content: 'The help command could not be found.',
                ephemeral: true
            });
        }

        // Execute the help command
        await helpCommand.execute(interaction, client);
    } catch (error) {
        console.error('Error handling help menu:', error);
        await interaction.reply({
            content: 'An error occurred while handling the help menu.',
            ephemeral: true
        });
    }
}

// Add handlers for the new help buttons right after the handleHelpMenu function
async function handleHelpHomeButton(interaction, client) {
    try {
        // Fetch the help command and execute it to show home page
        const helpCommand = client.commands.get('help');
        if (!helpCommand) {
            return await interaction.update({
                content: 'The help command could not be found.',
                components: []
            });
        }

        // Execute the help command with no options (home page)
        await helpCommand.execute(interaction, client);
    } catch (error) {
        console.error('Error handling home button:', error);
        await interaction.update({
            content: 'An error occurred while handling the home button.',
            embeds: [],
            components: []
        });
    }
}

async function handleHelpAllButton(interaction, client) {
    try {
        // Create an embed that shows all commands
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const embed = new EmbedBuilder()
            .setTitle('All Commands')
            .setDescription('Here\'s a list of all available commands:')
            .setColor('#0099ff')
            .setThumbnail(client.user.displayAvatarURL());

        // Get all commands
        const commands = [...client.commands.values()];
        
        // Group commands by their folder/category
        const commandsByCategory = {};
        
        for (const command of commands) {
            // Extract category from command filename path if available
            let category = 'Uncategorized';
            
            if (command.data && command.data.name) {
                // Try to determine category from file path
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const categories = ['public', 'games', 'tickets', 'giveaway', 'moderation', 'music'];
                    
                    for (const cat of categories) {
                        const catPath = path.join(__dirname, '..', 'commands', cat);
                        if (fs.existsSync(catPath)) {
                            const files = fs.readdirSync(catPath);
                            if (files.some(file => file.includes(command.data.name))) {
                                category = cat.charAt(0).toUpperCase() + cat.slice(1);
                                break;
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error determining command category:', err);
                }
                
                // Add command to its category
                if (!commandsByCategory[category]) {
                    commandsByCategory[category] = [];
                }
                
                commandsByCategory[category].push(command);
            }
        }
        
        // Add a field for each category with its commands
        for (const [category, categoryCommands] of Object.entries(commandsByCategory)) {
            if (categoryCommands.length === 0) continue;
            
            const commandList = categoryCommands
                .map(cmd => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
                .join('\n');
                
            embed.addFields({
                name: `${category} Commands`,
                value: commandList
            });
        }

        // Add a footer with instructions
        embed.setFooter({
            text: `${client.user.username} • Use /help <command> for detailed help`,
            iconURL: client.user.displayAvatarURL()
        });

        // Add button to go back to help menu
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_home')
                    .setLabel('Back to Help Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        // Send the embed with the button
        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error handling all commands button:', error);
        await interaction.update({
            content: 'An error occurred while displaying all commands.',
            embeds: [],
            components: []
        });
    }
}

// Function to handle bot info
async function handleBotInfo(interaction, client) {
    try {
        const guilds = client.guilds.cache.size;
        const channels = client.channels.cache.size;
        const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        // Calculate uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime % 86400 / 3600);
        const minutes = Math.floor(uptime % 3600 / 60);
        const seconds = Math.floor(uptime % 60);
        
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🤖 Bot Information')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'Bot Name', value: client.user.username, inline: true },
                { name: 'Bot ID', value: client.user.id, inline: true },
                { name: 'Created', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Servers', value: guilds.toString(), inline: true },
                { name: 'Channels', value: channels.toString(), inline: true },
                { name: 'Users', value: users.toString(), inline: true },
                { name: 'Uptime', value: uptimeString, inline: true },
                { name: 'Library', value: 'discord.js', inline: true },
                { name: 'Node.js', value: process.version, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Thanks for using our bot!' });
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling bot info:', error);
        await interaction.reply({
            content: 'An error occurred while fetching bot information.',
            ephemeral: true
        });
    }
}

// Embed builder button handlers
async function handleEmbedSendButton(interaction, client) {
    try {
        // Get the embed from the previous message
        const message = await interaction.message.fetch();
        const embed = message.embeds[0];
        
        if (!embed) {
            return await interaction.reply({
                content: 'Could not find the embed to send.',
                ephemeral: true
            });
        }
        
        // Create a channel selection menu
        const row = new ActionRowBuilder()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('embed_channel_select')
                    .setPlaceholder('Select a channel to send the embed to')
                    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            );
        
        // Store the embed data in a temporary object for later use
        client.embedData = client.embedData || {};
        client.embedData[interaction.user.id] = {
            embed: embed
        };
        
        // Send the channel selection menu
        await interaction.update({
            content: 'Please select a channel to send the embed to:',
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error handling embed send button:', error);
        
        await interaction.reply({
            content: 'An error occurred while preparing to send the embed.',
            ephemeral: true
        });
    }
}

async function handleEmbedAddFieldButton(interaction, client) {
    try {
        // Create a modal for adding a field
        const modal = new ModalBuilder()
            .setCustomId('embed_add_field_modal')
            .setTitle('Add Field to Embed');
        
        // Add field name input
        const nameInput = new TextInputBuilder()
            .setCustomId('field_name')
            .setLabel('Field Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter a name for the field')
            .setRequired(true)
            .setMaxLength(256);
        
        // Add field value input
        const valueInput = new TextInputBuilder()
            .setCustomId('field_value')
            .setLabel('Field Value')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter the content for the field')
            .setRequired(true)
            .setMaxLength(1024);
        
        // Add inline option input
        const inlineInput = new TextInputBuilder()
            .setCustomId('field_inline')
            .setLabel('Inline? (yes/no)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('yes or no')
            .setRequired(false)
            .setValue('no')
            .setMaxLength(3);
        
        // Create action rows
        const nameRow = new ActionRowBuilder().addComponents(nameInput);
        const valueRow = new ActionRowBuilder().addComponents(valueInput);
        const inlineRow = new ActionRowBuilder().addComponents(inlineInput);
        
        // Add inputs to the modal
        modal.addComponents(nameRow, valueRow, inlineRow);
        
        // Store the current message ID for reference
        client.embedData = client.embedData || {};
        client.embedData[interaction.user.id] = {
            messageId: interaction.message.id
        };
        
        // Show the modal
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error handling add field button:', error);
        
        await interaction.reply({
            content: 'An error occurred while preparing to add a field.',
            ephemeral: true
        });
    }
}

async function handleEmbedEditButton(interaction, client) {
    try {
        // Get the embed from the previous message
        const message = await interaction.message.fetch();
        const embed = message.embeds[0];
        
        if (!embed) {
            return await interaction.reply({
                content: 'Could not find the embed to edit.',
                ephemeral: true
            });
        }
        
        // Create a modal for editing the embed
        const modal = new ModalBuilder()
            .setCustomId('embed_edit_modal')
            .setTitle('Edit Embed');
        
        // Add title input
        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter a title for your embed')
            .setRequired(false)
            .setMaxLength(256)
            .setValue(embed.title || '');
        
        // Add description input
        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter a description for your embed')
            .setRequired(false)
            .setMaxLength(4000)
            .setValue(embed.description || '');
        
        // Add color input
        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#3498db')
            .setRequired(false)
            .setMaxLength(7)
            .setValue(embed.hexColor || '#3498db');
        
        // Add footer input
        const footerInput = new TextInputBuilder()
            .setCustomId('embed_footer')
            .setLabel('Embed Footer')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter text for the footer')
            .setRequired(false)
            .setMaxLength(2048)
            .setValue(embed.footer?.text || '');
        
        // Add image URL input
        const imageInput = new TextInputBuilder()
            .setCustomId('embed_image')
            .setLabel('Image URL (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com/image.png')
            .setRequired(false)
            .setValue(embed.image?.url || '');
        
        // Create action rows
        const titleRow = new ActionRowBuilder().addComponents(titleInput);
        const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
        const colorRow = new ActionRowBuilder().addComponents(colorInput);
        const footerRow = new ActionRowBuilder().addComponents(footerInput);
        const imageRow = new ActionRowBuilder().addComponents(imageInput);
        
        // Add inputs to the modal
        modal.addComponents(titleRow, descriptionRow, colorRow, footerRow, imageRow);
        
        // Store the current message ID for reference
        client.embedData = client.embedData || {};
        client.embedData[interaction.user.id] = {
            messageId: interaction.message.id
        };
        
        // Show the modal
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error handling edit button:', error);
        
        await interaction.reply({
            content: 'An error occurred while preparing to edit the embed.',
            ephemeral: true
        });
    }
}

async function handleEmbedCancelButton(interaction, client) {
    // Delete the embed preview and cancel the embed creation
    await interaction.update({
        content: 'Embed creation cancelled.',
        embeds: [],
        components: []
    });
    
    // Clean up any stored data
    if (client.embedData && client.embedData[interaction.user.id]) {
        delete client.embedData[interaction.user.id];
    }
}

async function handleEmbedTemplateEditButton(interaction, client) {
    try {
        // Get the template type from the custom ID
        const templateType = interaction.customId.split('_')[3];
        
        // Get the embed from the previous message
        const message = await interaction.message.fetch();
        const embed = message.embeds[0];
        
        if (!embed) {
            return await interaction.reply({
                content: 'Could not find the template embed to edit.',
                ephemeral: true
            });
        }
        
        // Create a modal for editing the template
        const modal = new ModalBuilder()
            .setCustomId(`embed_template_modal_${templateType}`)
            .setTitle('Edit Template Embed');
        
        // Add title input
        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter a title for your embed')
            .setRequired(false)
            .setMaxLength(256)
            .setValue(embed.title || '');
        
        // Add description input
        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter a description for your embed')
            .setRequired(false)
            .setMaxLength(4000)
            .setValue(embed.description || '');
        
        // Add color input
        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#3498db')
            .setRequired(false)
            .setMaxLength(7)
            .setValue(embed.hexColor || '#3498db');
        
        // Add footer input
        const footerInput = new TextInputBuilder()
            .setCustomId('embed_footer')
            .setLabel('Embed Footer')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter text for the footer')
            .setRequired(false)
            .setMaxLength(2048)
            .setValue(embed.footer?.text || '');
        
        // Add image URL input
        const imageInput = new TextInputBuilder()
            .setCustomId('embed_image')
            .setLabel('Image URL (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com/image.png')
            .setRequired(false)
            .setValue(embed.image?.url || '');
        
        // Create action rows
        const titleRow = new ActionRowBuilder().addComponents(titleInput);
        const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
        const colorRow = new ActionRowBuilder().addComponents(colorInput);
        const footerRow = new ActionRowBuilder().addComponents(footerInput);
        const imageRow = new ActionRowBuilder().addComponents(imageInput);
        
        // Add inputs to the modal
        modal.addComponents(titleRow, descriptionRow, colorRow, footerRow, imageRow);
        
        // Show the modal
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error handling template edit button:', error);
        
        await interaction.reply({
            content: 'An error occurred while preparing to edit the template.',
            ephemeral: true
        });
    }
}

// Add handler for music control buttons
async function handleMusicControls(interaction, client) {
    try {
        // Get the music player and queue
        if (!global.player) {
            return interaction.reply({
                content: '❌ | Music player is not initialized.',
                ephemeral: true
            });
        }
        
        const player = global.player;
        const queue = player.nodes.get(interaction.guildId);
        
        if (!queue) {
            return interaction.reply({
                content: '❌ | No active music queue found.',
                ephemeral: true
            });
        }
        
        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ | You must be in a voice channel to use these controls.',
                ephemeral: true
            });
        }
        
        // Handle different music control buttons
        const buttonId = interaction.customId;
        let replyContent = '';
        
        switch (buttonId) {
            case 'music_pause':
                if (queue.node.isPaused()) {
                    queue.node.resume();
                    replyContent = '▶️ | Resumed playback.';
                } else {
                    queue.node.pause();
                    replyContent = '⏸️ | Paused playback.';
                }
                break;
                
            case 'music_skip':
                if (!queue.tracks.size) {
                    replyContent = '❌ | No more tracks in the queue to skip to.';
                } else {
                    queue.node.skip();
                    replyContent = '⏭️ | Skipped to the next track.';
                }
                break;
                
            case 'music_stop':
                queue.delete();
                replyContent = '⏹️ | Stopped playback and cleared the queue.';
                break;
                
            case 'music_volume_down':
                {
                    const currentVolume = queue.node.volume;
                    const newVolume = Math.max(currentVolume - 10, 0);
                    queue.node.setVolume(newVolume);
                    replyContent = `🔉 | Volume decreased to ${newVolume}%.`;
                }
                break;
                
            case 'music_volume_up':
                {
                    const currentVolume = queue.node.volume;
                    const newVolume = Math.min(currentVolume + 10, 100);
                    queue.node.setVolume(newVolume);
                    replyContent = `🔊 | Volume increased to ${newVolume}%.`;
                }
                break;
                
            default:
                replyContent = '❓ | Unknown music control button.';
        }
        
        // Update the current track display if it exists
        try {
            // Get the original message with the buttons
            const message = interaction.message;
            
            // If this is the nowplaying command's message, update it
            if (message.embeds.length > 0 && message.embeds[0].title === '🎵 Now Playing') {
                // Get updated track info
                const currentTrack = queue.currentTrack;
                
                if (currentTrack && buttonId !== 'music_stop') {
                    // Import the nowplaying command to reuse its createProgressBar function
                    const nowPlayingCommand = require('../commands/music/nowplaying');
                    
                    // Get updated progress
                    const progress = queue.node.getTimestamp();
                    const progressBar = nowPlayingCommand.createProgressBar 
                        ? nowPlayingCommand.createProgressBar(progress.current, progress.total)
                        : '`[—————————]`';
                    
                    // Create updated embed
                    const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#3498db')
                        .setTitle('🎵 Now Playing')
                        .setDescription(`**[${currentTrack.title}](${currentTrack.url})**`)
                        .setThumbnail(currentTrack.thumbnail || 'https://i.imgur.com/GGKye05.png')
                        .addFields(
                            { name: 'Progress', value: progressBar, inline: false },
                            { name: 'Duration', value: `\`${progress.current}\` / \`${currentTrack.duration}\``, inline: true },
                            { name: 'Author', value: currentTrack.author || 'Unknown', inline: true },
                            { name: 'Requested by', value: `<@${currentTrack.requestedBy.id}>`, inline: true },
                            { name: 'Volume', value: `${queue.node.volume}%`, inline: true },
                            { name: 'Queue Length', value: `${queue.tracks.size} song(s)`, inline: true },
                            { name: 'Source', value: currentTrack.source || 'YouTube', inline: true }
                        )
                        .setTimestamp();
                    
                    // Create updated control buttons
                    const controlRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('music_pause')
                                .setLabel(queue.node.isPaused() ? 'Resume' : 'Pause')
                                .setStyle(queue.node.isPaused() ? ButtonStyle.Success : ButtonStyle.Secondary)
                                .setEmoji(queue.node.isPaused() ? '▶️' : '⏸️'),
                            new ButtonBuilder()
                                .setCustomId('music_skip')
                                .setLabel('Skip')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏭️'),
                            new ButtonBuilder()
                                .setCustomId('music_stop')
                                .setLabel('Stop')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('⏹️'),
                            new ButtonBuilder()
                                .setCustomId('music_volume_down')
                                .setLabel('-10%')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('🔉'),
                            new ButtonBuilder()
                                .setCustomId('music_volume_up')
                                .setLabel('+10%')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('🔊')
                        );
                    
                    // Update the message
                    await interaction.update({
                        embeds: [embed],
                        components: [controlRow]
                    });
                    
                    // Send the reply as a follow-up instead of updating
                    return interaction.followUp({
                        content: replyContent,
                        ephemeral: true
                    });
                }
            }
        } catch (updateError) {
            console.error('Error updating nowplaying display:', updateError);
            // Continue to regular reply if update fails
        }
        
        // Regular reply if we didn't update the message
        return interaction.reply({
            content: replyContent,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling music controls:', error);
        return interaction.reply({
            content: `❌ | An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
}

// Handle music queue controls and pagination
async function handleQueueControls(interaction, client) {
    try {
        // Get the music player and queue
        if (!global.player) {
            return interaction.reply({
                content: '❌ | Music player is not initialized.',
                ephemeral: true
            });
        }
        
        const player = global.player;
        const queue = player.nodes.get(interaction.guildId);
        
        if (!queue) {
            return interaction.reply({
                content: '❌ | No active music queue found.',
                ephemeral: true
            });
        }
        
        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ | You must be in a voice channel to use these controls.',
                ephemeral: true
            });
        }
        
        // Get the original message with its embeds and components
        const message = interaction.message;
        const originalEmbed = message.embeds[0];
        const originalComponents = message.components;
        
        // Check which button was clicked
        const buttonId = interaction.customId;
        let replyContent = '';
        
        // If this is the queue_page button from nowplaying view, show the queue
        if (buttonId === 'queue_page') {
            // Import and execute the queue command
            const queueCommand = require('../commands/music/queue');
            
            // Create a fake interaction object to execute the queue command
            const fakeInteraction = {
                ...interaction,
                options: {
                    getNumber: () => 1 // Start at page 1
                }
            };
            
            // Execute the queue command with the interaction
            return await queueCommand.execute(interaction, client);
        }
        
        // Queue pagination buttons
        if (buttonId.startsWith('queue_')) {
            // Get current page from the embed footer
            const footerText = originalEmbed.footer?.text || '';
            const pageMatch = footerText.match(/Page (\d+) of (\d+)/);
            
            if (!pageMatch) {
                return interaction.reply({
                    content: '❌ | Could not determine the current page.',
                    ephemeral: true
                });
            }
            
            const currentPage = parseInt(pageMatch[1]);
            const totalPages = parseInt(pageMatch[2]);
            
            // Calculate the new page based on button clicked
            let newPage = currentPage;
            
            switch(buttonId) {
                case 'queue_first':
                    newPage = 1;
                    break;
                case 'queue_prev':
                    newPage = Math.max(currentPage - 1, 1);
                    break;
                case 'queue_next':
                    newPage = Math.min(currentPage + 1, totalPages);
                    break;
                case 'queue_last':
                    newPage = totalPages;
                    break;
                default:
                    // Just page display, do nothing
                    return interaction.deferUpdate();
            }
            
            // If the page hasn't changed, no need to update
            if (newPage === currentPage) {
                return interaction.deferUpdate();
            }
            
            // Recreate the queue command with the new page
            // We'll import and use the queue command directly
            const queueCommand = require('../commands/music/queue');
            
            // Create a fake interaction object with the correct page
            const fakeInteraction = {
                ...interaction,
                options: {
                    getNumber: (name) => name === 'page' ? newPage : null
                }
            };
            
            // Use update instead of reply for the fake interaction
            fakeInteraction.reply = interaction.update.bind(interaction);
            
            // Execute the queue command with the new page
            return await queueCommand.execute(fakeInteraction, client);
        }
        
        // Music queue control buttons
        switch (buttonId) {
            case 'music_shuffle':
                // Shuffle the queue
                queue.tracks.shuffle();
                replyContent = '🔀 | Queue has been shuffled!';
                break;
                
            case 'music_loop':
                // Cycle through loop modes: off (0) -> track (1) -> queue (2) -> off (0)
                const currentMode = queue.repeatMode;
                const newMode = (currentMode + 1) % 3;
                queue.setRepeatMode(newMode);
                
                const modeNames = ['disabled', 'track', 'queue'];
                replyContent = `🔁 | Loop mode set to: ${modeNames[newMode]}`;
                break;
                
            case 'music_clear':
                // Clear the queue but keep the current track
                queue.tracks.clear();
                replyContent = '🗑️ | Queue has been cleared!';
                break;
                
            default:
                return interaction.reply({
                    content: '❓ | Unknown queue control button.',
                    ephemeral: true
                });
        }
        
        // Update the queue display after control buttons
        // Get the new queue state
        const queueCommand = require('../commands/music/queue');
        
        // Create a fake interaction object to refresh the display
        const fakeInteraction = {
            ...interaction,
            options: {
                getNumber: () => 1 // Reset to first page after control action
            }
        };
        
        // First send a reply about the action
        await interaction.reply({
            content: replyContent,
            ephemeral: true
        });
        
        // Then update the original message with the new queue state
        fakeInteraction.reply = interaction.message.edit.bind(interaction.message);
        
        // Execute the queue command to refresh the display
        return await queueCommand.execute(fakeInteraction, client);
    } catch (error) {
        console.error('Error handling queue controls:', error);
        return interaction.reply({
            content: `❌ | An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
} 