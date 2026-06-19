const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    name: 'حماية',
    aliases: ['protection', 'shield', 'protect'],
    category: 'economy',
    description: 'Buy protection shield against robbery',
    
    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            // Get guild config
            const guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig) {
                return message.reply('❌ Protection system has not been set up yet');
            }

            const protectionCost = 100; // Fixed cost in dollars
            const protectionDuration = 24 * 60 * 60 * 1000; // 24 hours

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Check if protection is already active
            if (userProfile.protection?.active && userProfile.protection.expiresAt > new Date()) {
                const timeLeft = Math.ceil((userProfile.protection.expiresAt - new Date()) / (1000 * 60 * 60));
                return message.reply(`❌ You already have an active protection shield! Expires in ${timeLeft}h`);
            }

            // Check if user has enough money
            if (userProfile.balance < protectionCost) {
                return message.reply(`❌ Insufficient balance! You need $${protectionCost}`);
            }

            // Purchase protection
            userProfile.balance -= protectionCost;
            userProfile.stats.totalSpent += protectionCost;
            userProfile.protection = {
                active: true,
                expiresAt: new Date(Date.now() + protectionDuration)
            };

            await userProfile.save();

            // Calculate duration in hours
            const hours = protectionDuration / (1000 * 60 * 60);

            // Format numbers
            const formattedCost = protectionCost.toLocaleString('en-US');
            const formattedBalance = userProfile.balance.toLocaleString('en-US');

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🛡️ Protection Shield')
                .setDescription('Successfully purchased a protection shield!')
                .addFields(
                    { name: '💰 Cost', value: `$${formattedCost}`, inline: true },
                    { name: '⏳ Duration', value: `${hours} hours`, inline: true },
                    { name: '📅 Expires', value: userProfile.protection.expiresAt.toLocaleString('en-US'), inline: true },
                    { name: '💳 Your Balance', value: `$${formattedBalance}`, inline: true }
                )
                .setFooter({ text: 'The shield protects you from robbery attempts' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Set a reminder when protection expires
            setTimeout(async () => {
                try {
                    const reminderEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('⚠️ Protection Expired')
                        .setDescription('Your protection shield has expired')
                        .addFields(
                            { name: '💡 Tip', value: 'Buy a new shield to protect your money from robbery', inline: true }
                        )
                        .setTimestamp();

                    await message.author.send({ embeds: [reminderEmbed] });
                } catch (error) {
                    console.log('Could not send protection expiry reminder:', error);
                }
            }, protectionDuration);
        } catch (error) {
            console.error('Error in protection command:', error);
            await message.reply('❌ An error occurred while executing the command');
        }
    }
};
