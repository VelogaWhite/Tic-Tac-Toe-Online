import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

import { Lobby } from './components/Lobby';
import { Game } from './components/Game';

// Your Firebase project configuration
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyA-ezETUvJsjdcceG-3WpQK2NuXZQLGFmw",
  authDomain: "tic-tac-toe-online-955d0.firebaseapp.com",
  projectId: "tic-tac-toe-online-955d0",
  storageBucket: "tic-tac-toe-online-955d0.firebasestorage.app",
  messagingSenderId: "61466632785",
  appId: "1:61466632785:web:e90047573f2c3bbf328e70",
  measurementId: "G-8WECGZY7RW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export default function App() {
    const [userId, setUserId] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);

    // Effect for handling user authentication
    useEffect(() => {
        signInAnonymously(auth).catch(err => setError(err.message));
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // Effect for clearing notifications and errors
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification, error]);

    const handleLeaveGame = () => {
        setGameId(null);
    };

    return (
        <div className="bg-gray-800 text-white min-h-screen flex flex-col justify-center items-center p-4 font-sans">
            <div className="w-full max-w-md mx-auto bg-gray-900 rounded-2xl shadow-lg p-6 text-center border border-gray-700">
                <h1 className="text-4xl font-bold text-sky-400 mb-2">Tic-Tac-Toe Online</h1>
                <p className="text-sm text-gray-400 mb-6">Built with Classes & Firebase</p>

                {(!userId) ? (
                    <div className="text-yellow-400 animate-pulse mb-4">Connecting to server...</div>
                ) : !gameId ? (
                    <Lobby
                        functions={functions}
                        setGameId={setGameId}
                        setError={setError}
                        setNotification={setNotification}
                    />
                ) : (
                    <Game
                        db={db}
                        functions={functions}
                        gameId={gameId}
                        userId={userId}
                        setError={setError}
                        setNotification={setNotification}
                        handleLeaveGame={handleLeaveGame}
                    />
                )}

                {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-2 rounded-md transition-opacity">{error}</p>}
                {notification && <p className="text-green-400 mt-4 text-sm bg-green-900/50 p-2 rounded-md transition-opacity">{notification}</p>}
            </div>
            <footer className="text-xs text-gray-600 mt-4">User ID: {userId || '...'}</footer>
        </div>
    );
}

