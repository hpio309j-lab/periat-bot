const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const Giveaway = require('../../database/models/Giveaway');
const { createGiveaway, formatTimeRemaining, endGiveaway: endGiveawayFlow, selectWinners } = require('../../utils/giveawayManager');
const ms = require('ms');

const GIVEAWAY_COLOR = '#1e3a5f'; // Dark Blue
const GIVEAWAY_EMOJI = '🎉';
const PREFIX_START = '-gstart';    // Example: -gstart Nitro Boost 1d 3

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')

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

        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID of the giveaway')
                        .setRequired(true)))

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

        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active giveaways'))

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
                await startGiveawaySlash(interaction, client);
                break;
            case 'end':
                await endGiveawaySlash(interaction, client);
                break;
            case 'reroll':
                await rerollGiveawaySlash(interaction, client);
                break;
            case 'list':
                await listGiveawaysSlash(interaction, client);
                break;
            case 'edit':
                await editGiveawaySlash(interaction, client);
                break;
        }
    },

    async handleMessage(message, client) {
        if (!message?.inGuild?.() || message.author.bot) return;
        if (!message.content.toLowerCase().startsWith(PREFIX_START)) return;

        const parsed = parsePrefixStart(message.content);
        if (!parsed) {
            await message.reply({
                content: `Example: \`${PREFIX_START} Nitro Boost 1d 3\``
            });
            return;
        }

        const { prize, durationStr, winnerCount } = parsed;

        if (!hasGiveawayPermissions(message.member)) {
            await message.reply({
                content: 'You need Manage Events or Manage Server permissions to start a giveaway.'
            });
            return;
        }

        const channel = message.channel;
        const description = '';

        try {
            const result = await createAndSendGiveaway({
                guild: message.guild,
                channel,
                hostId: message.author.id,
                prize,
                durationStr,
                winnerCount,
                description,
                client
            });

            // No reply — the giveaway embed is enough
        } catch (error) {
            console.error('Error starting giveaway via prefix:', error);
            await message.reply({
                content: error?.message || 'An error occurred while starting the giveaway.'
            });
        }
    }
};

function hasGiveawayPermissions(member) {
    return member?.permissions?.has(PermissionFlagsBits.ManageEvents) ||
           member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function parsePrefixStart(content) {
    const raw = content.slice(PREFIX_START.length).trim();
    const parts = raw.split(/\s+/).filter(Boolean);

    if (parts.length < 3) return null;

    const winnersRaw = parts.pop();
    const durationStr = parts.pop();
    const prize = parts.join(' ');

    const winnerCount = Number.parseInt(winnersRaw, 10);

    if (!prize || !durationStr || !Number.isInteger(winnerCount)) return null;

    return { prize, durationStr, winnerCount };
}

function buildGiveawayEmbed({ prize, winnerCount, endTime, hostId, giveawayId, description, entries }) {
    const embed = new EmbedBuilder()
        .setColor(GIVEAWAY_COLOR)
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(`**Prize:** ${prize}`)
        .addFields(
            { name: '<:1089507751207645204:1456347760843292846> Hosted by', value: `<@${hostId}>`, inline: false },
            { name: '<:blackstar:1457394084095463489> Ends', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: false },
            { name: '<:1089507751207645204:1456347760843292846> Entries', value: `${entries} participant${entries === 1 ? '' : 's'}`, inline: false }
        );

    if (description) {
        embed.addFields({ name: '📝 Description', value: description, inline: false });
    }

    return embed;
}

async function createAndSendGiveaway({ guild, channel, hostId, prize, durationStr, winnerCount, description, client }) {
    if (!guild) throw new Error('Guild not found.');

    if (!channel?.isTextBased?.()) {
        throw new Error('The selected channel is not a text channel.');
    }

    let duration;
    try {
        duration = ms(durationStr);
        if (!duration || duration < 10000) {
            throw new Error('Invalid duration! Please provide a valid duration (minimum 10 seconds).');
        }
    } catch {
        throw new Error('Invalid duration format! Examples: 1m, 1h, 1d');
    }

    if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 10) {
        throw new Error('Winners must be between 1 and 10.');
    }

    const giveaway = await createGiveaway({
        prize,
        channelId: channel.id,
        guildId: guild.id,
        hostId,
        duration: durationStr,
        winnerCount,
        description
    });

    const endTime = new Date(Date.now() + duration);

    const giveawayEmbed = buildGiveawayEmbed({
        prize,
        winnerCount,
        endTime,
        hostId,
        giveawayId: giveaway._id,
        description,
        entries: 0
    });

    // Send embed only — no buttons
    const giveawayMessage = await channel.send({ embeds: [giveawayEmbed] });

    // React with emoji for entry
    await giveawayMessage.react(GIVEAWAY_EMOJI);

    giveaway.messageId = giveawayMessage.id;
    await giveaway.save();

    return {
        giveaway,
        giveawayMessage,
        channelId: channel.id,
        endTime
    };
}

async function startGiveawaySlash(interaction, client) {
    try {
        if (!hasGiveawayPermissions(interaction.member)) {
            return interaction.reply({
                content: 'You need Manage Events or Manage Server permissions to start a giveaway.',
                ephemeral: true
            });
        }

        const prize = interaction.options.getString('prize');
        const durationStr = interaction.options.getString('duration');
        const winnerCount = interaction.options.getInteger('winners');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const description = interaction.options.getString('description') || '';

        const result = await createAndSendGiveaway({
            guild: interaction.guild,
            channel,
            hostId: interaction.user.id,
            prize,
            durationStr,
            winnerCount,
            description,
            client
        });

        await interaction.reply({ content: '✅', ephemeral: true });
    } catch (error) {
        console.error('Error starting giveaway:', error);
        await interaction.reply({
            content: error?.message || 'An error occurred while starting the giveaway.',
            ephemeral: true
        });
    }
}

