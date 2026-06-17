const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction, client) => {
    // Get the custom ID of the select menu
    const customId = interaction.customId;
    
    // Handle different select menu interactions based on their custom ID
    if (customId === 'embed_channel_select') {
        await handleEmbedChannelSelect(interaction, client);
    }
    // Add more select menu handlers here as needed
};

// Handle the embed channel selection
async function handleEmbedChannelSelect(interaction, client) {
    try {
        // Get the selected channel
        const selectedChannel = interaction.channels.first();
        
        if (!selectedChannel) {
            return await interaction.reply({
                content: 'You must select a channel.',
                ephemeral: true
            });
        }
        
        // Check if the channel is text-based
        if (!selectedChannel.isTextBased()) {
            return await interaction.reply({
                content: 'You must select a text channel.',
                ephemeral: true
            });
        }
        
        // Get the stored embed data
        if (!client.embedData || !client.embedData[interaction.user.id] || !client.embedData[interaction.user.id].embed) {
            return await interaction.reply({
                content: 'Could not find the embed data. Please try creating the embed again.',
                ephemeral: true
            });
        }
        
        // Get the stored embed
        const storedEmbed = client.embedData[interaction.user.id].embed;
        
        // Create a new embed with the same properties
        const embed = new EmbedBuilder()
            .setColor(storedEmbed.color || '#3498db');
        
        // Set title if it exists
        if (storedEmbed.title) embed.setTitle(storedEmbed.title);
        
        // Set description if it exists
        if (storedEmbed.description) embed.setDescription(storedEmbed.description);
        
        // Set footer if it exists
        if (storedEmbed.footer) {
            embed.setFooter({
                text: storedEmbed.footer.text,
                iconURL: storedEmbed.footer.iconURL
            });
        }
        
        // Set image if it exists
        if (storedEmbed.image) embed.setImage(storedEmbed.image.url);
        
        // Set thumbnail if it exists
        if (storedEmbed.thumbnail) embed.setThumbnail(storedEmbed.thumbnail.url);
        
        // Set author if it exists
        if (storedEmbed.author) {
            embed.setAuthor({
                name: storedEmbed.author.name,
                iconURL: storedEmbed.author.iconURL,
                url: storedEmbed.author.url
            });
        }
        
        // Add fields if they exist
        if (storedEmbed.fields && storedEmbed.fields.length > 0) {
            embed.addFields(...storedEmbed.fields);
        }
        
        // Send the embed to the selected channel
        const sentMessage = await selectedChannel.send({ embeds: [embed] });
        
        // Clear the stored embed data
        delete client.embedData[interaction.user.id];
        
        // Confirm to the user
        await interaction.update({
            content: `Embed sent to ${selectedChannel}! [Jump to Message](${sentMessage.url})`,
            embeds: [],
            components: []
        });
    } catch (error) {
        console.error('Error handling embed channel select:', error);
        
        await interaction.reply({
            content: 'An error occurred while sending the embed.',
            ephemeral: true
        });
    }
} 