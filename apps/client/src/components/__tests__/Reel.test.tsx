import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { Reel } from '../Reel';
import { SLOT_SYMBOLS } from '../../store/gameStore';
import type { SlotSymbol } from '@monorepo/shared';

// Mock framer-motion to avoid animation complexity in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Reel Component', () => {
  const mockSymbols: SlotSymbol[] = [
    { id: 'cherry', name: 'Cherry', emoji: '🍒', value: 2, rarity: 'common' },
    { id: 'lemon', name: 'Lemon', emoji: '🍋', value: 3, rarity: 'common' },
    { id: 'seven', name: 'Seven', emoji: '7️⃣', value: 10, rarity: 'rare' },
  ];

  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders reel with initial symbols', () => {
    render(
      <Reel
        symbols={mockSymbols}
        isSpinning={false}
        reelIndex={0}
      />
    );

    // Check that all symbols are rendered
    expect(screen.getByText('🍒')).toBeInTheDocument();
    expect(screen.getByText('🍋')).toBeInTheDocument();
    expect(screen.getByText('7️⃣')).toBeInTheDocument();

    // Check that reel container exists
    expect(screen.getByTestId('reel-container')).toBeInTheDocument();
  });

  it('shows correct symbol for different rarities', () => {
    const legendarySymbol: SlotSymbol = {
      id: 'diamond',
      name: 'Diamond',
      emoji: '💎',
      value: 25,
      rarity: 'legendary'
    };

    render(
      <Reel
        symbols={[legendarySymbol]}
        isSpinning={false}
        reelIndex={0}
      />
    );

    expect(screen.getByText('💎')).toBeInTheDocument();
  });

  it('starts spinning when isSpinning prop changes to true', async () => {
    const onSpinComplete = jest.fn();
    
    const { rerender } = render(
      <Reel
        symbols={mockSymbols}
        isSpinning={false}
        reelIndex={0}
        onSpinComplete={onSpinComplete}
      />
    );

    // Start spinning
    rerender(
      <Reel
        symbols={mockSymbols}
        isSpinning={true}
        reelIndex={0}
        onSpinComplete={onSpinComplete}
      />
    );

    // Advance time to let spinning animation complete
    jest.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(onSpinComplete).toHaveBeenCalled();
    });
  });

  it('uses delay for each reel to create cascading effect', () => {
    const onSpinComplete = jest.fn();
    
    render(
      <Reel
        symbols={mockSymbols}
        isSpinning={true}
        reelIndex={2}
        delay={400}
        onSpinComplete={onSpinComplete}
      />
    );

    // At this point, the spin shouldn't have started yet due to delay
    // The delay is set for each reel
    expect(onSpinComplete).not.toHaveBeenCalled();
  });

  it('handles spin completion callback', async () => {
    const onSpinComplete = jest.fn();
    
    render(
      <Reel
        symbols={mockSymbols}
        isSpinning={true}
        reelIndex={0}
        onSpinComplete={onSpinComplete}
      />
    );

    // Advance time to complete the spin
    jest.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(onSpinComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('displays symbols with correct styling based on rarity', () => {
    const rareSymbol: SlotSymbol = {
      id: 'bell',
      name: 'Bell',
      emoji: '🔔',
      value: 8,
      rarity: 'rare'
    };

    render(
      <Reel
        symbols={[rareSymbol]}
        isSpinning={false}
        reelIndex={0}
      />
    );

    const symbolElement = screen.getByText('🔔').closest('.slot-symbol');
    expect(symbolElement).toBeInTheDocument();
    expect(symbolElement).toHaveClass('bg-gradient-to-br');
  });

  it('clears timeouts on unmount', () => {
    const { unmount } = render(
      <Reel
        symbols={mockSymbols}
        isSpinning={true}
        reelIndex={0}
      />
    );

    // This should clear any pending timeouts
    unmount();

    // If timeouts weren't cleared, this could cause issues
    // We'll just verify it doesn't throw
    expect(() => unmount()).not.toThrow();
  });

  it('handles rapid symbol changes', () => {
    const newSymbols: SlotSymbol[] = [
      { id: 'diamond', name: 'Diamond', emoji: '💎', value: 25, rarity: 'legendary' }
    ];

    const { rerender } = render(
      <Reel
        symbols={mockSymbols}
        isSpinning={false}
        reelIndex={0}
      />
    );

    // Change symbols rapidly
    rerender(
      <Reel
        symbols={newSymbols}
        isSpinning={false}
        reelIndex={0}
      />
    );

    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.queryByText('🍒')).not.toBeInTheDocument();
  });

  it('maintains reel structure during spinning', () => {
    render(
      <Reel
        symbols={mockSymbols}
        isSpinning={true}
        reelIndex={0}
      />
    );

    // The reel container should still exist during spinning
    expect(screen.getByTestId('reel-container')).toBeInTheDocument();
  });
});

// Test hook interactions
describe('Reel Hook Integration', () => {
  it('responds to props changes correctly', () => {
    const onSpinComplete = jest.fn();
    const initialSymbols: SlotSymbol[] = [
      { id: 'cherry', name: 'Cherry', emoji: '🍒', value: 2, rarity: 'common' }
    ];
    
    const { rerender } = render(
      <Reel
        symbols={initialSymbols}
        isSpinning={false}
        reelIndex={0}
        onSpinComplete={onSpinComplete}
      />
    );

    const newSymbols: SlotSymbol[] = [
      { id: 'seven', name: 'Seven', emoji: '7️⃣', value: 10, rarity: 'rare' }
    ];

    rerender(
      <Reel
        symbols={newSymbols}
        isSpinning={true}
        reelIndex={1}
        onSpinComplete={onSpinComplete}
      />
    );

    // Symbol should change
    expect(screen.getByText('7️⃣')).toBeInTheDocument();
    expect(screen.queryByText('🍒')).not.toBeInTheDocument();
  });
});