import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PayLine, SlotSymbol } from '@monorepo/shared';

interface PaylineOverlayProps {
  winLines: PayLine[];
  isVisible: boolean;
  symbols: SlotSymbol[][];
  cellSize?: number;
}

interface WinningCellProps {
  row: number;
  column: number;
  symbol: SlotSymbol;
  isHighlighted: boolean;
  cellSize: number;
}

const WinningCell: React.FC<WinningCellProps> = ({ 
  row, 
  column, 
  symbol, 
  isHighlighted, 
  cellSize 
}) => {
  return (
    <motion.div
      className={`absolute rounded-lg ${
        isHighlighted ? 'win-highlight' : 'opacity-0'
      }`}
      style={{
        left: `${column * cellSize}px`,
        top: `${row * cellSize}px`,
        width: `${cellSize}px`,
        height: `${cellSize}px`,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isHighlighted ? 1 : 0, 
        opacity: isHighlighted ? 1 : 0 
      }}
      transition={{ 
        delay: (row + column) * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }}
    >
      {/* Celebration effect for legendary wins */}
      {symbol.rarity === 'legendary' && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ scale: 1, opacity: 1 }}
          animate={{ 
            scale: [1, 1.2, 1.4, 1],
            opacity: [1, 0.8, 0.4, 0.8, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop"
          }}
        >
          <div className="w-full h-full rounded-lg border-2 border-yellow-300 shadow-lg shadow-yellow-300/50" />
        </motion.div>
      )}
    </motion.div>
  );
};

export const PaylineOverlay: React.FC<PaylineOverlayProps> = ({
  winLines,
  isVisible,
  symbols,
  cellSize = 64
}) => {
  // Create a set of winning positions for quick lookup
  const winningPositions = new Set<string>();
  winLines.forEach(line => {
    line.positions.forEach(pos => {
      winningPositions.add(`${pos.row}-${pos.column}`);
    });
  });

  if (!isVisible || winLines.length === 0) {
    return null;
  }

  return (
    <div className="payline-overlay">
      <AnimatePresence>
        {winLines.map((line, lineIndex) => (
          <motion.div
            key={line.id}
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: lineIndex * 0.2 }}
          >
            {/* Draw payline path */}
            <svg 
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 10 }}
            >
              <motion.path
                d={line.positions
                  .map((pos, index) => {
                    const x = (pos.column + 0.5) * cellSize;
                    const y = (pos.row + 0.5) * cellSize;
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#ffd700"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: 1, 
                  opacity: 1,
                  strokeDashoffset: [0, 10] 
                }}
                transition={{ 
                  pathLength: { duration: 0.8, ease: "easeInOut" },
                  opacity: { duration: 0.5 },
                  strokeDashoffset: {
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear"
                  }
                }}
              />
            </svg>

            {/* Highlight winning symbols */}
            {line.positions.map((pos, posIndex) => {
              const symbol = symbols[pos.row]?.[pos.column];
              if (!symbol) return null;

              const isHighlighted = winningPositions.has(`${pos.row}-${pos.column}`);

              return (
                <WinningCell
                  key={`${line.id}-${pos.row}-${pos.column}`}
                  row={pos.row}
                  column={pos.column}
                  symbol={symbol}
                  isHighlighted={isHighlighted}
                  cellSize={cellSize}
                />
              );
            })}

            {/* Win amount display */}
            {line.winAmount > 0 && (
              <motion.div
                className="absolute bg-slot-gold text-slot-primary px-3 py-1 rounded-lg font-bold text-sm pointer-events-none"
                style={{
                  left: '50%',
                  top: '-40px',
                  transform: 'translateX(-50%)'
                }}
                initial={{ scale: 0, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ 
                  delay: 1 + (lineIndex * 0.2),
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
              >
                +{line.winAmount}
                <motion.div
                  className="absolute inset-0 bg-slot-gold rounded-lg pointer-events-none"
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ 
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default PaylineOverlay;