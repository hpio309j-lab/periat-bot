const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedbuilder')
        .setDescription('Create and send custom embeds to any channel')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new custom embed'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing embed')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID of the embed to edit')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel where the embed is located')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('template')
                .setDescription('Use a premade embed template')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('The type of template to use')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Announcement', value: 'announcement' },
                            { name: 'Welcome', value: 'welcome' },
                            { name: 'Rules', value: 'rules' },
                            { name: 'Information', value: 'info' },
                            { name: 'Poll', value: 'poll' }
                        )))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'create':
                await handleCreateEmbed(interaction, client);
                break;
            case 'edit':
                await handleEditEmbed(interaction, client);
                break;
            case 'template':
                await handleTemplateEmbed(interaction, client);
                break;
        }
    },
};

// Handle creating a new embed
async function handleCreateEmbed(interaction, client) {
    // Show the embed builder modal
    const modal = new ModalBuilder()
        .setCustomId('embed_builder_modal')
        .setTitle('Create Custom Embed');
    
    // Add title input
    const titleInput = new TextInputBuilder()
        .setCustomId('embed_title')
        .setLabel('Embed Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a title for your embed')
        .setRequired(false)
        .setMaxLength(256);
    
    // Add description input
    const descriptionInput = new TextInputBuilder()
        .setCustomId('embed_description')
        .setLabel('Embed Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter a description for your embed')
        .setRequired(false)
        .setMaxLength(4000);
    
    // Add color input
    const colorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setLabel('Embed Color (hex code)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#3498db')
        .setRequired(false)
        .setMaxLength(7);
    
    // Add footer input
    const footerInput = new TextInputBuilder()
        .setCustomId('embed_footer')
        .setLabel('Embed Footer')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter text for the footer')
        .setRequired(false)
        .setMaxLength(2048);
    
    // Add image URL input
    const imageInput = new TextInputBuilder()
        .setCustomId('embed_image')
        .setLabel('Image URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com/image.png')
        .setRequired(false);
    
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
}

// Handle editing an existing embed
async function handleEditEmbed(interaction, client) {
    try {
        const messageId = interaction.options.getString('message_id');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        // Check if channel is a text channel
        if (!channel.isTextBased()) {
            return interaction.reply({
                content: 'The specified channel is not a text channel!',
                ephemeral: true
            });
        }
        
        // Fetch the message
        let message;
        try {
            message = await channel.messages.fetch(messageId);
        } catch (error) {
            return interaction.reply({
                content: 'Could not find a message with that ID in the specified channel.',
                ephemeral: true
            });
        }
        
        // Check if the message has an embed
        if (!message.embeds || message.embeds.length === 0) {
            return interaction.reply({
                content: 'The specified message does not contain an embed!',
                ephemeral: true
            });
        }
        
        // Check if the message was sent by the bot
        if (message.author.id !== client.user.id) {
            return interaction.reply({
                content: 'I can only edit embeds that were created by me.',
                ephemeral: true
            });
        }
        
        // Create modal with the existing embed values
        const embed = message.embeds[0];
        
        const modal = new ModalBuilder()
            .setCustomId(`embed_edit_modal_${messageId}_${channel.id}`)
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
        
        // Show the modal
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error editing embed:', error);
        
        await interaction.reply({
            content: 'An error occurred while editing the embed.',
            ephemeral: true
        });
    }
}

// Handle template embeds
async function handleTemplateEmbed(interaction, client) {
    const templateType = interaction.options.getString('type');
    
    // Create embed based on template type
    let embed = new EmbedBuilder();
    
    switch (templateType) {
        case 'announcement':
            embed
                .setColor('#e74c3c')
                .setTitle('📢 Important Announcement')
                .setDescription('We have some exciting news to share with you! Read all about it below.')
                .addFields(
                    { name: 'What\'s New', value: 'Type your announcement here...' },
                    { name: 'When', value: 'Date and time information...' },
                    { name: 'Additional Info', value: 'Any other relevant details...' }
                )
                .setFooter({ text: 'Edit this template with your own content', iconURL: client.user.displayAvatarURL() });
            break;
            
        case 'welcome':
            embed
                .setColor('#2ecc71')
                .setTitle('👋 Welcome to the Server!')
                .setDescription('We\'re glad to have you here! Check out the information below to get started.')
                .addFields(
                    { name: 'Rules', value: 'Make sure to read our rules in <#CHANNEL_ID>' },
                    { name: 'Roles', value: 'Get roles in <#CHANNEL_ID>' },
                    { name: 'Introduction', value: 'Introduce yourself in <#CHANNEL_ID>' }
                )
                .setImage('https://i.imgur.com/GGKye05.png')
                .setFooter({ text: 'Edit this template with your own content', iconURL: client.user.displayAvatarURL() });
            break;
            
        case 'rules':
            embed
                .setColor('#3498db')
                .setTitle('📜 Server Rules')
                .setDescription('Please follow these rules to ensure a positive experience for everyone.')
                .addFields(
                    { name: '1. Be Respectful', value: 'Treat others with respect. Harassment, hate speech, and discrimination will not be tolerated.' },
                    { name: '2. No Spam', value: 'Avoid spamming messages, emotes, or mentions.' },
                    { name: '3. Keep Content Appropriate', value: 'No NSFW content in non-NSFW channels.' },
                    { name: '4. Follow Discord TOS', value: 'Adhere to Discord\'s Terms of Service and Community Guidelines.' },
                    { name: '5. Listen to Staff', value: 'Follow instructions from moderators and administrators.' }
                )
                .setFooter({ text: 'Edit this template with your own content', iconURL: client.user.displayAvatarURL() });
            break;
            
        case 'info':
            embed
                .setColor('#9b59b6')
                .setTitle('ℹ️ Server Information')
                .setDescription('Everything you need to know about our server.')
                .addFields(
                    { name: 'About Us', value: 'Information about the server and its purpose...' },
                    { name: 'Channels', value: 'Description of important channels...' },
                    { name: 'Roles', value: 'Information about the role system...' },
                    { name: 'Commands', value: 'List of useful bot commands...' }
                )
                .setFooter({ text: 'Edit this template with your own content', iconURL: client.user.displayAvatarURL() });
            break;
            
        case 'poll':
            embed
                .setColor('#f1c40f')
                .setTitle('📊 Poll: [Your Question Here]')
                .setDescription('Cast your vote by reacting to this message!')
                .addFields(
                    { name: 'Option 1️⃣', value: 'Description of option 1...' },
                    { name: 'Option 2️⃣', value: 'Description of option 2...' },
                    { name: 'Option 3️⃣', value: 'Description of option 3...' }
                )
                .setFooter({ text: 'Poll ends: [Date/Time] • Edit this template with your own content', iconURL: client.user.displayAvatarURL() });
            break;
    }
    
    // Create preview for the user
    await interaction.reply({
        content: 'Here\'s your template embed. You can send it as-is or customize it.',
        embeds: [embed],
        ephemeral: true
    });
    
    // Add buttons to edit or send the embed
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_template_edit_${templateType}`)
                .setLabel('Edit Template')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`embed_template_send`)
                .setLabel('Send to Channel')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`embed_template_cancel`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.followUp({
        components: [row],
        ephemeral: true
    });
} 