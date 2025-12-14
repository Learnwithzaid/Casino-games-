import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SlotSymbol } from '@monorepo/shared';
import { SLOT_SYMBOLS } from '../store/gameStore';

interface ReelProps {
  symbols: SlotSymbol[];
  isSpinning: boolean;
  onSpinComplete?: () => void;
  reelIndex: number;
  delay?: number;
}

interface SymbolComponentProps {
  symbol: SlotSymbol;
  isVisible: boolean;
  isAnimating?: boolean;
}

const SymbolComponent: React.FC<SymbolComponentProps> = ({ 
  symbol, 
  isVisible, 
  isAnimating = false 
}) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-purple-500 to-pink-500 border-yellow-400 shadow-yellow-400/50';
      case 'epic': return 'from-blue-500 to-purple-500 border-blue-400 shadow-blue-400/50';
      case 'rare': return 'from-green-500 to-blue-500 border-green-400 shadow-green-400/50';
      default: return 'from-slot-secondary to-slot-primary border-slot-accent shadow-slot-accent/50';
    }
  };

  return (
    <motion.div
      className={`slot-symbol bg-gradient-to-br ${getRarityColor(symbol.rarity)} ${
        isAnimating ? 'animate-reel-flicker' : ''
      }`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: isVisible ? 1 : 0.8, 
        opacity: isVisible ? 1 : 0 
      }}
      transition={{ 
        duration: 0.3, 
        ease: "easeInOut" 
      }}
      whileHover={{ scale: 1.05 }}
    >
      <span className="text-2xl md:text-3xl filter drop-shadow-lg">
        {symbol.emoji}
      </span>
    </motion.div>
  );
};

export const Reel: React.FC<ReelProps> = ({ 
  symbols, 
  isSpinning, 
  onSpinComplete, 
  reelIndex, 
  delay = 0 
}) => {
  const [currentSymbols, setCurrentSymbols] = useState<SlotSymbol[]>(symbols);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const spinTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isSpinning) {
      setIsAnimating(true);
      
      // Add delay for each reel to create cascading effect
      spinTimeoutRef.current = setTimeout(() => {
        const spinDuration = 2000 + (reelIndex * 200); // Each reel spins for different duration
        
        // Generate random symbols during spin
        const spinInterval = setInterval(() => {
          const randomSymbols = Array.from({ length: 3 }, () => 
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
          );
          setCurrentSymbols(randomSymbols);
        }, 100);

        // Stop spinning and show final result
        animationTimeoutRef.current = setTimeout(() => {
          clearInterval(spinInterval);
          setCurrentSymbols(symbols);
          setIsAnimating(false);
          onSpinComplete?.();
        }, spinDuration);

      }, delay);
    } else {
      setCurrentSymbols(symbols);
      setIsAnimating(false);
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, [isSpinning, symbols, reelIndex, delay, onSpinComplete]);

  return (
    <div className="reel-container p-2">
      <div className="flex flex-col gap-2 h-24 md:h-28">
        <AnimatePresence mode="wait">
          {currentSymbols.map((symbol, index) => (
            <SymbolComponent
              key={`${symbol.id}-${index}`}
              symbol={symbol}
              isVisible={true}
              isAnimating={isAnimating}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Reel;