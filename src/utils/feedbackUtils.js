const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Feedback = require('../database/schemas/Feedback');
const GuildConfig = require('../database/schemas/guildConfig');
const { customAlphabet } = require('nanoid/non-secure');
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 8);

const userCooldowns = new Map();

async function createFeedbackModal(interaction, client) {
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
    
    if (!guildConfig || !guildConfig.feedback.enabled) {
        return interaction.reply({
            content: 'The feedback system is not enabled in this server.',
            ephemeral: true
        });
    }
    
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    
    if (userCooldowns.has(`${guildId}-${userId}`)) {
        const cooldownExpiration = userCooldowns.get(`${guildId}-${userId}`);
        if (Date.now() < cooldownExpiration) {
            const timeLeft = Math.ceil((cooldownExpiration - Date.now()) / 1000 / 60);
            return interaction.reply({
                content: `You are on cooldown. Please wait ${timeLeft} minute(s) before submitting another feedback.`,
                ephemeral: true
            });
        }
    }
    
    const categories = guildConfig.feedback.categories || ['General', 'Suggestion', 'Bug Report', 'Complaint'];
    
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('feedback_category')
            .setPlaceholder('Select a category')
            .addOptions(categories.map(category => ({
                label: category,
                value: category.toLowerCase().replace(/\s+/g, '_'),
                description: `Submit ${category.toLowerCase()} feedback`
            })))
    );
    
    const anonymousRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('feedback_anonymous_yes')
            .setLabel('Anonymous')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('feedback_anonymous_no')
            .setLabel('Public')
            .setStyle(ButtonStyle.Primary)
    );
    
    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('Submit Feedback')
        .setDescription('Please select a category for your feedback.')
        .addFields(
            { name: 'Anonymous Feedback', value: 'Choose whether you want to submit your feedback anonymously.' }
        )
        .setTimestamp();
    
    if (!guildConfig.feedback.allowAnonymous) {
        return interaction.reply({
            content: 'Please select a category for your feedback:',
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
    
    return interaction.reply({
        embeds: [embed],
        components: [row, anonymousRow],
        ephemeral: true
    });
}

async function handleFeedbackCategorySelect(interaction, client) {
    const category = interaction.values[0];
    const formattedCategory = category.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    const modal = new ModalBuilder()
        .setCustomId(`feedback_submit_${category}`)
        .setTitle(`Submit ${formattedCategory} Feedback`);
    
    const feedbackInput = new TextInputBuilder()
        .setCustomId('feedback_content')
        .setLabel('Your feedback')
        .setPlaceholder('Please provide your feedback here...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);
    
    const firstRow = new ActionRowBuilder().addComponents(feedbackInput);
    modal.addComponents(firstRow);
    
    await interaction.showModal(modal);
}

async function handleFeedbackAnonymousSelect(interaction, client, isAnonymous) {
    const customId = interaction.message.components[0].components[0].customId;
    
    if (customId !== 'feedback_category') {
        return interaction.reply({
            content: 'An error occurred. Please try again.',
            ephemeral: true
        });
    }
    
    client.feedbackAnonymous = client.feedbackAnonymous || new Map();
    client.feedbackAnonymous.set(interaction.user.id, isAnonymous);
    
    await interaction.update({
        content: `You've selected to submit ${isAnonymous ? 'anonymous' : 'public'} feedback. Now please select a category.`,
        components: [interaction.message.components[0]]
    });
}

async function submitFeedback(interaction, client) {
    try {
        const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (!guildConfig || !guildConfig.feedback.enabled) {
            return interaction.reply({
                content: 'The feedback system is not enabled in this server.',
                ephemeral: true
            });
        }
        
        const categoryMatch = interaction.customId.match(/feedback_submit_(.+)/);
        if (!categoryMatch) {
            return interaction.reply({
                content: 'An error occurred while processing your feedback.',
                ephemeral: true
            });
        }
        
        const category = categoryMatch[1].split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        const content = interaction.fields.getTextInputValue('feedback_content');
        
        client.feedbackAnonymous = client.feedbackAnonymous || new Map();
        const isAnonymous = client.feedbackAnonymous.get(interaction.user.id) || false;
        client.feedbackAnonymous.delete(interaction.user.id);
        
        const feedbackId = nanoid();
        
        const feedback = new Feedback({
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            feedbackId,
            category,
            content,
            anonymous: isAnonymous
        });
        
        await feedback.save();
        
        userCooldowns.set(
            `${interaction.guild.id}-${interaction.user.id}`, 
            Date.now() + (guildConfig.feedback.cooldown || 24 * 60 * 60 * 1000)
        );
        
        const userEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Feedback Submitted')
            .setDescription('Your feedback has been submitted successfully!')
            .addFields(
                { name: 'Category', value: category, inline: true },
                { name: 'Feedback ID', value: feedbackId, inline: true },
                { name: 'Anonymous', value: isAnonymous ? 'Yes' : 'No', inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({
            embeds: [userEmbed],
            ephemeral: true
        });
        
        if (guildConfig.feedback.channelId) {
            const feedbackChannel = interaction.guild.channels.cache.get(guildConfig.feedback.channelId);
            
            if (feedbackChannel) {
                const staffEmbed = new EmbedBuilder()
                    .setColor('#9b59b6')
                    .setTitle(`New ${category} Feedback`)
                    .setDescription(content)
                    .addFields(
                        { 
                            name: 'Submitted By', 
                            value: isAnonymous ? 'Anonymous' : `${interaction.user.tag} (${interaction.user.id})`, 
                            inline: true 
                        },
                        { name: 'Feedback ID', value: feedbackId, inline: true },
                        { name: 'Status', value: 'Pending', inline: true }
                    )
                    .setTimestamp();
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`feedback_respond_${feedbackId}`)
                        .setLabel('Respond')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`feedback_status_${feedbackId}_reviewed`)
                        .setLabel('Mark as Reviewed')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`feedback_status_${feedbackId}_implemented`)
                        .setLabel('Mark as Implemented')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`feedback_status_${feedbackId}_rejected`)
                        .setLabel('Mark as Rejected')
                        .setStyle(ButtonStyle.Danger)
                );
                
                await feedbackChannel.send({ embeds: [staffEmbed], components: [row] });
            }
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        await interaction.reply({
            content: 'An error occurred while submitting your feedback. Please try again later.',
            ephemeral: true
        });
    }
}

async function handleFeedbackResponse(interaction, client) {
    const feedbackIdMatch = interaction.customId.match(/feedback_respond_(.+)/);
    if (!feedbackIdMatch) {
        return interaction.reply({
            content: 'An error occurred while processing the response.',
            ephemeral: true
        });
    }
    
    const feedbackId = feedbackIdMatch[1];
    
    const modal = new ModalBuilder()
        .setCustomId(`feedback_response_${feedbackId}`)
        .setTitle('Respond to Feedback');
    
    const responseInput = new TextInputBuilder()
        .setCustomId('feedback_response_content')
        .setLabel('Your response')
        .setPlaceholder('Enter your response to this feedback...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);
    
    const firstRow = new ActionRowBuilder().addComponents(responseInput);
    modal.addComponents(firstRow);
    
    await interaction.showModal(modal);
}

async function submitFeedbackResponse(interaction, client) {
    try {
        const feedbackIdMatch = interaction.customId.match(/feedback_response_(.+)/);
        if (!feedbackIdMatch) {
            return interaction.reply({
                content: 'An error occurred while processing the response.',
                ephemeral: true
            });
        }
        
        const feedbackId = feedbackIdMatch[1];
        const response = interaction.fields.getTextInputValue('feedback_response_content');
        
        const feedback = await Feedback.findOne({ feedbackId });
        
        if (!feedback) {
            return interaction.reply({
                content: 'Feedback not found.',
                ephemeral: true
            });
        }
        
        feedback.staffResponse = response;
        feedback.respondedBy = interaction.user.id;
        feedback.respondedAt = new Date();
        feedback.status = 'reviewed';
        
        await feedback.save();
        
        const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (guildConfig.feedback.dmReply) {
            try {
                const user = await client.users.fetch(feedback.userId);
                
                const responseEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`Response to your ${feedback.category} Feedback`)
                    .setDescription('A staff member has responded to your feedback:')
                    .addFields(
                        { name: 'Your Feedback', value: feedback.content },
                        { name: 'Staff Response', value: response },
                        { name: 'Feedback ID', value: feedbackId }
                    )
                    .setTimestamp();
                
                await user.send({ embeds: [responseEmbed] });
            } catch (error) {
                console.error('Error sending DM response:', error);
            }
        }
        
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#3498db')
            .spliceFields(2, 1, { name: 'Status', value: 'Reviewed', inline: true })
            .addFields({ name: 'Staff Response', value: response });
        
        const updatedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`feedback_status_${feedbackId}_implemented`)
                .setLabel('Mark as Implemented')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`feedback_status_${feedbackId}_rejected`)
                .setLabel('Mark as Rejected')
                .setStyle(ButtonStyle.Danger)
        );
        
        await interaction.update({
            embeds: [updatedEmbed],
            components: [updatedRow]
        });
    } catch (error) {
        console.error('Error submitting feedback response:', error);
        await interaction.reply({
            content: 'An error occurred while submitting your response. Please try again later.',
            ephemeral: true
        });
    }
}

