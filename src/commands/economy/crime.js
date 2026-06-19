const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

// List of possible crimes and their outcomes
const CRIMES = [
    {
        name: 'سرقة متجر',
        success: [
            'نجحت في سرقة صندوق المتجر!',
            'تمكنت من سرقة بضائع ثمينة!',
            'وجدت خزنة مفتوحة وأخذت محتوياتها!'
        ],
        fail: [
            'تم القبض عليك متلبساً!',
            'شاهدك أحد العملاء وأبلغ الشرطة!',
            'كاميرات المراقبة كشفت هويتك!'
        ]
    },
    {
        name: 'سرقة سيارة',
        success: [
            'نجحت في سرقة سيارة فاخرة!',
            'تمكنت من بيع السيارة المسروقة!',
            'وجدت مفاتيح السيارة وهربت بها!'
        ],
        fail: [
            'إنذار السيارة كشف محاولتك!',
            'دورية شرطة شاهدتك أثناء السرقة!',
            'صاحب السيارة ضبطك متلبساً!'
        ]
    },
    {
        name: 'تزوير عملة',
        success: [
            'نجحت في تزوير مبلغ كبير!',
            'تمكنت من تصريف العملة المزورة!',
            'خدعت الجميع بجودة التزوير!'
        ],
        fail: [
            'جهاز كشف العملة المزورة فضح أمرك!',
            'البنك اكتشف التزوير وأبلغ الشرطة!',
            'تم القبض عليك أثناء محاولة الصرف!'
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('جريمة')
        .setDescription('محاولة ارتكاب جريمة للحصول على المال'),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Get guild config
            const guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig) {
                return interaction.reply({
                    content: '❌ لم يتم إعداد نظام الجرائم بعد',
                    ephemeral: true
                });
            }

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Check cooldown
            const cooldown = guildConfig.settings.crimeCooldown || 1800000; // 30 minutes default
            const lastCrime = userProfile.cooldowns?.crime || 0;
            const timeLeft = lastCrime + cooldown - Date.now();

            if (timeLeft > 0) {
                const minutes = Math.ceil(timeLeft / 60000);
                return interaction.reply({
                    content: `❌ يجب الانتظار ${minutes} دقيقة قبل ارتكاب جريمة أخرى`,
                    ephemeral: true
                });
            }

            // Select random crime
            const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
            const successChance = Math.random();

            // Calculate reward/fine based on user's current balance
            const maxReward = Math.min(userProfile.balance * 0.5, 10000);
            const minReward = 1000;
            const reward = Math.floor(Math.random() * (maxReward - minReward) + minReward);
            const fine = Math.floor(reward * 0.7); // Fine is 70% of potential reward

            if (successChance > 0.5) { // 50% success rate
                // Successful crime
                const message = crime.success[Math.floor(Math.random() * crime.success.length)];
                userProfile.balance += reward;
                userProfile.stats.totalEarned += reward;
                userProfile.stats.crimesCommitted++;
                userProfile.cooldowns.crime = Date.now();

                await userProfile.save();

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle(`🦹 ${crime.name}`)
                    .setDescription(message)
                    .addFields(
                        { name: '💰 المبلغ المسروق', value: `${reward} ريال`, inline: true },
                        { name: '💳 رصيدك الحالي', value: `${userProfile.balance} ريال`, inline: true },
                        { name: '📊 إحصائياتك', value: `عدد الجرائم: ${userProfile.stats.crimesCommitted}`, inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [successEmbed] });
            } else {
                // Failed crime
                const message = crime.fail[Math.floor(Math.random() * crime.fail.length)];
                
                // Only apply fine if user has money
                const actualFine = Math.min(fine, userProfile.balance);
                userProfile.balance -= actualFine;
                userProfile.stats.totalLost += actualFine;
                userProfile.stats.crimesCommitted++;
                userProfile.cooldowns.crime = Date.now();

                await userProfile.save();

                const failEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle(`🚔 ${crime.name}`)
                    .setDescription(message)
                    .addFields(
                        { name: '💰 الغرامة', value: `${actualFine} ريال`, inline: true },
                        { name: '💳 رصيدك الحالي', value: `${userProfile.balance} ريال`, inline: true },
                        { name: '📊 إحصائياتك', value: `عدد الجرائم: ${userProfile.stats.crimesCommitted}`, inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [failEmbed] });
            }
        } catch (error) {
            console.error('Error in crime command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
