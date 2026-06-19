const { 
    EmbedBuilder, 
    PermissionFlagsBits
} = require('discord.js');
const { createGiveaway } = require('../../utils/giveawayManager');
const ms = require('ms');

const GIVEAWAY_COLOR = '#1e3a5f'; // Dark Blue
const GIVEAWAY_EMOJI = '🎉';

module.exports = {
    name: 'gstart',
    aliases: ['gcreate'],
    description: 'Start a new giveaway using the prefix command',
    usage: '-gstart <prize> <duration> <winners>',

    async execute(message, args, client) {
        try {
            if (!message.guild) {
                return message.reply('هذا الأمر يشتغل فقط داخل السيرفر.');
            }

            if (
                !message.member.permissions.has(PermissionFlagsBits.ManageEvents) &&
                !message.member.permissions.has(PermissionFlagsBits.ManageGuild)
            ) {
                return message.reply('تحتاج صلاحية Manage Events أو Manage Server عشان تبدأ جيف اواي.');
            }

            if (args.length < 3) {
                return message.reply(
                    `استخدام خاطئ!\n` +
                    `**الصيغة الصحيحة:** \`${this.usage}\`\n` +
                    `**مثال:** \`-gstart Nitro Boost 1h 1\`\n` +
                    `(آخر كلمتين تعتبر دايم المدة وعدد الفائزين، والباقي يعتبر اسم الجائزة)`
                );
            }

            const winnersRaw = args[args.length - 1];
            const durationStr = args[args.length - 2];
            const prize = args.slice(0, args.length - 2).join(' ');

            if (!prize || prize.trim().length === 0) {
                return message.reply(
                    `لازم تحدد اسم الجائزة!\n**مثال:** \`-gstart Nitro Boost 1h 1\``
                );
            }

            const winnerCount = parseInt(winnersRaw, 10);
            if (isNaN(winnerCount) || winnerCount < 1 || winnerCount > 10) {
                return message.reply('عدد الفائزين لازم يكون رقم بين 1 و 10.');
            }

            let duration;
            try {
                duration = ms(durationStr);
            } catch (error) {
                duration = null;
            }

            if (!duration || duration < 10000) {
                return message.reply(
                    `مدة غير صحيحة! تأكد من الصيغة، مثال: 1m, 1h, 1d\n` +
                    `**الصيغة الصحيحة:** \`${this.usage}\``
                );
            }

            const channel = message.channel;

            const giveaway = await createGiveaway({
                prize,
                channelId: channel.id,
                guildId: message.guild.id,
                hostId: message.author.id,
                duration: durationStr,
                winnerCount,
                description: ''
            });

            const endTime = new Date(Date.now() + duration);

            const giveawayEmbed = new EmbedBuilder()
                .setColor(GIVEAWAY_COLOR)
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${prize}`)
                .addFields(
                    { name: '🔒 Hosted by', value: `<@${message.author.id}>`, inline: false },
                    { name: '⏱ Ends', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: false },
                    { name: '👥 Entries', value: '0 participants', inline: false }
                );

            // إرسال رسالة الجيف اواي بدون أزرار
            const giveawayMessage = await channel.send({ embeds: [giveawayEmbed] });

            // حط إيموجي ريأكشن للمشاركة
            await giveawayMessage.react(GIVEAWAY_EMOJI);

            giveaway.messageId = giveawayMessage.id;
            await giveaway.save();

            if (message.deletable) {
                message.delete().catch(() => {});
            }
        } catch (error) {
            console.error('Error in -gstart command:', error);
            message.reply('صار خطأ أثناء بدء الجيف اواي.');
        }
    }
};
