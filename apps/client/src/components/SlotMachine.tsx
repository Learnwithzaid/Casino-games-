import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, SLOT_SYMBOLS } from '../store/gameStore';
import { Reel } from './Reel';
import { PaylineOverlay } from './PaylineOverlay';
import { GameControls } from './GameControls';
import { LoadingSkeleton } from './LoadingSkeleton';
import ErrorBoundary from './ErrorBoundary';
import type { SlotSymbol } from '@monorepo/shared';

interface SlotMachineProps {
  onHistoryClick?: () => void;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ onHistoryClick }) => {
  const {
    userId,
    balance,
    isSpinning,
    lastSpinResult,
    soundEnabled,
    animationsEnabled,
    isLoading,
    error,
    isConnected,
    sessionExpiry,
    fetchBalance,
    setUserId,
    updateSessionExpiry,
    resetError
  } = useGameStore();

  // Local state
  const [currentSymbols, setCurrentSymbols] = useState<SlotSymbol[][]>([]);
  const [completedSpins, setCompletedSpins] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationWinAmount, setCelebrationWinAmount] = useState(0);

  // Initialize user and fetch balance
  useEffect(() => {
    const initUser = async () => {
      // Generate a demo user ID for now
      const demoUserId = 'demo-user-' + Math.random().toString(36).substr(2, 9);
      setUserId(demoUserId);
      
      // Set session expiry (24 hours from now)
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);
      updateSessionExpiry(expiry);
      
      // Fetch initial balance
      await fetchBalance();
    };

    if (!userId) {
      initUser();
    }
  }, [userId, setUserId, updateSessionExpiry, fetchBalance]);

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (userId && isConnected && !isSpinning) {
        fetchBalance();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, isConnected, isSpinning, fetchBalance]);

  // Initialize symbols
  useEffect(() => {
    const initialSymbols = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => 
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
      )
    );
    setCurrentSymbols(initialSymbols);
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning || parseFloat(balance) < useGameStore.getState().currentBet) {
      return;
    }

    resetError();
    
    // Optimistic UI update - start spinning immediately
    setShowCelebration(false);
    
    // This will be triggered when the spin completes via the API response
    // For demo purposes, we'll simulate the spin completion
    setTimeout(() => {
      // Generate new symbols (this would come from the API in a real implementation)
      const newSymbols = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => 
          SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
        )
      );
      setCurrentSymbols(newSymbols);
      setCompletedSpins(prev => prev + 1);
    }, 2000);
  }, [isSpinning, balance, resetError]);

  // Simulate win detection for demo
  useEffect(() => {
    if (currentSymbols.length > 0 && !isSpinning) {
      // Simple win detection for demo: if all symbols in first row are the same
      const firstRow = currentSymbols[0];
      const allSame = firstRow.every(symbol => symbol.id === firstRow[0].id);
      
      if (allSame && firstRow[0].rarity !== 'common') {
        const winAmount = firstRow[0].value * useGameStore.getState().currentBet * 2;
        setCelebrationWinAmount(winAmount);
        setShowCelebration(true);
        
        if (soundEnabled) {
          // Play celebration sound
        }
      }
    }
  }, [currentSymbols, isSpinning, soundEnabled]);

  // Connectivity indicator
  const ConnectivityIndicator: React.FC = () => (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-400' : 'bg-red-400'
      }`} />
      <span className={`${
        isConnected ? 'text-green-400' : 'text-red-400'
      }`}>
        {isConnected ? 'Online' : 'Offline'}
      </span>
    </div>
  );

  // Session warning
  const SessionWarning: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
      if (!sessionExpiry) return;

      const updateTimeLeft = () => {
        const now = new Date().getTime();
        const expiry = new Date(sessionExpiry).getTime();
        const diff = expiry - now;
        
        if (diff <= 0) {
          setTimeLeft(0);
          // Auto logout
          window.location.href = '/login';
          return;
        }
        
        setTimeLeft(Math.floor(diff / 1000));
      };

      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(interval);
    }, [sessionExpiry]);

    if (!sessionExpiry || timeLeft > 300) return null; // Only show if less than 5 minutes left

    return (
      <motion.div
        className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3 text-yellow-200 text-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Session expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      </motion.div>
    );
  };

  if (!userId || isLoading) {
    return (
      <div className="min-h-screen bg-slot-primary flex items-center justify-center">
        <LoadingSkeleton variant="card" className="max-w-md w-full" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slot-primary via-slot-secondary to-slot-primary">
        {/* Header */}
        <header className="bg-slot-secondary/50 backdrop-blur-sm border-b border-slot-accent p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slot-gold">🎰 Lucky Slots</h1>
              <ConnectivityIndicator />
            </div>
            
            <div className="flex items-center gap-4">
              <SessionWarning />
              <div className="text-sm text-gray-400">
                User: {userId.slice(-8)}
              </div>
            </div>
          </div>
        </header>

        {/* Main Game Area */}
        <main className="max-w-7xl mx-auto p-4">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Reel Area */}
            <div className="lg:col-span-3">
              <div className="space-y-4">
                {/* Session Status */}
                <div className="text-center text-sm text-gray-400">
                  Session spins: {completedSpins}
                </div>

                {/* 3x3 Reel Grid */}
                <div className="relative mx-auto max-w-lg">
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    {currentSymbols.map((reelSymbols, columnIndex) => (
                      <Reel
                        key={columnIndex}
                        symbols={reelSymbols}
                        isSpinning={isSpinning}
                        reelIndex={columnIndex}
                        delay={columnIndex * 200}
                        onSpinComplete={columnIndex === 2 ? undefined : undefined}
                      />
                    ))}
                  </div>

                  {/* Payline Overlay */}
                  <PaylineOverlay
                    winLines={lastSpinResult?.winLines || []}
                    isVisible={!isSpinning && lastSpinResult?.isWin}
                    symbols={currentSymbols}
                  />
                </div>

                {/* Error Display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200 text-center"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Celebration Modal */}
                <AnimatePresence>
                  {showCelebration && (
                    <motion.div
                      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowCelebration(false)}
                    >
                      <motion.div
                        className="bg-slot-secondary border-4 border-slot-gold rounded-lg p-8 text-center max-w-md mx-4"
                        initial={{ scale: 0.5, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0.5, rotate: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-bold text-slot-gold mb-2">BIG WIN!</h2>
                        <p className="text-xl text-white mb-4">
                          Congratulations! You won {celebrationWinAmount} coins!
                        </p>
                        <button
                          onClick={() => setShowCelebration(false)}
                          className="bg-slot-gold text-slot-primary px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                        >
                          Awesome!
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Controls Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <GameControls
                  onSpin={handleSpin}
                  onHistoryClick={onHistoryClick}
                />
              </div>
            </div>
          </div>

          {/* Mobile Layout Adjustments */}
          <div className="lg:hidden mt-8">
            <div className="text-center text-sm text-gray-400">
              💡 Tip: Use SPACE key to spin for faster gameplay
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-slot-secondary/30 border-t border-slot-accent p-4 mt-8">
          <div className="max-w-7xl mx-auto text-center text-sm text-gray-400">
            <div className="flex flex-wrap justify-center gap-4">
              <span>🎮 Play Responsibly</span>
              <span>•</span>
              <span>18+ Only</span>
              <span>•</span>
              <span>Made with ❤️ for demo purposes</span>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default SlotMachine;