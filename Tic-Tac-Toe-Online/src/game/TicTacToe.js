/**
 * The universal Tic-Tac-Toe game engine class.
 * It holds the core logic and state, and knows nothing about
 * Firebase, React, or the DOM. It now supports a dynamic board size.
 */
export class TicTacToe {
  /**
   * @param {number} size - The dimension of the board (e.g., 3 for a 3x3 board).
   */
  constructor(size = 3) {
    this.size = size;
    this.winningLines = [];
    this.reset();
  }

  /**
   * Resets the game to its initial state and generates winning conditions.
   */
  reset() {
    this.state = {
      board: Array(this.size * this.size).fill(null),
      currentPlayer: 'X',
      winner: null,
      isGameOver: false,
      isDraw: false,
      size: this.size,
    };
    this.#generateWinningLines();
  }

  /**
   * Hydrates the class instance with a state object from an external source (like Firebase).
   * Note: The size of the hydrated board must match the instance's size.
   * @param {object} stateObject - The game state to load.
   */
  hydrate(stateObject) {
    // Ensure the size is consistent.
    if (stateObject.size && stateObject.size !== this.size) {
        console.error("Hydration failed: Board size mismatch.");
        return;
    }
    this.state = { ...this.state, ...stateObject };
  }

  /**
   * Returns a clean copy of the current game state.
   * @returns {object} The current state of the game.
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Attempts to make a move. This is the core logic method.
   * @param {number} row - The row index (0 to size-1).
   * @param {number} col - The column index (0 to size-1).
   * @returns {boolean} True if the move was successful, false otherwise.
   */
  makeMove(row, col) {
    const index = row * this.size + col;
    
    if (this.state.isGameOver || this.state.board[index] !== null) {
      return false; // Invalid move
    }

    this.state.board[index] = this.state.currentPlayer;

    const winner = this.#checkForWin();
    if (winner) {
      this.state.winner = winner;
      this.state.isGameOver = true;
    } else if (this.#isBoardFull()) {
      this.state.isDraw = true;
      this.state.isGameOver = true;
    } else {
      this.#switchPlayer();
    }
    return true;
  }
  
  // --- Private Helper Methods ---

  #switchPlayer() {
    this.state.currentPlayer = this.state.currentPlayer === 'X' ? 'O' : 'X';
  }

  #isBoardFull() {
    return this.state.board.every(cell => cell !== null);
  }

  /**
   * Dynamically generates all possible winning lines (rows, columns, diagonals)
   * based on the board size and caches them.
   */
  #generateWinningLines() {
    this.winningLines = [];
    // Rows
    for (let i = 0; i < this.size; i++) {
        const row = [];
        for (let j = 0; j < this.size; j++) {
            row.push(i * this.size + j);
        }
        this.winningLines.push(row);
    }
    // Columns
    for (let i = 0; i < this.size; i++) {
        const col = [];
        for (let j = 0; j < this.size; j++) {
            col.push(j * this.size + i);
        }
        this.winningLines.push(col);
    }
    // Diagonals
    const diag1 = [];
    const diag2 = [];
    for (let i = 0; i < this.size; i++) {
        diag1.push(i * this.size + i);
        diag2.push(i * this.size + (this.size - 1 - i));
    }
    this.winningLines.push(diag1);
    this.winningLines.push(diag2);
  }

  /**
   * Checks for a winner by iterating through the pre-calculated winning lines.
   * @returns {string|null} The winner ('X' or 'O') or null if no winner.
   */
  #checkForWin() {
    for (const line of this.winningLines) {
      const firstCell = this.state.board[line[0]];
      if (firstCell && line.every(index => this.state.board[index] === firstCell)) {
        return firstCell; // Return the winning player ('X' or 'O')
      }
    }
    return null;
  }
}

