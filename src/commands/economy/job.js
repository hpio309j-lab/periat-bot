const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('وظيفة')
        .setDescription('التقديم على وظيفة')
        .addStringOption(option =>
            option.setName('job')
                .setDescription('الوظيفة المراد التقديم عليها')
                .setRequired(true)
                .addChoices(
                    { name: '💻 مبرمج', value: 'programmer' },
                    { name: '👨‍⚕️ طبيب', value: 'doctor' },
                    { name: '👨‍🏫 معلم', value: 'teacher' },
                    { name: '👮 شرطي', value: 'police' },
                    { name: '👨‍🍳 طباخ', value: 'chef' },
                    { name: '🚗 سائق', value: 'driver' }
                )),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const jobName = interaction.options.getString('job');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Check if user already has a job
            if (userProfile.job) {
                return interaction.reply({
                    content: '❌ لديك وظيفة بالفعل! استخدم أمر `/استقالة` للاستقالة من وظيفتك الحالية',
                    ephemeral: true
                });
            }

            // Get guild config
            const guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig?.settings?.jobPayments?.[jobName]) {
                return interaction.reply({
                    content: '❌ هذه الوظيفة غير متوفرة',
                    ephemeral: true
                });
            }

            // Job requirements (you can add more requirements based on your needs)
            const requirements = {
                programmer: { messages: 100 },
                doctor: { messages: 500 },
                teacher: { messages: 200 },
                police: { messages: 300 },
                chef: { messages: 150 },
                driver: { messages: 50 }
            };

            // Check requirements (this is a placeholder - implement your own logic)
            // For now, we'll just give them the job

            // Update user profile
            userProfile.job = jobName;
            await userProfile.save();

            const jobEmojis = {
                programmer: '💻',
                doctor: '👨‍⚕️',
                teacher: '👨‍🏫',
                police: '👮',
                chef: '👨‍🍳',
                driver: '🚗'
            };

            const jobArabicNames = {
                programmer: 'مبرمج',
                doctor: 'طبيب',
                teacher: 'معلم',
                police: 'شرطي',
                chef: 'طباخ',
                driver: 'سائق'
            };

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🎉 مبروك!')
                .setDescription(`تم قبولك في وظيفة ${jobEmojis[jobName]} ${jobArabicNames[jobName]}`)
                .addFields(
                    { 
                        name: '💰 الراتب',
                        value: `${guildConfig.settings.jobPayments[jobName].min} - ${guildConfig.settings.jobPayments[jobName].max} ريال`,
                        inline: true
                    },
                    {
                        name: '⏰ موعد الراتب',
                        value: 'كل 30 دقيقة',
                        inline: true
                    }
                )
                .setFooter({ text: 'استخدم أمر /راتب لاستلام راتبك' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in job command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
