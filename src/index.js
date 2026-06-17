const { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

// Add crypto polyfill to fix "crypto is not defined" error
global.crypto = require('crypto');

// Import discord-player and voice dependencies
const { Player } = require('discord-player');

// Import auto role system
const { setupAutoRoleSystem } = require('./utils/autoRoleUtils');
const { initializeInviteTracker } = require('./utils/inviteTracker');

// Import FFmpeg if available
let ffmpeg;
try {
    ffmpeg = require('ffmpeg-static');
    console.log('FFmpeg loaded successfully:', ffmpeg);
} catch (error) {
    console.warn('FFmpeg not loaded, audio playback may be affected:', error.message);
}

// Import voice dependencies
try {
    require('@discordjs/opus');
    console.log('@discordjs/opus loaded successfully');
} catch (error) {
    console.warn('@discordjs/opus not loaded, audio quality may be affected:', error.message);
}

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildInvites
    ],
    partials: [
        Partials.Channel, 
        Partials.Message, 
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User
    ]
});

// Set up collections
client.commands = new Collection();
client.cooldowns = new Collection();

// Initialize Discord Player with improved configuration for better stream extraction
console.log('Initializing Discord Player...');
console.log('Set up player configuration...');
global.player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        dlChunkSize: 0, // Set to 0 to disable chunking (fixes some issues with tracks not playing)
        filter: 'audioonly',
    },
    // Set FFmpeg path if available
    ...(ffmpeg ? { ffmpegPath: ffmpeg } : {}),
    disableHistory: false, // Enable history for resumed playback
    skipFFmpeg: false, // Needed for volume control and filtering
    volumeSmoothness: 0.1, // For smooth volume transitions
    connectionTimeout: 60000, // 60 second timeout for better reliability
    leaveOnEmpty: true, // Leave voice channel when empty
    leaveOnEmptyCooldown: 300000, // 5 minutes
    leaveOnEnd: true, // Leave voice channel when queue ends
    leaveOnEndCooldown: 300000, // 5 minutes
    // Use better YouTube extraction
    youtubeOptions: {
        fetchBeforeQueued: true, // Fetch video info before queuing
        maxRetries: 5, // More retries for better reliability
        maxRetriesPerRequest: 3 // More retries per request
    }
});

// Register player extractors using the current recommended method for version 7.x
async function registerPlayerExtractors() {
    try {
        console.log('Setting up Discord Player extractors...');
        
        // Add debug for player version
        console.log('Discord Player version:', require('discord-player/package.json').version);
        console.log('Available player methods:', Object.keys(global.player));
        console.log('Available extractor methods:', global.player.extractors ? Object.keys(global.player.extractors) : 'No extractors property');
        
        try {
            // Method for Discord Player 7.x
            console.log('Trying Discord Player 7.x extractor method (loadMulti)...');
            const { DefaultExtractors } = await import('@discord-player/extractor');
            
            // Log available extractors
            console.log('Available DefaultExtractors:', DefaultExtractors ? Object.keys(DefaultExtractors) : 'None');
            
            // Check if DefaultExtractors and loadMulti exist
            if (DefaultExtractors && global.player.extractors.loadMulti) {
                await global.player.extractors.loadMulti(DefaultExtractors);
                console.log('Successfully loaded extractors with loadMulti method');
                
                // Verify extractors were loaded
                const loadedExtractors = global.player.extractors.get();
                console.log('Loaded extractors:', loadedExtractors ? loadedExtractors.length : 'None');
            } else {
                throw new Error('loadMulti or DefaultExtractors not available');
            }
        } catch (err) {
            console.error('Error loading extractors with primary method:', err.message);
            
            try {
                // Try alternative method for Discord Player 6.x
                console.log('Trying Discord Player 6.x extractor method (register)...');
                const { YouTubeExtractor } = await import('@discord-player/extractor');
                await global.player.extractors.register(YouTubeExtractor);
                console.log('Successfully registered YouTube extractor with register method');
            } catch (altErr) {
                console.error('Error loading extractors with alternative method:', altErr.message);
                console.log('Continuing without extractors - YouTube playback may still work');
            }
        }
    } catch (error) {
        console.error('Failed to set up Discord Player extractors:', error);
        console.log('Continuing without extractors - basic playback may still work');
    }
}

// Call the function to register extractors
registerPlayerExtractors();

