const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupeconomy')
        .setDescription('إعداد نظام الإقتصاد')
        .addChannelOption(option =>
            option.setName('economy')
                .setDescription('روم الإقتصاد')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('games')
                .setDescription('روم الألعاب')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const economyChannel = interaction.options.getChannel('economy');
            const gamesChannel = interaction.options.getChannel('games');

            // Define default items
            const defaultItems = [
                {
                    id: 'protection_shield',
                    name: 'درع حماية',
                    price: 1000,
                    description: 'يحميك من السرقة لمدة 24 ساعة',
                    emoji: '🛡️',
                    type: 'usable',
                    effect: {
                        type: 'protection',
                        value: 24 // hours
                    }
                },
                {
                    id: 'diamond_ring',
                    name: 'خاتم الماس',
                    price: 5000,
                    description: 'خاتم فاخر للزواج',
                    emoji: '💍',
                    type: 'ring',
                    effect: {
                        type: 'marriage',
                        value: 1
                    }
                }
            ];

            // Update or create guild configuration
            await GuildConfig.findOneAndUpdate(
                { guildId: interaction.guildId },
                {
                    $set: {
                        guildId: interaction.guildId,
                        economyChannelId: economyChannel.id,
                        gameChannelId: gamesChannel.id,
                        items: defaultItems
                    }
                },
                { upsert: true, new: true }
            );

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('⚙️ إعداد نظام الإقتصاد')
                .setDescription('تم إعداد نظام الإقتصاد بنجاح!')
                .addFields(
                    { name: '💰 روم الإقتصاد', value: `${economyChannel}`, inline: true },
                    { name: '🎮 روم الألعاب', value: `${gamesChannel}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in setupeconomy command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إعداد نظام الإقتصاد',
                ephemeral: true
            });
        }
    }
};
