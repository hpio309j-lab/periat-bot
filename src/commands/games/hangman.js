const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Play a game of Hangman')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose difficulty level')
                .setRequired(false)
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' }
                )),
    
    async execute(interaction, client) {
        const difficulty = interaction.options.getString('difficulty') || 'medium';
        
        // Word lists based on difficulty
        const words = {
            easy: ['CAT', 'DOG', 'SUN', 'MOON', 'BOOK', 'TREE', 'CAKE', 'BIRD', 'FISH', 'GAME', 'BALL', 'HOME', 'STAR', 'RAIN', 'LAKE'],
            medium: ['COMPUTER', 'MOUNTAIN', 'KEYBOARD', 'FESTIVAL', 'CHOCOLATE', 'AIRPLANE', 'TREASURE', 'CALENDAR', 'UMBRELLA', 'SANDWICH'],
            hard: ['XYLOPHONE', 'MYSTERIOUS', 'PNEUMONIA', 'QUADRILLION', 'OBSERVATORY', 'SIGNIFICANCE', 'JUXTAPOSITION', 'KALEIDOSCOPE']
        };
        
        // Select random word
        const wordList = words[difficulty];
        const word = wordList[Math.floor(Math.random() * wordList.length)];
        
        // Initialize game data
        const gameData = {
            word: word,
            guessed: [],
            wrongGuesses: 0,
            maxWrongGuesses: 6,
            gameId: Date.now().toString(),
            letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
        };
        
        // Create display word with blanks
        const displayWord = createDisplayWord(word, gameData.guessed);
        
        // Create letter buttons
        const components = createLetterButtons(gameData);
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🪢 Hangman')
            .setDescription(`${displayHangman(gameData.wrongGuesses)}\n\n${displayWord}\n\n**Difficulty:** ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}\n**Wrong Guesses:** ${gameData.wrongGuesses}/${gameData.maxWrongGuesses}`)
            .setFooter({ text: `Game started by ${interaction.user.tag}` });
        
        // Send game message
        const reply = await interaction.reply({
            embeds: [embed],
            components,
            fetchReply: true
        });
        
        // Create collector for game interactions
        const collector = reply.createMessageComponentCollector({ 
            idle: 300000 // 5 minutes
        });
        
        collector.on('collect', async i => {
            // Extract letter from button ID
            const letter = i.customId.replace('letter_', '');
            
            // Mark letter as guessed
            gameData.guessed.push(letter);
            
            // Check if letter is in word
            if (!word.includes(letter)) {
                gameData.wrongGuesses++;
            }
            
            // Update display word
            const newDisplayWord = createDisplayWord(word, gameData.guessed);
            
            // Check if game is over
            let gameOver = false;
            let gameWon = false;
            
            if (gameData.wrongGuesses >= gameData.maxWrongGuesses) {
                gameOver = true;
            } else if (!newDisplayWord.includes('_')) {
                gameOver = true;
                gameWon = true;
            }
            
            // Update letter buttons
            const updatedComponents = createLetterButtons(gameData);
            
            // Create updated embed
            let updatedEmbed;
            
            if (gameOver) {
                if (gameWon) {
                    updatedEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('🎮 Hangman - You Won!')
                        .setDescription(`${displayHangman(gameData.wrongGuesses)}\n\n${newDisplayWord}\n\n**Word:** ${word}\n**Difficulty:** ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}\n**Wrong Guesses:** ${gameData.wrongGuesses}/${gameData.maxWrongGuesses}`)
                        .setFooter({ text: `Game started by ${interaction.user.tag}` });
                } else {
                    updatedEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('🎮 Hangman - Game Over')
                        .setDescription(`${displayHangman(gameData.wrongGuesses)}\n\n${word}\n\n**The word was:** ${word}\n**Difficulty:** ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}\n**Wrong Guesses:** ${gameData.wrongGuesses}/${gameData.maxWrongGuesses}`)
                        .setFooter({ text: `Game started by ${interaction.user.tag}` });
                }
                
                // Stop the collector
                collector.stop();
                
                // Remove all buttons
                await i.update({
                    embeds: [updatedEmbed],
                    components: []
                });
            } else {
                updatedEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('🪢 Hangman')
                    .setDescription(`${displayHangman(gameData.wrongGuesses)}\n\n${newDisplayWord}\n\n**Difficulty:** ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}\n**Wrong Guesses:** ${gameData.wrongGuesses}/${gameData.maxWrongGuesses}`)
                    .setFooter({ text: `Game started by ${interaction.user.tag}` });
                
                await i.update({
                    embeds: [updatedEmbed],
                    components: updatedComponents
                });
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                // Game timed out
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🎮 Hangman - Game Over')
                    .setDescription(`The game has timed out due to inactivity.\nThe word was: **${word}**`)
                    .setFooter({ text: `Game started by ${interaction.user.tag}` });
                
                interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                }).catch(error => console.error('Error editing reply after game timeout:', error));
            }
        });
    },
};

// Function to create display word with blanks and guessed letters
function createDisplayWord(word, guessed) {
    let display = '';
    
    for (const letter of word) {
        if (guessed.includes(letter)) {
            display += letter + ' ';
        } else {
            display += '_ ';
        }
    }
    
    return display.trim();
}

// Function to create letter buttons
function createLetterButtons(gameData) {
    const rows = [];
    
    // Split alphabet into rows of 9, 9, and 8 buttons
    const splitAlphabet = [
        gameData.letters.slice(0, 9),
        gameData.letters.slice(9, 18),
        gameData.letters.slice(18)
    ];
    
    for (let i = 0; i < splitAlphabet.length; i++) {
        const row = new ActionRowBuilder();
        
        for (const letter of splitAlphabet[i]) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`letter_${letter}`)
                    .setLabel(letter)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(gameData.guessed.includes(letter))
            );
        }
        
        rows.push(row);
    }
    
    return rows;
}

// Function to display hangman based on wrong guesses
function displayHangman(wrongGuesses) {
    const stages = [
        "```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```",
        "```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```",
        "```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```",
        "```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```",
        "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```",
        "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```",
        "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```"
    ];
    
    return stages[wrongGuesses];
} 