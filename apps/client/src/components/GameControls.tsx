import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import { useGameStore } from '../store/gameStore';
import type { BetRequest } from '@monorepo/shared';

interface GameControlsProps {
  onSpin?: () => void;
  onHistoryClick?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ 
  onSpin, 
  onHistoryClick 
}) => {
  const {
    currentBet,
    balance,
    isSpinning,
    soundEnabled,
    animationsEnabled,
    betAmounts,
    maxBet,
    setCurrentBet,
    setSoundEnabled,
    placeBet,
    error,
    resetError
  } = useGameStore();

  const [showBetSelector, setShowBetSelector] = useState(false);
  const [spinCountdown, setSpinCountdown] = useState(0);

  const canSpin = !isSpinning && parseFloat(balance) >= currentBet;

  const handleSpin = useCallback(async () => {
    if (!canSpin) return;

    resetError();
    
    const betRequest: BetRequest = {
      amount: currentBet,
      gameRoundId: `round_${Date.now()}`
    };

    // Optimistic UI update - show spinning immediately
    onSpin?.();

    try {
      const result = await placeBet(betRequest);
      
      if (result?.success && result.data) {
        // Play win sound if it's a win
        if (result.data.spinResult.isWin && soundEnabled) {
          playSound('win');
        }
        
        // Show win celebration
        if (result.data.spinResult.winAmount > currentBet * 2) {
          showCelebration(result.data.spinResult.winAmount);
        }
      }
    } catch (error) {
      console.error('Spin failed:', error);
    }
  }, [canSpin, currentBet, placeBet, onSpin, soundEnabled, resetError]);

  // Keyboard shortcuts
  useHotkeys('space', (e) => {
    e.preventDefault();
    handleSpin();
  }, { enabled: canSpin });

  useHotkeys('escape', () => {
    setShowBetSelector(false);
  });

  // Sound effects
  const playSound = (type: 'spin' | 'win' | 'click') => {
    if (!soundEnabled) return;

    // Create audio context for web audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'spin':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        break;
      case 'win':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        break;
      case 'click':
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        break;
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + (type === 'win' ? 0.5 : 1));
  };

  // Celebration effect
  const showCelebration = (winAmount: number) => {
    // This could trigger a celebration modal or effects
    console.log(`Big win! ${winAmount} coins!`);
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-200"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={resetError}
                className="text-red-300 hover:text-red-100"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance Display */}
      <div className="balance-display text-center">
        <div className="text-sm opacity-80">Balance</div>
        <div className="text-2xl font-bold">
          {formatBalance(balance)} PKR
        </div>
      </div>

      {/* Bet Selection */}
      <div className="relative">
        <button
          onClick={() => {
            setShowBetSelector(!showBetSelector);
            playSound('click');
          }}
          className="bet-selector w-full text-left flex items-center justify-between"
          disabled={isSpinning}
        >
          <div>
            <div className="text-sm opacity-70">Current Bet</div>
            <div className="text-lg font-bold">{currentBet} PKR</div>
          </div>
          <div className="text-2xl">
            {showBetSelector ? '▲' : '▼'}
          </div>
        </button>

        <AnimatePresence>
          {showBetSelector && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-2 bg-slot-secondary border-2 border-slot-accent rounded-lg shadow-xl z-50"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-2">
                <div className="text-sm opacity-70 mb-2">Select Bet Amount</div>
                <div className="grid grid-cols-2 gap-2">
                  {betAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setCurrentBet(amount);
                        setShowBetSelector(false);
                        playSound('click');
                      }}
                      className={`p-2 rounded border-2 transition-all ${
                        currentBet === amount
                          ? 'border-slot-gold bg-slot-gold/20'
                          : 'border-slot-accent hover:border-slot-gold'
                      } ${amount > parseFloat(balance) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={amount > parseFloat(balance)}
                    >
                      {amount} PKR
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-slot-accent">
                  <label className="text-sm opacity-70">Custom Amount</label>
                  <input
                    type="number"
                    min="1"
                    max={maxBet}
                    value={currentBet}
                    onChange={(e) => setCurrentBet(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 p-2 bg-slot-primary border border-slot-accent rounded text-white"
                    placeholder="Enter amount"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spin Button */}
      <motion.button
        onClick={handleSpin}
        disabled={!canSpin}
        className={`game-button w-full text-xl py-4 ${
          !canSpin ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        whileHover={canSpin ? { scale: 1.02 } : {}}
        whileTap={canSpin ? { scale: 0.98 } : {}}
      >
        <AnimatePresence mode="wait">
          {isSpinning ? (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              Spinning...
            </motion.div>
          ) : (
            <motion.div
              key="spin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2"
            >
              🎰 SPIN
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Last Win Display */}
      <div className="bg-slot-secondary/50 border border-slot-accent rounded-lg p-3 text-center">
        <div className="text-sm opacity-70">Last Win</div>
        <div className="text-lg font-bold text-slot-gold">0 PKR</div>
      </div>

      {/* Settings and Actions */}
      <div className="flex gap-2">
        {/* Sound Toggle */}
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            playSound('click');
          }}
          className={`flex-1 p-2 rounded border-2 transition-all ${
            soundEnabled
              ? 'border-slot-gold bg-slot-gold/20 text-slot-gold'
              : 'border-slot-accent hover:border-slot-gold'
          }`}
          title={`Sound ${soundEnabled ? 'On' : 'Off'}`}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* History Button */}
        <button
          onClick={() => {
            onHistoryClick?.();
            playSound('click');
          }}
          className="flex-1 p-2 bg-slot-secondary border-2 border-slot-accent rounded hover:border-slot-gold transition-all"
          title="Game History"
        >
          📊
        </button>

        {/* Settings Button */}
        <button
          onClick={() => {
            playSound('click');
            // Open settings modal
          }}
          className="flex-1 p-2 bg-slot-secondary border-2 border-slot-accent rounded hover:border-slot-gold transition-all"
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="text-xs opacity-50 text-center">
        Press SPACE to spin • ESC to close menus
      </div>
    </div>
  );
};

export default GameControls;