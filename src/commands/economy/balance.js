const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    name: 'رصيد',
    aliases: ['balance', 'bal', 'credits'],
    category: 'economy',
    description: 'Check your balance',

    async messageExecute(message, args) {
        try {
            const targetUser = message.mentions.users.first() || message.author;
            
            let userProfile = await UserProfile.findOne({ 
                userId: targetUser.id,
                guildId: message.guildId
            });

            if (!userProfile) {
                userProfile = new UserProfile({
                    userId: targetUser.id,
                    guildId: message.guildId
                });
                await userProfile.save();
            }

            // Format numbers with commas
            const formattedBalance = userProfile.balance.toLocaleString('en-US');
            const formattedBank = userProfile.bank.toLocaleString('en-US');
            const formattedTotal = (userProfile.balance + userProfile.bank).toLocaleString('en-US');

            const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle(`💰 ${targetUser.username}'s Balance`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '💵 Wallet', value: `$${formattedBalance}`, inline: true },
                    { name: '🏦 Bank', value: `$${formattedBank}`, inline: true },
                    { name: '💎 Total', value: `$${formattedTotal}` }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in balance command:', error);
            await message.reply('❌ An error occurred while executing the command');
        }
    },
};
