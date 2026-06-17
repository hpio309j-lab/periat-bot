const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

// Game choices with their emojis and winning conditions
const CHOICES = {
    rock: {
        emoji: '🪨',
        name: 'حجر',
        beats: 'scissors'
    },
    paper: {
        emoji: '📄',
        name: 'ورقة',
        beats: 'rock'
    },
    scissors: {
        emoji: '✂️',
        name: 'مقص',
        beats: 'paper'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('حجر-ورقة-مقص')
        .setDescription('لعبة حجر ورقة مقص')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('المبلغ المراد المراهنة به')
                .setRequired(true)
                .setMinValue(100))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('اختيارك: حجر، ورقة، أو مقص')
                .setRequired(true)
                .addChoices(
                    { name: 'حجر 🪨', value: 'rock' },
                    { name: 'ورقة 📄', value: 'paper' },
                    { name: 'مقص ✂️', value: 'scissors' }
                )),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const amount = interaction.options.getInteger('amount');
            const playerChoice = interaction.options.getString('choice');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Check if user has enough money
            if (userProfile.balance < amount) {
                return interaction.reply({
                    content: `❌ رصيدك غير كافي! تحتاج إلى ${amount} ريال`,
                    ephemeral: true
                });
            }

            // Check cooldown
            const cooldown = 10000; // 10 seconds
            const lastGame = userProfile.cooldowns?.rps || 0;
            const timeLeft = lastGame + cooldown - Date.now();

            if (timeLeft > 0) {
                const seconds = Math.ceil(timeLeft / 1000);
                return interaction.reply({
                    content: `❌ يجب الانتظار ${seconds} ثانية قبل اللعب مرة أخرى`,
                    ephemeral: true
                });
            }

            // Bot makes its choice
            const choices = Object.keys(CHOICES);
            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            // Determine the winner
            let result;
            if (playerChoice === botChoice) {
                result = 'draw';
            } else if (CHOICES[playerChoice].beats === botChoice) {
                result = 'win';
            } else {
                result = 'lose';
            }

            // Calculate winnings
            let winnings = 0;
            if (result === 'win') {
                winnings = amount;
            } else if (result === 'lose') {
                winnings = -amount;
            }

            // Update user profile
            userProfile.balance += winnings;
            userProfile.stats.gamesPlayed = (userProfile.stats.gamesPlayed || 0) + 1;
            if (result === 'win') {
                userProfile.stats.gamesWon = (userProfile.stats.gamesWon || 0) + 1;
                userProfile.stats.totalEarned += winnings;
            } else if (result === 'lose') {
                userProfile.stats.totalLost += amount;
            }
            userProfile.cooldowns.rps = Date.now();

            await userProfile.save();

            // Create result message
            let resultMessage;
            let color;
            switch (result) {
                case 'win':
                    resultMessage = '🎉 مبروك! لقد فزت!';
                    color = '#2ecc71';
                    break;
                case 'lose':
                    resultMessage = '💔 للأسف خسرت!';
                    color = '#e74c3c';
                    break;
                case 'draw':
                    resultMessage = '🤝 تعادل!';
                    color = '#f1c40f';
                    break;
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle('🎮 حجر ورقة مقص')
                .setDescription(resultMessage)
                .addFields(
                    { name: '🎯 اختيارك', value: `${CHOICES[playerChoice].emoji} ${CHOICES[playerChoice].name}`, inline: true },
                    { name: '🤖 اختيار البوت', value: `${CHOICES[botChoice].emoji} ${CHOICES[botChoice].name}`, inline: true },
                    { name: result === 'draw' ? '🤝 تعادل' : (result === 'win' ? '💰 ربحت' : '💸 خسرت'), 
                      value: result === 'draw' ? 'لا خسارة' : `${Math.abs(winnings)} ريال`, 
                      inline: true },
                    { name: '💳 رصيدك الحالي', value: `${userProfile.balance} ريال`, inline: true },
                    { name: '📊 إحصائياتك', value: `الألعاب: ${userProfile.stats.gamesPlayed}\nالفوز: ${userProfile.stats.gamesWon}`, inline: true }
                )
                .setTimestamp();

            // Add a special effect for big wins
            if (result === 'win' && amount >= 1000) {
                embed.setDescription('🎉🎉🎉 مبروك! فوز كبير! 🎉🎉🎉');
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in rps command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
