const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock Paper Scissors against the bot or another user')
        .addUserOption(option => 
            option.setName('opponent')
                .setDescription('Select an opponent to play against (leave empty to play against the bot)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('rounds')
                .setDescription('Number of rounds to play (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(5)),
    
    async execute(interaction, client) {
        const opponent = interaction.options.getUser('opponent');
        const rounds = interaction.options.getInteger('rounds') || 1;
        
        // Game against bot
        if (!opponent) {
            return handleBotGame(interaction, rounds);
        }
        
        // Check if opponent is the bot
        if (opponent.id === client.user.id) {
            return handleBotGame(interaction, rounds);
        }
        
        // Check if opponent is self
        if (opponent.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't play against yourself!",
                ephemeral: true
            });
        }
        
        // Check if opponent is a bot
        if (opponent.bot) {
            return interaction.reply({
                content: "You can't play against other bots!",
                ephemeral: true
            });
        }
        
        // Initialize player vs player game
        const gameData = {
            players: [interaction.user.id, opponent.id],
            choices: {},
            scores: {[interaction.user.id]: 0, [opponent.id]: 0},
            currentRound: 1,
            totalRounds: rounds,
            gameId: Date.now().toString()
        };
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('✂️ Rock Paper Scissors')
            .setDescription(`${interaction.user} has challenged ${opponent} to a game of Rock Paper Scissors!\n\n**Round ${gameData.currentRound} of ${gameData.totalRounds}**\n\nBoth players: Make your selection using the buttons below.`)
            .addFields(
                { name: 'Score', value: `${interaction.user}: 0 | ${opponent}: 0` }
            )
            .setFooter({ text: `Game ID: ${gameData.gameId}` });
        
        // Create choice buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rps_rock_${gameData.gameId}`)
                    .setLabel('Rock')
                    .setEmoji('🪨')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`rps_paper_${gameData.gameId}`)
                    .setLabel('Paper')
                    .setEmoji('📝')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`rps_scissors_${gameData.gameId}`)
                    .setLabel('Scissors')
                    .setEmoji('✂️')
                    .setStyle(ButtonStyle.Primary)
            );
        
        // Send game message
        const reply = await interaction.reply({
            content: `${opponent}, you have been challenged to a game of Rock Paper Scissors by ${interaction.user}!`,
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
        
        // Store game data in client
        if (!client.rpsGames) client.rpsGames = new Map();
        client.rpsGames.set(gameData.gameId, gameData);
        
        // Create collector for game interactions
        const collector = reply.createMessageComponentCollector({ 
            filter: i => i.customId.includes(`rps_`) && i.customId.endsWith(gameData.gameId),
            idle: 60000 // 1 minute
        });
        
        collector.on('collect', async i => {
            const currentGame = client.rpsGames.get(gameData.gameId);
            if (!currentGame) return;
            
            // Check if player is in the game
            if (!currentGame.players.includes(i.user.id)) {
                return i.reply({
                    content: "You are not part of this game!",
                    ephemeral: true
                });
            }
            
            // Check if player already made a choice this round
            if (currentGame.choices[i.user.id]) {
                return i.reply({
                    content: "You already made your choice for this round!",
                    ephemeral: true
                });
            }
            
            // Extract choice from button ID
            const choice = i.customId.split('_')[1]; // rock, paper, or scissors
            
            // Store player's choice
            currentGame.choices[i.user.id] = choice;
            
            // Acknowledge the choice
            await i.reply({
                content: `You chose ${choice}!`,
                ephemeral: true
            });
            
            // Check if both players have made their choices
            if (Object.keys(currentGame.choices).length === 2) {
                const player1 = currentGame.players[0];
                const player2 = currentGame.players[1];
                const choice1 = currentGame.choices[player1];
                const choice2 = currentGame.choices[player2];
                
                // Determine winner
                let roundResult;
                if (choice1 === choice2) {
                    roundResult = "It's a tie!";
                } else if (
                    (choice1 === 'rock' && choice2 === 'scissors') ||
                    (choice1 === 'paper' && choice2 === 'rock') ||
                    (choice1 === 'scissors' && choice2 === 'paper')
                ) {
                    roundResult = `<@${player1}> wins this round!`;
                    currentGame.scores[player1]++;
                } else {
                    roundResult = `<@${player2}> wins this round!`;
                    currentGame.scores[player2]++;
                }
                
                // Show round results
                const roundEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`✂️ Round ${currentGame.currentRound} Results`)
                    .setDescription(roundResult)
                    .addFields(
                        { name: `${client.users.cache.get(player1).username}'s choice`, value: choice1.charAt(0).toUpperCase() + choice1.slice(1), inline: true },
                        { name: `${client.users.cache.get(player2).username}'s choice`, value: choice2.charAt(0).toUpperCase() + choice2.slice(1), inline: true },
                        { name: 'Score', value: `<@${player1}>: ${currentGame.scores[player1]} | <@${player2}>: ${currentGame.scores[player2]}` }
                    )
                    .setFooter({ text: `Game ID: ${currentGame.gameId}` });
                
                await reply.edit({
                    content: `Round ${currentGame.currentRound} finished!`,
                    embeds: [roundEmbed],
                    components: []
                });
                
                // Check if game is over
                if (currentGame.currentRound >= currentGame.totalRounds) {
                    // Determine game winner
                    let gameWinner;
                    if (currentGame.scores[player1] > currentGame.scores[player2]) {
                        gameWinner = player1;
                    } else if (currentGame.scores[player2] > currentGame.scores[player1]) {
                        gameWinner = player2;
                    } else {
                        gameWinner = null; // Tie
                    }
                    
                    // Show final results
                    setTimeout(async () => {
                        const finalEmbed = new EmbedBuilder()
                            .setColor(gameWinner ? '#2ecc71' : '#e74c3c')
                            .setTitle('✂️ Rock Paper Scissors - Game Over')
                            .setDescription(gameWinner 
                                ? `🏆 <@${gameWinner}> wins the game!` 
                                : "It's a tie! No winner.")
                            .addFields(
                                { name: 'Final Score', value: `<@${player1}>: ${currentGame.scores[player1]} | <@${player2}>: ${currentGame.scores[player2]}` }
                            )
                            .setFooter({ text: `Game ID: ${currentGame.gameId}` });
                        
                        await reply.edit({
                            content: 'Game over!',
                            embeds: [finalEmbed],
                            components: []
                        });
                        
                        // Clean up game data
                        client.rpsGames.delete(currentGame.gameId);
                    }, 3000);
                    
                    collector.stop();
                } else {
                    // Move to next round
                    setTimeout(async () => {
                        currentGame.currentRound++;
                        currentGame.choices = {};
                        
                        // Create new round embed
                        const newRoundEmbed = new EmbedBuilder()
                            .setColor('#3498db')
                            .setTitle('✂️ Rock Paper Scissors')
                            .setDescription(`**Round ${currentGame.currentRound} of ${currentGame.totalRounds}**\n\nBoth players: Make your selection using the buttons below.`)
                            .addFields(
                                { name: 'Score', value: `<@${player1}>: ${currentGame.scores[player1]} | <@${player2}>: ${currentGame.scores[player2]}` }
                            )
                            .setFooter({ text: `Game ID: ${currentGame.gameId}` });
                        
                        await reply.edit({
                            content: `Round ${currentGame.currentRound} started!`,
                            embeds: [newRoundEmbed],
                            components: [row]
                        });
                    }, 3000);
                }
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                // Game timed out
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('✂️ Rock Paper Scissors - Game Over')
                    .setDescription('The game has timed out due to inactivity.')
                    .setFooter({ text: `Game ID: ${gameData.gameId}` });
                
                interaction.editReply({
                    content: 'Game over! The game has timed out due to inactivity.',
                    embeds: [timeoutEmbed],
                    components: []
                }).catch(error => console.error('Error editing reply after game timeout:', error));
                
                // Clean up game data
                client.rpsGames.delete(gameData.gameId);
            }
        });
    },
};

