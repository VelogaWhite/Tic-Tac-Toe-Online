import React, { useRef, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { TicTacToeOnline } from '../game/TicTacToeOnline';

// Helper drawing functions (can be moved to a separate utility file)
function drawX(ctx, row, col, lineSpacing) {
    ctx.strokeStyle = '#38bdf8'; // Light Blue
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

function drawO(ctx, row, col, lineSpacing) {
    ctx.strokeStyle = '#fb923c'; // Orange
    ctx.lineWidth = 8;
    ctx.beginPath();
    const x = col * lineSpacing + lineSpacing / 2;
    const y = row * lineSpacing + lineSpacing / 2;
    ctx.arc(x, y, lineSpacing / 2.5, 0, 2 * Math.PI);
    ctx.stroke();
}


export const Game = ({ db, functions, gameId, userId, setNotification, setError, handleLeaveGame }) => {
    // We store the entire game class instance in state.
    const [game, setGame] = useState(null);
    const canvasRef = useRef(null);
    const canvasSize = 400;

    // This effect runs once to set up the game instance and listener.
    useEffect(() => {
        const onlineGame = new TicTacToeOnline(db, gameId, userId);
        
        const unsubscribe = onlineGame.listenForUpdates((updatedGame) => {
            // Create a new object reference to ensure React detects the change and re-renders.
            setGame({ ...updatedGame });
        });

        // Cleanup the listener when the component unmounts.
        return () => unsubscribe();
    }, [db, gameId, userId]);


    // This effect runs whenever the game state changes to redraw the canvas.
    useEffect(() => {
        if (!canvasRef.current || !game?.state) return;
        
        const ctx = canvasRef.current.getContext('2d');
        const lineSpacing = canvasSize / 3;

        ctx.clearRect(0, 0, canvasSize, canvasSize);
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 4;
        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * lineSpacing, 0); ctx.lineTo(i * lineSpacing, canvasSize); ctx.stroke();
            ctx.moveTo(0, i * lineSpacing); ctx.lineTo(canvasSize, i * lineSpacing); ctx.stroke();
        }

        game.state.board.forEach((mark, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            if (mark === 'X') drawX(ctx, row, col, lineSpacing);
            else if (mark === 'O') drawO(ctx, row, col, lineSpacing);
        });
    }, [game]);

    const handleCanvasClick = async (event) => {
        if (!game) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const col = Math.floor(x / (canvasSize / 3));
        const row = Math.floor(y / (canvasSize / 3));

        // Let the class instance handle the logic.
        await game.makeMove(row, col);
    };
    
    const handleResetGame = async () => {
        try {
            const resetGameFunc = httpsCallable(functions, 'resetGame');
            await resetGameFunc({ gameId });
            setNotification("Game has been reset!");
        } catch (err) {
            setError(err.message);
        }
    };

    if (!game || !game.state) {
        return <div className="text-sky-400 animate-pulse my-8">Loading Game...</div>;
    }

    const { status, playerX, playerO, currentPlayer, winner } = game.state;
    const isHost = playerX === userId;
    const isMyTurn = (currentPlayer === 'X' && playerX === userId) || (currentPlayer === 'O' && playerO === userId);
    const myMark = isHost ? 'X' : 'O';

    const getStatusMessage = () => {
        if (status === 'waiting') return 'Waiting for an opponent...';
        if (status === 'finished') {
            if (winner && winner !== 'draw') {
                return winner === myMark ? "🎉 You Win! 🎉" : "😢 Opponent Wins! 😢";
            }
            return "🤝 It's a Draw! 🤝";
        }
        if (status === 'active') {
            return isMyTurn ? `Your Turn (${myMark})` : `Opponent's Turn (${currentPlayer})`;
        }
        return '';
    };

    return (
        <div className="mt-6 animate-fade-in">
            <div className="flex justify-between items-center bg-gray-700 p-2 rounded-lg mb-4">
                <span className="text-sm font-semibold text-gray-300">Game ID: <span className="text-yellow-400">{gameId}</span></span>
                <button 
                    onClick={() => { navigator.clipboard.writeText(gameId); setNotification('Game ID Copied!'); }}
                    className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded-md transition"
                >Copy ID</button>
            </div>

            <div className="text-xl font-bold text-sky-400 my-4 h-8 transition-all">{getStatusMessage()}</div>

            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={canvasSize}
                    height={canvasSize}
                    className={`bg-gray-900/50 rounded-lg shadow-inner mx-auto transition-all duration-300 ${isMyTurn && status === 'active' ? 'ring-2 ring-sky-400 ring-offset-4 ring-offset-gray-800' : 'opacity-70'}`}
                    onClick={handleCanvasClick}
                    style={{ cursor: isMyTurn && status === 'active' ? 'pointer' : 'not-allowed' }}
                />
                 {status === 'finished' && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center rounded-lg animate-fade-in">
                         <div className="text-4xl font-extrabold text-white mb-6">{getStatusMessage().replace(/[🎉😢🤝]/g, '').trim()}</div>
                         <div className="flex space-x-4">
                            {isHost && <button onClick={handleResetGame} className="bg-sky-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-sky-600 transition">Play Again</button>}
                            <button onClick={handleLeaveGame} className="bg-gray-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-700 transition">Leave Game</button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};