// Set up player events
player.events.on('playerStart', (queue, track) => {
    try {
        if (!queue || !queue.metadata) {
            console.error('Queue or metadata is undefined in playerStart event');
            return;
        }

        const channel = queue.metadata;
        if (!channel || typeof channel.send !== 'function') {
            console.error('Invalid channel in playerStart event');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**`)
            .setThumbnail(track.thumbnail)
            .addFields(
                { name: 'Duration', value: track.duration, inline: true },
                {
                    name: 'Requested By',
                    value: `<@${track.requestedBy.id}>`,
                    inline: true,
                },
                {
                    name: 'Replay Mode',
                    value: queue.repeatMode === 0 ? '🔁 Off' : queue.repeatMode === 1 ? '🔂 Track' : '🔁 Queue',
                    inline: true
                }
            )
            .setTimestamp();

        channel.send({ embeds: [embed] }).catch(err => {
            console.error('Error sending playerStart embed:', err);
        });
    } catch (error) {
        console.error('Error in playerStart event:', error);
    }
});

player.events.on('disconnect', (queue) => {
    try {
        queue.metadata.channel.send('❌ | I was manually disconnected from the voice channel.');
    } catch (error) {
        console.error('Error in disconnect event:', error);
    }
});

player.events.on('emptyChannel', (queue) => {
    try {
        queue.metadata.channel.send('❌ | Nobody is in the voice channel, leaving...');
    } catch (error) {
        console.error('Error in emptyChannel event:', error);
    }
});

player.events.on('emptyQueue', (queue) => {
    try {
        queue.metadata.channel.send('✅ | Queue finished!');
    } catch (error) {
        console.error('Error in emptyQueue event:', error);
    }
});

player.events.on('error', (queue, error) => {
    console.error(`[Player Error] ${error.message}`);
    try {
        if (queue && queue.metadata && queue.metadata.channel) {
            queue.metadata.channel.send(`❌ | An error occurred: ${error.message}`);
        }
    } catch (err) {
        console.error('Error in error event:', err);
    }
});

// Add debug handler for connection errors
player.events.on('connection', (queue) => {
    console.log(`Player connection established in guild: ${queue.guild.name}`);
});

// Add debug handler for debug info
player.events.on('debug', (message) => {
    console.log(`Player debug: ${message}`);
});

// Add playerError handler for player-specific errors
player.events.on('playerError', (queue, error) => {
    console.error(`[Player Specific Error] ${error.message}`);
    try {
        if (queue && queue.metadata && queue.metadata.channel) {
            queue.metadata.channel.send({
                content: `❌ | An error occurred with the music player: ${error.message}`,
                ephemeral: true
            }).catch(sendErr => {
                console.error('Error sending player error message:', sendErr);
            });
        }
    } catch (err) {
        console.error('Error in playerError event:', err);
    }
});

// Database connection
const { connectDB } = require('./database/mongoose');

// Import Athkar Scheduler
const AthkarScheduler = require('./services/athkarScheduler');

// Load commands
const loadCommands = async () => {
    const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));
    
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            try {
                const command = require(path.join(__dirname, 'commands', folder, file));
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    console.log(`Loaded slash command: ${command.data.name}`);
                } else if (command.name) {
                    client.commands.set(command.name, command);
                    console.log(`Loaded legacy command: ${command.name}`);
                    
                    // Set aliases if they exist
                    if (command.aliases) {
                        command.aliases.forEach(alias => {
                            client.commands.set(alias, command);
                        });
                    }
                }
            } catch (error) {
                console.error(`Error loading command from ${file}:`, error);
            }
        }
    }
};

// Load events
const loadEvents = async () => {
    const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        try {
            const event = require(path.join(__dirname, 'events', file));
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`Loaded event: ${event.name}`);
        } catch (error) {
            console.error(`Error loading event from ${file}:`, error);
        }
    }
};

// Initialize the bot
const initializeBot = async () => {
    try {
        console.log('Starting bot initialization...');
        
        // Connect to database
        await connectDB();
        
        // Load commands and events
        await loadCommands();
        await loadEvents();
        
        // Login to Discord
        await client.login(process.env.TOKEN);
        
        // Initialize and start Athkar scheduler
        try {
            const athkarScheduler = new AthkarScheduler(client);
            athkarScheduler.start();
            console.log('Athkar scheduler initialized successfully');
        } catch (error) {
            console.error('Error initializing Athkar scheduler:', error);
        }

        // Setup auto role system
        try {
            await setupAutoRoleSystem(client);
            console.log('Auto role system initialized successfully');
        } catch (error) {
            console.error('Error initializing auto role system:', error);
        }
        
        // Initialize invite tracker - make this optional
        try {
            await initializeInviteTracker(client);
            console.log('Invite tracker initialized successfully');
        } catch (error) {
            console.error('Error initializing invite tracker:', error);
            console.log('Bot will continue without invite tracking functionality');
        }
        
        console.log('Bot initialization completed');
    } catch (error) {
        console.error('Error during bot initialization:', error);
        process.exit(1);
    }
};

// Create a simple HTTP server to keep the bot alive on hosting platforms
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Bot is running!\n');
});

server.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
});

// Handle process events for better stability
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    // Don't exit the process, just log the error
    // process.exit(1);
});

// Handle SIGTERM and SIGINT signals gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    if (client) client.destroy();
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    if (client) client.destroy();
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
});

// Start the bot
initializeBot(); 