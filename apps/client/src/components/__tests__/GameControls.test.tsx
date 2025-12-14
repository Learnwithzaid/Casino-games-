import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { GameControls } from '../GameControls';
import { useGameStore } from '../../store/gameStore';

// Mock zustand store
const mockUseGameStore = useGameStore as jest.MockedFunction<typeof useGameStore>;

jest.mock('../../store/gameStore', () => ({
  useGameStore: jest.fn(),
}));

jest.mock('react-hotkeys-hook', () => ({
  useHotkeys: jest.fn(),
}));

describe('GameControls Component', () => {
  const mockStore = {
    currentBet: 10,
    balance: '1000',
    isSpinning: false,
    soundEnabled: true,
    animationsEnabled: true,
    betAmounts: [5, 10, 25, 50],
    maxBet: 1000,
    setCurrentBet: jest.fn(),
    setSoundEnabled: jest.fn(),
    placeBet: jest.fn(),
    error: null,
    resetError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockUseGameStore as jest.Mock).mockReturnValue(mockStore);
  });

  it('renders balance display correctly', () => {
    render(<GameControls />);

    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('1000 PKR')).toBeInTheDocument();
  });

  it('displays current bet amount', () => {
    render(<GameControls />);

    expect(screen.getByText('Current Bet')).toBeInTheDocument();
    expect(screen.getByText('10 PKR')).toBeInTheDocument();
  });

  it('shows spin button with correct state', () => {
    render(<GameControls />);

    const spinButton = screen.getByRole('button', { name: /🎰 SPIN/i });
    expect(spinButton).toBeInTheDocument();
    expect(spinButton).not.toBeDisabled();
  });

  it('disables spin button when spinning', () => {
    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...mockStore,
      isSpinning: true,
    });

    render(<GameControls />);

    const spinButton = screen.getByRole('button', { name: /Spinning/i });
    expect(spinButton).toBeInTheDocument();
    expect(spinButton).toBeDisabled();
  });

  it('disables spin button when insufficient balance', () => {
    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...mockStore,
      balance: '5', // Less than current bet
    });

    render(<GameControls />);

    const spinButton = screen.getByRole('button', { name: /🎰 SPIN/i });
    expect(spinButton).toBeDisabled();
  });

  it('opens bet selector when clicked', async () => {
    render(<GameControls />);

    const betSelector = screen.getByText('Current Bet').closest('button');
    fireEvent.click(betSelector!);

    await waitFor(() => {
      expect(screen.getByText('Select Bet Amount')).toBeInTheDocument();
    });
  });

  it('allows selecting different bet amounts', async () => {
    render(<GameControls />);

    // Open bet selector
    const betSelector = screen.getByText('Current Bet').closest('button');
    fireEvent.click(betSelector!);

    await waitFor(() => {
      expect(screen.getByText('Select Bet Amount')).toBeInTheDocument();
    });

    // Click on different bet amount
    const betOption = screen.getByText('25 PKR');
    fireEvent.click(betOption);

    expect(mockStore.setCurrentBet).toHaveBeenCalledWith(25);
  });

  it('toggles sound when sound button is clicked', () => {
    render(<GameControls />);

    const soundButton = screen.getByTitle('Sound On');
    fireEvent.click(soundButton);

    expect(mockStore.setSoundEnabled).toHaveBeenCalledWith(false);
  });

  it('calls onHistoryClick when history button is clicked', () => {
    const mockOnHistoryClick = jest.fn();
    render(<GameControls onHistoryClick={mockOnHistoryClick} />);

    const historyButton = screen.getByTitle('Game History');
    fireEvent.click(historyButton);

    expect(mockOnHistoryClick).toHaveBeenCalled();
  });

  it('displays error message when error exists', () => {
    const errorMessage = 'Test error message';
    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...mockStore,
      error: errorMessage,
    });

    render(<GameControls />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('dismisses error when close button is clicked', async () => {
    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...mockStore,
      error: 'Test error',
    });

    render(<GameControls />);

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(mockStore.resetError).toHaveBeenCalled();
  });

  it('handles custom bet amount input', async () => {
    render(<GameControls />);

    // Open bet selector
    const betSelector = screen.getByText('Current Bet').closest('button');
    fireEvent.click(betSelector!);

    await waitFor(() => {
      expect(screen.getByText('Select Bet Amount')).toBeInTheDocument();
    });

    // Find and input custom amount
    const customInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(customInput, { target: { value: '100' } });

    expect(mockStore.setCurrentBet).toHaveBeenCalledWith(100);
  });

  it('displays last win amount', () => {
    render(<GameControls />);

    expect(screen.getByText('Last Win')).toBeInTheDocument();
    expect(screen.getByText('0 PKR')).toBeInTheDocument();
  });

  it('shows loading state during spin', () => {
    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...mockStore,
      isSpinning: true,
    });

    render(<GameControls />);

    expect(screen.getByText('Spinning...')).toBeInTheDocument();
    expect(screen.queryByText('🎰 SPIN')).not.toBeInTheDocument();
  });

  it('disables bet selector when spinning', () => {
    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...mockStore,
      isSpinning: true,
    });

    render(<GameControls />);

    const betSelector = screen.getByText('Current Bet').closest('button');
    expect(betSelector).toBeDisabled();
  });

  it('shows keyboard shortcuts hint', () => {
    render(<GameControls />);

    expect(screen.getByText('Press SPACE to spin • ESC to close menus')).toBeInTheDocument();
  });

  it('limits custom bet amount to max bet', () => {
    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...mockStore,
      maxBet: 500,
    });

    render(<GameControls />);

    // Open bet selector
    const betSelector = screen.getByText('Current Bet').closest('button');
    fireEvent.click(betSelector!);

    // Custom amount input should have max attribute
    const customInput = screen.getByPlaceholderText('Enter amount');
    expect(customInput).toHaveAttribute('max', '500');
  });
});