async function endGiveawaySlash(interaction, client) {
    try {
        if (!hasGiveawayPermissions(interaction.member)) {
            return interaction.reply({
                content: 'You need Manage Events or Manage Server permissions to end a giveaway.',
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id');

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

        await endGiveawayFlow(giveaway, client);

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

async function rerollGiveawaySlash(interaction, client) {
    try {
        if (!hasGiveawayPermissions(interaction.member)) {
            return interaction.reply({
                content: 'You need Manage Events or Manage Server permissions to reroll a giveaway.',
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id');
        const winnerCount = interaction.options.getInteger('winners') || 1;

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

        const channel = interaction.guild.channels.cache.get(giveaway.channelId);
        if (!channel) {
            return interaction.reply({
                content: 'The channel for this giveaway no longer exists.',
                ephemeral: true
            });
        }

        const winners = await selectWinners(giveaway, winnerCount, interaction.guild);

        giveaway.winners = winners.map(w => w.id);
        await giveaway.save();

        const winnerText = winners.length > 0
            ? winners.map(w => `<@${w.id}>`).join(', ')
            : 'No valid participants';

        if (winners.length > 0) {
            await channel.send({
                content: `Congratulations ${winnerText}! You won the reroll for **${giveaway.prize}**!`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(GIVEAWAY_COLOR)
                        .setTitle('🎉 Giveaway Rerolled 🎉')
                        .setDescription(`**Prize:** ${giveaway.prize}`)
                        .addFields(
                            { name: '<:1089507751207645204:1456347760843292846> Hosted by', value: `<@${giveaway.hostId}>`, inline: false },
                            { name: '<:Wa_fngift:1457532899183034522> Winner(s)', value: winnerText, inline: false }
                        )
                ]
            });
        } else {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(GIVEAWAY_COLOR)
                        .setTitle('🎉 Giveaway Rerolled 🎉')
                        .setDescription(`No valid winner found for the reroll of **${giveaway.prize}**`)
                        .addFields(
                            { name: '<:1089507751207645204:1456347760843292846> Hosted by', value: `<@${giveaway.hostId}>`, inline: false }
                        )
                ]
            });
        }

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

async function listGiveawaysSlash(interaction, client) {
    try {
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

        const embed = new EmbedBuilder()
            .setColor(GIVEAWAY_COLOR)
            .setTitle('🎉 Active Giveaways')
            .setDescription(`There are ${giveaways.length} active giveaways in this server.`);

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
                    `**Jump to Giveaway:** [Click here](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`
                ].join('\n'),
                inline: false
            });
        }

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

async function editGiveawaySlash(interaction, client) {
    try {
        if (!hasGiveawayPermissions(interaction.member)) {
            return interaction.reply({
                content: 'You need Manage Events or Manage Server permissions to edit a giveaway.',
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id');
        const newPrize = interaction.options.getString('prize');
        const newDescription = interaction.options.getString('description');
        const additionalTime = interaction.options.getString('duration');
        const newWinnerCount = interaction.options.getInteger('winners');

        if (!newPrize && newDescription === null && !additionalTime && newWinnerCount === null) {
            return interaction.reply({
                content: 'You need to provide at least one property to edit (prize, description, duration, or winners).',
                ephemeral: true
            });
        }

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
            } catch {
                return interaction.reply({
                    content: 'Invalid duration format! Examples: 1m, 1h, 1d',
                    ephemeral: true
                });
            }
        }

        let updated = false;
        const changes = [];

        if (newPrize) {
            giveaway.prize = newPrize;
            updated = true;
            changes.push('Prize updated');
        }

        if (newDescription !== null) {
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

        await giveaway.save();

        const channel = interaction.guild.channels.cache.get(giveaway.channelId);
        if (!channel) {
            return interaction.reply({
                content: 'The channel for this giveaway no longer exists.',
                ephemeral: true
            });
        }

        try {
            const message = await channel.messages.fetch(giveaway.messageId);
            const entryCount = giveaway.participants ? giveaway.participants.length : 0;

            const updatedEmbed = new EmbedBuilder()
                .setColor(GIVEAWAY_COLOR)
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}`)
                .addFields(
                    { name: '<:1089507751207645204:1456347760843292846> Hosted by', value: `<@${giveaway.hostId}>`, inline: false },
                    { name: '<:blackstar:1457394084095463489> Ends', value: `<t:${Math.floor(giveaway.endTime.getTime() / 1000)}:R>`, inline: false },
                    { name: '<:1089507751207645204:1456347760843292846> Entries', value: `${entryCount} participant${entryCount === 1 ? '' : 's'}`, inline: false }
                );

            if (giveaway.description) {
                updatedEmbed.addFields({ name: '📝 Description', value: giveaway.description, inline: false });
            }

            await message.edit({ embeds: [updatedEmbed] });
        } catch (error) {
            console.error('Error updating giveaway message:', error);
            return interaction.reply({
                content: `Giveaway updated in database, but failed to update the message: ${error.message}`,
                ephemeral: true
            });
        }

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
