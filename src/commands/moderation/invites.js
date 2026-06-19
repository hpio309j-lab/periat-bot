const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const GuildConfig = require('../../database/schemas/guildConfig');
const { getUserInvites, getInviteLeaderboard, addBonusInvites } = require('../../utils/inviteTracker');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Manage server invites and invite tracking')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your invite statistics')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to view invites for (defaults to yourself)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View the invite leaderboard'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add bonus invites to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add invites to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('The amount of invites to add')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('The reason for adding invites')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure invite tracking')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable invite tracking')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'view':
                await viewInvites(interaction);
                break;
            case 'leaderboard':
                await showLeaderboard(interaction);
                break;
            case 'add':
                await addInvites(interaction);
                break;
            case 'config':
                await configInvites(interaction);
                break;
        }
    }
};

async function viewInvites(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;
    
    try {
        const invites = await getUserInvites(guildId, targetUser.id);
        
        if (!invites) {
            return interaction.reply({
                content: '❌ Failed to fetch invite statistics.',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(`Invite Statistics for ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Total Invites', value: invites.total.toString(), inline: true },
                { name: 'Regular', value: invites.regular.toString(), inline: true },
                { name: 'Left', value: invites.left.toString(), inline: true },
                { name: 'Fake', value: invites.fake.toString(), inline: true },
                { name: 'Bonus', value: invites.bonus.toString(), inline: true }
            )
            .setFooter({ text: `User ID: ${targetUser.id}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error viewing invites:', error);
        await interaction.reply({
            content: '❌ An error occurred while fetching invite statistics.',
            ephemeral: true
        });
    }
}

async function showLeaderboard(interaction) {
    const guildId = interaction.guild.id;
    
    try {
        const stats = await getInviteLeaderboard(guildId, 10);
        
        if (!stats || stats.length === 0) {
            return interaction.reply({
                content: 'No invite statistics found for this server.',
                ephemeral: true
            });
        }
        
        let leaderboardText = '';
        
        for (let i = 0; i < stats.length; i++) {
            const user = await interaction.client.users.fetch(stats[i].userId).catch(() => null);
            const username = user ? user.tag : 'Unknown User';
            
            leaderboardText += `**${i + 1}.** ${username}: **${stats[i].invites.total}** invites\n`;
            leaderboardText += `   ├ Regular: ${stats[i].invites.regular} | Left: ${stats[i].invites.left} | Bonus: ${stats[i].invites.bonus}\n`;
        }
        
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle(`Invite Leaderboard - ${interaction.guild.name}`)
            .setDescription(leaderboardText)
            .setFooter({ text: 'Last updated' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error showing leaderboard:', error);
        await interaction.reply({
            content: '❌ An error occurred while fetching the invite leaderboard.',
            ephemeral: true
        });
    }
}

async function addInvites(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
            content: '❌ You need the Manage Server permission to add bonus invites.',
            ephemeral: true
        });
    }
    
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildId = interaction.guild.id;
    
    try {
        const success = await addBonusInvites(guildId, targetUser.id, amount);
        
        if (!success) {
            return interaction.reply({
                content: '❌ Failed to add bonus invites.',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Bonus Invites Added')
            .setDescription(`Added ${amount} bonus invites to ${targetUser.tag}`)
            .addFields(
                { name: 'Reason', value: reason },
                { name: 'Added By', value: interaction.user.tag }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        const logChannel = interaction.guild.channels.cache.find(
            channel => channel.name.includes('log') || channel.name.includes('invite')
        );
        
        if (logChannel) {
            embed.setFooter({ text: `User ID: ${targetUser.id}` });
            await logChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error adding invites:', error);
        await interaction.reply({
            content: '❌ An error occurred while adding bonus invites.',
            ephemeral: true
        });
    }
}

async function configInvites(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
            content: '❌ You need the Manage Server permission to configure invite tracking.',
            ephemeral: true
        });
    }
    
    const enabled = interaction.options.getBoolean('enabled');
    const guildId = interaction.guild.id;
    
    try {
        await GuildConfig.findOneAndUpdate(
            { guildId },
            { 'inviteTracking.enabled': enabled },
            { upsert: true }
        );
        
        const statusText = enabled ? 'enabled' : 'disabled';
        
        const embed = new EmbedBuilder()
            .setColor(enabled ? '#2ecc71' : '#e74c3c')
            .setTitle('Invite Tracking Configuration')
            .setDescription(`Invite tracking has been ${statusText} for this server.`)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error configuring invites:', error);
        await interaction.reply({
            content: '❌ An error occurred while configuring invite tracking.',
            ephemeral: true
        });
    }
} 