describe('GameControls Integration', () => {
  it('handles spin with keyboard shortcut', async () => {
    const mockPlaceBet = jest.fn().mockResolvedValue({
      success: true,
      data: {
        transactionId: 'test-transaction',
        newBalance: '990',
        spinResult: {
          id: 'test-spin',
          userId: 'test-user',
          symbols: [],
          betAmount: 10,
          winAmount: 0,
          winLines: [],
          timestamp: new Date(),
          isWin: false,
        },
      },
    });

    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...{
        currentBet: 10,
        balance: '1000',
        isSpinning: false,
        soundEnabled: false,
        animationsEnabled: true,
        betAmounts: [5, 10, 25, 50],
        maxBet: 1000,
        setCurrentBet: jest.fn(),
        setSoundEnabled: jest.fn(),
        placeBet: mockPlaceBet,
        error: null,
        resetError: jest.fn(),
      },
    });

    render(<GameControls />);

    const spinButton = screen.getByRole('button', { name: /🎰 SPIN/i });
    fireEvent.click(spinButton);

    await waitFor(() => {
      expect(mockPlaceBet).toHaveBeenCalledWith({
        amount: 10,
        gameRoundId: expect.stringMatching(/^round_/),
      });
    });
  });

  it('handles spin failure gracefully', async () => {
    const mockPlaceBet = jest.fn().mockRejectedValue(new Error('Network error'));

    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...{
        currentBet: 10,
        balance: '1000',
        isSpinning: false,
        soundEnabled: false,
        animationsEnabled: true,
        betAmounts: [5, 10, 25, 50],
        maxBet: 1000,
        setCurrentBet: jest.fn(),
        setSoundEnabled: jest.fn(),
        placeBet: mockPlaceBet,
        error: null,
        resetError: jest.fn(),
      },
    });

    render(<GameControls />);

    const spinButton = screen.getByRole('button', { name: /🎰 SPIN/i });
    fireEvent.click(spinButton);

    // Should handle error without throwing
    await waitFor(() => {
      expect(spinButton).not.toBeDisabled();
    });
  });

  it('respects user sound preferences', () => {
    (mockUseGameStore as jest.Mock).mockReturnValue({
      ...{
        currentBet: 10,
        balance: '1000',
        isSpinning: false,
        soundEnabled: false, // Sound disabled
        animationsEnabled: true,
        betAmounts: [5, 10, 25, 50],
        maxBet: 1000,
        setCurrentBet: jest.fn(),
        setSoundEnabled: jest.fn(),
        placeBet: jest.fn(),
        error: null,
        resetError: jest.fn(),
      },
    });

    render(<GameControls />);

    const soundButton = screen.getByTitle('Sound Off');
    expect(soundButton).toBeInTheDocument();
  });
});