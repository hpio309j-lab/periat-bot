const { EmbedBuilder } = require('discord.js');

const games = [
    {
        name: 'بلاك جاك',
        command: 'blackjack',
        emoji: '🎰',
        description: 'العب بلاك جاك واربح المال',
        minBet: 50
    },
    {
        name: 'حجر ورقة مقص',
        command: 'rps',
        emoji: '✌️',
        description: 'العب حجر ورقة مقص مع البوت',
        minBet: 20
    },
    {
        name: 'نرد',
        command: 'dice',
        emoji: '🎲',
        description: 'العب النرد واربح أضعاف رهانك',
        minBet: 30
    },
    {
        name: 'عملة',
        command: 'coinflip',
        emoji: '🪙',
        description: 'راهن على وجه العملة',
        minBet: 10
    },
    {
        name: 'سلوتس',
        command: 'slots',
        emoji: '🎰',
        description: 'العب آلة السلوتس واربح جوائز كبيرة',
        minBet: 40
    },
    {
        name: 'اكس او',
        command: 'tictactoe',
        emoji: '❌',
        description: 'العب اكس او مع صديق',
        minBet: 0
    },
    {
        name: 'كونكت 4',
        command: 'connect4',
        emoji: '🔴',
        description: 'العب كونكت 4 مع صديق',
        minBet: 0
    },
    {
        name: 'المشنقة',
        command: 'hangman',
        emoji: '👨',
        description: 'العب لعبة المشنقة وخمن الكلمة',
        minBet: 0
    }
];

module.exports = {
    name: 'العاب',
    aliases: ['games', 'game', 'لعبة'],
    category: 'economy',
    description: 'عرض قائمة الألعاب المتوفرة',

    async messageExecute(message, args) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🎮 الألعاب المتوفرة')
                .setDescription('قائمة بجميع الألعاب المتوفرة في البوت. استخدم الأمر الموضح للعب.')
                .addFields(
                    games.map(game => ({
                        name: `${game.emoji} ${game.name}`,
                        value: `${game.description}\n💰 الحد الأدنى للرهان: $${game.minBet.toLocaleString('en-US')}\n🎯 الأمر: \`${game.command}\``,
                        inline: true
                    }))
                )
                .setFooter({ text: 'للعب، اكتب الأمر المطلوب. مثال: blackjack 100' });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in games command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};
