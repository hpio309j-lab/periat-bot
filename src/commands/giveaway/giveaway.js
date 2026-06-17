const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelType
} = require('discord.js');
const Giveaway = require('../../database/models/Giveaway');
const { createGiveaway, formatTimeRemaining } = require('../../utils/giveawayManager');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        
        // Start subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('The prize for the giveaway')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('The duration of the giveaway (e.g. 1h, 1d, 1w)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('The number of winners')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to post the giveaway in')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildText))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Additional description for the giveaway')
                        .setRequired(false)))
        
        // End subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID of the giveaway')
                        .setRequired(true)))
        
        // Reroll subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll a giveaway winner')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID of the giveaway')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('The number of winners to reroll')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)))
        
        // List subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active giveaways'))
                
        // Edit subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an active giveaway')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID of the giveaway')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('New prize for the giveaway')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('New description for the giveaway')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Add more time to the giveaway (e.g. 1h, 1d)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('New number of winners')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10))),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'start':
                await startGiveaway(interaction, client);
                break;
            case 'end':
                await endGiveaway(interaction, client);
                break;
            case 'reroll':
                await rerollGiveaway(interaction, client);
                break;
            case 'list':
                await listGiveaways(interaction, client);
                break;
            case 'edit':
                await editGiveaway(interaction, client);
                break;
        }
    },
};

// Start a new giveaway
async function startGiveaway(interaction, client) {
    try {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageEvents) && 
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: 'You need Manage Events or Manage Server permissions to start a giveaway.',
                ephemeral: true
            });
        }
        
        // Get options
        const prize = interaction.options.getString('prize');
        const durationStr = interaction.options.getString('duration');
        const winnerCount = interaction.options.getInteger('winners');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const description = interaction.options.getString('description') || '';
        
        // Validate duration
        let duration;
        try {
            duration = ms(durationStr);
            
            if (!duration || duration < 10000) {
                return interaction.reply({
                    content: 'Invalid duration! Please provide a valid duration (minimum 10 seconds).',
                    ephemeral: true
                });
            }
        } catch (error) {
            return interaction.reply({
                content: 'Invalid duration format! Examples: 1m, 1h, 1d',
                ephemeral: true
            });
        }
        
        // Create giveaway in database
        const giveaway = await createGiveaway({
            prize,
            channelId: channel.id,
            guildId: interaction.guild.id,
            hostId: interaction.user.id,
            duration: durationStr,
            winnerCount,
            description
        });
        
        // Calculate end time for display
        const endTime = new Date(Date.now() + duration);
        
        // Create giveaway embed
        const giveawayEmbed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('🎉 GIVEAWAY 🎉')
            .setDescription(`**Prize:** ${prize}`)
            .addFields(
                { name: 'Ends', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: true },
                { name: 'Winners', value: `${winnerCount}`, inline: true },
                { name: 'Hosted by', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Entries', value: '0 participants', inline: true }
            )
            .setFooter({ text: `Giveaway ID: ${giveaway._id} • Click the button below to enter!` })
            .setTimestamp(endTime);
        
        if (description) {
            giveawayEmbed.addFields({ name: 'Description', value: description });
        }
        
        // Create buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway_enter_${giveaway._id}`)
                .setLabel('Enter Giveaway')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎉')
        );
        
        // Send giveaway message
        const giveawayMessage = await channel.send({
            embeds: [giveawayEmbed],
            components: [row]
        });
        
        // Update giveaway with message ID
        giveaway.messageId = giveawayMessage.id;
        await giveaway.save();
        
        // Reply to interaction
        await interaction.reply({
            content: `Giveaway started in <#${channel.id}>!`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error starting giveaway:', error);
        await interaction.reply({
            content: 'An error occurred while starting the giveaway.',
            ephemeral: true
        });
    }
}

// End a giveaway early
async function endGiveaway(interaction, client) {
    try {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageEvents) && 
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: 'You need Manage Events or Manage Server permissions to end a giveaway.',
                ephemeral: true
            });
        }
        
        // Get giveaway message ID
        const messageId = interaction.options.getString('message_id');
        
        // Find giveaway in database
        const giveaway = await Giveaway.findOne({ 
            messageId,
            guildId: interaction.guild.id,
            ended: false
        });
        
        if (!giveaway) {
            return interaction.reply({
                content: 'No active giveaway found with that message ID.',
                ephemeral: true
            });
        }
        
        // End the giveaway
        await require('../../utils/giveawayManager').endGiveaway(giveaway, client);
        
        // Reply to interaction
        await interaction.reply({
            content: 'Giveaway ended successfully!',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error ending giveaway:', error);
        await interaction.reply({
            content: 'An error occurred while ending the giveaway.',
            ephemeral: true
        });
    }
}

