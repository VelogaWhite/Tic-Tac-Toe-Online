
class TicTacToe {
    constructor(size = 3) {
        this.size = size;
        this.reset();
    }

    reset() {
        this.board = Array(this.size * this.size).fill(null);
        this.currentPlayer = 'X';
        this.winner = null;
        this.isGameOver = false;
        this.isDraw = false;
    }

    makeMove(row, col) {
        const index = row * this.size + col;
        if (this.isGameOver || this.board[index] !== null) {
            return false;
        }

        this.board[index] = this.currentPlayer;

        if (this.#checkForWin()) {
            this.winner = this.currentPlayer;
            this.isGameOver = true;
        } else if (this.#isBoardFull()) {
            this.isDraw = true;
            this.isGameOver = true;
        } else {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        }
        return true;
    }

    getState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            winner: this.winner,
            isGameOver: this.isGameOver,
            isDraw: this.isDraw,
            size: this.size,
        };
    }

    #isBoardFull() {
        return this.board.every(cell => cell !== null);
    }

    #checkForWin() {
        const p = this.currentPlayer;
        const size = this.size;

        for (let r = 0; r < size; r++) {
            let rowWin = true;
            for (let c = 0; c < size; c++) {
                if (this.board[r * size + c] !== p) {
                    rowWin = false;
                    break;
                }
            }
            if (rowWin) return true;
        }

        for (let c = 0; c < size; c++) {
            let colWin = true;
            for (let r = 0; r < size; r++) {
                if (this.board[r * size + c] !== p) {
                    colWin = false;
                    break;
                }
            }
            if (colWin) return true;
        }

        let diag1Win = true;
        for (let i = 0; i < size; i++) {
            if (this.board[i * size + i] !== p) {
                diag1Win = false;
                break;
            }
        }
        if (diag1Win) return true;

        let diag2Win = true;
        for (let i = 0; i < size; i++) {
            if (this.board[i * size + (size - 1 - i)] !== p) {
                diag2Win = false;
                break;
            }
        }
        if (diag2Win) return true;

        return false;
    }
}

// Export the class for use in index.js
module.exports = { TicTacToe };
