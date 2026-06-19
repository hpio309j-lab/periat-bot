const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    name: 'تحويل',
    aliases: ['transfer', 'send', 'pay'],
    category: 'economy',
    description: 'Transfer money to another user',
    
    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            if (args.length < 2) {
                return message.reply('❌ Usage: transfer @user amount');
            }

            const sender = message.author;
            const receiver = message.mentions.users.first();
            const amount = parseInt(args[1]);

            if (!receiver) {
                return message.reply('❌ Please mention a user to transfer to');
            }

            if (isNaN(amount) || amount <= 0) {
                return message.reply('❌ Please specify a valid amount');
            }

            // Can't transfer to yourself
            if (sender.id === receiver.id) {
                return message.reply('❌ You cannot transfer money to yourself!');
            }

            // Can't transfer to bots
            if (receiver.bot) {
                return message.reply('❌ You cannot transfer money to bots!');
            }

            // Get sender's profile
            const senderProfile = await UserProfile.findOne({
                userId: sender.id,
                guildId: message.guildId
            });

            if (!senderProfile || senderProfile.balance < amount) {
                return message.reply('❌ Insufficient balance!');
            }

            // Get or create receiver's profile
            let receiverProfile = await UserProfile.findOne({
                userId: receiver.id,
                guildId: message.guildId
            });

            if (!receiverProfile) {
                receiverProfile = new UserProfile({
                    userId: receiver.id,
                    guildId: message.guildId
                });
            }

            // Perform transfer
            senderProfile.balance -= amount;
            receiverProfile.balance += amount;

            // Update stats
            senderProfile.stats.totalSpent += amount;
            receiverProfile.stats.totalEarned += amount;

            await Promise.all([senderProfile.save(), receiverProfile.save()]);

            // Format numbers
            const formattedAmount = amount.toLocaleString('en-US');
            const formattedBalance = senderProfile.balance.toLocaleString('en-US');
            const formattedReceiverBalance = receiverProfile.balance.toLocaleString('en-US');

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('💸 Transfer Successful')
                .setDescription(`Successfully transferred money from ${sender} to ${receiver}`)
                .addFields(
                    { name: '💵 Amount', value: `$${formattedAmount}`, inline: true },
                    { name: '💳 Your Balance', value: `$${formattedBalance}`, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Try to notify the receiver
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('💸 Transfer Received')
                    .setDescription(`You received a transfer from ${sender}`)
                    .addFields(
                        { name: '💵 Amount', value: `$${formattedAmount}`, inline: true },
                        { name: '💳 Your Balance', value: `$${formattedReceiverBalance}`, inline: true }
                    )
                    .setTimestamp();

                await receiver.send({ embeds: [dmEmbed] });
            } catch (error) {
                // Ignore DM errors
                console.log('Could not send DM to receiver:', error);
            }
        } catch (error) {
            console.error('Error in transfer command:', error);
            await message.reply('❌ An error occurred while executing the command');
        }
    }
};
