const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('زواجي')
        .setDescription('عرض معلومات الزواج')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('الشخص المراد عرض معلومات زواجه (اختياري)')),
    
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

            if (!userProfile?.marriage?.partnerId) {
                return interaction.reply({
                    content: targetUser.id === interaction.user.id ? 
                        '❌ أنت غير متزوج!' : 
                        `❌ ${targetUser.username} غير متزوج!`,
                    ephemeral: true
                });
            }

            // Get partner profile
            const partnerProfile = await UserProfile.findOne({
                userId: userProfile.marriage.partnerId,
                guildId
            });

            // Calculate marriage duration
            const marriageDuration = Date.now() - userProfile.marriage.since;
            const days = Math.floor(marriageDuration / (1000 * 60 * 60 * 24));
            const months = Math.floor(days / 30);
            const years = Math.floor(months / 12);

            let durationText = '';
            if (years > 0) {
                durationText = `${years} سنة`;
                if (months % 12 > 0) durationText += ` و ${months % 12} شهر`;
            } else if (months > 0) {
                durationText = `${months} شهر`;
                if (days % 30 > 0) durationText += ` و ${days % 30} يوم`;
            } else {
                durationText = `${days} يوم`;
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#e91e63')
                .setTitle('💑 معلومات الزواج')
                .setDescription(partnerProfile ? 
                    `${targetUser} متزوج من <@${partnerProfile.userId}>` :
                    `${targetUser} متزوج`)
                .addFields(
                    { name: '💍 الخاتم', value: 'خاتم الماس', inline: true },
                    { name: '📅 تاريخ الزواج', value: userProfile.marriage.since.toLocaleDateString('ar-SA'), inline: true },
                    { name: '⏳ مدة الزواج', value: durationText, inline: true }
                )
                .setTimestamp();

            // Add thumbnail if possible
            if (partnerProfile) {
                const partner = await interaction.client.users.fetch(partnerProfile.userId);
                embed.setThumbnail(partner.displayAvatarURL({ dynamic: true }));
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in marriage info command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
