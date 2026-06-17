const { EmbedBuilder } = require('discord.js');
const { validateEconomyChannel } = require('../../utils/channelValidator');

module.exports = {
    name: 'اوامر',
    aliases: ['commands', 'help', 'اوامر-اقتصاد', 'economy-help'],
    category: 'economy',
    description: 'عرض جميع اوامر الاقتصاد',

    async messageExecute(message, args) {
        // Validate channel
        if (!await validateEconomyChannel(message)) return;

        try {
            const prefix = '$';

            const commands = [
                { 
                    name: 'رصيد', 
                    aliases: ['balance', 'bal', 'credits'], 
                    description: 'عرض رصيدك' 
                },
                { 
                    name: 'راتب', 
                    aliases: ['salary', 'sal'], 
                    description: 'استلام راتبك اليومي' 
                },
                { 
                    name: 'بنك', 
                    aliases: ['bank'], 
                    description: 'ايداع او سحب من البنك' 
                },
                { 
                    name: 'تحويل', 
                    aliases: ['transfer', 'send'], 
                    description: 'تحويل اموال لشخص اخر' 
                },
                { 
                    name: 'سرقة', 
                    aliases: ['rob', 'steal'], 
                    description: 'سرقة شخص' 
                },
                { 
                    name: 'حماية', 
                    aliases: ['protection', 'protect'], 
                    description: 'شراء حماية من السرقة' 
                },
                { 
                    name: 'متجر', 
                    aliases: ['shop', 'store'], 
                    description: 'عرض المتجر' 
                },
                { 
                    name: 'شراء', 
                    aliases: ['buy', 'purchase'], 
                    description: 'شراء عنصر من المتجر' 
                },
                { 
                    name: 'حقيبة', 
                    aliases: ['inventory', 'inv', 'items'], 
                    description: 'عرض حقيبتك' 
                },
                { 
                    name: 'وظيفة', 
                    aliases: ['job', 'work'], 
                    description: 'التقديم على وظيفة' 
                },
                { 
                    name: 'استقالة', 
                    aliases: ['resign', 'quit'], 
                    description: 'الاستقالة من وظيفتك' 
                },
                { 
                    name: 'وظائف', 
                    aliases: ['jobs', 'careers'], 
                    description: 'عرض الوظائف المتاحة' 
                },
                { 
                    name: 'زواج', 
                    aliases: ['marry'], 
                    description: 'الزواج من شخص' 
                },
                { 
                    name: 'طلاق', 
                    aliases: ['divorce'], 
                    description: 'الطلاق' 
                },
                { 
                    name: 'هدية', 
                    aliases: ['gift', 'present'], 
                    description: 'اهداء شيء لشخص' 
                },
                { 
                    name: 'قرض', 
                    aliases: ['loan', 'borrow'], 
                    description: 'طلب قرض من البنك' 
                },
                { 
                    name: 'تسديد', 
                    aliases: ['pay', 'repay'], 
                    description: 'تسديد القرض' 
                }
            ];

            // Create pages for commands (5 commands per page)
            const commandsPerPage = 5;
            const pages = [];
            for (let i = 0; i < commands.length; i += commandsPerPage) {
                const pageCommands = commands.slice(i, i + commandsPerPage);
                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('📋 اوامر الاقتصاد')
                    .setDescription('يمكنك استخدام الاوامر مباشرة في روم الاقتصاد بدون اي بادئة\nمثال: `رصيد`')
                    .setFooter({ text: `الصفحة ${Math.floor(i/commandsPerPage) + 1}/${Math.ceil(commands.length/commandsPerPage)}` });

                for (const cmd of pageCommands) {
                    const aliases = cmd.aliases.map(a => `\`${a}\``).join(', ');
                    embed.addFields({
                        name: cmd.name,
                        value: `**الوصف:** ${cmd.description}\n**الاختصارات:** ${aliases}`
                    });
                }

                pages.push(embed);
            }

            // Send first page
            const response = await message.reply({ embeds: [pages[0]] });

            // Add reactions for pagination if there are multiple pages
            if (pages.length > 1) {
                await response.react('⬅️');
                await response.react('➡️');

                // Create reaction collector
                const filter = (reaction, user) => 
                    ['⬅️', '➡️'].includes(reaction.emoji.name) && 
                    user.id === message.author.id;

                const collector = response.createReactionCollector({ 
                    filter, 
                    time: 60000 
                });

                let currentPage = 0;

                collector.on('collect', async (reaction, user) => {
                    if (reaction.emoji.name === '➡️') {
                        currentPage = currentPage + 1 < pages.length ? currentPage + 1 : 0;
                    } else {
                        currentPage = currentPage > 0 ? currentPage - 1 : pages.length - 1;
                    }

                    await response.edit({ embeds: [pages[currentPage]] });
                    await reaction.users.remove(user.id);
                });

                collector.on('end', () => {
                    response.reactions.removeAll().catch(error => console.error('Failed to clear reactions:', error));
                });
            }
        } catch (error) {
            console.error('Error in economy help command:', error);
            await message.reply('❌ حدث خطأ أثناء عرض قائمة الاوامر');
        }
    }
};
