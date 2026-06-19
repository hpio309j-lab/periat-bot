const { 
    EmbedBuilder, 
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
const { createGiveaway } = require('../../utils/giveawayManager');
const ms = require('ms');

// لون الإمبيد الموحد لكل الجيف اواي (أزرق)
const GIVEAWAY_COLOR = '#3498db';

module.exports = {
    name: 'gstart',
    aliases: ['gcreate'],
    description: 'Start a new giveaway using the prefix command',
    usage: '-gstart <prize> <duration> <winners>',

    /**
     * مثال على الاستخدام:
     * -gstart Nitro Boost 1h 1
     * يعني الجائزة = "Nitro Boost"، المدة = "1h"، عدد الفائزين = "1"
     * (آخر كلمتين دايم duration و winners، والباقي كله الجائزة)
     */
    async execute(message, args, client) {
        try {
            // لازم نكون داخل سيرفر
            if (!message.guild) {
                return message.reply('هذا الأمر يشتغل فقط داخل السيرفر.');
            }

            // فحص الصلاحيات
            if (
                !message.member.permissions.has(PermissionFlagsBits.ManageEvents) &&
                !message.member.permissions.has(PermissionFlagsBits.ManageGuild)
            ) {
                return message.reply('تحتاج صلاحية Manage Events أو Manage Server عشان تبدأ جيف اواي.');
            }

            // لازم 3 معطيات على الأقل: prize duration winners
            if (args.length < 3) {
                return message.reply(
                    `استخدام خاطئ!\n` +
                    `**الصيغة الصحيحة:** \`${this.usage}\`\n` +
                    `**مثال:** \`-gstart Nitro Boost 1h 1\`\n` +
                    `(آخر كلمتين تعتبر دايم المدة وعدد الفائزين، والباقي يعتبر اسم الجائزة)`
                );
            }

            // آخر كلمتين = winners و duration، والباقي كله الجائزة
            const winnersRaw = args[args.length - 1];
            const durationStr = args[args.length - 2];
            const prize = args.slice(0, args.length - 2).join(' ');

            if (!prize || prize.trim().length === 0) {
                return message.reply(
                    `لازم تحدد اسم الجائزة!\n**مثال:** \`-gstart Nitro Boost 1h 1\``
                );
            }

            // التحقق من عدد الفائزين
            const winnerCount = parseInt(winnersRaw, 10);
            if (isNaN(winnerCount) || winnerCount < 1 || winnerCount > 10) {
                return message.reply('عدد الفائزين لازم يكون رقم بين 1 و 10.');
            }

            // التحقق من المدة
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

            // إنشاء الجيف اواي بقاعدة البيانات
            const giveaway = await createGiveaway({
                prize,
                channelId: channel.id,
                guildId: message.guild.id,
                hostId: message.author.id,
                duration: durationStr,
                winnerCount,
                description: ''
            });

            // حساب وقت الانتهاء
            const endTime = new Date(Date.now() + duration);

            // بناء الإمبيد (أزرق)
            const giveawayEmbed = new EmbedBuilder()
                .setColor(GIVEAWAY_COLOR)
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${prize}`)
                .addFields(
                    { name: 'Ends', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: true },
                    { name: 'Winners', value: `${winnerCount}`, inline: true },
                    { name: 'Hosted by', value: `<@${message.author.id}>`, inline: true },
                    { name: 'Entries', value: '0 participants', inline: true }
                )
                .setFooter({ text: `Giveaway ID: ${giveaway._id} • Click the button below to enter!` })
                .setTimestamp(endTime);

            // زر الدخول
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_enter_${giveaway._id}`)
                    .setLabel('Enter Giveaway')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎉')
            );

            // إرسال رسالة الجيف اواي
            const giveawayMessage = await channel.send({
                embeds: [giveawayEmbed],
                components: [row]
            });

            // تحديث الـ messageId بقاعدة البيانات
            giveaway.messageId = giveawayMessage.id;
            await giveaway.save();

            // حذف رسالة الأمر نفسها (اختياري - يخلي القناة نظيفة)
            if (message.deletable) {
                message.delete().catch(() => {});
            }
        } catch (error) {
            console.error('Error in -gstart command:', error);
            message.reply('صار خطأ أثناء بدء الجيف اواي.');
        }
    }
};
