const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    name: 'تسديد',
    aliases: ['repay', 'pay', 'سداد'],
    category: 'economy',
    description: 'تسديد القرض البنكي',
    usage: '$تسديد <المبلغ>',
    
    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            if (!args[0]) {
                return message.reply('❌ يجب تحديد المبلغ المراد تسديده');
            }

            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1) {
                return message.reply('❌ يجب أن يكون المبلغ رقماً موجباً');
            }

            const userId = message.author.id;
            const guildId = message.guild.id;

            // Get user profile
            const userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile || !userProfile.loan || !userProfile.loan.amount) {
                return message.reply('❌ ليس لديك قرض للتسديد');
            }

            // Check if user has enough money
            if (userProfile.balance < amount) {
                return message.reply('❌ رصيدك غير كافي للتسديد');
            }

            // Check if payment amount is more than remaining loan
            if (amount > userProfile.loan.amount) {
                return message.reply(`❌ المبلغ المتبقي من القرض هو ${userProfile.loan.amount.toLocaleString('ar-EG')} ريال فقط`);
            }

            // Process payment
            userProfile.balance -= amount;
            userProfile.loan.amount -= amount;
            userProfile.loan.payments.push({
                amount: amount,
                date: new Date()
            });

            // Check if loan is fully paid
            if (userProfile.loan.amount === 0) {
                userProfile.loan.dueDate = null;
            }

            await userProfile.save();

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('💰 تسديد القرض')
                .setDescription('تم تسديد الدفعة بنجاح!')
                .addFields(
                    { name: '💵 المبلغ المسدد', value: `${amount.toLocaleString('ar-EG')} ريال`, inline: true },
                    { name: '💳 المبلغ المتبقي', value: `${userProfile.loan.amount.toLocaleString('ar-EG')} ريال`, inline: true },
                    { name: '💰 رصيدك الحالي', value: `${userProfile.balance.toLocaleString('ar-EG')} ريال`, inline: true }
                )
                .setTimestamp();

            if (userProfile.loan.amount === 0) {
                embed.setDescription('🎉 مبروك! تم تسديد القرض بالكامل')
                    .setColor('#f1c40f');
            } else {
                embed.addFields({
                    name: '📅 تاريخ الاستحقاق',
                    value: userProfile.loan.dueDate.toLocaleDateString('ar-SA'),
                    inline: true
                });
            }

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in repay command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};
