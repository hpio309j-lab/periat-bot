const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const athkarImages = {
    quran: [
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',  // Quran image
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758'
    ],
    hadith: [
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758'
    ],
    dua: [
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758'
    ],
    morning: [
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758'
    ],
    evening: [
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758'
    ],
    general: [
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',  // General athkar image
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758'
    ],
    sleep: [
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',  // Sleep athkar image
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758',
        'https://media.discordapp.net/attachments/1516928596524929174/1517575172490531028/9E8A79B0-7BF0-467A-AD0E-591B1610FE15.png?ex=6a36c784&is=6a357604&hm=baf93ce95ea95757e6bc6cd008088d3a0467fd471b2bf85766e2905bcd7a5836&=&format=webp&quality=lossless&width=1376&height=758'
    ]
};

const athkarData = {
    // Athkar data object that will be used by both the command and the scheduler
    quran: {
        name: 'آيات قرآنية',
        list: [
            'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
            'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِن شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
            'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ',
            'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ',
            'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ',
            'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
            'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي'
        ]
    },
    hadith: {
        name: 'أحاديث نبوية',
        list: [
            'قال رسول الله ﷺ: إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
            'قال رسول الله ﷺ: مَنْ قَالَ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، فِي يَوْمٍ مِائَةَ مَرَّةٍ، حُطَّتْ خَطَايَاهُ، وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ',
            'قال رسول الله ﷺ: الدُّعَاءُ هُوَ الْعِبَادَةُ',
            'قال رسول الله ﷺ: مَنْ صَلَّى عَلَيَّ صَلاَةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا',
            'قال رسول الله ﷺ: كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
            'قال رسول الله ﷺ: مَنْ قَرَأَ آيَةَ الْكُرْسِيِّ دُبُرَ كُلِّ صَلَاةٍ مَكْتُوبَةٍ لَمْ يَمْنَعْهُ مِنْ دُخُولِ الْجَنَّةِ إِلَّا الْمَوْتُ'
        ]
    },
    dua: {
        name: 'أدعية مختارة',
        list: [
            'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى، وَالْعَفَافَ وَالْغِنَى',
            'اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي، وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي، وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي',
            'رَبِّ أَعِنِّي وَلَا تُعِنْ عَلَيَّ، وَانْصُرْنِي وَلَا تَنْصُرْ عَلَيَّ، وَامْكُرْ لِي وَلَا تَمْكُرْ عَلَيَّ',
            'اللَّهُمَّ اغْفِرْ لِي، وَارْحَمْنِي، وَاهْدِنِي، وَعَافِنِي، وَارْزُقْنِي',
            'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ',
            'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا'
        ]
    },
    morning: {
        name: 'أذكار الصباح',
        list: [
            'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
            'أَصْبَحْنَا عَلَى فِطْرَةِ الإِسْلاَمِ، وَعَلَى كَلِمَةِ الإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ',
            'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنُورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ',
            'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ'
        ]
    },
    evening: {
        name: 'أذكار المساء',
        list: [
            'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
            'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ للهِ، وَالْحَمْدُ للهِ، لَا إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ',
            'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ مَا عَمِلْتُ، وَمِنْ شَرِّ مَا لَمْ أَعْمَلْ',
            'رَضِيتُ بِاللهِ رَبًّا، وَبِالإِسْلاَمِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا'
        ]
    },
    general: {
        name: 'أذكار عامة',
        list: [
            'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ العَظِيمِ',
            'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
            'أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه',
            'اللهم صل وسلم وبارك على سيدنا محمد',
            'لا حول ولا قوة إلا بالله العلي العظيم',
            'سبحان الله والحمد لله ولا إله إلا الله والله أكبر'
        ]
    },
    sleep: {
        name: 'أذكار النوم',
        list: [
            'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
            'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
            'سُبْحَانَ اللَّهِ (33 مرة)، وَالْحَمْدُ لِلَّهِ (33 مرة)، وَاللَّهُ أَكْبَرُ (34 مرة)',
            'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ'
        ]
    }
};

module.exports = {
    athkarData,
    athkarImages,
    data: new SlashCommandBuilder()
        .setName('athkar')
        .setDescription('يعرض الأذكار حسب الوقت والمناسبة')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('اختر نوع الذكر')
                .setRequired(true)
                .addChoices(
                    { name: 'آيات قرآنية', value: 'quran' },
                    { name: 'أحاديث نبوية', value: 'hadith' },
                    { name: 'أدعية مختارة', value: 'dua' },
                    { name: 'أذكار الصباح', value: 'morning' },
                    { name: 'أذكار المساء', value: 'evening' },
                    { name: 'أذكار عامة', value: 'general' },
                    { name: 'أذكار النوم', value: 'sleep' }
                )
        ),

    async execute(interaction) {
        const category = interaction.options.getString('category');
        const categoryData = athkarData[category];
        let currentIndex = 0;

        const createThikrEmbed = (index) => {
            const thikr = categoryData.list[index];
            const randomImage = athkarImages[category][Math.floor(Math.random() * athkarImages[category].length)];
            return new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle(categoryData.name)
                .setDescription(thikr)
                .setImage(randomImage)
                .setFooter({ text: `${index + 1}/${categoryData.list.length} • اذكر الله يذكرك` })
                .setTimestamp();
        };

        const createButtons = (index) => {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('⬅️ السابق')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('التالي ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === categoryData.list.length - 1),
                    new ButtonBuilder()
                        .setCustomId('counter')
                        .setLabel('🔄 تسبيح')
                        .setStyle(ButtonStyle.Success)
                );
            return row;
        };

        const initialEmbed = createThikrEmbed(currentIndex);
        const initialButtons = createButtons(currentIndex);

        const reply = await interaction.reply({
            embeds: [initialEmbed],
            components: [initialButtons],
            fetchReply: true
        });

        let counterValue = 0;

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'هذا الزر ليس لك', ephemeral: true });
                return;
            }

            await i.deferUpdate();

            if (i.customId === 'previous' && currentIndex > 0) {
                currentIndex--;
            } else if (i.customId === 'next' && currentIndex < categoryData.list.length - 1) {
                currentIndex++;
            } else if (i.customId === 'counter') {
                counterValue++;
                const counterEmbed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle('عداد التسبيح')
                    .setDescription(`🔄 عدد التسبيحات: ${counterValue}`)
                    .setFooter({ text: interaction.user.username })
                    .setTimestamp();
                
                await i.followUp({ embeds: [counterEmbed], ephemeral: true });
                return;
            }

            await i.editReply({
                embeds: [createThikrEmbed(currentIndex)],
                components: [createButtons(currentIndex)]
            });
        });

        collector.on('end', async () => {
            const disabledButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('⬅️ السابق')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('التالي ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('counter')
                        .setLabel('🔄 تسبيح')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true)
                );

            await interaction.editReply({
                components: [disabledButtons]
            });
        });
    },
};
