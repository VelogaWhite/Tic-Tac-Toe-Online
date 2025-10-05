import React, { useState } from 'react';

export const Lobby = ({ handleCreateGame, handleJoinGame, loading }) => {
    const [inputGameId, setInputGameId] = useState('');

    return (
        <div className="space-y-4 animate-fade-in">
            <button
                onClick={handleCreateGame}
                disabled={loading}
                className="w-full bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:scale-100"
            >
                {loading ? 'Creating...' : 'Create New Game'}
            </button>
            <div className="flex items-center space-x-2">
                <hr className="flex-grow border-gray-600"/>
                <span className="text-gray-500 font-bold">OR</span>
                <hr className="flex-grow border-gray-600"/>
            </div>
            <div className="flex space-x-2">
                 <input
                    type="text"
                    value={inputGameId}
                    onChange={(e) => setInputGameId(e.target.value.trim())}
                    placeholder="Enter Game ID"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-white"
                />
                <button
                    onClick={() => handleJoinGame(inputGameId)}
                    disabled={loading || !inputGameId}
                    className="bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:scale-100"
                >
                    Join
                </button>
            </div>
        </div>
    );
};
