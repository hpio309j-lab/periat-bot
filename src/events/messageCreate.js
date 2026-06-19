const { Events } = require('discord.js');
const GuildConfig = require('../database/schemas/guildConfig');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore messages from bots
        if (message.author.bot) return;

        try {
            // Handle "خط" auto-reply (mistake command)
            if (message.content.trim() === 'خط' && message.inGuild()) {
                const MISTAKE_ROLE_ID = '1455192755088130216';
                if (!message.member.roles.cache.has(MISTAKE_ROLE_ID)) return;

                try {
                    await message.delete();
                } catch (e) {
                    // ignore delete error
                }

                await message.channel.send({
                    content: 'https://media.discordapp.net/attachments/1466099079288455230/1517651379299291206/839361839334424586.webp?ex=6a370e7d&is=6a35bcfd&hm=7659e2ce4a2c6f9a5b55728608b040333c9b2f3b8d44ba8e8bf25b5ad6187d87&=&format=webp&width=619&height=34'
                });
                return;
            }

            // Handle -gstart prefix command for giveaways
            if (message.content.toLowerCase().startsWith('-gstart') && message.inGuild()) {
                const giveawayCommand = client.commands.get('giveaway');
                if (giveawayCommand && giveawayCommand.handleMessage) {
                    try {
                        await giveawayCommand.handleMessage(message, client);
                    } catch (error) {
                        console.error('Error executing -gstart command:', error);
                        if (!message.replied) {
                            await message.reply('An error occurred while starting the giveaway.');
                        }
                    }
                    return;
                }
            }

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
