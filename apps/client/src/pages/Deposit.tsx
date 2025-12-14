import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { depositsApi } from '@/api/endpoints';
import { CreditCard, Building, Bitcoin } from 'lucide-react';
import type { Deposit } from '@/types';

interface DepositForm {
  amount: number;
  method: 'card' | 'bank' | 'crypto';
}

interface DepositMethod {
  id: string;
  name: string;
  type: string;
  fees: number;
}

export const Deposit: React.FC = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<DepositForm>();

  const selectedMethod = watch('method');

  useEffect(() => {
    loadDeposits();
    loadDepositMethods();
  }, []);

  const loadDeposits = async () => {
    setIsLoading(true);
    try {
      const response = await depositsApi.getDeposits(1, 10);
      setDeposits(response.items);
    } catch (error) {
      // Error handled by API client
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepositMethods = async () => {
    try {
      const methods = await depositsApi.getDepositMethods();
      setDepositMethods(methods);
    } catch (error) {
      // Error handled by API client
    }
  };

  const onSubmit = async (data: DepositForm) => {
    setSubmitLoading(true);
    try {
      await depositsApi.createDeposit(data.amount, data.method);
      setSuccess('Deposit request submitted successfully!');
      reset();
      await loadDeposits();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      // Error handled by API client
    } finally {
      setSubmitLoading(false);
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

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'bank':
        return <Building className="w-5 h-5" />;
      case 'crypto':
        return <Bitcoin className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success-600 bg-success-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-danger-600 bg-danger-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getMinAmount = () => {
    const method = depositMethods.find(m => m.type === selectedMethod);
    return method ? 10 : 10; // Default minimum
  };

  const getMaxAmount = () => {
    return 10000; // Default maximum
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Deposit Funds</h1>
          <p className="mt-2 text-gray-600">
            Add funds to your wallet to start playing games.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Deposit Form */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Make a Deposit</h2>
            
            {success && (
              <div className="mb-4 rounded-md bg-success-50 p-4">
                <p className="text-sm text-success-800">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Deposit Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Deposit Method
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {depositMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                        selectedMethod === method.type
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        {...register('method', { required: 'Please select a deposit method' })}
                        type="radio"
                        value={method.type}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getMethodIcon(method.type)}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{method.name}</div>
                          <div className="text-sm text-gray-500">
                            Fee: {method.fees}% • 
                            {method.type === 'card' && ' Instant processing'}
                            {method.type === 'bank' && ' 1-3 business days'}
                            {method.type === 'crypto' && ' 10-30 minutes'}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.method && (
                  <p className="mt-1 text-sm text-danger-600">{errors.method.message}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('amount', {
                      required: 'Amount is required',
                      min: {
                        value: getMinAmount(),
                        message: `Minimum amount is $${getMinAmount()}`,
                      },
                      max: {
                        value: getMaxAmount(),
                        message: `Maximum amount is $${getMaxAmount()}`,
                      },
                    })}
                    type="number"
                    step="0.01"
                    min={getMinAmount()}
                    max={getMaxAmount()}
                    className={`input ${errors.amount ? 'input-error' : ''}`}
                    placeholder="Enter amount"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-danger-600">{errors.amount.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Minimum: ${getMinAmount()} • Maximum: ${getMaxAmount()}
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Amounts
                </label>
                <div className="flex flex-wrap gap-2">
                  {[25, 50, 100, 250, 500].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        const form = watch();
                        register('amount').onChange({ target: { value: amount.toString() } });
                      }}
                      className="btn btn-secondary text-sm"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee Calculation */}
              {selectedMethod && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Fee Breakdown</h3>
                  <div className="space-y-1 text-sm">
                    {(() => {
                      const method = depositMethods.find(m => m.type === selectedMethod);
                      const amount = watch('amount') || 0;
                      const fee = (amount * (method?.fees || 0)) / 100;
                      const total = amount + fee;
                      
                      return (
                        <>
                          <div className="flex justify-between">
                            <span>Deposit Amount:</span>
                            <span>${amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Processing Fee ({method?.fees || 0}%):</span>
                            <span>${fee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Total:</span>
                            <span>${total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitLoading || !selectedMethod}
                className="btn btn-primary w-full"
              >
                {submitLoading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Submit Deposit'
                )}
              </button>
            </form>
          </div>

          {/* Recent Deposits */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Recent Deposits</h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="loading-spinner w-6 h-6"></div>
              </div>
            ) : deposits.length > 0 ? (
              <div className="space-y-4">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-full">
                        {getMethodIcon(deposit.method)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(deposit.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(deposit.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(deposit.status)}`}>
                      {deposit.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No deposits yet</p>
                <p className="text-sm">Your deposit history will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deposit;
