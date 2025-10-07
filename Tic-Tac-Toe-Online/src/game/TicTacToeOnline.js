import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { TicTacToe } from './TicTacToe.js';

export class TicTacToeOnline extends TicTacToe {
    constructor(db, gameId, userId) {
        super(); // Let the base class initialize first
        this.db = db;
        this.gameId = gameId;
        this.userId = userId;
        this.gameRef = doc(db, 'games', gameId);
        this.state = null; // To hold the synchronized state from Firebase
    }

    /**
     * Sets up a real-time listener to sync the local class state
     * with the state from the Firestore database.
     * @param {function} onUpdateCallback - A function to call when the state changes.
     * @returns {Function} An unsubscribe function to stop the listener.
     */
    listenForUpdates(onUpdateCallback) {
        return onSnapshot(this.gameRef, (doc) => {
            const gameData = doc.data();
            if (gameData) {
                // Sync the internal state of this class instance with Firebase
                this.state = gameData;
                // Also update the base class properties for any internal checks
                this.board = gameData.board;
                this.currentPlayer = gameData.currentPlayer;
                this.winner = gameData.winner;
                this.isGameOver = gameData.isGameOver;
                this.isDraw = gameData.isDraw;
                this.size = gameData.size;

                if (onUpdateCallback) {
                    onUpdateCallback(this);
                }
            }
        });
    }

    /**
     * Signals a move intent to the Firestore database.
     * The actual game logic is handled by a secure Cloud Function.
     * @param {number} row - The row of the move.
     * @param {number} col - The column of the move.
     * @returns {Promise<boolean>} True if the intent was sent, false otherwise.
     */
    async makeMove(row, col) {
        if (!this.state || this.state.isGameOver) return false;
        
        const index = row * this.state.size + col;
        if (this.state.board[index] !== null) return false;

        const moveIntent = {
            userId: this.userId,
            position: { row, col }
        };

        try {
            await updateDoc(this.gameRef, { lastMoveIntent: moveIntent });
            return true;
        } catch (error) {
            console.error("Error sending move intent:", error);
            return false;
        }
    }
}

