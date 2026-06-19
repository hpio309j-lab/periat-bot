const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType
} = require('discord.js');

module.exports = async (interaction, client) => {
    // Get the custom ID of the modal
    const modalId = interaction.customId;
    
    // Handle different modals based on their custom ID
    if (modalId === 'embed_builder_modal') {
        await handleEmbedBuilderModal(interaction, client);
    } else if (modalId.startsWith('embed_edit_modal_')) {
        await handleEmbedEditModal(interaction, client);
    } else if (modalId.startsWith('embed_template_modal_')) {
        await handleEmbedTemplateModal(interaction, client);
    }
};

// Handle the embed builder modal submission
async function handleEmbedBuilderModal(interaction, client) {
    try {
        // Get values from the modal inputs
        const title = interaction.fields.getTextInputValue('embed_title');
        const description = interaction.fields.getTextInputValue('embed_description');
        const colorInput = interaction.fields.getTextInputValue('embed_color');
        const footer = interaction.fields.getTextInputValue('embed_footer');
        const imageUrl = interaction.fields.getTextInputValue('embed_image');
        
        // Create the embed with the provided values
        const embed = new EmbedBuilder();
        
        // Set title if provided
        if (title) embed.setTitle(title);
        
        // Set description if provided
        if (description) embed.setDescription(description);
        
        // Set color if provided and valid
        if (colorInput) {
            // Check if the color is a valid hex code
            const colorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
            if (colorRegex.test(colorInput)) {
                embed.setColor(colorInput);
            } else {
                embed.setColor('#3498db'); // Default color if invalid
            }
        } else {
            embed.setColor('#3498db'); // Default color if not provided
        }
        
        // Set footer if provided
        if (footer) embed.setFooter({ text: footer, iconURL: client.user.displayAvatarURL() });
        
        // Set image if provided and valid
        if (imageUrl) {
            try {
                // Simple URL validation
                new URL(imageUrl);
                embed.setImage(imageUrl);
            } catch (error) {
                // Invalid URL, don't set image
            }
        }
        
        // Send a preview of the embed to the user
        await interaction.reply({
            content: 'Here\'s a preview of your embed. Use the buttons below to send it to a channel or make additional edits.',
            embeds: [embed],
            ephemeral: true
        });
        
        // Add buttons for channel selection, additional fields, and cancel
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('embed_send')
                    .setLabel('Send to Channel')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('embed_add_field')
                    .setLabel('Add Field')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('embed_edit')
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('embed_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await interaction.followUp({
            components: [buttons],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling embed builder modal:', error);
        
        await interaction.reply({
            content: 'An error occurred while creating the embed.',
            ephemeral: true
        });
    }
}

// Handle the embed edit modal submission
async function handleEmbedEditModal(interaction, client) {
    try {
        // Extract message ID and channel ID from the custom ID
        const [, messageId, channelId] = interaction.customId.split('_').slice(2);
        
        // Get the channel
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            return interaction.reply({
                content: 'Could not find the channel for this embed.',
                ephemeral: true
            });
        }
        
        // Get the message
        const message = await channel.messages.fetch(messageId);
        if (!message) {
            return interaction.reply({
                content: 'Could not find the message for this embed.',
                ephemeral: true
            });
        }
        
        // Get values from the modal inputs
        const title = interaction.fields.getTextInputValue('embed_title');
        const description = interaction.fields.getTextInputValue('embed_description');
        const colorInput = interaction.fields.getTextInputValue('embed_color');
        const footer = interaction.fields.getTextInputValue('embed_footer');
        const imageUrl = interaction.fields.getTextInputValue('embed_image');
        
        // Get the original embed
        const originalEmbed = message.embeds[0];
        
        // Create a new embed with updated values
        const embed = new EmbedBuilder();
        
        // Set title if provided
        if (title) embed.setTitle(title);
        
        // Set description if provided
        if (description) embed.setDescription(description);
        
        // Set color if provided and valid
        if (colorInput) {
            // Check if the color is a valid hex code
            const colorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
            if (colorRegex.test(colorInput)) {
                embed.setColor(colorInput);
            } else {
                embed.setColor(originalEmbed.color || '#3498db');
            }
        } else {
            embed.setColor(originalEmbed.color || '#3498db');
        }
        
        // Set footer if provided
        if (footer) {
            embed.setFooter({ 
                text: footer, 
                iconURL: originalEmbed.footer?.iconURL || client.user.displayAvatarURL() 
            });
        } else if (originalEmbed.footer) {
            embed.setFooter({
                text: originalEmbed.footer.text,
                iconURL: originalEmbed.footer.iconURL
            });
        }
        
        // Set image if provided and valid
        if (imageUrl) {
            try {
                // Simple URL validation
                new URL(imageUrl);
                embed.setImage(imageUrl);
            } catch (error) {
                if (originalEmbed.image) {
                    embed.setImage(originalEmbed.image.url);
                }
            }
        } else if (originalEmbed.image) {
            embed.setImage(originalEmbed.image.url);
        }
        
        // Preserve any fields from the original embed
        if (originalEmbed.fields && originalEmbed.fields.length > 0) {
            embed.addFields(...originalEmbed.fields);
        }
        
        // Update the message with the new embed
        await message.edit({ embeds: [embed] });
        
        // Confirm the edit to the user
        await interaction.reply({
            content: 'The embed has been updated!',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling embed edit modal:', error);
        
        await interaction.reply({
            content: 'An error occurred while updating the embed.',
            ephemeral: true
        });
    }
}

// Handle the embed template modal submission
async function handleEmbedTemplateModal(interaction, client) {
    try {
        // Extract template type from the custom ID
        const templateType = interaction.customId.split('_')[3];
        
        // Get values from the modal inputs
        const title = interaction.fields.getTextInputValue('embed_title');
        const description = interaction.fields.getTextInputValue('embed_description');
        const colorInput = interaction.fields.getTextInputValue('embed_color');
        const footer = interaction.fields.getTextInputValue('embed_footer');
        const imageUrl = interaction.fields.getTextInputValue('embed_image');
        
        // Create the embed with the provided values
        const embed = new EmbedBuilder();
        
        // Set title if provided
        if (title) embed.setTitle(title);
        
        // Set description if provided
        if (description) embed.setDescription(description);
        
        // Set color if provided and valid
        if (colorInput) {
            // Check if the color is a valid hex code
            const colorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
            if (colorRegex.test(colorInput)) {
                embed.setColor(colorInput);
            } else {
                embed.setColor('#3498db'); // Default color if invalid
            }
        } else {
            embed.setColor('#3498db'); // Default color if not provided
        }
        
        // Set footer if provided
        if (footer) embed.setFooter({ text: footer, iconURL: client.user.displayAvatarURL() });
        
        // Set image if provided and valid
        if (imageUrl) {
            try {
                // Simple URL validation
                new URL(imageUrl);
                embed.setImage(imageUrl);
            } catch (error) {
                // Invalid URL, don't set image
            }
        }
        
        // Add template-specific fields based on the template type
        switch (templateType) {
            case 'announcement':
                embed.addFields(
                    { name: 'What\'s New', value: 'Edit this field with your announcement content...' },
                    { name: 'When', value: 'Edit this field with your date/time information...' },
                    { name: 'Additional Info', value: 'Edit this field with any other relevant details...' }
                );
                break;
                
            case 'welcome':
                embed.addFields(
                    { name: 'Rules', value: 'Edit this field with your rules channel information...' },
                    { name: 'Roles', value: 'Edit this field with your roles channel information...' },
                    { name: 'Introduction', value: 'Edit this field with your introduction channel information...' }
                );
                break;
                
            case 'rules':
                embed.addFields(
                    { name: '1. Be Respectful', value: 'Edit this field with your specific rule details...' },
                    { name: '2. No Spam', value: 'Edit this field with your specific rule details...' },
                    { name: '3. Keep Content Appropriate', value: 'Edit this field with your specific rule details...' },
                    { name: '4. Follow Discord TOS', value: 'Edit this field with your specific rule details...' },
                    { name: '5. Listen to Staff', value: 'Edit this field with your specific rule details...' }
                );
                break;
                
            case 'info':
                embed.addFields(
                    { name: 'About Us', value: 'Edit this field with information about your server...' },
                    { name: 'Channels', value: 'Edit this field with descriptions of important channels...' },
                    { name: 'Roles', value: 'Edit this field with information about your role system...' },
                    { name: 'Commands', value: 'Edit this field with a list of useful bot commands...' }
                );
                break;
                
            case 'poll':
                embed.addFields(
                    { name: 'Option 1️⃣', value: 'Edit this field with your first option details...' },
                    { name: 'Option 2️⃣', value: 'Edit this field with your second option details...' },
                    { name: 'Option 3️⃣', value: 'Edit this field with your third option details...' }
                );
                break;
        }
        
        // Send a preview of the embed to the user
        await interaction.reply({
            content: 'Here\'s a preview of your template embed. Use the buttons below to send it to a channel or make additional edits.',
            embeds: [embed],
            ephemeral: true
        });
        
        // Add buttons for channel selection, additional fields, and cancel
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('embed_send')
                    .setLabel('Send to Channel')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('embed_add_field')
                    .setLabel('Add Field')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('embed_edit')
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('embed_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await interaction.followUp({
            components: [buttons],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling embed template modal:', error);
        
        await interaction.reply({
            content: 'An error occurred while creating the template embed.',
            ephemeral: true
        });
    }
} 