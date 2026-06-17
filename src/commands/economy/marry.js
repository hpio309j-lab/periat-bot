const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('زواج')
        .setDescription('التقدم للزواج من شخص ما')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('الشخص الذي تريد الزواج منه')
                .setRequired(true)),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const proposer = interaction.user;
            const proposed = interaction.options.getUser('user');

            // Can't marry yourself
            if (proposer.id === proposed.id) {
                return interaction.reply({
                    content: '❌ لا يمكنك الزواج من نفسك!',
                    ephemeral: true
                });
            }

            // Can't marry bots
            if (proposed.bot) {
                return interaction.reply({
                    content: '❌ لا يمكنك الزواج من البوتات!',
                    ephemeral: true
                });
            }

            // Get both profiles
            const [proposerProfile, proposedProfile] = await Promise.all([
                UserProfile.findOne({ userId: proposer.id, guildId: interaction.guildId }),
                UserProfile.findOne({ userId: proposed.id, guildId: interaction.guildId })
            ]);

            // Check if proposer is already married
            if (proposerProfile?.marriage?.partnerId) {
                return interaction.reply({
                    content: '❌ أنت متزوج بالفعل!',
                    ephemeral: true
                });
            }

            // Check if proposed is already married
            if (proposedProfile?.marriage?.partnerId) {
                return interaction.reply({
                    content: '❌ هذا الشخص متزوج بالفعل!',
                    ephemeral: true
                });
            }

            // Check if proposer has a diamond ring
            const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
            const ringPrice = guildConfig?.items?.find(item => item.id === 'diamond_ring')?.price || 5000;

            if (!proposerProfile || proposerProfile.balance < ringPrice) {
                return interaction.reply({
                    content: `❌ تحتاج إلى ${ringPrice} ريال لشراء خاتم الزواج!`,
                    ephemeral: true
                });
            }

            // Create buttons
            const acceptButton = new ButtonBuilder()
                .setCustomId('accept_marriage')
                .setLabel('قبول ✨')
                .setStyle(ButtonStyle.Success);

            const rejectButton = new ButtonBuilder()
                .setCustomId('reject_marriage')
                .setLabel('رفض 💔')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(acceptButton, rejectButton);

            // Create proposal embed
            const embed = new EmbedBuilder()
                .setColor('#e91e63')
                .setTitle('💝 طلب زواج')
                .setDescription(`${proposer} تقدم للزواج من ${proposed}`)
                .addFields(
                    { name: '💍 تكلفة الزواج', value: `${ringPrice} ريال`, inline: true },
                    { name: '⏳ مدة الانتظار', value: '60 ثانية', inline: true }
                )
                .setFooter({ text: 'يرجى الرد على الطلب باستخدام الأزرار أدناه' })
                .setTimestamp();

            const message = await interaction.reply({
                content: `${proposed}`,
                embeds: [embed],
                components: [row],
                fetchReply: true
            });

            // Create collector for buttons
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === proposed.id,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'accept_marriage') {
                    // Deduct ring price
                    proposerProfile.balance -= ringPrice;
                    proposerProfile.stats.totalSpent += ringPrice;

                    // Set marriage details for both users
                    const now = new Date();
                    proposerProfile.marriage = {
                        partnerId: proposed.id,
                        since: now,
                        ring: 'diamond_ring'
                    };

                    if (!proposedProfile) {
                        proposedProfile = new UserProfile({
                            userId: proposed.id,
                            guildId: interaction.guildId
                        });
                    }

                    proposedProfile.marriage = {
                        partnerId: proposer.id,
                        since: now,
                        ring: 'diamond_ring'
                    };

                    await Promise.all([proposerProfile.save(), proposedProfile.save()]);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('👰 تم الزواج! 🤵')
                        .setDescription(`مبروك! ${proposer} و ${proposed} أصبحا متزوجين!`)
                        .addFields(
                            { name: '💍 الخاتم', value: 'خاتم الماس', inline: true },
                            { name: '📅 تاريخ الزواج', value: now.toLocaleDateString('ar-SA'), inline: true }
                        )
                        .setTimestamp();

                    await i.update({ embeds: [successEmbed], components: [] });
                } else if (i.customId === 'reject_marriage') {
                    const rejectEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('💔 تم رفض طلب الزواج')
                        .setDescription(`${proposed} رفض طلب الزواج من ${proposer}`)
                        .setTimestamp();

                    await i.update({ embeds: [rejectEmbed], components: [] });
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#95a5a6')
                        .setTitle('⏰ انتهت المهلة')
                        .setDescription('انتهت مهلة الرد على طلب الزواج')
                        .setTimestamp();

                    await message.edit({ embeds: [timeoutEmbed], components: [] });
                }
            });
        } catch (error) {
            console.error('Error in marry command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
