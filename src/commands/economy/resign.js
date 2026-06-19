const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('استقالة')
        .setDescription('الاستقالة من وظيفتك الحالية'),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Get user profile
            const userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile || !userProfile.job) {
                return interaction.reply({
                    content: '❌ ليس لديك وظيفة للاستقالة منها!',
                    ephemeral: true
                });
            }

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

            const oldJob = userProfile.job;

            // Update user profile
            userProfile.job = null;
            userProfile.jobCooldown = null;
            await userProfile.save();

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('📝 استقالة')
                .setDescription(`تم تقديم استقالتك من وظيفة ${jobEmojis[oldJob]} ${jobArabicNames[oldJob]} بنجاح`)
                .addFields(
                    { name: '💼 الوظيفة السابقة', value: jobArabicNames[oldJob], inline: true },
                    { name: '📅 تاريخ الاستقالة', value: new Date().toLocaleDateString('ar-SA'), inline: true }
                )
                .setFooter({ text: 'يمكنك التقديم على وظيفة جديدة باستخدام أمر /وظيفة' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in resign command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
