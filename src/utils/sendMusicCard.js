const { 
    AttachmentBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Colors, 
    EmbedBuilder, 
    ActivityType
} = require('discord.js');
const generateMusicCard = require('./generateMusicCard');

/**
 * @param {object} queue - The music queue object.
 * @param {object} song - The currently playing song object.
 * @param {object} localization - The localization utility instance.
 */
async function sendMusicCard(queue, song, localization) {
    try {
        let currentTime = 0;
        const totalTime = song.duration;

        const cardBuffer = await generateMusicCard(song, currentTime, totalTime, queue);
        if (!cardBuffer) {
            console.error("❌ Failed to generate music card.");
            return;
        }

        const buttons = {
            pause: new ButtonBuilder()
                .setCustomId("pause")
                .setLabel(localization.get('buttons.pause'))
                .setStyle(ButtonStyle.Secondary),
            resume: new ButtonBuilder()
                .setCustomId("resume")
                .setLabel(localization.get('buttons.resume'))
                .setStyle(ButtonStyle.Success),
            skip: new ButtonBuilder()
                .setCustomId("skip")
                .setLabel(localization.get('buttons.skip'))
                .setStyle(ButtonStyle.Primary),
            stop: new ButtonBuilder()
                .setCustomId("stop")
                .setLabel(localization.get('buttons.stop'))
                .setStyle(ButtonStyle.Danger),
            volumeUp: new ButtonBuilder()
                .setCustomId("volumeUp")
                .setLabel(localization.get('buttons.volumeUp'))
                .setStyle(ButtonStyle.Primary),
            volumeDown: new ButtonBuilder()
                .setCustomId("volumeDown")
                .setLabel(localization.get('buttons.volumeDown'))
                .setStyle(ButtonStyle.Primary),
            repeat: new ButtonBuilder()
                .setCustomId("repeat")
                .setLabel(localization.get('buttons.repeat'))
                .setStyle(ButtonStyle.Secondary),
            open: new ButtonBuilder()
                .setLabel(localization.get('buttons.open'))
                .setStyle(ButtonStyle.Link)
                .setURL(song.url || "https://youtube.com"),
        };

        const row1 = new ActionRowBuilder().addComponents(
            buttons.pause,
            buttons.resume,
            buttons.skip,
            buttons.stop
        );
        const row2 = new ActionRowBuilder().addComponents(
            buttons.volumeUp,
            buttons.volumeDown,
            buttons.repeat
        );
        const row3 = new ActionRowBuilder().addComponents(buttons.open);

        if (queue.textChannel && typeof queue.textChannel.send === "function") {
            const attachment = new AttachmentBuilder(cardBuffer, { name: 'musiccard.png' });
            const message = await queue.textChannel.send({
                components: [row1, row2, row3],
                files: [attachment],
            });

            queue.currentMessage = message;
            queue.initiatorId = song.user.id;

            const updateInterval = setInterval(async () => {
                try {
                    if (!queue || queue.paused || queue.destroyed || !queue.currentMessage) {
                        clearInterval(updateInterval);
                        return;
                    }

                    currentTime = Math.floor(queue.currentTime);
                    if (currentTime > totalTime) currentTime = totalTime;

                    const currentSong = queue.songs[0];
                    if (!currentSong) {
                        console.error("❌ Current song is undefined.");
                        clearInterval(updateInterval);
                        return;
                    }

                    const updatedCardBuffer = await generateMusicCard(currentSong, currentTime, totalTime, queue);
                    if (!updatedCardBuffer) {
                        console.error("❌ Failed to generate updated music card.");
                        clearInterval(updateInterval);
                        return;
                    }

                    const updatedAttachment = new AttachmentBuilder(updatedCardBuffer, { name: 'musiccard.png' });
                    await queue.currentMessage.edit({
                        components: [row1, row2, row3],
                        files: [updatedAttachment],
                    });

                    await queue.client.user.setActivity(
                        localization.get('commands.nowplaying.nowPlaying') + ` ${currentSong.name}`, 
                        { type: ActivityType.Playing }
                    );

                    if (currentTime >= totalTime) {
                        clearInterval(updateInterval);
                    }
                } catch (err) {
                    console.error("❌ Error updating music card:", err);
                    clearInterval(updateInterval);
                }
            }, 1000);
        } else {
            console.error("❌ Queue text channel is not a text-based channel. Cannot send music card.");
        }
    } catch (error) {
        console.error("❌ Error sending music card:", error);
        if (queue.textChannel && typeof queue.textChannel.send === "function") {
            const embed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription(localization.get('errors.unableToCreateMusicCard'));
            queue.textChannel.send({ embeds: [embed] }).catch(console.error);
        }
    }
}

module.exports = sendMusicCard;
