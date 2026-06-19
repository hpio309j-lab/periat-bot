const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    name: 'سرقة',
    aliases: ['rob', 'steal'],
    category: 'economy',
    description: 'Try to rob another user',
    
    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            if (!args.length) {
                return message.reply('❌ Usage: rob @user');
            }

            const robber = message.author;
            const victim = message.mentions.users.first();

            if (!victim) {
                return message.reply('❌ Please mention a user to rob');
            }

            const guildId = message.guild.id;

            // Can't rob yourself
            if (robber.id === victim.id) {
                return message.reply('❌ You cannot rob yourself!');
            }

            // Can't rob bots
            if (victim.bot) {
                return message.reply('❌ You cannot rob bots!');
            }

            // Get guild config
            const guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig) {
                return message.reply('❌ Rob system has not been set up yet');
            }

            // Get both profiles
            const [robberProfile, victimProfile] = await Promise.all([
                UserProfile.findOne({ userId: robber.id, guildId }),
                UserProfile.findOne({ userId: victim.id, guildId })
            ]);

            if (!robberProfile) {
                return message.reply('❌ You need an account to rob! Use the balance command first');
            }

            if (!victimProfile || victimProfile.balance < 10) {
                return message.reply('❌ This user doesn\'t have enough money to rob!');
            }

            // Check cooldown
            const cooldown = guildConfig.settings.robCooldown || 3600000; // 1 hour default
            const lastRob = robberProfile.cooldowns?.rob || 0;
            const timeLeft = lastRob + cooldown - Date.now();

            if (timeLeft > 0) {
                const minutes = Math.ceil(timeLeft / 60000);
                return message.reply(`❌ You must wait ${minutes}m before attempting to rob again`);
            }

            // Check if victim has active protection
            if (victimProfile.protection?.active && victimProfile.protection.expiresAt > new Date()) {
                // Robbery failed due to protection
                const fine = Math.floor(robberProfile.balance * 0.1); // 10% fine
                robberProfile.balance -= fine;
                robberProfile.stats.totalLost += fine;
                robberProfile.cooldowns.rob = Date.now();
                await robberProfile.save();

                const formattedFine = fine.toLocaleString('en-US');
                const formattedBalance = robberProfile.balance.toLocaleString('en-US');

                const failEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🛡️ Failed Robbery')
                    .setDescription(`${victim} is protected! You were fined $${formattedFine}`)
                    .addFields(
                        { name: '💰 Your Balance', value: `$${formattedBalance}`, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [failEmbed] });
            }

            // Calculate success chance and amount
            const successChance = Math.random();
            const maxSteal = Math.min(victimProfile.balance * 0.3, 500); // Max 30% of victim's balance or $500
            const stolenAmount = Math.floor(Math.random() * maxSteal);

            if (successChance > 0.6) { // 40% success rate
                // Successful robbery
                robberProfile.balance += stolenAmount;
                victimProfile.balance -= stolenAmount;
                robberProfile.stats.totalStolen += stolenAmount;
                victimProfile.stats.totalLost += stolenAmount;
                robberProfile.cooldowns.rob = Date.now();

                await Promise.all([robberProfile.save(), victimProfile.save()]);

                const formattedStolen = stolenAmount.toLocaleString('en-US');
                const formattedBalance = robberProfile.balance.toLocaleString('en-US');

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('💰 Successful Robbery')
                    .setDescription(`Success! You stole $${formattedStolen} from ${victim}`)
                    .addFields(
                        { name: '💰 Your Balance', value: `$${formattedBalance}`, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [successEmbed] });
            } else {
                // Failed robbery
                const fine = Math.floor(robberProfile.balance * 0.15); // 15% fine
                robberProfile.balance -= fine;
                robberProfile.stats.totalLost += fine;
                robberProfile.cooldowns.rob = Date.now();
                await robberProfile.save();

                const formattedFine = fine.toLocaleString('en-US');
                const formattedBalance = robberProfile.balance.toLocaleString('en-US');

                const failEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Failed Robbery')
                    .setDescription(`Robbery failed! You were fined $${formattedFine}`)
                    .addFields(
                        { name: '💰 Your Balance', value: `$${formattedBalance}`, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [failEmbed] });
            }
        } catch (error) {
            console.error('Error in rob command:', error);
            await message.reply('❌ An error occurred while executing the command');
        }
    }
};
