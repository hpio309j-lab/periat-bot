const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

// Card suits and values
const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }

    toString() {
        return `${this.value}${this.suit}`;
    }

    getValue() {
        if (this.value === 'A') return 11;
        if (['K', 'Q', 'J'].includes(this.value)) return 10;
        return parseInt(this.value);
    }
}

class Deck {
    constructor() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const value of VALUES) {
                this.cards.push(new Card(suit, value));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }
}

class Hand {
    constructor() {
        this.cards = [];
    }

    addCard(card) {
        this.cards.push(card);
    }

    getValue() {
        let value = 0;
        let aces = 0;

        for (const card of this.cards) {
            if (card.value === 'A') {
                aces++;
            } else {
                value += card.getValue();
            }
        }

        for (let i = 0; i < aces; i++) {
            if (value + 11 <= 21) {
                value += 11;
            } else {
                value += 1;
            }
        }

        return value;
    }

    toString() {
        return this.cards.map(card => card.toString()).join(' ');
    }
}

module.exports = {
    name: 'بلاكجاك',
    aliases: ['blackjack', 'bj', 'بج'],
    category: 'economy',
    description: 'لعبة البلاك جاك',
    minBet: 100,
    
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
            const lastGame = userProfile.cooldowns?.blackjack || 0;
            const timeLeft = lastGame + cooldown - Date.now();

            if (timeLeft > 0) {
                const seconds = Math.ceil(timeLeft / 1000);
                return message.reply(`❌ يجب الانتظار ${seconds} ثانية قبل اللعب مرة أخرى`);
            }

            // Initialize game
            const deck = new Deck();
            const playerHand = new Hand();
            const dealerHand = new Hand();

            // Initial deal
            playerHand.addCard(deck.draw());
            dealerHand.addCard(deck.draw());
            playerHand.addCard(deck.draw());
            dealerHand.addCard(deck.draw());

            // Create buttons
            const hitButton = new ButtonBuilder()
                .setCustomId('hit')
                .setLabel('اسحب 🎴')
                .setStyle(ButtonStyle.Primary);

            const standButton = new ButtonBuilder()
                .setCustomId('stand')
                .setLabel('قف 🛑')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(hitButton, standButton);

            // Create initial embed
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🎰 بلاك جاك')
                .addFields(
                    { name: '👤 يدك', value: `${playerHand.toString()} (${playerHand.getValue()})`, inline: true },
                    { name: '🎲 يد البنك', value: `${dealerHand.toString()} (?)`, inline: true },
                    { name: '💰 الرهان', value: `$${amount.toLocaleString('en-US')}`, inline: true }
                )
                .setTimestamp();

            const response = await message.reply({
                embeds: [embed],
                components: [row]
            });

            // Create button collector
            const collector = response.createMessageComponentCollector({ time: 30000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== userId) {
                    await i.reply({ content: '❌ هذه ليست لعبتك!', ephemeral: true });
                    return;
                }

                if (i.customId === 'hit') {
                    // Player hits
                    playerHand.addCard(deck.draw());
                    const playerValue = playerHand.getValue();

                    // Update embed
                    embed.setFields(
                        { name: '👤 يدك', value: `${playerHand.toString()} (${playerValue})`, inline: true },
                        { name: '🎲 يد البنك', value: `${dealerHand.toString()} (?)`, inline: true },
                        { name: '💰 الرهان', value: `$${amount.toLocaleString('en-US')}`, inline: true }
                    );

                    if (playerValue > 21) {
                        // Player busts
                        embed.setColor('#e74c3c')
                            .setDescription('😢 لقد خسرت! تجاوزت 21');

                        // Update user profile
                        userProfile.balance -= amount;
                        userProfile.stats.gamesPlayed = (userProfile.stats.gamesPlayed || 0) + 1;
                        userProfile.stats.totalLost = (userProfile.stats.totalLost || 0) + amount;
                        userProfile.cooldowns.blackjack = Date.now();
                        await userProfile.save();

                        await i.update({ embeds: [embed], components: [] });
                        collector.stop();
                    } else {
                        await i.update({ embeds: [embed] });
                    }
                } else if (i.customId === 'stand') {
                    // Dealer's turn
                    let dealerValue = dealerHand.getValue();

                    // Dealer must hit on 16 and below
                    while (dealerValue < 17) {
                        dealerHand.addCard(deck.draw());
                        dealerValue = dealerHand.getValue();
                    }

                    // Determine winner
                    const playerValue = playerHand.getValue();
                    let result = '';
                    let color = '#e74c3c';
                    let winnings = -amount;

                    if (dealerValue > 21 || playerValue > dealerValue) {
                        result = '🎉 مبروك! لقد فزت!';
                        color = '#2ecc71';
                        winnings = amount;
                    } else if (playerValue === dealerValue) {
                        result = '🔝 تعادل!';
                        color = '#f1c40f';
                        winnings = 0;
                    } else {
                        result = '😢 حظ أوفر المرة القادمة!';
                    }

                    // Format numbers
                    const formattedWinnings = Math.abs(winnings).toLocaleString('en-US');
                    const formattedBalance = userProfile.balance.toLocaleString('en-US');

                    // Update user profile
                    userProfile.balance += winnings;
                    userProfile.stats.gamesPlayed = (userProfile.stats.gamesPlayed || 0) + 1;
                    if (winnings > 0) {
                        userProfile.stats.gamesWon = (userProfile.stats.gamesWon || 0) + 1;
                        userProfile.stats.totalEarned = (userProfile.stats.totalEarned || 0) + winnings;
                    } else if (winnings < 0) {
                        userProfile.stats.totalLost = (userProfile.stats.totalLost || 0) + amount;
                    }
                    userProfile.cooldowns.blackjack = Date.now();
                    await userProfile.save();

                    // Update embed
                    embed.setColor(color)
                        .setDescription(result)
                        .setFields(
                            { name: '👤 يدك', value: `${playerHand.toString()} (${playerValue})`, inline: true },
                            { name: '🎲 يد البنك', value: `${dealerHand.toString()} (${dealerValue})`, inline: true },
                            { name: '💰 النتيجة', value: winnings >= 0 ? `+$${formattedWinnings}` : `-$${formattedWinnings}`, inline: true },
                            { name: '💳 رصيدك', value: `$${formattedBalance}`, inline: true }
                        );

                    await i.update({ embeds: [embed], components: [] });
                    collector.stop();
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    embed.setColor('#e74c3c')
                        .setDescription('⏰ انتهى الوقت!');
                    await response.edit({ embeds: [embed], components: [] });
                }
            });
        } catch (error) {
            console.error('Error in blackjack command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};
