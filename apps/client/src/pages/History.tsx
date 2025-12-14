import React, { useEffect } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { useGameStore } from '@/store/gameStore';
import { Wallet, GamepadIcon, TrendingUp, TrendingDown } from 'lucide-react';

export const History: React.FC = () => {
  const { balance, transactions, isLoading, pagination, fetchTransactions } = useWalletStore();
  const { gameHistory, fetchGameHistory } = useGameStore();

  useEffect(() => {
    fetchTransactions();
    fetchGameHistory();
  }, []);

  const loadMore = () => {
    if (pagination.page < pagination.totalPages) {
      fetchTransactions(pagination.page + 1, pagination.limit);
      fetchGameHistory(pagination.page + 1, pagination.limit);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'win':
        return 'text-success-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
      case 'lose':
        return 'text-danger-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (item: any) => {
    if ('type' in item) {
      // It's a game
      if (item.result === 'win') return <TrendingUp className="w-4 h-4" />;
      if (item.result === 'lose') return <TrendingDown className="w-4 h-4" />;
      return <GamepadIcon className="w-4 h-4" />;
    } else {
      // It's a transaction
      return <Wallet className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">History</h1>
          <p className="mt-2 text-gray-600">
            View your game history and transaction records.
          </p>
        </div>

        {/* Balance Overview */}
        {balance && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Balance</h2>
            <div className="text-3xl font-bold text-primary-600">
              {formatCurrency(balance.balance)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {formatDate(balance.lastUpdated)}
            </p>
          </div>
        )}

        {/* Combined History */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
            
            {isLoading && transactions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="loading-spinner w-6 h-6"></div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full bg-white ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {'type' in item ? `Game: ${item.type}` : `Deposit via ${item.method}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(item.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-medium ${getStatusColor(item.status)}`}>
                        {'result' in item && item.result === 'win' ? '+' : ''}
                        {formatCurrency(item.amount)}
                      </div>
                      <div className={`text-sm capitalize ${getStatusColor(item.status)}`}>
                        {item.status}
                      </div>
                    </div>
                  </div>
                ))}
                
                {pagination.page < pagination.totalPages && (
                  <div className="text-center pt-4">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="btn btn-secondary"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="loading-spinner w-4 h-4 mr-2"></div>
                          Loading...
                        </div>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No transactions yet</p>
                <p className="text-sm">Start playing games to see your history here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
