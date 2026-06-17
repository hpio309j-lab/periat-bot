const GuildConfig = require('../database/schemas/guildConfig');

async function validateEconomyChannel(context) {
    // Determine if it's a message or interaction
    const isMessage = context.content !== undefined;
    const guildId = isMessage ? context.guild.id : context.guildId;
    const channelId = isMessage ? context.channel.id : context.channelId;

    const config = await GuildConfig.findOne({ guildId });
    if (!config) {
        const response = '❌ لم يتم إعداد نظام الإقتصاد بعد. الرجاء استخدام أمر `setupeconomy`';
        if (isMessage) {
            await context.reply(response);
        } else {
            await context.reply({ content: response, ephemeral: true });
        }
        return false;
    }

    if (channelId !== config.economyChannelId) {
        const response = `❌ يمكن استخدام هذا الأمر فقط في روم <#${config.economyChannelId}>`;
        if (isMessage) {
            await context.reply(response);
        } else {
            await context.reply({ content: response, ephemeral: true });
        }
        return false;
    }

    return true;
}

async function validateGameChannel(context) {
    // Determine if it's a message or interaction
    const isMessage = context.content !== undefined;
    const guildId = isMessage ? context.guild.id : context.guildId;
    const channelId = isMessage ? context.channel.id : context.channelId;

    const config = await GuildConfig.findOne({ guildId });
    if (!config) {
        const response = '❌ لم يتم إعداد نظام الألعاب بعد. الرجاء استخدام أمر `setupeconomy`';
        if (isMessage) {
            await context.reply(response);
        } else {
            await context.reply({ content: response, ephemeral: true });
        }
        return false;
    }

    if (channelId !== config.gameChannelId) {
        const response = `❌ يمكن استخدام هذا الأمر فقط في روم <#${config.gameChannelId}>`;
        if (isMessage) {
            await context.reply(response);
        } else {
            await context.reply({ content: response, ephemeral: true });
        }
        return false;
    }

    return true;
}

module.exports = {
    validateEconomyChannel,
    validateGameChannel
};
