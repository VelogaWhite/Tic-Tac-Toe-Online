import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// --- Local Imports ---
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';

// --- Firebase Config ---
// This configuration remains the same.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    //...etc
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


// --- Main App Component ---
export default function App() {
    // State for Firebase services and user info
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [functions, setFunctions] = useState(null);
    const [userId, setUserId] = useState(null);
    
    // State for application flow
    const [gameId, setGameId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');

    // --- Firebase Initialization & Auth ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const functionsInstance = getFunctions(app);
            const dbInstance = getFirestore(app);
            
            setAuth(authInstance);
            setFunctions(functionsInstance);
            setDb(dbInstance);

            onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else if (initialAuthToken) {
                    try { await signInWithCustomToken(authInstance, initialAuthToken); }
                    catch (e) { await signInAnonymously(authInstance); }
                } else {
                    await signInAnonymously(authInstance);
                }
            });
        } catch (err) {
            setError('Could not initialize Firebase.');
            console.error(err);
        }
    }, []);

    // --- Notification timeout ---
    useEffect(() => {
        if(notification) {
            const timer = setTimeout(() => setNotification(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // --- Cloud Function Handlers ---
    const handleCreateGame = async () => {
        setLoading(true);
        setError('');
        try {
            const createGameFunc = httpsCallable(functions, 'createGame');
            const result = await createGameFunc();
            setGameId(result.data.gameId);
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    const handleJoinGame = async (idToJoin) => {
        setLoading(true);
setError('');
        try {
            const joinGameFunc = httpsCallable(functions, 'joinGame');
            await joinGameFunc({ gameId: idToJoin });
            setGameId(idToJoin);
        } catch (err) { setError(err.message); }
        setLoading(false);
    };
    
    const handleLeaveGame = () => {
        setGameId(null);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4 font-sans antialiased">
            <div className="w-full max-w-sm bg-gray-800 rounded-2xl shadow-2xl p-6 text-center">
                <h1 className="text-4xl font-bold text-white mb-2">Tic-Tac-Toe</h1>
                <p className="text-gray-400 mb-6">Built with Firebase</p>
                
                {!userId ? <div className="text-yellow-400 animate-pulse mb-4">Connecting...</div> : (
                    !gameId ? (
                        <Lobby 
                            handleCreateGame={handleCreateGame}
                            handleJoinGame={handleJoinGame}
                            loading={loading}
                        />
                    ) : (
                        <Game
                            db={db}
                            functions={functions}
                            gameId={gameId}
                            userId={userId}
                            setNotification={setNotification}
                            setError={setError}
                            handleLeaveGame={handleLeaveGame}
                        />
                    )
                )}

                {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-2 rounded-md">{error}</p>}
                {notification && <p className="text-green-400 mt-4 text-sm bg-green-900/50 p-2 rounded-md">{notification}</p>}
            </div>
            <footer className="text-xs text-gray-600 mt-4">Your User ID: {userId || '...'}</footer>
        </div>
    );
}
