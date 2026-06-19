const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('connect4')
        .setDescription('Play a game of Connect 4')
        .addUserOption(option => 
            option.setName('opponent')
                .setDescription('Select an opponent to play against')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const opponent = interaction.options.getUser('opponent');
        
        // Check if opponent is the bot or self
        if (opponent.id === client.user.id) {
            return interaction.reply({
                content: "I can't play Connect 4 yet! Please choose another player.",
                ephemeral: true
            });
        }
        
        if (opponent.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't play against yourself!",
                ephemeral: true
            });
        }
        
        // Check if opponent is a bot
        if (opponent.bot) {
            return interaction.reply({
                content: "You can't play against a bot!",
                ephemeral: true
            });
        }
        
        // Initialize game data
        const gameData = {
            players: [interaction.user.id, opponent.id],
            currentTurn: 0, // Index in players array
            board: [
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null]
            ],
            gameId: Date.now().toString(),
            colors: ['🔴', '🟡']
        };
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🎮 Connect 4')
            .setDescription(`It's ${gameData.colors[gameData.currentTurn]} <@${gameData.players[gameData.currentTurn]}>'s turn!`)
            .addFields(
                { name: 'Player 1 (🔴)', value: `<@${interaction.user.id}>` },
                { name: 'Player 2 (🟡)', value: `<@${opponent.id}>` }
            )
            .setFooter({ text: `Game ID: ${gameData.gameId}` });
        
        // Create board message
        const boardMsg = createBoardMessage(gameData);
        embed.setDescription(`${boardMsg}\n\nIt's ${gameData.colors[gameData.currentTurn]} <@${gameData.players[gameData.currentTurn]}>'s turn!`);
        
        // Create column selection buttons
        const components = createColumnButtons(gameData);
        
        // Send game message
        const reply = await interaction.reply({
            content: `<@${opponent.id}>, you have been challenged to a game of Connect 4 by <@${interaction.user.id}>!`,
            embeds: [embed],
            components,
            fetchReply: true
        });
        
        // Create collector for game interactions
        const collector = reply.createMessageComponentCollector({ 
            idle: 300000 // 5 minutes
        });
        
        collector.on('collect', async i => {
            // Extract column from button ID
            const column = parseInt(i.customId.split('_')[1]);
            
            // Check if it's a game button
            if (isNaN(column)) return;
            
            // Check if it's the player's turn
            if (i.user.id !== gameData.players[gameData.currentTurn]) {
                return i.reply({
                    content: "It's not your turn!",
                    ephemeral: true
                });
            }
            
            // Find the first available row in the selected column
            const row = findAvailableRow(gameData.board, column);
            
            // Check if column is full
            if (row === -1) {
                return i.reply({
                    content: "That column is full! Choose another one.",
                    ephemeral: true
                });
            }
            
            // Update game board
            gameData.board[row][column] = gameData.currentTurn;
            
            // Check for winner
            const winner = checkWinner(gameData.board, row, column, gameData.currentTurn);
            
            if (winner) {
                // Game over with a winner
                const winnerPlayer = gameData.players[gameData.currentTurn];
                const winnerEmoji = gameData.colors[gameData.currentTurn];
                
                const boardMsg = createBoardMessage(gameData);
                
                const endEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🎮 Connect 4 - Game Over')
                    .setDescription(`${boardMsg}\n\n${winnerEmoji} <@${winnerPlayer}> has won the game!`)
                    .addFields(
                        { name: 'Player 1 (🔴)', value: `<@${gameData.players[0]}>` },
                        { name: 'Player 2 (🟡)', value: `<@${gameData.players[1]}>` }
                    )
                    .setFooter({ text: `Game ID: ${gameData.gameId}` });
                
                await i.update({
                    content: `Game over! ${winnerEmoji} <@${winnerPlayer}> has won!`,
                    embeds: [endEmbed],
                    components: []
                });
                
                collector.stop();
                return;
            } else if (isBoardFull(gameData.board)) {
                // Game over with a tie
                const boardMsg = createBoardMessage(gameData);
                
                const endEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🎮 Connect 4 - Game Over')
                    .setDescription(`${boardMsg}\n\nThe game ended in a tie!`)
                    .addFields(
                        { name: 'Player 1 (🔴)', value: `<@${gameData.players[0]}>` },
                        { name: 'Player 2 (🟡)', value: `<@${gameData.players[1]}>` }
                    )
                    .setFooter({ text: `Game ID: ${gameData.gameId}` });
                
                await i.update({
                    content: 'Game over! It\'s a tie!',
                    embeds: [endEmbed],
                    components: []
                });
                
                collector.stop();
                return;
            }
            
            // Switch turns
            gameData.currentTurn = gameData.currentTurn === 0 ? 1 : 0;
            
            // Update board message
            const boardMsg = createBoardMessage(gameData);
            
            // Update game message
            const updatedEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🎮 Connect 4')
                .setDescription(`${boardMsg}\n\nIt's ${gameData.colors[gameData.currentTurn]} <@${gameData.players[gameData.currentTurn]}>'s turn!`)
                .addFields(
                    { name: 'Player 1 (🔴)', value: `<@${gameData.players[0]}>` },
                    { name: 'Player 2 (🟡)', value: `<@${gameData.players[1]}>` }
                )
                .setFooter({ text: `Game ID: ${gameData.gameId}` });
            
            // Update column buttons - disable full columns
            const updatedComponents = createColumnButtons(gameData);
            
            await i.update({
                content: `<@${opponent.id}>, you are playing Connect 4 with <@${interaction.user.id}>!`,
                embeds: [updatedEmbed],
                components: updatedComponents
            });
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                // Game timed out
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🎮 Connect 4 - Game Over')
                    .setDescription('The game has timed out due to inactivity.')
                    .addFields(
                        { name: 'Player 1 (🔴)', value: `<@${gameData.players[0]}>` },
                        { name: 'Player 2 (🟡)', value: `<@${gameData.players[1]}>` }
                    )
                    .setFooter({ text: `Game ID: ${gameData.gameId}` });
                
                interaction.editReply({
                    content: 'Game over! The game has timed out due to inactivity.',
                    embeds: [timeoutEmbed],
                    components: []
                }).catch(error => console.error('Error editing reply after game timeout:', error));
            }
        });
    },
};

