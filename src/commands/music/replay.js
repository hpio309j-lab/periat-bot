const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('replay')
        .setDescription('Toggle replay mode for the current track'),
    cooldown: 5,

    async execute(interaction, client) {
        try {
            // Check if user is in a voice channel
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: '❌ | You must be in a voice channel to use this command!',
                    ephemeral: true
                });
            }

            // Get the queue
            const queue = global.player.nodes.get(interaction.guildId);
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({
                    content: '❌ | No music is currently playing!',
                    ephemeral: true
                });
            }

            // Toggle replay mode
            queue.setRepeatMode(queue.repeatMode === 1 ? 0 : 1);

            // Create an embed to show the status
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🔁 Replay Mode')
                .setDescription(`Replay mode is now ${queue.repeatMode === 1 ? '**ON**' : '**OFF**'}`)
                .addFields(
                    { name: 'Current Track', value: `[${queue.currentTrack.title}](${queue.currentTrack.url})`, inline: true }
                )
                .setTimestamp();

            // Add the current track thumbnail if available
            if (queue.currentTrack.thumbnail) {
                embed.setThumbnail(queue.currentTrack.thumbnail);
            }

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in replay command:', error);
            return interaction.reply({
                content: `❌ | Error: ${error.message}`,
                ephemeral: true
            });
        }
    },
};
