const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const Economy = require('../../database/schemas/economy');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    name: 'وظائف',
    aliases: ['jobs', 'careers', 'وظيفة', 'وظيفه'],
    category: 'economy',
    description: 'عرض قائمة الوظائف المتاحة',

    async messageExecute(message) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
            if (!guildConfig?.economy?.jobPayments) {
                return message.reply('❌ لم يتم إعداد نظام الوظائف بعد');
            }

            const jobEmojis = {
                programmer: '💻',
                doctor: '👨‍⚕️',
                teacher: '👨‍🏫',
                police: '👮',
                chef: '👨‍🍳',
                driver: '🚗'
            };

            const jobDescriptions = {
                programmer: 'مبرمج - تطوير البرامج والمواقع',
                doctor: 'طبيب - معالجة المرضى',
                teacher: 'معلم - تعليم الطلاب',
                police: 'شرطي - حماية المواطنين',
                chef: 'طباخ - تحضير الطعام',
                driver: 'سائق - توصيل الركاب'
            };

            const jobNames = {
                programmer: 'مبرمج',
                doctor: 'طبيب',
                teacher: 'معلم',
                police: 'شرطي',
                chef: 'طباخ',
                driver: 'سائق'
            };

            const embed = new EmbedBuilder()
                .setColor('#9b59b6')
                .setTitle('💼 قائمة الوظائف المتاحة')
                .setDescription('اضغط على الزر للتقديم على الوظيفة')
                .setTimestamp();

            // Add each job to the embed
            for (const [job, payments] of Object.entries(guildConfig.economy.jobPayments)) {
                embed.addFields({
                    name: `${jobEmojis[job]} ${jobNames[job]}`,
                    value: `${jobDescriptions[job]}\nالراتب: ${payments.min.toLocaleString('ar-EG')} - ${payments.max.toLocaleString('ar-EG')} ريال`,
                    inline: false
                });
            }

            // Create buttons for each job
            const rows = [];
            let currentRow = new ActionRowBuilder();
            let buttonCount = 0;

            for (const [job, emoji] of Object.entries(jobEmojis)) {
                const button = new ButtonBuilder()
                    .setCustomId(`job_${job}`)
                    .setLabel(jobNames[job])
                    .setEmoji(emoji)
                    .setStyle(ButtonStyle.Primary);

                currentRow.addComponents(button);
                buttonCount++;

                if (buttonCount === 3 || Object.keys(jobEmojis).indexOf(job) === Object.keys(jobEmojis).length - 1) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                    buttonCount = 0;
                }
            }

            const response = await message.reply({
                embeds: [embed],
                components: rows
            });

            // Create button collector
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000 // 1 minute
            });

            collector.on('collect', async i => {
                try {
                    const selectedJob = i.customId.split('_')[1];
                    let userEconomy = await Economy.findOne({
                        userId: message.author.id,
                        guildId: message.guild.id
                    });

                    if (!userEconomy) {
                        userEconomy = new Economy({
                            userId: message.author.id,
                            guildId: message.guild.id
                        });
                    }

                    if (userEconomy.job) {
                        await i.reply({
                            content: '❌ أنت تعمل بالفعل! استخدم أمر `استقالة` أولاً',
                            ephemeral: true
                        });
                        return;
                    }

                    userEconomy.job = selectedJob;
                    await userEconomy.save();

                    const successEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('🎉 مبروك!')
                        .setDescription(`تم توظيفك كـ ${jobEmojis[selectedJob]} ${jobNames[selectedJob]}\nالراتب: ${guildConfig.economy.jobPayments[selectedJob].min.toLocaleString('ar-EG')} - ${guildConfig.economy.jobPayments[selectedJob].max.toLocaleString('ar-EG')} ريال`)
                        .setTimestamp();

                    await i.update({
                        embeds: [successEmbed],
                        components: []
                    });
                } catch (error) {
                    console.error('Error handling job button:', error);
                    await i.reply({
                        content: '❌ حدث خطأ أثناء التقديم على الوظيفة',
                        ephemeral: true
                    });
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(console.error);
            });
        } catch (error) {
            console.error('Error in jobs command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};
