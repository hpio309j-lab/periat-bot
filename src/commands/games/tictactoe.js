const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Play a game of Tic Tac Toe')
        .addUserOption(option => 
            option.setName('opponent')
                .setDescription('Select an opponent to play against')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const opponent = interaction.options.getUser('opponent');
        
        // Check if opponent is the bot or self
        if (opponent.id === client.user.id) {
            return interaction.reply({
                content: "I can't play Tic Tac Toe yet! Please choose another player.",
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
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ],
            gameId: Date.now().toString()
        };
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🎮 Tic Tac Toe')
            .setDescription(`It's <@${gameData.players[gameData.currentTurn]}>'s turn!`)
            .addFields(
                { name: 'Player 1 (X)', value: `<@${interaction.user.id}>` },
                { name: 'Player 2 (O)', value: `<@${opponent.id}>` }
            )
            .setFooter({ text: `Game ID: ${gameData.gameId}` });
        
        // Create board buttons
        const components = createGameBoard(gameData);
        
        // Send game message
        const reply = await interaction.reply({
            content: `<@${opponent.id}>, you have been challenged to a game of Tic Tac Toe by <@${interaction.user.id}>!`,
            embeds: [embed],
            components,
            fetchReply: true
        });
        
        // Create collector for game interactions
        const collector = reply.createMessageComponentCollector({ 
            idle: 300000 // 5 minutes
        });
        
        collector.on('collect', async i => {
            // Extract row and column from button ID
            const [action, row, col] = i.customId.split('_');
            
            // Check if it's a game button
            if (action !== 'ttt') return;
            
            // Check if it's the player's turn
            if (i.user.id !== gameData.players[gameData.currentTurn]) {
                return i.reply({
                    content: "It's not your turn!",
                    ephemeral: true
                });
            }
            
            // Check if cell is already occupied
            if (gameData.board[row][col] !== null) {
                return i.reply({
                    content: "That cell is already occupied!",
                    ephemeral: true
                });
            }
            
            // Update game board
            gameData.board[row][col] = gameData.currentTurn === 0 ? 'X' : 'O';
            
            // Check for winner
            const winner = checkWinner(gameData.board);
            
            if (winner) {
                // Game over with a winner
                const winnerPlayer = winner === 'X' ? gameData.players[0] : gameData.players[1];
                
                const endEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🎮 Tic Tac Toe - Game Over')
                    .setDescription(`<@${winnerPlayer}> has won the game!`)
                    .addFields(
                        { name: 'Player 1 (X)', value: `<@${gameData.players[0]}>` },
                        { name: 'Player 2 (O)', value: `<@${gameData.players[1]}>` }
                    )
                    .setFooter({ text: `Game ID: ${gameData.gameId}` });
                
                await i.update({
                    content: `Game over! <@${winnerPlayer}> has won!`,
                    embeds: [endEmbed],
                    components: createGameBoard(gameData, true)
                });
                
                collector.stop();
                return;
            } else if (isBoardFull(gameData.board)) {
                // Game over with a tie
                const endEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🎮 Tic Tac Toe - Game Over')
                    .setDescription('The game ended in a tie!')
                    .addFields(
                        { name: 'Player 1 (X)', value: `<@${gameData.players[0]}>` },
                        { name: 'Player 2 (O)', value: `<@${gameData.players[1]}>` }
                    )
                    .setFooter({ text: `Game ID: ${gameData.gameId}` });
                
                await i.update({
                    content: 'Game over! It\'s a tie!',
                    embeds: [endEmbed],
                    components: createGameBoard(gameData, true)
                });
                
                collector.stop();
                return;
            }
            
            // Switch turns
            gameData.currentTurn = gameData.currentTurn === 0 ? 1 : 0;
            
            // Update game message
            const updatedEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🎮 Tic Tac Toe')
                .setDescription(`It's <@${gameData.players[gameData.currentTurn]}>'s turn!`)
                .addFields(
                    { name: 'Player 1 (X)', value: `<@${gameData.players[0]}>` },
                    { name: 'Player 2 (O)', value: `<@${gameData.players[1]}>` }
                )
                .setFooter({ text: `Game ID: ${gameData.gameId}` });
            
            await i.update({
                content: `<@${opponent.id}>, you are playing Tic Tac Toe with <@${interaction.user.id}>!`,
                embeds: [updatedEmbed],
                components: createGameBoard(gameData)
            });
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                // Game timed out
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🎮 Tic Tac Toe - Game Over')
                    .setDescription('The game has timed out due to inactivity.')
                    .addFields(
                        { name: 'Player 1 (X)', value: `<@${gameData.players[0]}>` },
                        { name: 'Player 2 (O)', value: `<@${gameData.players[1]}>` }
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

// Function to create the game board
function createGameBoard(gameData, gameOver = false) {
    const rows = [];
    
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        
        for (let j = 0; j < 3; j++) {
            const cell = gameData.board[i][j];
            
            // Determine button style and emoji
            let style = ButtonStyle.Secondary;
            let emoji = null;
            let label = '⠀'; // Using Braille Pattern Blank (invisible space that meets Discord's requirements)
            let disabled = gameOver;
            
            if (cell === 'X') {
                style = ButtonStyle.Danger;
                label = 'X';
                disabled = true;
            } else if (cell === 'O') {
                style = ButtonStyle.Success;
                label = 'O';
                disabled = true;
            }
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${i}_${j}`)
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(disabled)
            );
        }
        
        rows.push(row);
    }
    
    return rows;
}

// Function to check for a winner
function checkWinner(board) {
    // Check rows
    for (let row = 0; row < 3; row++) {
        if (board[row][0] && board[row][0] === board[row][1] && board[row][0] === board[row][2]) {
            return board[row][0];
        }
    }
    
    // Check columns
    for (let col = 0; col < 3; col++) {
        if (board[0][col] && board[0][col] === board[1][col] && board[0][col] === board[2][col]) {
            return board[0][col];
        }
    }
    
    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
        return board[0][0];
    }
    
    if (board[0][2] && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
        return board[0][2];
    }
    
    return null;
}

// Function to check if the board is full
function isBoardFull(board) {
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] === null) {
                return false;
            }
        }
    }
    
    return true;
} 