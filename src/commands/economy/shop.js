const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');
const UserProfile = require('../../database/schemas/userProfile');
const GuildConfig = require('../../database/schemas/guildConfig');

// Default shop items if not configured in guild settings
const DEFAULT_ITEMS = [
    {
        id: 'vip_role',
        name: 'رتبة VIP',
        description: 'رتبة مميزة في السيرفر',
        price: 50000,
        emoji: '👑',
        type: 'role'
    },
    {
        id: 'diamond_ring',
        name: 'خاتم الماس',
        description: 'خاتم فاخر للزواج',
        price: 5000,
        emoji: '💍',
        type: 'item'
    },
    {
        id: 'protection_shield',
        name: 'درع الحماية',
        description: 'يحميك من السرقة لمدة 24 ساعة',
        price: 2000,
        emoji: '🛡️',
        type: 'protection'
    },
    {
        id: 'lucky_ticket',
        name: 'تذكرة الحظ',
        description: 'تذكرة للدخول في السحب اليومي',
        price: 1000,
        emoji: '🎟️',
        type: 'ticket'
    }
];

module.exports = {
    name: 'متجر',
    aliases: ['shop', 'store', 'متجره'],
    category: 'economy',
    description: 'عرض المتجر وشراء العناصر',

    async messageExecute(message) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            const guildId = message.guild.id;

            // Get guild config and shop items
            const guildConfig = await GuildConfig.findOne({ guildId });
            const shopItems = guildConfig?.economy?.shopItems || DEFAULT_ITEMS;

            // Create shop display embed
            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('🏪 متجر السيرفر')
                .setDescription('مرحباً بك في متجر السيرفر! اختر العناصر التي تريد شراءها')
                .setTimestamp();

            // Add items to embed
            shopItems.forEach(item => {
                embed.addFields({
                    name: `${item.emoji} ${item.name}`,
                    value: `الوصف: ${item.description}\nالسعر: ${item.price.toLocaleString('ar-EG')} ريال`,
                    inline: false
                });
            });

            // Create select menu for items
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_select')
                .setPlaceholder('اختر عنصر للشراء')
                .addOptions(
                    shopItems.map(item => ({
                        label: item.name,
                        description: `${item.price.toLocaleString('ar-EG')} ريال`,
                        value: item.id,
                        emoji: item.emoji
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await message.reply({
                embeds: [embed],
                components: [row]
            });

            // Create collector for select menu
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000 // 1 minute
            });

            collector.on('collect', async i => {
                try {
                    if (i.customId === 'shop_select') {
                        const selectedItemId = i.values[0];
                        const item = shopItems.find(item => item.id === selectedItemId);

                        // Get user profile
                        let userProfile = await UserProfile.findOne({
                            userId: message.author.id,
                            guildId: message.guild.id
                        });

                        if (!userProfile) {
                            userProfile = new UserProfile({
                                userId: message.author.id,
                                guildId: message.guild.id
                            });
                        }

                        // Check if user has enough money
                        if (userProfile.balance < item.price) {
                            await i.reply({
                                content: `❌ رصيدك غير كافي! تحتاج إلى ${item.price.toLocaleString('ar-EG')} ريال`,
                                ephemeral: true
                            });
                            return;
                        }

                        // Process purchase based on item type
                        switch (item.type) {
                            case 'role':
                                try {
                                    const role = await message.guild.roles.fetch(guildConfig.economy.vipRoleId);
                                    if (role) {
                                        await message.member.roles.add(role);
                                    }
                                } catch (error) {
                                    console.error('Error adding role:', error);
                                    await i.reply({
                                        content: '❌ حدث خطأ أثناء إضافة الرتبة',
                                        ephemeral: true
                                    });
                                    return;
                                }
                                break;

                            case 'protection':
                                userProfile.protection = {
                                    active: true,
                                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
                                };
                                break;

                            case 'ticket':
                                userProfile.items = userProfile.items || [];
                                userProfile.items.push({
                                    id: item.id,
                                    name: item.name,
                                    purchasedAt: new Date()
                                });
                                break;
                        }

                        // Update user profile
                        userProfile.balance -= item.price;
                        userProfile.stats = userProfile.stats || {};
                        userProfile.stats.totalSpent = (userProfile.stats.totalSpent || 0) + item.price;
                        await userProfile.save();

                        // Create success embed
                        const successEmbed = new EmbedBuilder()
                            .setColor('#2ecc71')
                            .setTitle('✅ تم الشراء بنجاح')
                            .setDescription(`${item.emoji} تم شراء ${item.name} مقابل ${item.price.toLocaleString('ar-EG')} ريال`)
                            .addFields(
                                { name: '💰 رصيدك الحالي', value: `${userProfile.balance.toLocaleString('ar-EG')} ريال`, inline: true }
                            )
                            .setTimestamp();

                        await i.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    }
                } catch (error) {
                    console.error('Error handling shop selection:', error);
                    await i.reply({
                        content: '❌ حدث خطأ أثناء الشراء',
                        ephemeral: true
                    });
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(console.error);
            });
        } catch (error) {
            console.error('Error in shop command:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};
