const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('بخشيش')
        .setDescription('إعطاء بخشيش لشخص ما')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('الشخص المراد إعطاءه بخشيش')
                .setRequired(true)),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const tipper = interaction.user;
            const receiver = interaction.options.getUser('user');

            // Can't tip yourself
            if (tipper.id === receiver.id) {
                return interaction.reply({
                    content: '❌ لا يمكنك إعطاء بخشيش لنفسك!',
                    ephemeral: true
                });
            }

            // Can't tip bots
            if (receiver.bot) {
                return interaction.reply({
                    content: '❌ لا يمكنك إعطاء بخشيش للبوتات!',
                    ephemeral: true
                });
            }

            // Get tipper's profile
            const tipperProfile = await UserProfile.findOne({
                userId: tipper.id,
                guildId: interaction.guildId
            });

            // Random tip amount between 10 and 100
            const tipAmount = Math.floor(Math.random() * 91) + 10;

            if (!tipperProfile || tipperProfile.balance < tipAmount) {
                return interaction.reply({
                    content: `❌ رصيدك غير كافي! تحتاج إلى ${tipAmount} ريال على الأقل`,
                    ephemeral: true
                });
            }

            // Get or create receiver's profile
            let receiverProfile = await UserProfile.findOne({
                userId: receiver.id,
                guildId: interaction.guildId
            });

            if (!receiverProfile) {
                receiverProfile = new UserProfile({
                    userId: receiver.id,
                    guildId: interaction.guildId
                });
            }

            // Perform tip
            tipperProfile.balance -= tipAmount;
            receiverProfile.balance += tipAmount;

            // Update stats
            tipperProfile.stats.totalSpent += tipAmount;
            receiverProfile.stats.totalEarned += tipAmount;

            await Promise.all([tipperProfile.save(), receiverProfile.save()]);

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🎁 بخشيش')
                .setDescription(`${tipper} أعطى بخشيش لـ ${receiver}`)
                .addFields(
                    { name: '💵 المبلغ', value: `${tipAmount} ريال`, inline: true },
                    { name: '💝 رسالة', value: 'شكراً لك!', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Try to notify the receiver
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🎁 بخشيش مستلم')
                    .setDescription(`لقد استلمت بخشيش من ${tipper}`)
                    .addFields(
                        { name: '💵 المبلغ', value: `${tipAmount} ريال`, inline: true },
                        { name: '💳 رصيدك الحالي', value: `${receiverProfile.balance} ريال`, inline: true }
                    )
                    .setTimestamp();

                await receiver.send({ embeds: [dmEmbed] });
            } catch (error) {
                // Ignore DM errors
                console.log('Could not send DM to receiver:', error);
            }
        } catch (error) {
            console.error('Error in tip command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
