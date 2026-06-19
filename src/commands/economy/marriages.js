const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('زواجات')
        .setDescription('عرض قائمة الزواجات في السيرفر'),
    
    async execute(interaction) {
        // Validate channel
        if (!await validateEconomyChannel(interaction)) return;

        try {
            // Get all married users in the guild
            const marriedUsers = await UserProfile.find({
                guildId: interaction.guildId,
                'marriage.partnerId': { $ne: null }
            }).sort({ 'marriage.since': -1 });

            if (marriedUsers.length === 0) {
                return interaction.reply({
                    content: '❌ لا يوجد زواجات في السيرفر حالياً',
                    ephemeral: true
                });
            }

            // Process marriages to avoid duplicates
            const processedMarriages = new Set();
            const uniqueMarriages = [];

            for (const user of marriedUsers) {
                const marriageKey = [user.userId, user.marriage.partnerId].sort().join('-');
                if (!processedMarriages.has(marriageKey)) {
                    processedMarriages.add(marriageKey);
                    uniqueMarriages.push(user);
                }
            }

            // Create pages (10 marriages per page)
            const marriagesPerPage = 10;
            const pages = Math.ceil(uniqueMarriages.length / marriagesPerPage);
            const currentPage = 1;

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#e91e63')
                .setTitle('💑 قائمة الزواجات')
                .setDescription(`إجمالي الزواجات: ${uniqueMarriages.length}`);

            // Add marriages to embed
            let description = '';
            for (let i = 0; i < Math.min(marriagesPerPage, uniqueMarriages.length); i++) {
                const marriage = uniqueMarriages[i];
                const durationDays = Math.floor((Date.now() - marriage.marriage.since) / (1000 * 60 * 60 * 24));
                
                try {
                    const partner = await interaction.client.users.fetch(marriage.marriage.partnerId);
                    const user = await interaction.client.users.fetch(marriage.userId);
                    
                    description += `${i + 1}. ${user} + ${partner}\n`;
                    description += `   💍 منذ: ${durationDays} يوم\n\n`;
                } catch (error) {
                    console.error('Error fetching user:', error);
                    continue;
                }
            }

            embed.setDescription(description || 'لا يوجد زواجات للعرض');
            
            if (pages > 1) {
                embed.setFooter({
                    text: `الصفحة ${currentPage} من ${pages} | استخدم الأزرار للتنقل بين الصفحات`
                });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in marriages list command:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};
