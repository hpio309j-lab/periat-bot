const { Events } = require('discord.js');
const Giveaway = require('../database/models/Giveaway');

const GIVEAWAY_EMOJI = '🎉';

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user, client) {
        // Ignore bot reactions
        if (user.bot) return;

        // Partial reaction — fetch the full message
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Failed to fetch partial reaction:', error);
                return;
            }
        }

        // Only handle 🎉 emoji reactions
        if (reaction.emoji.name !== GIVEAWAY_EMOJI) return;

        // Only handle reactions in guilds
        if (!reaction.message.guildId) return;

        try {
            // Find the giveaway by messageId
            const giveaway = await Giveaway.findOne({
                messageId: reaction.message.id,
                guildId: reaction.message.guildId,
                ended: false
            });

            if (!giveaway) return;

            // Check if user already entered
            if (giveaway.participants.includes(user.id)) return;

            // Add user to participants
            giveaway.participants.push(user.id);
            await giveaway.save();

            // Update the embed entry count
            try {
                const updatedEmbed = reaction.message.embeds[0];
                if (updatedEmbed) {
                    const { EmbedBuilder } = require('discord.js');
                    const fields = [];

                    for (const field of updatedEmbed.fields) {
                        if (field.name.includes('Entries') || field.name.includes('👥')) {
                            const count = giveaway.participants.length;
                            fields.push({
                                name: field.name,
                                value: `${count} participant${count === 1 ? '' : 's'}`,
                                inline: field.inline
                            });
                        } else {
                            fields.push(field);
                        }
                    }

                    const newEmbed = EmbedBuilder.from(updatedEmbed).setFields(fields);
                    await reaction.message.edit({ embeds: [newEmbed] });
                }
            } catch (editError) {
                console.error('Error updating giveaway embed count:', editError);
            }
        } catch (error) {
            console.error('Error handling giveaway reaction add:', error);
        }
    }
};
