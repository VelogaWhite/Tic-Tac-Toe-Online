const functions = require("firebase-functions");
const admin = require("firebase-admin");

// IMPORTANT: You must copy the new `TicTacToe.js` file into this `functions`
// directory for this code to work. This ensures the server and client
// use the exact same game rules.
const { TicTacToe } = require("./TicTacToe.js");

admin.initializeApp();
const db = admin.firestore();

/**
 * Creates a new game document in Firestore.
 */
exports.createGame = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to create a game.');
  }

  // Use our universal class to get a fresh, reliable game state.
  const gameEngine = new TicTacToe();
  const initialState = gameEngine.getState();

  // Add player and server timestamp information.
  const gameData = {
    ...initialState,
    playerX: context.auth.uid,
    playerO: null,
    status: "waiting", // Overwrite initial status
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const gameRef = await db.collection("games").add(gameData);
  return { gameId: gameRef.id };
});

/**
 * Allows a second player to join an existing game.
 */
exports.joinGame = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to join a game.');
  }

  const { gameId } = data;
  const userId = context.auth.uid;

  const gameRef = db.collection("games").doc(gameId);
  const gameDoc = await gameRef.get();

  if (!gameDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Game not found.");
  }

  const gameData = gameDoc.data();
  if (gameData.playerX === userId) {
    throw new functions.https.HttpsError("failed-precondition", "You can't join your own game.");
  }
  if (gameData.playerO !== null) {
    throw new functions.https.HttpsError("failed-precondition", "This game is already full.");
  }

  // The game is now active.
  await gameRef.update({
    playerO: userId,
    status: "active",
  });

  return { status: "success" };
});


/**
 * The new "Referee" function. It's a trigger that runs whenever a game
 * document is updated, validating the `lastMoveIntent`.
 */
exports.processMoveIntent = functions.firestore
  .document("games/{gameId}")
  .onUpdate(async (change, context) => {
    const beforeState = change.before.data();
    const afterState = change.after.data();

    // Check if a new move intent was just submitted.
    if (!afterState.lastMoveIntent || afterState.lastMoveIntent === beforeState.lastMoveIntent) {
      return null; // No new move to process.
    }

    const { userId, position } = afterState.lastMoveIntent;
    const { row, col } = position;
    
    // --- SERVER-SIDE VALIDATION ---
    // Create a game instance based on the LAST known official state.
    const game = new TicTacToe();
    game.hydrate(beforeState); // Use a helper to load state into the class

    // Check if the correct user is making a move.
    const expectedPlayerId = game.currentPlayer === 'X' ? game.state.playerX : game.state.playerO;
    if (userId !== expectedPlayerId) {
       console.error("Validation failed: User played out of turn.");
       return null;
    }

    // --- EXECUTE THE MOVE USING THE TRUSTED GAME ENGINE ---
    const wasMoveSuccessful = game.makeMove(row, col);

    if (wasMoveSuccessful) {
      // Get the new, authoritative state from our trusted class.
      const newAuthoritativeState = game.getState();

      // If the game just ended, update the status.
      if (newAuthoritativeState.isGameOver) {
          newAuthoritativeState.status = "finished";
      }

      // Write the official new state back to the database.
      return change.after.ref.update({
        ...newAuthoritativeState,
        lastMoveIntent: null // Clear the intent after processing.
      });
    } else {
      console.error("Validation failed: Invalid move attempted.");
      // Optional: Revert the change if needed, but clearing the intent is often enough.
      return change.after.ref.update({ lastMoveIntent: null });
    }
  });


/**
 * Resets a finished game. Only the host (Player X) can do this.
 */
exports.resetGame = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { gameId } = data;
    const userId = context.auth.uid;
    const gameRef = db.collection("games").doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Game not found.");
    }
    if (gameDoc.data().playerX !== userId) {
        throw new functions.https.HttpsError("permission-denied", "Only the host can reset the game.");
    }

    // Use the class to get a clean state.
    const game = new TicTacToe();
    const freshState = game.getState();

    await gameRef.update({
        ...freshState,
        status: 'active', // Set status back to active
    });

    return { status: "success" };
});
