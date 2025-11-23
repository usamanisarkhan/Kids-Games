
import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { useGeminiLive } from './hooks/useGeminiLive';
import { GameState } from './types';
import { Play, Square, Loader2, Video, Mic, Volume2, Sliders, VolumeX } from 'lucide-react';
import { soundManager } from './services/soundManager';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [speedLevel, setSpeedLevel] = useState(3);
  const [isMuted, setIsMuted] = useState(false);

  const { 
    connect, 
    disconnect, 
    sendVideoFrame, 
    isConnected, 
    isConnecting 
  } = useGeminiLive({
    onError: (err) => setError(err.message),
    onConnect: () => setError(null) // Clear error on successful connect
  });

  const handleStartGame = async () => {
    setError(null);
    if (!isConnected) {
      await connect();
    }
    // Initialize/Resume Audio Context
    soundManager.init();
    
    setGameState(GameState.PLAYING);
    setScore(0);
  };

  const handleStopGame = () => {
    setGameState(GameState.IDLE);
  };

  const handleGameOver = () => {
    setGameState(GameState.GAME_OVER);
  };
  
  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Manage BGM based on Game State
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      soundManager.startBGM();
    } else {
      soundManager.stopBGM();
    }
  }, [gameState]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4">
      
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-6 py-4 px-6 bg-slate-800/50 rounded-2xl backdrop-blur-sm border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-pink-500 to-violet-600 p-2 rounded-lg">
            <Video className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-violet-400 hidden sm:block">
            Gemini Balloon Popper
          </h1>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-700 mx-2">
          <Sliders className="w-4 h-4 text-slate-400" />
          <div className="flex flex-col">
             <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Balloon Speed</label>
             <input 
               type="range" 
               min="1" 
               max="10" 
               value={speedLevel} 
               onChange={(e) => setSpeedLevel(parseInt(e.target.value))}
               className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
             />
          </div>
          <span className="text-sm font-mono font-bold text-pink-400 w-6 text-center">{speedLevel}</span>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
             onClick={toggleMute}
             className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
             title={isMuted ? "Unmute Game Sounds" : "Mute Game Sounds"}
          >
             {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-700 hidden sm:flex">
             <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Score</span>
             <span className="text-2xl font-mono font-bold text-yellow-400">{score.toString().padStart(4, '0')}</span>
          </div>

          <div className="flex items-center gap-2">
             <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
             <span className="text-sm font-medium text-slate-300 hidden sm:block">
               {isConnected ? 'Live' : 'Offline'}
             </span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="w-full flex-1 flex flex-col items-center justify-center relative">
        <GameCanvas 
          gameState={gameState} 
          onScoreUpdate={setScore} 
          onGameOver={handleGameOver}
          onFrameCapture={sendVideoFrame}
          speedLevel={speedLevel}
        />

        {/* Overlay Controls */}
        {gameState === GameState.IDLE && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
            <div className="text-center p-8 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md">
              <h2 className="text-3xl font-bold mb-4 text-white">Ready to Pop?</h2>
              <p className="text-slate-400 mb-8">
                Move your hands in the video to pop the falling balloons. 
                Gemini will watch and cheer you on!
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button 
                onClick={handleStartGame}
                disabled={isConnecting}
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-gradient-to-r from-pink-600 to-violet-600 rounded-xl hover:from-pink-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Connecting AI...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    Start Game
                  </>
                )}
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 opacity-30 blur group-hover:opacity-50 transition duration-200"></div>
              </button>
            </div>
          </div>
        )}

        {gameState === GameState.PLAYING && (
          <div className="absolute top-4 right-4 z-20">
            <button 
              onClick={handleStopGame}
              className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-all shadow-lg hover:shadow-red-500/20"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
          </div>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="mt-6 text-slate-500 text-sm flex flex-wrap justify-center gap-8">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4" />
          <span>Camera enabled for tracking</span>
        </div>
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4" />
          <span>Microphone active for AI</span>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          <span>Turn up volume for commentary</span>
        </div>
      </footer>
    </div>
  );
}
