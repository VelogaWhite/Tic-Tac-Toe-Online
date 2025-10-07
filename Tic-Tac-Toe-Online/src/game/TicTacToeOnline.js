import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { TicTacToe } from './TicTacToe.js';

export class TicTacToeOnline extends TicTacToe {
    constructor(db, gameId, userId) {
        // Call the parent constructor to set up the basic game engine.
        super();
        
        this.db = db;
        this.gameId = gameId;
        this.userId = userId;
        this.gameRef = doc(db, 'games', gameId);
    }

    /**
     * Updates the internal state of this class instance from a Firebase data object.
     * This method is called by the listener.
     */
    syncStateFromFirebase(firebaseData) {
        if (!firebaseData) return;
        
        this.board = firebaseData.board;
        this.currentPlayer = firebaseData.currentPlayer;
        this.winner = firebaseData.winner;
        this.isGameOver = firebaseData.isGameOver;
        this.isDraw = firebaseData.isDraw;
        this.size = firebaseData.size;
        // Also sync player and status info for the UI
        this.playerX = firebaseData.playerX;
        this.playerO = firebaseData.playerO;
        this.status = firebaseData.status;
    }

    /**
     * Sets up the real-time listener.
     * @param {function} onUpdateCallback - A function to call when the game state changes,
     * which will trigger a UI re-render in React.
     */
    listenForUpdates(onUpdateCallback) {
        const unsubscribe = onSnapshot(this.gameRef, (doc) => {
            const gameData = doc.data();
            this.syncStateFromFirebase(gameData);
            
            if (onUpdateCallback) {
                onUpdateCallback(this); // Pass the updated instance itself.
            }
        });
        return unsubscribe; // Return the cleanup function.
    }

    /**
     * Sends the user's "move intent" to Firestore, letting the Cloud Function do the rest.
     */
    async makeMove(row, col) {
        // Perform a quick client-side check for immediate feedback.
        const index = row * this.size + col;
        if (this.isGameOver || this.board[index] !== null) {
            console.log("Invalid move (client-side check).");
            return false;
        }
        
        const moveIntent = {
            userId: this.userId,
            position: { row, col }
        };

        try {
            await updateDoc(this.gameRef, { lastMoveIntent: moveIntent });
            return true;
        } catch (error) {
            console.error("Error signaling move:", error);
            return false;
        }
    }

    // Override the base getState to include online-specific properties
    getState() {
        const baseState = super.getState();
        return {
            ...baseState,
            playerX: this.playerX,
            playerO: this.playerO,
            status: this.status
        };
    }
}

