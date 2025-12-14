import React, { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useWalletStore } from '@/store/walletStore';
import { useAuth } from '@/hooks/useAuth';

export const Game: React.FC = () => {
  const { user } = useAuth();
  const { 
    currentGame, 
    isPlaying, 
    isLoading, 
    error, 
    fetchCurrentGame, 
    startGame, 
    endGame 
  } = useGameStore();
  const { balance, fetchBalance } = useWalletStore();

  useEffect(() => {
    fetchCurrentGame();
    fetchBalance();
  }, []);

  const handleStartGame = async () => {
    try {
      await startGame('dice', 10); // Default to dice game with $10
    } catch (error) {
      // Error handled by store
    }
  };

  const handleEndGame = async (result: 'win' | 'lose' | 'draw') => {
    if (!currentGame) return;
    
    try {
      await endGame(currentGame.id, result);
      // Refresh balance after game ends
      fetchBalance();
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Game Center</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.username}!
          </p>
        </div>

        {/* Balance Card */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Balance</h2>
          {balance ? (
            <div className="text-3xl font-bold text-primary-600">
              ${balance.balance.toFixed(2)} {balance.currency}
            </div>
          ) : (
            <div className="loading-spinner w-6 h-6"></div>
          )}
        </div>

        {/* Current Game */}
        {currentGame && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Game</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Game ID: {currentGame.id}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Type: {currentGame.type}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Amount: ${currentGame.amount}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Status: <span className="capitalize font-medium">{currentGame.status}</span>
              </p>
              
              {currentGame.status === 'playing' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEndGame('win')}
                    className="btn btn-success"
                    disabled={isLoading}
                  >
                    Win
                  </button>
                  <button
                    onClick={() => handleEndGame('lose')}
                    className="btn btn-danger"
                    disabled={isLoading}
                  >
                    Lose
                  </button>
                  <button
                    onClick={() => handleEndGame('draw')}
                    className="btn btn-secondary"
                    disabled={isLoading}
                  >
                    Draw
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Start New Game */}
        {!isPlaying && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Start New Game</h2>
            <p className="text-gray-600 mb-4">
              Choose a game type and amount to get started.
            </p>
            <button
              onClick={handleStartGame}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="loading-spinner w-4 h-4 mr-2"></div>
                  Starting game...
                </div>
              ) : (
                'Start Dice Game ($10)'
              )}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 rounded-md bg-danger-50 p-4">
            <p className="text-sm text-danger-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
