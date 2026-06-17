const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    name: 'قرض',
    aliases: ['loan', 'قروض'],
    category: 'economy',
    description: 'طلب قرض من البنك',
    usage: '$قرض <المبلغ>',
    
    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            if (!args[0]) {
                return message.reply('❌ يجب تحديد المبلغ المطلوب للقرض');
            }

            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1000) {
                return message.reply('❌ يجب أن يكون المبلغ رقماً ولا يقل عن 1000 ريال');
            }

            const userId = message.author.id;
            const guildId = message.guild.id;

            // Get guild config
            const guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig || !guildConfig.economy) {
                return message.reply('❌ لم يتم إعداد نظام البنك بعد');
            }

            const maxLoan = guildConfig.economy.maxLoan || 50000;
            const interestRate = guildConfig.economy.interestRate || 0.1;

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Check if user already has a loan
            if (userProfile.loan && userProfile.loan.amount > 0) {
                return message.reply(`❌ لديك قرض حالي بقيمة ${userProfile.loan.amount.toLocaleString('ar-EG')} ريال. يجب سداده أولاً`);
            }

            // Check if amount is within limits
            if (amount > maxLoan) {
                return message.reply(`❌ الحد الأقصى للقرض هو ${maxLoan.toLocaleString('ar-EG')} ريال`);
            }

            // Calculate interest and total amount to repay
            const interest = Math.floor(amount * interestRate);
            const totalToRepay = amount + interest;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

            // Update user profile
            userProfile.balance += amount;
            userProfile.loan = {
                amount: totalToRepay,
                dueDate: dueDate,
                payments: []
            };
            await userProfile.save();

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('💰 قرض بنكي')
                .setDescription('تم الموافقة على طلب القرض!')
                .addFields(
                    { name: '💵 مبلغ القرض', value: `${amount.toLocaleString('ar-EG')} ريال`, inline: true },
                    { name: '💹 الفائدة', value: `${interest.toLocaleString('ar-EG')} ريال (${interestRate * 100}%)`, inline: true },
                    { name: '💳 المبلغ المطلوب سداده', value: `${totalToRepay.toLocaleString('ar-EG')} ريال`, inline: true },
                    { name: '📅 تاريخ السداد', value: dueDate.toLocaleDateString('ar-SA'), inline: true },
                    { name: '💰 رصيدك الحالي', value: `${userProfile.balance.toLocaleString('ar-EG')} ريال`, inline: true }
                )
                .setFooter({ text: 'استخدم أمر $تسديد لسداد القرض' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Set a reminder for loan due date
            setTimeout(async () => {
                if (userProfile.loan.amount > 0) {
                    try {
                        const reminderEmbed = new EmbedBuilder()
                            .setColor('#e74c3c')
                            .setTitle('⚠️ تذكير بموعد سداد القرض')
                            .setDescription('حان موعد سداد قرضك البنكي')
                            .addFields(
                                { name: '💰 المبلغ المتبقي', value: `${userProfile.loan.amount.toLocaleString('ar-EG')} ريال`, inline: true },
                                { name: '📅 تاريخ الاستحقاق', value: dueDate.toLocaleDateString('ar-SA'), inline: true }
                            )
                            .setTimestamp();

                        await message.author.send({ embeds: [reminderEmbed] });
                    } catch (error) {
                        console.log('Could not send loan reminder:', error);
                    }
                }
            }, dueDate.getTime() - Date.now());
        } catch (error) {
            console.error('Error in loan command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};
