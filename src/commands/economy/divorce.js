const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('طلاق')
        .setDescription('طلب الطلاق من شريك حياتك'),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Get user profile
            const userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile?.marriage?.partnerId) {
                return interaction.reply({
                    content: '❌ أنت غير متزوج!',
                    ephemeral: true
                });
            }

            // Get partner profile
            const partnerProfile = await UserProfile.findOne({
                userId: userProfile.marriage.partnerId,
                guildId
            });

            if (!partnerProfile) {
                // Partner not found, force divorce
                userProfile.marriage = null;
                await userProfile.save();
                return interaction.reply({
                    content: '✅ تم إنهاء الزواج لعدم وجود الشريك',
                    ephemeral: true
                });
            }

            // Calculate marriage duration
            const marriageDuration = Date.now() - userProfile.marriage.since;
            const durationInDays = Math.floor(marriageDuration / (1000 * 60 * 60 * 24));

            // Create confirmation buttons
            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_divorce')
                .setLabel('تأكيد الطلاق 💔')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_divorce')
                .setLabel('إلغاء ❌')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(confirmButton, cancelButton);

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('💔 طلب طلاق')
                .setDescription(`هل أنت متأكد من رغبتك في الطلاق من <@${userProfile.marriage.partnerId}>؟`)
                .addFields(
                    { name: '📅 تاريخ الزواج', value: userProfile.marriage.since.toLocaleDateString('ar-SA'), inline: true },
                    { name: '⏳ مدة الزواج', value: `${durationInDays} يوم`, inline: true }
                )
                .setFooter({ text: 'يرجى تأكيد قرارك باستخدام الأزرار أدناه' })
                .setTimestamp();

            const message = await interaction.reply({
                embeds: [embed],
                components: [row],
                fetchReply: true
            });

            // Create collector for buttons
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === userId,
                time: 30000
            });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_divorce') {
                    // Remove marriage details from both profiles
                    userProfile.marriage = null;
                    partnerProfile.marriage = null;

                    await Promise.all([userProfile.save(), partnerProfile.save()]);

                    const divorceEmbed = new EmbedBuilder()
                        .setColor('#95a5a6')
                        .setTitle('💔 تم الطلاق')
                        .setDescription(`تم إنهاء الزواج بين ${interaction.user} و <@${partnerProfile.userId}>`)
                        .addFields(
                            { name: '📅 تاريخ الطلاق', value: new Date().toLocaleDateString('ar-SA'), inline: true },
                            { name: '⏳ مدة الزواج', value: `${durationInDays} يوم`, inline: true }
                        )
                        .setTimestamp();

                    await i.update({ embeds: [divorceEmbed], components: [] });

                    // Try to notify the partner
                    try {
                        const partner = await interaction.client.users.fetch(partnerProfile.userId);
                        const notifyEmbed = new EmbedBuilder()
                            .setColor('#95a5a6')
                            .setTitle('💔 إشعار طلاق')
                            .setDescription(`قام ${interaction.user} بطلب الطلاق منك`)
                            .setTimestamp();

                        await partner.send({ embeds: [notifyEmbed] });
                    } catch (error) {
                        console.log('Could not notify partner about divorce:', error);
                    }
                } else if (i.customId === 'cancel_divorce') {
                    const cancelEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('💝 تم إلغاء الطلاق')
                        .setDescription('تم إلغاء طلب الطلاق بنجاح')
                        .setTimestamp();

                    await i.update({ embeds: [cancelEmbed], components: [] });
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#95a5a6')
                        .setTitle('⏰ انتهت المهلة')
                        .setDescription('انتهت مهلة الرد على طلب الطلاق')
                        .setTimestamp();

                    await message.edit({ embeds: [timeoutEmbed], components: [] });
                }
            });
        } catch (error) {
            console.error('Error in divorce command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
