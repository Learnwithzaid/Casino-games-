import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { LoadingSkeleton } from './LoadingSkeleton';

interface GameHistoryProps {
  // Add any props if needed
}

export const GameHistory: React.FC<GameHistoryProps> = () => {
  const {
    gameHistory,
    isLoading,
    error,
    fetchGameHistory,
    balance,
    currentBet
  } = useGameStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'win' | 'bet'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses'>('all');

  useEffect(() => {
    fetchGameHistory(currentPage, 20);
  }, [currentPage, fetchGameHistory]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatCurrency = (amount: number, currency = 'PKR') => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getWinLossColor = (spin: any) => {
    if (spin.isWin) return 'text-green-400';
    return 'text-red-400';
  };

  const getWinLossIcon = (spin: any) => {
    if (spin.isWin) return '🎉';
    return '😔';
  };

  // Filter and sort spins
  const filteredAndSortedSpins = gameHistory
    .filter(spin => {
      if (filterBy === 'wins') return spin.isWin;
      if (filterBy === 'losses') return !spin.isWin;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'win':
          return b.winAmount - a.winAmount;
        case 'bet':
          return b.betAmount - a.betAmount;
        case 'date':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

  const totalSpins = gameHistory.length;
  const totalWins = gameHistory.filter(spin => spin.isWin).length;
  const totalWinsAmount = gameHistory.reduce((sum, spin) => sum + spin.winAmount, 0);
  const totalBetsAmount = gameHistory.reduce((sum, spin) => sum + spin.betAmount, 0);
  const netProfit = totalWinsAmount - totalBetsAmount;
  const winRate = totalSpins > 0 ? (totalWins / totalSpins * 100) : 0;

  if (isLoading && gameHistory.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slot-gold mb-2">Game History</h1>
          <p className="text-gray-400">View your recent spins and statistics</p>
        </div>
        <LoadingSkeleton variant="card" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-xl mb-4">⚠️ Failed to load history</div>
        <p className="text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => fetchGameHistory(currentPage, 20)}
          className="bg-slot-accent hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slot-gold mb-2">Game History</h1>
        <p className="text-gray-400">View your recent spins and statistics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          className="bg-slot-secondary border border-slot-accent rounded-lg p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-2xl font-bold text-slot-gold">{totalSpins}</div>
          <div className="text-sm text-gray-400">Total Spins</div>
        </motion.div>

        <motion.div
          className="bg-slot-secondary border border-slot-accent rounded-lg p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-2xl font-bold text-green-400">{winRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-400">Win Rate</div>
        </motion.div>

        <motion.div
          className="bg-slot-secondary border border-slot-accent rounded-lg p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-2xl font-bold text-slot-gold">
            {formatCurrency(totalWinsAmount)}
          </div>
          <div className="text-sm text-gray-400">Total Wins</div>
        </motion.div>

        <motion.div
          className="bg-slot-secondary border border-slot-accent rounded-lg p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="text-sm text-gray-400">Net Profit</div>
        </motion.div>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-slot-secondary border border-slot-accent rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Filter</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="bg-slot-primary border border-slot-accent rounded px-3 py-1 text-white text-sm"
              >
                <option value="all">All Spins</option>
                <option value="wins">Wins Only</option>
                <option value="losses">Losses Only</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slot-primary border border-slot-accent rounded px-3 py-1 text-white text-sm"
              >
                <option value="date">Date</option>
                <option value="win">Win Amount</option>
                <option value="bet">Bet Amount</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            Showing {filteredAndSortedSpins.length} spins
          </div>
        </div>
      </div>

      {/* Game History List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredAndSortedSpins.map((spin, index) => (
            <motion.div
              key={spin.id || index}
              className="bg-slot-secondary border border-slot-accent rounded-lg p-4 hover:border-slot-gold transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Spin Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{getWinLossIcon(spin)}</span>
                    <div>
                      <div className="font-bold text-white">
                        {spin.isWin ? 'WIN!' : 'LOSS'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatDate(spin.timestamp)}
                      </div>
                    </div>
                  </div>

                  {/* Symbol Display */}
                  <div className="flex gap-1 mb-2">
                    {spin.symbols.flat().map((symbol, symbolIndex) => (
                      <div
                        key={symbolIndex}
                        className="w-8 h-8 flex items-center justify-center text-lg bg-slot-primary rounded border border-slot-accent"
                        title={symbol.name}
                      >
                        {symbol.emoji}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Win/Loss Amount */}
                <div className="text-right">
                  <div className="text-sm text-gray-400">Bet Amount</div>
                  <div className="font-bold text-white">
                    {formatCurrency(spin.betAmount)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Win Amount</div>
                  <div className={`font-bold ${getWinLossColor(spin)}`}>
                    {formatCurrency(spin.winAmount)}
                  </div>
                  {spin.winLines && spin.winLines.length > 0 && (
                    <div className="text-xs text-slot-gold mt-1">
                      {spin.winLines.length} payline{spin.winLines.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAndSortedSpins.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎰</div>
            <div className="text-xl text-gray-400 mb-2">No spins found</div>
            <div className="text-gray-500">
              {filterBy === 'all' 
                ? 'Start playing to see your game history here!'
                : `No ${filterBy} found. Try changing your filter.`
              }
            </div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {filteredAndSortedSpins.length > 0 && filteredAndSortedSpins.length >= 20 && (
        <div className="text-center">
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={isLoading}
            className="bg-slot-accent hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Current Balance Display */}
      <div className="bg-slot-gold/10 border border-slot-gold rounded-lg p-4 text-center">
        <div className="text-sm text-slot-gold/80">Current Balance</div>
        <div className="text-2xl font-bold text-slot-gold">
          {formatCurrency(parseFloat(balance))}
        </div>
      </div>
    </div>
  );
};

export default GameHistory;