// Function to create the board message
function createBoardMessage(gameData) {
    let boardMsg = '';
    
    // Column numbers
    boardMsg += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣\n';
    
    // Board
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            const cell = gameData.board[row][col];
            
            if (cell === null) {
                boardMsg += '⚪';
            } else if (cell === 0) {
                boardMsg += '🔴';
            } else {
                boardMsg += '🟡';
            }
        }
        boardMsg += '\n';
    }
    
    return boardMsg;
}

// Function to create column buttons
function createColumnButtons(gameData) {
    const rows = [];
    const row = new ActionRowBuilder();
    
    for (let col = 0; col < 7; col++) {
        // Check if column is full
        const isColumnFull = isColumnFullCheck(gameData.board, col);
        
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`col_${col}`)
                .setLabel(`${col + 1}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(isColumnFull)
        );
    }
    
    rows.push(row);
    return rows;
}

// Function to find available row in a column
function findAvailableRow(board, column) {
    for (let row = 5; row >= 0; row--) {
        if (board[row][column] === null) {
            return row;
        }
    }
    return -1; // Column is full
}

// Function to check if a column is full
function isColumnFullCheck(board, column) {
    return board[0][column] !== null;
}

// Function to check if board is full
function isBoardFull(board) {
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            if (board[row][col] === null) {
                return false;
            }
        }
    }
    return true;
}

// Function to check for a winner
function checkWinner(board, row, col, player) {
    // Check horizontal
    let count = 0;
    for (let c = 0; c < 7; c++) {
        if (board[row][c] === player) {
            count++;
            if (count === 4) return true;
        } else {
            count = 0;
        }
    }
    
    // Check vertical
    count = 0;
    for (let r = 0; r < 6; r++) {
        if (board[r][col] === player) {
            count++;
            if (count === 4) return true;
        } else {
            count = 0;
        }
    }
    
    // Check diagonal (top-left to bottom-right)
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            if (board[r][c] === player && 
                board[r+1][c+1] === player && 
                board[r+2][c+2] === player && 
                board[r+3][c+3] === player) {
                return true;
            }
        }
    }
    
    // Check diagonal (top-right to bottom-left)
    for (let r = 0; r < 3; r++) {
        for (let c = 3; c < 7; c++) {
            if (board[r][c] === player && 
                board[r+1][c-1] === player && 
                board[r+2][c-2] === player && 
                board[r+3][c-3] === player) {
                return true;
            }
        }
    }
    
    return false;
} 