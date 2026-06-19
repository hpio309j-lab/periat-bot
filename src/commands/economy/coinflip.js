const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('عملة')
        .setDescription('لعبة رمي العملة')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('المبلغ المراد المراهنة به')
                .setRequired(true)
                .setMinValue(100))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('اختيارك: كتابة أو صورة')
                .setRequired(true)
                .addChoices(
                    { name: 'كتابة', value: 'heads' },
                    { name: 'صورة', value: 'tails' }
                )),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const amount = interaction.options.getInteger('amount');
            const choice = interaction.options.getString('choice');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Check if user has enough money
            if (userProfile.balance < amount) {
                return interaction.reply({
                    content: `❌ رصيدك غير كافي! تحتاج إلى ${amount} ريال`,
                    ephemeral: true
                });
            }

            // Check cooldown
            const cooldown = 10000; // 10 seconds
            const lastGame = userProfile.cooldowns?.coinflip || 0;
            const timeLeft = lastGame + cooldown - Date.now();

            if (timeLeft > 0) {
                const seconds = Math.ceil(timeLeft / 1000);
                return interaction.reply({
                    content: `❌ يجب الانتظار ${seconds} ثانية قبل اللعب مرة أخرى`,
                    ephemeral: true
                });
            }

            // Flip the coin
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = choice === result;
            const resultText = result === 'heads' ? 'كتابة' : 'صورة';

            // Update user profile
            userProfile.balance += won ? amount : -amount;
            userProfile.stats.gamesPlayed = (userProfile.stats.gamesPlayed || 0) + 1;
            if (won) {
                userProfile.stats.gamesWon = (userProfile.stats.gamesWon || 0) + 1;
                userProfile.stats.totalEarned += amount;
            } else {
                userProfile.stats.totalLost += amount;
            }
            userProfile.cooldowns.coinflip = Date.now();

            await userProfile.save();

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(won ? '#2ecc71' : '#e74c3c')
                .setTitle('🪙 رمي العملة')
                .setDescription(won ? '🎉 مبروك! لقد ربحت!' : '💔 للأسف خسرت!')
                .addFields(
                    { name: '🎲 اختيارك', value: choice === 'heads' ? 'كتابة' : 'صورة', inline: true },
                    { name: '🎯 النتيجة', value: resultText, inline: true },
                    { name: won ? '💰 ربحت' : '💸 خسرت', value: `${amount} ريال`, inline: true },
                    { name: '💳 رصيدك الحالي', value: `${userProfile.balance} ريال`, inline: true },
                    { name: '📊 إحصائياتك', value: `الألعاب: ${userProfile.stats.gamesPlayed}\nالفوز: ${userProfile.stats.gamesWon}`, inline: true }
                )
                .setTimestamp();

            // Add a special effect for big wins
            if (won && amount >= 1000) {
                embed.setDescription('🎉🎉🎉 مبروك! فوز كبير! 🎉🎉🎉');
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in coinflip command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
