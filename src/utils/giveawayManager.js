const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Giveaway = require('../database/models/Giveaway');
const ms = require('ms');

// Function to check and end active giveaways
async function checkGiveaways(client) {
    try {
        const now = Date.now();
        
        // Get all active giveaways that have ended
        const endedGiveaways = await Giveaway.find({
            ended: false,
            paused: false,
            endTime: { $lte: new Date(now) }
        });
        
        for (const giveaway of endedGiveaways) {
            try {
                // End the giveaway
                await endGiveaway(giveaway, client);
            } catch (err) {
                console.error(`Error ending giveaway with ID ${giveaway._id}:`, err);
            }
        }
    } catch (error) {
        console.error('Error checking giveaways:', error);
    }
}

// Function to end a giveaway
async function endGiveaway(giveaway, client) {
    try {
        // Get guild and channel
        const guild = client.guilds.cache.get(giveaway.guildId);
        if (!guild) return;
        
        const channel = guild.channels.cache.get(giveaway.channelId);
        if (!channel) return;
        
        // Try to fetch the giveaway message
        try {
            const message = await channel.messages.fetch(giveaway.messageId);
            
            // Get winners
            const winners = await selectWinners(giveaway, guild);
            
            // Update the giveaway in database
            giveaway.ended = true;
            giveaway.winners = winners.map(w => w.id);
            await giveaway.save();
            
            // Create winners announcement
            const winnerText = winners.length > 0 
                ? winners.map(w => `<@${w.id}>`).join(', ') 
                : 'No valid participants';
            
            const endEmbed = new EmbedBuilder()
                .setTitle('🎉 Giveaway Ended 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}`)
                .addFields(
                    { name: 'Winner(s)', value: winnerText },
                    { name: 'Hosted by', value: `<@${giveaway.hostId}>` }
                )
                .setColor('#2ecc71')
                .setTimestamp()
                .setFooter({ text: `Giveaway ID: ${giveaway._id}` });
            
            // Update the original message
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_view_${giveaway._id}`)
                    .setLabel('View Giveaway')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`giveaway_reroll_${giveaway._id}`)
                    .setLabel('Reroll')
                    .setStyle(ButtonStyle.Primary)
            );
            
            await message.edit({ embeds: [endEmbed], components: [row] });
            
            // Send winner announcement
            if (winners.length > 0) {
                await channel.send({
                    content: `Congratulations ${winnerText}! You won **${giveaway.prize}**!`,
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🎉 Giveaway Winners 🎉')
                            .setDescription(`You won the giveaway for **${giveaway.prize}**!`)
                            .setColor('#f1c40f')
                    ]
                });
            } else {
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🎉 Giveaway Ended 🎉')
                            .setDescription(`No valid winner for **${giveaway.prize}**`)
                            .setColor('#e74c3c')
                    ]
                });
            }
        } catch (err) {
            console.error(`Error updating giveaway message: ${err}`);
            // Mark giveaway as ended even if message can't be updated
            giveaway.ended = true;
            await giveaway.save();
        }
    } catch (error) {
        console.error('Error ending giveaway:', error);
    }
}

// Function to select winners
async function selectWinners(giveaway, guild) {
    try {
        // Filter participants
        let participants = [...giveaway.participants];
        
        // If no participants, return empty array
        if (participants.length === 0) return [];
        
        // Get member objects and check requirements
        let validParticipants = [];
        
        for (const userId of participants) {
            try {
                const member = await guild.members.fetch(userId);
                if (!member) continue;
                
                // Check requirements if any
                let isValid = true;
                
                // Role requirement
                if (giveaway.requirements?.roles && giveaway.requirements.roles.length > 0) {
                    const hasRequiredRole = giveaway.requirements.roles.some(roleId => 
                        member.roles.cache.has(roleId)
                    );
                    if (!hasRequiredRole) isValid = false;
                }
                
                // Account age requirement (in days)
                if (isValid && giveaway.requirements?.minAccountAge > 0) {
                    const accountAge = Date.now() - member.user.createdTimestamp;
                    const minAge = giveaway.requirements.minAccountAge * 24 * 60 * 60 * 1000; // convert days to ms
                    if (accountAge < minAge) isValid = false;
                }
                
                // Server time requirement (in days)
                if (isValid && giveaway.requirements?.minServerTime > 0) {
                    const joinTime = Date.now() - member.joinedTimestamp;
                    const minTime = giveaway.requirements.minServerTime * 24 * 60 * 60 * 1000; // convert days to ms
                    if (joinTime < minTime) isValid = false;
                }
                
                // If valid, add to participants with bonus entries if applicable
                if (isValid) {
                    let entries = 1;
                    
                    // Check for bonus entries
                    if (giveaway.bonusEntries && giveaway.bonusEntries.length > 0) {
                        for (const bonus of giveaway.bonusEntries) {
                            if (member.roles.cache.has(bonus.roleId)) {
                                entries *= bonus.multiplier;
                            }
                        }
                    }
                    
                    // Add entries
                    for (let i = 0; i < entries; i++) {
                        validParticipants.push(member);
                    }
                }
            } catch (err) {
                console.error(`Error processing participant ${userId}:`, err);
            }
        }
        
        // Shuffle the valid participants
        for (let i = validParticipants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validParticipants[i], validParticipants[j]] = [validParticipants[j], validParticipants[i]];
        }
        
        // Select winners
        const winners = [];
        const winnerCount = Math.min(giveaway.winnerCount, validParticipants.length);
        
        for (let i = 0; i < winnerCount; i++) {
            const winnerIndex = Math.floor(Math.random() * validParticipants.length);
            winners.push(validParticipants[winnerIndex]);
            
            // Remove all instances of this winner to prevent duplicates
            validParticipants = validParticipants.filter(p => p.id !== validParticipants[winnerIndex].id);
            
            if (validParticipants.length === 0) break;
        }
        
        return winners;
    } catch (error) {
        console.error('Error selecting winners:', error);
        return [];
    }
}

// Function to create a giveaway
async function createGiveaway(options) {
    try {
        const { 
            prize, 
            channelId, 
            guildId, 
            hostId, 
            duration, 
            winnerCount, 
            requirements, 
            bonusEntries, 
            description 
        } = options;
        
        // Calculate end time
        const endTime = new Date(Date.now() + ms(duration));
        
        // Create giveaway in database
        const giveaway = await Giveaway.create({
            prize,
            channelId,
            guildId,
            hostId,
            endTime,
            winnerCount: parseInt(winnerCount) || 1,
            requirements: requirements || {},
            bonusEntries: bonusEntries || [],
            description: description || '',
            messageId: 'placeholder' // Will be updated after sending the message
        });
        
        return giveaway;
    } catch (error) {
        console.error('Error creating giveaway:', error);
        throw error;
    }
}

// Function to format time remaining
function formatTimeRemaining(endTime) {
    const now = new Date();
    const end = new Date(endTime);
    const timeLeft = end - now;
    
    if (timeLeft <= 0) return 'Ended';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    let timeString = '';
    
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    if (seconds > 0) timeString += `${seconds}s`;
    
    return timeString.trim();
}

module.exports = {
    checkGiveaways,
    endGiveaway,
    createGiveaway,
    selectWinners,
    formatTimeRemaining
}; 