async function updateFeedbackStatus(interaction, client) {
    try {
        const match = interaction.customId.match(/feedback_status_(.+)_(.+)/);
        if (!match) {
            return interaction.reply({
                content: 'An error occurred while updating the feedback status.',
                ephemeral: true
            });
        }
        
        const [, feedbackId, status] = match;
        
        const feedback = await Feedback.findOne({ feedbackId });
        
        if (!feedback) {
            return interaction.reply({
                content: 'Feedback not found.',
                ephemeral: true
            });
        }
        
        feedback.status = status;
        await feedback.save();
        
        let statusColor;
        switch (status) {
            case 'reviewed':
                statusColor = '#3498db';
                break;
            case 'implemented':
                statusColor = '#2ecc71';
                break;
            case 'rejected':
                statusColor = '#e74c3c';
                break;
            default:
                statusColor = '#95a5a6';
        }
        
        const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
        
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(statusColor)
            .spliceFields(2, 1, { name: 'Status', value: formattedStatus, inline: true });
        
        let updatedRow;
        
        if (status === 'implemented' || status === 'rejected') {
            updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`feedback_view_${feedbackId}`)
                    .setLabel('View Details')
                    .setStyle(ButtonStyle.Secondary)
            );
        } else {
            updatedRow = ActionRowBuilder.from(interaction.message.components[0]);
        }
        
        await interaction.update({
            embeds: [updatedEmbed],
            components: [updatedRow]
        });
        
        const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (guildConfig.feedback.dmReply) {
            try {
                const user = await client.users.fetch(feedback.userId);
                
                const statusEmbed = new EmbedBuilder()
                    .setColor(statusColor)
                    .setTitle(`Feedback Status Update`)
                    .setDescription(`Your feedback has been marked as **${formattedStatus}**`)
                    .addFields(
                        { name: 'Category', value: feedback.category },
                        { name: 'Your Feedback', value: feedback.content },
                        { name: 'Feedback ID', value: feedbackId }
                    )
                    .setTimestamp();
                
                if (feedback.staffResponse) {
                    statusEmbed.addFields({ name: 'Staff Response', value: feedback.staffResponse });
                }
                
                await user.send({ embeds: [statusEmbed] });
            } catch (error) {
                console.error('Error sending status update DM:', error);
            }
        }
    } catch (error) {
        console.error('Error updating feedback status:', error);
        await interaction.reply({
            content: 'An error occurred while updating the feedback status. Please try again later.',
            ephemeral: true
        });
    }
}

module.exports = {
    createFeedbackModal,
    handleFeedbackCategorySelect,
    handleFeedbackAnonymousSelect,
    submitFeedback,
    handleFeedbackResponse,
    submitFeedbackResponse,
    updateFeedbackStatus
}; 