// Reroll a giveaway winner
async function rerollGiveaway(interaction, client) {
    try {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageEvents) && 
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: 'You need Manage Events or Manage Server permissions to reroll a giveaway.',
                ephemeral: true
            });
        }
        
        // Get giveaway message ID and winner count
        const messageId = interaction.options.getString('message_id');
        const winnerCount = interaction.options.getInteger('winners') || 1;
        
        // Find giveaway in database
        const giveaway = await Giveaway.findOne({ 
            messageId,
            guildId: interaction.guild.id,
            ended: true
        });
        
        if (!giveaway) {
            return interaction.reply({
                content: 'No ended giveaway found with that message ID.',
                ephemeral: true
            });
        }
        
        // Get the channel
        const channel = interaction.guild.channels.cache.get(giveaway.channelId);
        if (!channel) {
            return interaction.reply({
                content: 'The channel for this giveaway no longer exists.',
                ephemeral: true
            });
        }
        
        // Reroll winners
        const winners = await require('../../utils/giveawayManager').selectWinners(giveaway, winnerCount, interaction.guild);
        
        // Update giveaway
        giveaway.winners = winners.map(w => w.id);
        await giveaway.save();
        
        // Create announcement
        const winnerText = winners.length > 0 
            ? winners.map(w => `<@${w.id}>`).join(', ') 
            : 'No valid participants';
        
        if (winners.length > 0) {
            await channel.send({
                content: `Congratulations ${winnerText}! You won the reroll for **${giveaway.prize}**!`,
                embeds: [
                    new EmbedBuilder()
                        .setColor('#f1c40f')
                        .setTitle('🎉 Giveaway Rerolled 🎉')
                        .setDescription(`**Prize:** ${giveaway.prize}`)
                        .addFields(
                            { name: 'Winners', value: winnerText },
                            { name: 'Original Giveaway', value: `[Jump to Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId})` }
                        )
                ]
            });
        } else {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('🎉 Giveaway Rerolled 🎉')
                        .setDescription(`No valid winner found for the reroll of **${giveaway.prize}**`)
                        .addFields(
                            { name: 'Original Giveaway', value: `[Jump to Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId})` }
                        )
                ]
            });
        }
        
        // Reply to interaction
        await interaction.reply({
            content: `Giveaway rerolled! ${winners.length > 0 ? `New winner(s): ${winnerText}` : 'No valid winners found.'}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error rerolling giveaway:', error);
        await interaction.reply({
            content: 'An error occurred while rerolling the giveaway.',
            ephemeral: true
        });
    }
}

// List all active giveaways
async function listGiveaways(interaction, client) {
    try {
        // Find all active giveaways in this guild
        const giveaways = await Giveaway.find({ 
            guildId: interaction.guild.id,
            ended: false
        });
        
        if (giveaways.length === 0) {
            return interaction.reply({
                content: 'There are no active giveaways in this server.',
                ephemeral: true
            });
        }
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('🎉 Active Giveaways')
            .setDescription(`There are ${giveaways.length} active giveaways in this server.`)
            .setTimestamp();
        
        // Add each giveaway to the embed
        for (let i = 0; i < giveaways.length; i++) {
            const g = giveaways[i];
            const timeRemaining = formatTimeRemaining(g.endTime);
            const channel = interaction.guild.channels.cache.get(g.channelId);
            const entries = g.participants ? g.participants.length : 0;
            
            embed.addFields({
                name: `${i + 1}. ${g.prize}`,
                value: [
                    `**Channel:** ${channel ? `<#${channel.id}>` : 'Unknown'}`,
                    `**Winners:** ${g.winnerCount}`,
                    `**Entries:** ${entries} participant${entries === 1 ? '' : 's'}`,
                    `**Ends:** ${timeRemaining}`,
                    `**Message ID:** ${g.messageId}`,
                    `**Jump to Giveaway:** [Click here](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`
                ].join('\n')
            });
        }
        
        // Reply with embed
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error listing giveaways:', error);
        await interaction.reply({
            content: 'An error occurred while listing giveaways.',
            ephemeral: true
        });
    }
}

// Edit an active giveaway
async function editGiveaway(interaction, client) {
    try {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageEvents) && 
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: 'You need Manage Events or Manage Server permissions to edit a giveaway.',
                ephemeral: true
            });
        }
        
        // Get options
        const messageId = interaction.options.getString('message_id');
        const newPrize = interaction.options.getString('prize');
        const newDescription = interaction.options.getString('description');
        const additionalTime = interaction.options.getString('duration');
        const newWinnerCount = interaction.options.getInteger('winners');
        
        // Validate that at least one edit option is provided
        if (!newPrize && !newDescription && !additionalTime && newWinnerCount === null) {
            return interaction.reply({
                content: 'You need to provide at least one property to edit (prize, description, duration, or winners).',
                ephemeral: true
            });
        }
        
        // Find giveaway in database
        const giveaway = await Giveaway.findOne({ 
            messageId,
            guildId: interaction.guild.id,
            ended: false
        });
        
        if (!giveaway) {
            return interaction.reply({
                content: 'No active giveaway found with that message ID.',
                ephemeral: true
            });
        }
        
        // Parse additional time if provided
        let additionalTimeMs = 0;
        if (additionalTime) {
            try {
                additionalTimeMs = ms(additionalTime);
                if (!additionalTimeMs || additionalTimeMs < 0) {
                    return interaction.reply({
                        content: 'Invalid duration format! Examples: 1m, 1h, 1d',
                        ephemeral: true
                    });
                }
            } catch (error) {
                return interaction.reply({
                    content: 'Invalid duration format! Examples: 1m, 1h, 1d',
                    ephemeral: true
                });
            }
        }
        
        // Update giveaway properties
        let updated = false;
        const changes = [];
        
        if (newPrize) {
            giveaway.prize = newPrize;
            updated = true;
            changes.push('Prize updated');
        }
        
        if (newDescription !== undefined) {
            giveaway.description = newDescription;
            updated = true;
            changes.push('Description updated');
        }
        
        if (additionalTimeMs > 0) {
            giveaway.endTime = new Date(giveaway.endTime.getTime() + additionalTimeMs);
            updated = true;
            changes.push(`Added ${additionalTime} to duration`);
        }
        
        if (newWinnerCount !== null) {
            giveaway.winnerCount = newWinnerCount;
            updated = true;
            changes.push(`Winner count updated to ${newWinnerCount}`);
        }
        
        if (!updated) {
            return interaction.reply({
                content: 'No changes were made to the giveaway.',
                ephemeral: true
            });
        }
        
        // Save updated giveaway
        await giveaway.save();
        
        // Get the channel and message
        const channel = interaction.guild.channels.cache.get(giveaway.channelId);
        if (!channel) {
            return interaction.reply({
                content: 'The channel for this giveaway no longer exists.',
                ephemeral: true
            });
        }
        
        try {
            const message = await channel.messages.fetch(giveaway.messageId);
            
            // Get participant count
            const entryCount = giveaway.participants ? giveaway.participants.length : 0;
            
            // Update the embed
            const updatedEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}`)
                .addFields(
                    { name: 'Ends', value: `<t:${Math.floor(giveaway.endTime.getTime() / 1000)}:R>`, inline: true },
                    { name: 'Winners', value: `${giveaway.winnerCount}`, inline: true },
                    { name: 'Hosted by', value: `<@${giveaway.hostId}>`, inline: true },
                    { name: 'Entries', value: `${entryCount} participant${entryCount === 1 ? '' : 's'}`, inline: true }
                )
                .setFooter({ text: `Giveaway ID: ${giveaway._id} • Click the button below to enter!` })
                .setTimestamp(giveaway.endTime);
            
            if (giveaway.description) {
                updatedEmbed.addFields({ name: 'Description', value: giveaway.description });
            }
            
            await message.edit({ embeds: [updatedEmbed] });
        } catch (error) {
            console.error('Error updating giveaway message:', error);
            return interaction.reply({
                content: `Giveaway updated in database, but failed to update the message: ${error.message}`,
                ephemeral: true
            });
        }
        
        // Reply to interaction
        await interaction.reply({
            content: `Giveaway updated successfully!\n${changes.join('\n')}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error editing giveaway:', error);
        await interaction.reply({
            content: 'An error occurred while editing the giveaway.',
            ephemeral: true
        });
    }
} 