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
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

// Lazy load pages for better performance
const Login = React.lazy(() => import('@/pages/Login'));
const Game = React.lazy(() => import('@/pages/Game'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const History = React.lazy(() => import('@/pages/History'));
const Deposit = React.lazy(() => import('@/pages/Deposit'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="loading-spinner w-8 h-8"></div>
  </div>
);

function App() {
  // Initialize auth store to check for existing tokens
  useAuthStore();

  return (
    <Router>
      <div className="App">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/game" replace />} />
              <Route path="game" element={<Game />} />
              <Route path="profile" element={<Profile />} />
              <Route path="history" element={<History />} />
              <Route path="deposit" element={<Deposit />} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/game" replace />} />
          </Routes>
        </Suspense>

        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#059669',
              },
            },
            error: {
              style: {
                background: '#dc2626',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
