const { EmbedBuilder } = require('discord.js');
const InviteTracker = require('../database/schemas/InviteTracker');
const InviteStats = require('../database/schemas/InviteStats');
const GuildConfig = require('../database/schemas/guildConfig');

const guildInvites = new Map();

async function initializeInviteTracker(client) {
    for (const [guildId, guild] of client.guilds.cache) {
        try {
            // Fetch the bot member first to ensure it's available
            let me = guild.members.me;
            if (!me) {
                try {
                    me = await guild.members.fetch(client.user.id);
                } catch {
                    console.log(`Could not fetch bot member in guild ${guild.name} (${guildId}), skipping invite tracking`);
                    continue;
                }
            }

            if (!me) {
                console.log(`Bot not found in guild ${guild.name} (${guildId}), skipping invite tracking`);
                continue;
            }
            
            // Check if the bot has the ManageGuild permission
            const hasManageGuild = me.permissions?.has('ManageGuild');
            if (!hasManageGuild) {
                console.log(`Bot doesn't have ManageGuild permission in ${guild.name} (${guildId}), skipping invite tracking`);
                continue;
            }
            
            const invites = await guild.invites.fetch();
            guildInvites.set(guildId, new Map(
                invites.map(invite => [invite.code, {
                    code: invite.code,
                    uses: invite.uses,
                    maxUses: invite.maxUses,
                    inviterId: invite.inviterId
                }])
            ));
            
            for (const invite of invites.values()) {
                await updateInviteInDatabase(guild.id, invite);
            }
        } catch (error) {
            console.error(`Failed to fetch invites for guild ${guildId}:`, error);
        }
    }
    
    console.log(`Invite tracking initialized for ${guildInvites.size} guilds.`);
}

