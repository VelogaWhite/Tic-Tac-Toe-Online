import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';

export function Lobby({ functions, setGameId, setError, setNotification }) {
    const [inputGameId, setInputGameId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateGame = async () => {
        setLoading(true);
        setError(null);
        try {
            const createGameFunc = httpsCallable(functions, 'createGame');
            const result = await createGameFunc({ size: 3 }); // Create a 3x3 game
            setNotification("Game created successfully!");
            setGameId(result.data.gameId);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinGame = async (e) => {
        e.preventDefault();
        if (!inputGameId.trim()) {
            setError("Please enter a Game ID.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const joinGameFunc = httpsCallable(functions, 'joinGame');
            await joinGameFunc({ gameId: inputGameId.trim() });
            setNotification("Joined game successfully!");
            setGameId(inputGameId.trim());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-4">
            <button
                onClick={handleCreateGame}
                disabled={loading}
                className="w-full bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition disabled:bg-sky-800 disabled:cursor-not-allowed"
            >
                {loading ? 'Creating...' : 'Create New Game'}
            </button>
            <div className="flex items-center">
                <hr className="flex-grow border-gray-600" />
                <span className="px-4 text-gray-500 text-sm">OR</span>
                <hr className="flex-grow border-gray-600" />
            </div>
            <form onSubmit={handleJoinGame} className="space-y-2">
                <input
                    type="text"
                    value={inputGameId}
                    onChange={(e) => setInputGameId(e.target.value)}
                    placeholder="Enter Game ID to Join"
                    className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                    {loading ? 'Joining...' : 'Join Game'}
                </button>
            </form>
        </div>
    );
}

