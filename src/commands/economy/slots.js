const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

// Slot machine symbols and their multipliers
const SLOTS = [
    { symbol: '🍒', multiplier: 2, name: 'كرز' },      // Cherry
    { symbol: '🍋', multiplier: 3, name: 'ليمون' },    // Lemon
    { symbol: '🍊', multiplier: 4, name: 'برتقال' },   // Orange
    { symbol: '🍇', multiplier: 5, name: 'عنب' },     // Grapes
    { symbol: '🍎', multiplier: 6, name: 'تفاح' },    // Apple
    { symbol: '💎', multiplier: 10, name: 'الماس' },  // Diamond
    { symbol: '7️⃣', multiplier: 15, name: 'سفن' },   // Seven
    { symbol: '🎰', multiplier: 20, name: 'جاكبوت' }  // Jackpot
];

module.exports = {
    name: 'سلوت',
    aliases: ['slots', 'slot'],
    category: 'economy',
    description: 'العب ماكينة الحظ',
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
            const lastGame = userProfile.cooldowns?.slots || 0;
            const timeLeft = lastGame + cooldown - Date.now();

            if (timeLeft > 0) {
                const seconds = Math.ceil(timeLeft / 1000);
                return message.reply(`❌ يجب الانتظار ${seconds} ثانية قبل اللعب مرة أخرى`);
            }

            // Spin the slots
            const result = [];
            for (let i = 0; i < 3; i++) {
                result.push(SLOTS[Math.floor(Math.random() * SLOTS.length)]);
            }

            // Check for wins
            let multiplier = 0;
            if (result[0].symbol === result[1].symbol && result[1].symbol === result[2].symbol) {
                // All three match - get the symbol's multiplier
                multiplier = result[0].multiplier;
            } else if (result[0].symbol === result[1].symbol || result[1].symbol === result[2].symbol) {
                // Two adjacent symbols match - half the multiplier
                const matchedSymbol = result[0].symbol === result[1].symbol ? result[0] : result[1];
                multiplier = matchedSymbol.multiplier / 2;
            }

            // Calculate winnings
            const winnings = multiplier > 0 ? Math.floor(amount * multiplier) : -amount;

            // Update user profile
            userProfile.balance += winnings;
            userProfile.stats.gamesPlayed = (userProfile.stats.gamesPlayed || 0) + 1;
            if (winnings > 0) {
                userProfile.stats.gamesWon = (userProfile.stats.gamesWon || 0) + 1;
                userProfile.stats.totalEarned = (userProfile.stats.totalEarned || 0) + winnings;
            } else {
                userProfile.stats.totalLost = (userProfile.stats.totalLost || 0) + amount;
            }
            userProfile.cooldowns.slots = Date.now();
            await userProfile.save();

            // Format numbers
            const formattedWinnings = Math.abs(winnings).toLocaleString('en-US');
            const formattedBalance = userProfile.balance.toLocaleString('en-US');

            // Create result embed
            const embed = new EmbedBuilder()
                .setColor(winnings > 0 ? '#2ecc71' : '#e74c3c')
                .setTitle('🎰 ماكينة الحظ')
                .setDescription(`${result.map(r => r.symbol).join(' | ')}`)
                .addFields(
                    { name: winnings > 0 ? '💰 ربحت' : '💸 خسرت', 
                      value: `$${formattedWinnings}`, inline: true },
                    { name: '💳 رصيدك الحالي', 
                      value: `$${formattedBalance}`, inline: true }
                )
                .setFooter({ text: 'اجمع 3 رموز متطابقة للفوز بالجائزة الكبرى!' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in slots command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};