// Handle game against bot
async function handleBotGame(interaction, rounds) {
    const gameData = {
        currentRound: 1,
        totalRounds: rounds,
        playerScore: 0,
        botScore: 0,
        gameId: Date.now().toString()
    };
    
    // Create embed
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('✂️ Rock Paper Scissors')
        .setDescription(`**Round ${gameData.currentRound} of ${gameData.totalRounds}**\n\nMake your selection using the buttons below.`)
        .addFields(
            { name: 'Score', value: `You: ${gameData.playerScore} | Bot: ${gameData.botScore}` }
        )
        .setFooter({ text: `Game ID: ${gameData.gameId}` });
    
    // Create choice buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`rps_rock_${gameData.gameId}`)
                .setLabel('Rock')
                .setEmoji('🪨')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`rps_paper_${gameData.gameId}`)
                .setLabel('Paper')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`rps_scissors_${gameData.gameId}`)
                .setLabel('Scissors')
                .setEmoji('✂️')
                .setStyle(ButtonStyle.Primary)
        );
    
    // Send game message
    const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
    });
    
    // Create collector for game interactions
    const collector = reply.createMessageComponentCollector({ 
        filter: i => i.customId.includes(`rps_`) && i.customId.endsWith(gameData.gameId) && i.user.id === interaction.user.id,
        idle: 60000 // 1 minute
    });
    
    collector.on('collect', async i => {
        // Extract choice from button ID
        const playerChoice = i.customId.split('_')[1]; // rock, paper, or scissors
        
        // Generate bot choice
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        // Determine winner
        let roundResult;
        if (playerChoice === botChoice) {
            roundResult = "It's a tie!";
        } else if (
            (playerChoice === 'rock' && botChoice === 'scissors') ||
            (playerChoice === 'paper' && botChoice === 'rock') ||
            (playerChoice === 'scissors' && botChoice === 'paper')
        ) {
            roundResult = `You win this round!`;
            gameData.playerScore++;
        } else {
            roundResult = `Bot wins this round!`;
            gameData.botScore++;
        }
        
        // Show round results
        const roundEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(`✂️ Round ${gameData.currentRound} Results`)
            .setDescription(roundResult)
            .addFields(
                { name: 'Your choice', value: playerChoice.charAt(0).toUpperCase() + playerChoice.slice(1), inline: true },
                { name: 'Bot\'s choice', value: botChoice.charAt(0).toUpperCase() + botChoice.slice(1), inline: true },
                { name: 'Score', value: `You: ${gameData.playerScore} | Bot: ${gameData.botScore}` }
            )
            .setFooter({ text: `Game ID: ${gameData.gameId}` });
        
        await i.update({
            content: `Round ${gameData.currentRound} finished!`,
            embeds: [roundEmbed],
            components: []
        });
        
        // Check if game is over
        if (gameData.currentRound >= gameData.totalRounds) {
            // Determine game winner
            let gameWinner;
            if (gameData.playerScore > gameData.botScore) {
                gameWinner = 'player';
            } else if (gameData.botScore > gameData.playerScore) {
                gameWinner = 'bot';
            } else {
                gameWinner = null; // Tie
            }
            
            // Show final results
            setTimeout(async () => {
                const finalEmbed = new EmbedBuilder()
                    .setColor(gameWinner === 'player' ? '#2ecc71' : (gameWinner === 'bot' ? '#e74c3c' : '#3498db'))
                    .setTitle('✂️ Rock Paper Scissors - Game Over')
                    .setDescription(gameWinner === 'player' 
                        ? `🏆 You win the game!` 
                        : (gameWinner === 'bot' 
                            ? `Bot wins the game!` 
                            : "It's a tie! No winner."))
                    .addFields(
                        { name: 'Final Score', value: `You: ${gameData.playerScore} | Bot: ${gameData.botScore}` }
                    )
                    .setFooter({ text: `Game ID: ${gameData.gameId}` });
                
                await reply.edit({
                    content: 'Game over!',
                    embeds: [finalEmbed],
                    components: []
                });
            }, 3000);
            
            collector.stop();
        } else {
            // Move to next round
            setTimeout(async () => {
                gameData.currentRound++;
                
                // Create new round embed
                const newRoundEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('✂️ Rock Paper Scissors')
                    .setDescription(`**Round ${gameData.currentRound} of ${gameData.totalRounds}**\n\nMake your selection using the buttons below.`)
                    .addFields(
                        { name: 'Score', value: `You: ${gameData.playerScore} | Bot: ${gameData.botScore}` }
                    )
                    .setFooter({ text: `Game ID: ${gameData.gameId}` });
                
                await reply.edit({
                    content: `Round ${gameData.currentRound} started!`,
                    embeds: [newRoundEmbed],
                    components: [row]
                });
            }, 3000);
        }
    });
    
    collector.on('end', collected => {
        if (collected.size === 0) {
            // Game timed out
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('✂️ Rock Paper Scissors - Game Over')
                .setDescription('The game has timed out due to inactivity.')
                .setFooter({ text: `Game ID: ${gameData.gameId}` });
            
            interaction.editReply({
                content: 'Game over! The game has timed out due to inactivity.',
                embeds: [timeoutEmbed],
                components: []
            }).catch(error => console.error('Error editing reply after game timeout:', error));
        }
    });
} 