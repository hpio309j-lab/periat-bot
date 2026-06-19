const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    name: 'ايداع',
    aliases: ['deposit', 'dep'],
    category: 'economy',
    description: 'إيداع أموال في حسابك البنكي',

    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            // Check if amount is 'all' or a number
            let amount;
            if (args[0]?.toLowerCase() === 'all' || args[0]?.toLowerCase() === 'الكل') {
                amount = 'all';
            } else {
                amount = parseInt(args[0]);
                if (!amount || amount < 1) {
                    return message.reply('❌ الرجاء إدخال مبلغ صحيح أكبر من 0');
                }
            }

            let userProfile = await UserProfile.findOne({ 
                userId: message.author.id,
                guildId: message.guild.id
            });

            if (!userProfile) {
                userProfile = new UserProfile({
                    userId: message.author.id,
                    guildId: message.guild.id
                });
            }

            // If amount is 'all', set it to the user's balance
            if (amount === 'all') {
                amount = userProfile.balance;
            }

            if (amount > userProfile.balance) {
                return message.reply('❌ ليس لديك ما يكفي من المال في محفظتك');
            }

            userProfile.balance -= amount;
            userProfile.bank += amount;

            // Format numbers
            const formattedAmount = amount.toLocaleString('ar-EG');
            const formattedBalance = userProfile.balance.toLocaleString('ar-EG');
            const formattedBank = userProfile.bank.toLocaleString('ar-EG');

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🏦 تم الإيداع بنجاح')
                .setDescription(`تم إيداع ${formattedAmount} ريال في حسابك البنكي بنجاح`)
                .addFields(
                    { name: '💵 المحفظة', value: `${formattedBalance} ريال`, inline: true },
                    { name: '🏦 البنك', value: `${formattedBank} ريال`, inline: true }
                )
                .setTimestamp();

            await userProfile.save();
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in deposit command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ العملية');
        }
    }
};
