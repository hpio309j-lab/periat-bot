const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const TicketConfig = require('../../database/models/TicketConfig');
const Ticket = require('../../database/models/Ticket');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        // Handle ticket creation
        if (interaction.customId === 'create_ticket') {
            try {
                const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
                if (!config || !config.enabled) {
                    return interaction.reply({
                        content: '❌ نظام التذاكر غير مفعل في هذا السيرفر',
                        ephemeral: true
                    });
                }

                // Check if user already has an open ticket
                const existingTicket = await Ticket.findOne({
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    status: 'open'
                });

                if (existingTicket) {
                    return interaction.reply({
                        content: `❌ لديك تذكرة مفتوحة بالفعل: <#${existingTicket.channelId}>`,
                        ephemeral: true
                    });
                }

                // Create ticket channel
                const ticketNumber = config.ticketCounter + 1;
                const channelName = `ticket-${interaction.user.username}-${ticketNumber}`.toLowerCase();

                const ticketChannel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: config.categoryId,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        },
                        {
                            id: config.supportRoleId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        }
                    ]
                });

                // Create ticket in database
                const ticket = await Ticket.create({
                    guildId: interaction.guild.id,
                    channelId: ticketChannel.id,
                    userId: interaction.user.id,
                    number: ticketNumber,
                    status: 'open',
                    createdAt: new Date()
                });

                // Update ticket counter
                await TicketConfig.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $inc: { ticketCounter: 1 } }
                );

                // Create welcome message
                const embed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle(`تذكرة #${ticketNumber}`)
                    .setDescription(config.welcomeMessage || 'شكراً لإنشاء تذكرة! سيكون فريق الدعم معك قريباً.')
                    .addFields(
                        { name: 'صاحب التذكرة', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'الحالة', value: '🟢 مفتوحة', inline: true }
                    )
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('إغلاق التذكرة')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒'),
                        new ButtonBuilder()
                            .setCustomId('claim_ticket')
                            .setLabel('استلام التذكرة')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✋')
                    );

                await ticketChannel.send({
                    content: `<@${interaction.user.id}> <@&${config.supportRoleId}>`,
                    embeds: [embed],
                    components: [row]
                });

                await interaction.reply({
                    content: `✅ تم إنشاء تذكرتك: ${ticketChannel}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error creating ticket:', error);
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء إنشاء التذكرة',
                    ephemeral: true
                });
            }
        }

        // Handle ticket closing
        else if (interaction.customId === 'close_ticket') {
            try {
                const ticket = await Ticket.findOne({
                    channelId: interaction.channel.id,
                    status: 'open'
                });

                if (!ticket) {
                    return interaction.reply({
                        content: '❌ لم يتم العثور على تذكرة مفتوحة في هذه القناة',
                        ephemeral: true
                    });
                }

                // Update ticket status
                ticket.status = 'closed';
                ticket.closedBy = interaction.user.id;
                ticket.closedAt = new Date();
                await ticket.save();

                // Create transcript
                const messages = await interaction.channel.messages.fetch();
                const transcript = messages.reverse().map(m => {
                    return `${m.author.tag} (${m.createdAt.toLocaleString()}): ${m.content}`;
                }).join('\n');

                const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
                if (config && config.transcriptChannelId) {
                    const transcriptChannel = await interaction.guild.channels.fetch(config.transcriptChannelId);
                    if (transcriptChannel) {
                        const transcriptEmbed = new EmbedBuilder()
                            .setColor('#2f3136')
                            .setTitle(`نسخة التذكرة #${ticket.number}`)
                            .addFields(
                                { name: 'صاحب التذكرة', value: `<@${ticket.userId}>`, inline: true },
                                { name: 'أغلقت بواسطة', value: `<@${ticket.closedBy}>`, inline: true },
                                { name: 'تاريخ الإنشاء', value: ticket.createdAt.toLocaleString(), inline: true },
                                { name: 'تاريخ الإغلاق', value: ticket.closedAt.toLocaleString(), inline: true }
                            );

                        const buffer = Buffer.from(transcript, 'utf8');
                        await transcriptChannel.send({
                            embeds: [transcriptEmbed],
                            files: [{
                                attachment: buffer,
                                name: `ticket-${ticket.number}.txt`
                            }]
                        });
                    }
                }

                // Delete channel
                await interaction.channel.delete();
            } catch (error) {
                console.error('Error closing ticket:', error);
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء إغلاق التذكرة',
                    ephemeral: true
                });
            }
        }

        // Handle ticket claiming
        else if (interaction.customId === 'claim_ticket') {
            try {
                const ticket = await Ticket.findOne({
                    channelId: interaction.channel.id,
                    status: 'open'
                });

                if (!ticket) {
                    return interaction.reply({
                        content: '❌ لم يتم العثور على تذكرة مفتوحة في هذه القناة',
                        ephemeral: true
                    });
                }

                if (ticket.claimedBy) {
                    return interaction.reply({
                        content: `❌ هذه التذكرة تم استلامها بالفعل بواسطة <@${ticket.claimedBy}>`,
                        ephemeral: true
                    });
                }

                // Update ticket
                ticket.claimedBy = interaction.user.id;
                ticket.claimedAt = new Date();
                await ticket.save();

                const embed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setDescription(`✅ تم استلام التذكرة بواسطة ${interaction.user}`);

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error claiming ticket:', error);
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء استلام التذكرة',
                    ephemeral: true
                });
            }
        }
    }
};
