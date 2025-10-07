const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { TicTacToe } = require("./TicTacToe.js");

admin.initializeApp();
const db = admin.firestore();

/**
 * Creates a new game document in Firestore.
 */
exports.createGame = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to create a game.');
    }
    const userId = request.auth.uid;
    const gameSize = request.data.size || 3;

    const game = new TicTacToe(gameSize);
    const initialGameState = game.getState();

    const gameRef = await db.collection("games").add({
        ...initialGameState,
        playerX: userId,
        playerO: null,
        status: "waiting",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { gameId: gameRef.id };
});

/**
 * Allows a second player to join an existing game.
 */
exports.joinGame = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to join a game.');
    }
    const userId = request.auth.uid;
    const { gameId } = request.data;
    const gameRef = db.collection("games").doc(gameId);

    return db.runTransaction(async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists) {
            throw new HttpsError("not-found", "Game not found.");
        }
        const gameState = gameDoc.data();
        if (gameState.playerO !== null && gameState.playerO !== userId) {
            throw new HttpsError("permission-denied", "Game is already full.");
        }
        if (gameState.playerX === userId) {
            throw new HttpsError("permission-denied", "You cannot join your own game.");
        }

        transaction.update(gameRef, {
            playerO: userId,
            status: "active"
        });
        return { status: "success" };
    });
});

/**
 * Processes a player's move intent. This is the server-side referee.
 */
exports.processMove = onDocumentUpdated("games/{gameId}", async (event) => {
    const beforeState = event.data.before.data();
    const afterState = event.data.after.data();
    
    // Improved check: Only proceed if a new move intent has been submitted.
    if (!afterState.lastMoveIntent || JSON.stringify(beforeState.lastMoveIntent) === JSON.stringify(afterState.lastMoveIntent)) {
        return null;
    }
    
    const { userId, position } = afterState.lastMoveIntent;
    const gameId = event.params.gameId;
    const gameRef = db.collection("games").doc(gameId);

    const expectedPlayerMark = beforeState.currentPlayer;
    const expectedPlayerId = (expectedPlayerMark === 'X') ? beforeState.playerX : beforeState.playerO;

    // --- DEBUG LOGGING ---
    console.log(`[GAME ${gameId}] Move received from User: ${userId}`);
    console.log(`[GAME ${gameId}] Expected Player ID: ${expectedPlayerId} (Player ${expectedPlayerMark})`);

    if (beforeState.isGameOver || userId !== expectedPlayerId) {
        console.error(`[GAME ${gameId}] INVALID MOVE! Reason: isGameOver=${beforeState.isGameOver}, userIdMatch=${userId === expectedPlayerId}. Rejecting move.`);
        // Revert the intent to prevent re-triggering, but the move fails.
        return gameRef.update({ lastMoveIntent: beforeState.lastMoveIntent || null });
    }

    const game = new TicTacToe(beforeState.size);
    game.board = beforeState.board;
    game.currentPlayer = beforeState.currentPlayer;

    // Check if the cell is already taken (server-side)
    const index = position.row * game.size + position.col;
    if (game.board[index] !== null) {
        console.error(`[GAME ${gameId}] INVALID MOVE! Reason: Cell (${position.row}, ${position.col}) is already taken. Rejecting move.`);
        return gameRef.update({ lastMoveIntent: beforeState.lastMoveIntent || null });
    }

    console.log(`[GAME ${gameId}] Move is valid. Processing...`);
    game.makeMove(position.row, position.col);

    const newAuthoritativeState = game.getState();
    const finalStatus = newAuthoritativeState.isGameOver ? "finished" : "active";

    return gameRef.update({
        ...newAuthoritativeState,
        status: finalStatus,
        lastMoveIntent: null
    });
});


/**
 * Resets a finished game.
 */
exports.resetGame = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to reset a game.');
    }
    const userId = request.auth.uid;
    const { gameId } = request.data;
    const gameRef = db.collection("games").doc(gameId);
    
    const gameDoc = await gameRef.get();
    if (!gameDoc.exists) {
        throw new HttpsError("not-found", "Game not found.");
    }
    const gameState = gameDoc.data();

    if (gameState.playerX !== userId) {
         throw new HttpsError("permission-denied", "Only the host (Player X) can reset the game.");
    }

    const game = new TicTacToe(gameState.size);
    const resetState = game.getState();

    return gameRef.update({
        ...resetState,
        status: "active"
    });
});