async function updateInviteInDatabase(guildId, invite) {
    try {
        await InviteTracker.findOneAndUpdate(
            { guildId, inviteCode: invite.code },
            {
                $set: {
                    inviterId: invite.inviterId,
                    uses: invite.uses,
                    maxUses: invite.maxUses,
                    expiresAt: invite.expiresAt,
                    isTemporary: invite.temporary
                }
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error(`Failed to update invite in database:`, error);
    }
}

async function handleGuildMemberAdd(member, client) {
    const { guild } = member;
    
    try {
        // Check if bot is in the guild and has proper permissions
        if (!guild.members.me) {
            return null;
        }
        
        // Check if the bot has the ManageGuild permission
        const hasManageGuild = guild.members.me.permissions?.has('ManageGuild');
        if (!hasManageGuild) {
            return null;
        }
        
        const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
        if (!guildConfig || !guildConfig.inviteTracking.enabled) return null;
        
        const cachedInvites = guildInvites.get(guild.id) || new Map();
        const newInvites = await guild.invites.fetch();
        
        const usedInvite = newInvites.find(invite => {
            const cachedInvite = cachedInvites.get(invite.code);
            return cachedInvite && invite.uses > cachedInvite.uses;
        });
        
        guildInvites.set(guild.id, new Map(
            newInvites.map(invite => [invite.code, {
                code: invite.code,
                uses: invite.uses,
                maxUses: invite.maxUses,
                inviterId: invite.inviterId
            }])
        ));
        
        if (!usedInvite) return null;
        
        const inviter = await client.users.fetch(usedInvite.inviterId).catch(() => null);
        
        await updateInviteUsage(guild.id, usedInvite, member.id);
        await updateInviterStats(guild.id, usedInvite.inviterId, member.id, usedInvite.code);
        
        return { invite: usedInvite, inviter };
    } catch (error) {
        console.error(`Failed to track invite for member ${member.id} in guild ${guild.id}:`, error);
        return null;
    }
}

async function updateInviteUsage(guildId, invite, userId) {
    try {
        await InviteTracker.findOneAndUpdate(
            { guildId, inviteCode: invite.code },
            {
                $set: {
                    uses: invite.uses,
                    maxUses: invite.maxUses
                },
                $push: {
                    invitedUsers: {
                        userId,
                        joinedAt: new Date(),
                        isActive: true
                    }
                }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error(`Failed to update invite usage:`, error);
    }
}

async function updateInviterStats(guildId, inviterId, userId, inviteCode) {
    try {
        await InviteStats.findOneAndUpdate(
            { guildId, userId: inviterId },
            {
                $inc: {
                    'invites.total': 1,
                    'invites.regular': 1
                }
            },
            { upsert: true }
        );
        
        await InviteStats.findOneAndUpdate(
            { guildId, userId },
            {
                $set: {
                    'invitedBy.userId': inviterId,
                    'invitedBy.inviteCode': inviteCode
                }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error(`Failed to update inviter stats:`, error);
    }
}

async function handleGuildMemberRemove(member, client) {
    const { guild } = member;
    
    try {
        // Check if bot is in the guild and has proper permissions
        if (!guild.members.me) {
            return;
        }
        
        // Check if the bot has the ManageGuild permission
        const hasManageGuild = guild.members.me.permissions?.has('ManageGuild');
        if (!hasManageGuild) {
            return;
        }
        
        const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
        if (!guildConfig || !guildConfig.inviteTracking.enabled) return;
        
        const memberStats = await InviteStats.findOne({ guildId: guild.id, userId: member.id });
        
        if (!memberStats || !memberStats.invitedBy.userId) return;
        
        await InviteTracker.updateOne(
            { 
                guildId: guild.id,
                inviteCode: memberStats.invitedBy.inviteCode,
                'invitedUsers.userId': member.id
            },
            {
                $set: {
                    'invitedUsers.$.leftAt': new Date(),
                    'invitedUsers.$.isActive': false
                }
            }
        );
        
        await InviteStats.updateOne(
            { guildId: guild.id, userId: memberStats.invitedBy.userId },
            {
                $inc: {
                    'invites.left': 1
                }
            }
        );
    } catch (error) {
        console.error(`Failed to handle member leave for ${member.id} in guild ${guild.id}:`, error);
    }
}

async function handleGuildCreate(guild) {
    try {
        // Check if bot is in the guild and has proper permissions
        if (!guild.members.me) {
            return;
        }
        
        // Check if the bot has the ManageGuild permission
        const hasManageGuild = guild.members.me.permissions?.has('ManageGuild');
        if (!hasManageGuild) {
            return;
        }
        
        const invites = await guild.invites.fetch();
        guildInvites.set(guild.id, new Map(
            invites.map(invite => [invite.code, {
                code: invite.code,
                uses: invite.uses,
                maxUses: invite.maxUses,
                inviterId: invite.inviterId
            }])
        ));
        
        for (const invite of invites.values()) {
            await updateInviteInDatabase(guild.id, invite);
        }
    } catch (error) {
        console.error(`Failed to initialize invites for new guild ${guild.id}:`, error);
    }
}

async function handleGuildDelete(guild) {
    guildInvites.delete(guild.id);
}

async function handleInviteCreate(invite) {
    const { guild } = invite;
    
    if (!guildInvites.has(guild.id)) {
        guildInvites.set(guild.id, new Map());
    }
    
    guildInvites.get(guild.id).set(invite.code, {
        code: invite.code,
        uses: invite.uses,
        maxUses: invite.maxUses,
        inviterId: invite.inviterId
    });
    
    await updateInviteInDatabase(guild.id, invite);
}

async function handleInviteDelete(invite) {
    const { guild } = invite;
    
    if (guildInvites.has(guild.id)) {
        guildInvites.get(guild.id).delete(invite.code);
    }
}

async function addBonusInvites(guildId, userId, amount) {
    try {
        await InviteStats.findOneAndUpdate(
            { guildId, userId },
            {
                $inc: {
                    'invites.bonus': amount,
                    'invites.total': amount
                }
            },
            { upsert: true }
        );
        
        return true;
    } catch (error) {
        console.error(`Failed to add bonus invites:`, error);
        return false;
    }
}

async function getUserInvites(guildId, userId) {
    try {
        const stats = await InviteStats.findOne({ guildId, userId });
        
        if (!stats) {
            return {
                total: 0,
                regular: 0,
                left: 0,
                fake: 0,
                bonus: 0
            };
        }
        
        return stats.invites;
    } catch (error) {
        console.error(`Failed to get user invites:`, error);
        return null;
    }
}

async function getInviteLeaderboard(guildId, limit = 10) {
    try {
        const stats = await InviteStats.find({ guildId })
            .sort({ 'invites.total': -1 })
            .limit(limit);
        
        return stats;
    } catch (error) {
        console.error(`Failed to get invite leaderboard:`, error);
        return [];
    }
}

module.exports = {
    initializeInviteTracker,
    handleGuildMemberAdd,
    handleGuildMemberRemove,
    handleGuildCreate,
    handleGuildDelete,
    handleInviteCreate,
    handleInviteDelete,
    addBonusInvites,
    getUserInvites,
    getInviteLeaderboard
}; 