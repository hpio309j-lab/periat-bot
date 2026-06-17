const { Events } = require('discord.js');
const GuildConfig = require('../database/schemas/guildConfig');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore messages from bots
        if (message.author.bot) return;

        try {
            // Get guild configuration
            const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
            if (!guildConfig) return;

            // Get command name and args
            const args = message.content.trim().split(/ +/);
            let commandName = args.shift().toLowerCase();

            // Check if message is in economy channel
            const isEconomyChannel = message.channel.id === guildConfig.economyChannelId;

            // Get command
            let command = client.commands.get(commandName)
                || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            // If in economy channel and command not found, try with prefix
            if (isEconomyChannel && !command && message.content.startsWith('$')) {
                commandName = args.shift().toLowerCase();
                command = client.commands.get(commandName)
                    || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            }

            if (!command) return;

            // Check if command is economy and verify channel
            if (command.category === 'economy') {
                if (!isEconomyChannel) {
                    return message.reply('❌ هذا الأمر يعمل فقط في روم الاقتصاد');
                }
            } else {
                // Non-economy commands require prefix
                if (!message.content.startsWith('$')) return;
            }

            try {
                await command.messageExecute(message, args);
            } catch (error) {
                console.error('Error executing command:', error);
                await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
            }
        } catch (error) {
            console.error('Error in messageCreate event:', error);
            await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};
