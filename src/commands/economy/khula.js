const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('خلع')
        .setDescription('طلب الخلع من شريك حياتك مقابل تعويض مادي'),
    
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

            // Calculate khula compensation (half of the ring price)
            const guildConfig = await GuildConfig.findOne({ guildId });
            const ringPrice = guildConfig?.items?.find(item => item.id === 'diamond_ring')?.price || 5000;
            const compensation = Math.floor(ringPrice / 2);

            // Check if user has enough money for compensation
            if (userProfile.balance < compensation) {
                return interaction.reply({
                    content: `❌ لا يمكنك طلب الخلع! تحتاج إلى ${compensation} ريال كتعويض`,
                    ephemeral: true
                });
            }

            // Calculate marriage duration
            const marriageDuration = Date.now() - userProfile.marriage.since;
            const durationInDays = Math.floor(marriageDuration / (1000 * 60 * 60 * 24));

            // Create buttons for partner
            const acceptButton = new ButtonBuilder()
                .setCustomId('accept_khula')
                .setLabel('قبول الخلع ✨')
                .setStyle(ButtonStyle.Success);

            const rejectButton = new ButtonBuilder()
                .setCustomId('reject_khula')
                .setLabel('رفض الخلع ❌')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(acceptButton, rejectButton);

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('💔 طلب خلع')
                .setDescription(`${interaction.user} يطلب الخلع من <@${partnerProfile.userId}>`)
                .addFields(
                    { name: '💰 التعويض', value: `${compensation} ريال`, inline: true },
                    { name: '📅 تاريخ الزواج', value: userProfile.marriage.since.toLocaleDateString('ar-SA'), inline: true },
                    { name: '⏳ مدة الزواج', value: `${durationInDays} يوم`, inline: true }
                )
                .setFooter({ text: 'يجب على الزوج الرد خلال 60 ثانية' })
                .setTimestamp();

            const message = await interaction.reply({
                content: `<@${partnerProfile.userId}>`,
                embeds: [embed],
                components: [row],
                fetchReply: true
            });

            // Create collector for buttons
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === partnerProfile.userId,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'accept_khula') {
                    // Process compensation
                    userProfile.balance -= compensation;
                    partnerProfile.balance += compensation;
                    userProfile.stats.totalSpent += compensation;
                    partnerProfile.stats.totalEarned += compensation;

                    // Remove marriage details from both profiles
                    userProfile.marriage = null;
                    partnerProfile.marriage = null;

                    await Promise.all([userProfile.save(), partnerProfile.save()]);

                    const khulaEmbed = new EmbedBuilder()
                        .setColor('#95a5a6')
                        .setTitle('💔 تم الخلع')
                        .setDescription(`تم إنهاء الزواج بالخلع بين ${interaction.user} و <@${partnerProfile.userId}>`)
                        .addFields(
                            { name: '💰 التعويض', value: `${compensation} ريال`, inline: true },
                            { name: '📅 تاريخ الخلع', value: new Date().toLocaleDateString('ar-SA'), inline: true },
                            { name: '⏳ مدة الزواج', value: `${durationInDays} يوم`, inline: true }
                        )
                        .setTimestamp();

                    await i.update({ embeds: [khulaEmbed], components: [] });
                } else if (i.customId === 'reject_khula') {
                    const rejectEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('❌ تم رفض الخلع')
                        .setDescription(`<@${partnerProfile.userId}> رفض طلب الخلع`)
                        .setTimestamp();

                    await i.update({ embeds: [rejectEmbed], components: [] });
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#95a5a6')
                        .setTitle('⏰ انتهت المهلة')
                        .setDescription('انتهت مهلة الرد على طلب الخلع')
                        .setTimestamp();

                    await message.edit({ embeds: [timeoutEmbed], components: [] });
                }
            });
        } catch (error) {
            console.error('Error in khula command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
