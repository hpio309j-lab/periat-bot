const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('حقيبة')
        .setDescription('عرض محتويات حقيبتك')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('الشخص المراد عرض حقيبته (اختياري)')),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guild.id;

            // Get user profile
            const userProfile = await UserProfile.findOne({
                userId: targetUser.id,
                guildId
            });

            if (!userProfile || !userProfile.items || userProfile.items.length === 0) {
                return interaction.reply({
                    content: targetUser.id === interaction.user.id ?
                        '❌ حقيبتك فارغة!' :
                        `❌ حقيبة ${targetUser.username} فارغة!`,
                    ephemeral: true
                });
            }

            // Group items by type
            const groupedItems = userProfile.items.reduce((acc, item) => {
                if (!acc[item.id]) {
                    acc[item.id] = {
                        name: item.name,
                        count: 0,
                        lastPurchased: item.purchasedAt
                    };
                }
                acc[item.id].count++;
                acc[item.id].lastPurchased = new Date(Math.max(
                    new Date(acc[item.id].lastPurchased),
                    new Date(item.purchasedAt)
                ));
                return acc;
            }, {});

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`🎒 حقيبة ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            // Add active effects section if any
            const activeEffects = [];
            
            // Check protection
            if (userProfile.protection?.active && userProfile.protection.expiresAt > new Date()) {
                const hoursLeft = Math.ceil((userProfile.protection.expiresAt - new Date()) / (1000 * 60 * 60));
                activeEffects.push(`🛡️ درع الحماية (${hoursLeft} ساعة متبقية)`);
            }

            // Check marriage
            if (userProfile.marriage?.partnerId) {
                const daysMarried = Math.floor((new Date() - userProfile.marriage.since) / (1000 * 60 * 60 * 24));
                activeEffects.push(`💍 متزوج (${daysMarried} يوم)`);
            }

            if (activeEffects.length > 0) {
                embed.addFields({
                    name: '✨ التأثيرات النشطة',
                    value: activeEffects.join('\n'),
                    inline: false
                });
            }

            // Add items section
            Object.values(groupedItems).forEach(item => {
                embed.addFields({
                    name: item.name,
                    value: `العدد: ${item.count}\nآخر شراء: ${item.lastPurchased.toLocaleDateString('ar-SA')}`,
                    inline: true
                });
            });

            // Add statistics
            embed.addFields({
                name: '📊 إحصائيات',
                value: `💰 الرصيد: ${userProfile.balance} ريال\n` +
                      `💵 إجمالي المكتسبات: ${userProfile.stats.totalEarned} ريال\n` +
                      `💸 إجمالي المصروفات: ${userProfile.stats.totalSpent} ريال\n` +
                      `🦹 عدد الجرائم: ${userProfile.stats.crimesCommitted}\n` +
                      `🔫 عدد السرقات: ${userProfile.stats.totalStolen || 0}\n` +
                      `📉 إجمالي الخسائر: ${userProfile.stats.totalLost} ريال`,
                inline: false
            });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in inventory command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
