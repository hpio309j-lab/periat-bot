const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    name: 'نرد',
    aliases: ['dice', 'roll'],
    category: 'economy',
    description: 'العب النرد واربح المال',
    minBet: 50,

    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            // Parse bet amount
            const amount = parseInt(args[0]);
            if (!amount || amount < this.minBet) {
                return message.reply(`❌ يجب عليك المراهنة بمبلغ ${this.minBet}$ على الأقل`);
            }

            // Parse chosen number
            const number = parseInt(args[1]);
            if (!number || number < 1 || number > 6) {
                return message.reply('❌ يجب اختيار رقم من 1 إلى 6');
            }

            const userId = message.author.id;
            const guildId = message.guild.id;

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Check if user has enough money
            if (userProfile.balance < amount) {
                return message.reply(`❌ رصيدك غير كافي! تحتاج إلى $${amount.toLocaleString('en-US')}`);
            }

            // Check cooldown
            const cooldown = 10000; // 10 seconds
            const lastGame = userProfile.cooldowns?.dice || 0;
            const timeLeft = lastGame + cooldown - Date.now();

            if (timeLeft > 0) {
                const seconds = Math.ceil(timeLeft / 1000);
                return message.reply(`❌ يجب الانتظار ${seconds} ثانية قبل اللعب مرة أخرى`);
            }

            // Roll the dice
            const diceRoll = Math.floor(Math.random() * 6) + 1;

            // Calculate winnings
            let winnings = 0;
            if (diceRoll === number) {
                winnings = amount * 6; // 6x for correct guess
            } else {
                winnings = -amount;
            }

            // Update user profile
            userProfile.balance += winnings;
            userProfile.stats.gamesPlayed = (userProfile.stats.gamesPlayed || 0) + 1;
            if (winnings > 0) {
                userProfile.stats.gamesWon = (userProfile.stats.gamesWon || 0) + 1;
                userProfile.stats.totalEarned = (userProfile.stats.totalEarned || 0) + winnings;
            } else {
                userProfile.stats.totalLost = (userProfile.stats.totalLost || 0) + amount;
            }
            userProfile.cooldowns.dice = Date.now();
            await userProfile.save();

            // Format numbers
            const formattedWinnings = Math.abs(winnings).toLocaleString('en-US');
            const formattedBalance = userProfile.balance.toLocaleString('en-US');

            // Create result embed
            const embed = new EmbedBuilder()
                .setColor(winnings > 0 ? '#2ecc71' : '#e74c3c')
                .setTitle(winnings > 0 ? '🎉 مبروك! ربحت!' : '😢 خسرت!')
                .setDescription(`🎲 النرد وقع على ${diceRoll}`)
                .addFields(
                    { name: '🎲 رقمك', value: `${number}`, inline: true },
                    { name: winnings > 0 ? '💰 ربحت' : '💸 خسرت', value: `$${formattedWinnings}`, inline: true },
                    { name: '💳 رصيدك الحالي', value: `$${formattedBalance}`, inline: true }
                )
                .setTimestamp();

            // Add a special effect for big wins
            if (won && amount >= 1000) {
                embed.setDescription('🎉🎉🎉 مبروك! فوز كبير! 🎉🎉🎉');
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in dice command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
