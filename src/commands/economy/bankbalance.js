const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    name: 'بنك',
    aliases: ['bank', 'bankbal', 'البنك'],
    category: 'economy',
    description: 'عرض رصيدك في البنك',

    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            let userProfile = await UserProfile.findOne({ 
                userId: message.author.id,
                guildId: message.guild.id
            });

            if (!userProfile) {
                userProfile = new UserProfile({
                    userId: message.author.id,
                    guildId: message.guild.id
                });
                await userProfile.save();
            }

            const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle('🏦 معلومات الحساب البنكي')
                .setDescription(`حساب: ${message.author}`)
                .addFields(
                    { name: '💵 المحفظة', value: `${userProfile.balance.toLocaleString('ar-EG')} ريال`, inline: true },
                    { name: '🏦 البنك', value: `${userProfile.bank.toLocaleString('ar-EG')} ريال`, inline: true },
                    { name: '💰 المجموع', value: `${(userProfile.balance + userProfile.bank).toLocaleString('ar-EG')} ريال`, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in bank balance command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ العملية');
        }
    }
};
