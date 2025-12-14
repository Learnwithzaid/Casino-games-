import React, { useState } from 'react';
import { SlotMachine } from './components/SlotMachine';
import { GameHistory } from './components/GameHistory';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [showHistory, setShowHistory] = useState(false);

  if (showHistory) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slot-primary">
          <div className="max-w-4xl mx-auto p-4">
            <div className="mb-4">
              <button
                onClick={() => setShowHistory(false)}
                className="bg-slot-accent hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← Back to Game
              </button>
            </div>
            <GameHistory />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SlotMachine onHistoryClick={() => setShowHistory(true)} />
    </ErrorBoundary>
  );
}

export default App;
