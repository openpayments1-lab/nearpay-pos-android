import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Transaction } from '@shared/schema';

export default function TransactionHistory() {
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
      case 'declined':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between py-6">
          <Link href="/">
            <Button variant="outline" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to POS
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Transaction History
          </h1>
          <div className="w-32" /> {/* Spacer for centering */}
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">No transactions yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="p-4 hover:shadow-md transition-shadow"
                data-testid={`card-transaction-${transaction.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(transaction.status)}
                    <div>
                      <p className="font-semibold text-lg" data-testid={`text-amount-${transaction.id}`}>
                        {formatAmount(transaction.amount)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(transaction.dateTime)}
                      </p>
                      {transaction.transactionId && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          ID: {transaction.transactionId}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(transaction.status)}`}
                      data-testid={`status-${transaction.id}`}
                    >
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                    {transaction.cardDetails && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {transaction.cardDetails.type && `${transaction.cardDetails.type} `}
                        {transaction.cardDetails.last4 && `****${transaction.cardDetails.last4}`}
                      </div>
                    )}
                    {transaction.errorMessage && (
                      <p className="text-xs text-red-600 dark:text-red-400 max-w-xs text-right">
                        {transaction.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
