const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('هدية')
        .setDescription('استلم هديتك اليومية'),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Get guild config
            const guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig) {
                return interaction.reply({
                    content: '❌ لم يتم إعداد نظام الإقتصاد بعد',
                    ephemeral: true
                });
            }

            // Check cooldown
            const now = new Date();
            if (userProfile.dailyCooldown && userProfile.dailyCooldown > now) {
                const timeLeft = Math.ceil((userProfile.dailyCooldown - now) / 1000 / 60 / 60);
                return interaction.reply({
                    content: `⏳ يمكنك استلام هديتك اليومية بعد ${timeLeft} ساعة`,
                    ephemeral: true
                });
            }

            // Calculate gift amount
            const giftAmount = guildConfig.settings.dailyAmount;

            // Update user profile
            userProfile.balance += giftAmount;
            userProfile.stats.totalEarned += giftAmount;
            userProfile.dailyCooldown = new Date(now.getTime() + guildConfig.cooldowns.daily);
            await userProfile.save();

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('🎁 الهدية اليومية')
                .setDescription('مبروك! لقد استلمت هديتك اليومية')
                .addFields(
                    { name: '💵 المبلغ', value: `${giftAmount} ريال`, inline: true },
                    { name: '💳 رصيدك الحالي', value: `${userProfile.balance} ريال`, inline: true }
                )
                .setFooter({ text: 'تعال غداً للحصول على هدية جديدة!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in gift command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
