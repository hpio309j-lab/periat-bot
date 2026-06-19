const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Economy = require('../../database/schemas/economy');

const DAILY_AMOUNT = 1000; // 1000 ريال daily reward
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('استلام المكافأة اليومية'),

    async execute(interaction) {
        try {
            let userEconomy = await Economy.findOne({ 
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (!userEconomy) {
                userEconomy = new Economy({
                    userId: interaction.user.id,
                    guildId: interaction.guildId
                });
            }

            const now = new Date();
            if (userEconomy.lastDaily && (now - userEconomy.lastDaily) < DAILY_COOLDOWN) {
                const timeLeft = DAILY_COOLDOWN - (now - userEconomy.lastDaily);
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                return interaction.reply({
                    content: `⏰ يمكنك استلام مكافأتك اليومية بعد ${hoursLeft} ساعة و ${minutesLeft} دقيقة`,
                    ephemeral: true
                });
            }

            userEconomy.balance += DAILY_AMOUNT;
            userEconomy.lastDaily = now;
            userEconomy.transactions.push({
                type: 'daily',
                amount: DAILY_AMOUNT,
                description: 'المكافأة اليومية'
            });

            await userEconomy.save();

            const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle('💰 المكافأة اليومية')
                .setDescription(`تم إضافة ${DAILY_AMOUNT.toLocaleString('ar-EG')} ريال إلى محفظتك!`)
                .addFields(
                    { name: '💵 رصيد المحفظة الجديد', value: `${userEconomy.balance.toLocaleString('ar-EG')} ريال` }
                )
                .setFooter({ text: 'تعال غداً للحصول على مكافأة جديدة!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in daily command:', error);
            await interaction.reply({ content: '❌ حدث خطأ أثناء استلام المكافأة اليومية', ephemeral: true });
        }
    },
};
