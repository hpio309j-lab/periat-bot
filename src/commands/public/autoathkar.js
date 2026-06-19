const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const AthkarSchedule = require('../../database/schemas/athkarSchedule');
const { athkarData } = require('./athkar');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoathkar')
        .setDescription('إعداد الأذكار التلقائية في روم محدد')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('إعداد إرسال الأذكار التلقائي')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('الروم الذي سيتم إرسال الأذكار فيه')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('interval')
                        .setDescription('الفاصل الزمني بين كل ذكر (بالدقائق)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440)) // max 24 hours
                .addStringOption(option =>
                    option.setName('categories')
                        .setDescription('أنواع الأذكار التي تريد إرسالها')
                        .setRequired(true)
                        .addChoices(
                            { name: 'جميع الأذكار', value: 'all' },
                            { name: 'آيات قرآنية', value: 'quran' },
                            { name: 'أحاديث نبوية', value: 'hadith' },
                            { name: 'أدعية مختارة', value: 'dua' },
                            { name: 'أذكار الصباح', value: 'morning' },
                            { name: 'أذكار المساء', value: 'evening' },
                            { name: 'أذكار عامة', value: 'general' },
                            { name: 'أذكار النوم', value: 'sleep' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('إيقاف إرسال الأذكار التلقائي'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('عرض حالة الأذكار التلقائية')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const intervalMinutes = interaction.options.getInteger('interval');
            const categoryChoice = interaction.options.getString('categories');

            const categories = categoryChoice === 'all' 
                ? ['quran', 'hadith', 'dua', 'morning', 'evening', 'general', 'sleep']
                : [categoryChoice];

            try {
                // Update or create new schedule
                await AthkarSchedule.findOneAndUpdate(
                    { guildId: interaction.guildId },
                    {
                        channelId: channel.id,
                        interval: intervalMinutes * 60000, // Convert to milliseconds
                        categories: categories,
                        isEnabled: true,
                        lastSent: new Date()
                    },
                    { upsert: true, new: true }
                );

                const embed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle('✅ تم إعداد الأذكار التلقائية')
                    .setDescription(`سيتم إرسال الأذكار في ${channel} كل ${intervalMinutes} دقيقة`)
                    .addFields(
                        { name: 'الأذكار المختارة', value: categoryChoice === 'all' ? 'جميع الأذكار' : athkarData[categoryChoice].name }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error setting up auto athkar:', error);
                await interaction.reply({ content: '❌ حدث خطأ أثناء إعداد الأذكار التلقائية', ephemeral: true });
            }
        }
        else if (subcommand === 'disable') {
            try {
                const schedule = await AthkarSchedule.findOneAndUpdate(
                    { guildId: interaction.guildId },
                    { isEnabled: false },
                    { new: true }
                );

                if (!schedule) {
                    return await interaction.reply({ content: '❌ لم يتم إعداد الأذكار التلقائية بعد', ephemeral: true });
                }

                await interaction.reply('✅ تم إيقاف إرسال الأذكار التلقائي');
            } catch (error) {
                console.error('Error disabling auto athkar:', error);
                await interaction.reply({ content: '❌ حدث خطأ أثناء إيقاف الأذكار التلقائية', ephemeral: true });
            }
        }
        else if (subcommand === 'status') {
            try {
                const schedule = await AthkarSchedule.findOne({ guildId: interaction.guildId });

                if (!schedule) {
                    return await interaction.reply({ content: '❌ لم يتم إعداد الأذكار التلقائية بعد', ephemeral: true });
                }

                const channel = await interaction.guild.channels.fetch(schedule.channelId);
                const intervalMinutes = schedule.interval / 60000;

                const embed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle('حالة الأذكار التلقائية')
                    .addFields(
                        { name: 'الحالة', value: schedule.isEnabled ? '✅ مفعل' : '❌ متوقف' },
                        { name: 'الروم', value: channel ? channel.toString() : 'غير موجود' },
                        { name: 'الفاصل الزمني', value: `${intervalMinutes} دقيقة` },
                        { name: 'آخر إرسال', value: `<t:${Math.floor(schedule.lastSent.getTime() / 1000)}:R>` }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error getting auto athkar status:', error);
                await interaction.reply({ content: '❌ حدث خطأ أثناء عرض حالة الأذكار التلقائية', ephemeral: true });
            }
        }
    },
};
