import React from 'react';
import { httpsCallable } from 'firebase/functions';
import { TicTacToeOnline } from '../game/TicTacToeOnline';

export class Game extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            gameData: null,
        };
        this.gameInstance = null;
        this.canvasRef = React.createRef();
        this.canvasSize = 400;
        this.unsubscribeListener = null;
    }

    componentDidMount() {
        const { db, gameId, userId } = this.props;
        if (!db || !gameId || !userId) return;

        this.gameInstance = new TicTacToeOnline(db, gameId, userId);

        this.unsubscribeListener = this.gameInstance.listenForUpdates((updatedGameData) => {
            this.setState({ gameData: updatedGameData }, () => {
                this.drawCanvas();
            });
        });
    }

    componentWillUnmount() {
        if (this.unsubscribeListener) {
            this.unsubscribeListener();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.gameData !== prevState.gameData && this.canvasRef.current) {
            this.drawCanvas();
        }
    }

    drawCanvas = () => {
        if (!this.state.gameData) return;

        const { board, size } = this.state.gameData;
        const ctx = this.canvasRef.current.getContext('2d');
        const lineSpacing = this.canvasSize / size;

        ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 4;
        for (let i = 1; i < size; i++) {
            ctx.beginPath();
            ctx.moveTo(i * lineSpacing, 0); ctx.lineTo(i * lineSpacing, this.canvasSize); ctx.stroke();
            ctx.moveTo(0, i * lineSpacing); ctx.lineTo(this.canvasSize, i * lineSpacing); ctx.stroke();
        }

        board.forEach((mark, index) => {
            const row = Math.floor(index / size);
            const col = index % size;
            if (mark === 'X') this.drawX(ctx, row, col, lineSpacing);
            else if (mark === 'O') this.drawO(ctx, row, col, lineSpacing);
        });
    }

    drawX = (ctx, row, col, lineSpacing) => {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 8;
        const x = col * lineSpacing;
        const y = row * lineSpacing;
        const padding = lineSpacing / 5;
        ctx.beginPath();
        ctx.moveTo(x + padding, y + padding);
        ctx.lineTo(x + lineSpacing - padding, y + lineSpacing - padding);
        ctx.moveTo(x + lineSpacing - padding, y + padding);
        ctx.lineTo(x + padding, y + lineSpacing - padding);
        ctx.stroke();
    }

    drawO = (ctx, row, col, lineSpacing) => {
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 8;
        ctx.beginPath();
        const x = col * lineSpacing + lineSpacing / 2;
        const y = row * lineSpacing + lineSpacing / 2;
        ctx.arc(x, y, lineSpacing / 2.5, 0, 2 * Math.PI);
        ctx.stroke();
    }

    handleCanvasClick = async (event) => {
        if (!this.gameInstance || !this.state.gameData) return;
        const { gameData } = this.state;
        const { status, currentPlayer, playerX, playerO } = gameData;
        const isMyTurn = (currentPlayer === 'X' && playerX === this.props.userId) || (currentPlayer === 'O' && playerO === this.props.userId);
        
        if (status !== 'active' || !isMyTurn) {
            return;
        }

        const rect = this.canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const col = Math.floor(x / (this.canvasSize / gameData.size));
        const row = Math.floor(y / (this.canvasSize / gameData.size));
        
        const index = row * gameData.size + col;
        if (gameData.board[index] !== null) {
            return; // Don't do anything if the cell is already taken
        }

        // --- OPTIMISTIC UI UPDATE START ---
        // 1. Create a temporary copy of the current board.
        const optimisticBoard = [...gameData.board];
        
        // 2. Place the current player's mark on the copied board.
        optimisticBoard[index] = currentPlayer;

        // 3. Update the local state immediately with the new board.
        // This will trigger a re-render and draw the mark on the canvas instantly.
        this.setState({
            gameData: {
                ...gameData,
                board: optimisticBoard
            }
        });
        // --- OPTIMISTIC UI UPDATE END ---

        // 4. Now, send the move to the server in the background.
        // The user doesn't have to wait for this to complete.
        await this.gameInstance.makeMove(row, col);
    };

    handleResetGame = async () => {
        const { functions, gameId, setError, setNotification } = this.props;
        try {
            const resetGameFunc = httpsCallable(functions, 'resetGame');
            await resetGameFunc({ gameId });
            setNotification("Game has been reset!");
        } catch (err) {
            setError(err.message);
        }
    };
    
    render() {
        if (!this.state.gameData) {
            return <div className="text-sky-400 animate-pulse my-8">Syncing Game Data...</div>;
        }

        const { gameData } = this.state;
        const { gameId, userId, setNotification, handleLeaveGame } = this.props;
        const { status, playerX, playerO, currentPlayer, winner } = gameData;
        
        const isHost = playerX === userId;
        const myMark = isHost ? 'X' : (playerO === userId ? 'O' : null);
        const isMyTurn = myMark === currentPlayer;

        const getStatusMessage = () => {
            if (status === 'waiting') return 'Waiting for an opponent...';
            if (status === 'finished') {
                if (winner && winner !== 'draw') return winner === myMark ? "🎉 You Win! 🎉" : "😢 Opponent Wins! 😢";
                return "🤝 It's a Draw! 🤝";
            }
            if (status === 'active') return isMyTurn ? `Your Turn (${myMark})` : `Opponent's Turn (${currentPlayer})`;
            return '';
        };
        const finalStatusMessage = getStatusMessage();

        return (
            <div className="mt-6 animate-fade-in">
                 <div className="flex justify-between items-center bg-gray-700 p-2 rounded-lg mb-4">
                    <span className="text-sm font-semibold text-gray-300">Game ID: <span className="text-yellow-400">{gameId}</span></span>
                    <button onClick={() => { navigator.clipboard.writeText(gameId); setNotification('Game ID Copied!'); }} className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded-md transition">Copy ID</button>
                </div>

                <div className="text-xl font-bold text-sky-400 my-4 h-8 transition-all">{finalStatusMessage}</div>

                <div className="relative">
                    <canvas ref={this.canvasRef} width={this.canvasSize} height={this.canvasSize} className={`bg-gray-900/50 rounded-lg shadow-inner mx-auto transition-all duration-300 ${isMyTurn && status === 'active' ? 'ring-2 ring-sky-400 ring-offset-4 ring-offset-gray-800' : 'opacity-70'}`} onClick={this.handleCanvasClick} style={{ cursor: isMyTurn && status === 'active' ? 'pointer' : 'not-allowed' }} />
                    {status === 'finished' && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center rounded-lg animate-fade-in">
                            <div className="text-4xl font-extrabold text-white mb-6">{finalStatusMessage.replace(/[🎉😢🤝]/g, '').trim()}</div>
                            <div className="flex space-x-4">
                                {isHost && <button onClick={this.handleResetGame} className="bg-sky-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-sky-600 transition">Play Again</button>}
                                <button onClick={handleLeaveGame} className="bg-gray-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-700 transition">Leave Game</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

