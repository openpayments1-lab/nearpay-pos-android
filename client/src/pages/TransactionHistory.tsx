import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

// Define the transaction interface directly
interface CardDetails {
  type: string;
  number: string;
  authCode: string;
}

interface Transaction {
  id: number;
  amount: number;
  paymentMethod: string;
  status: string;
  dateTime: Date;
  terminalIp: string | null;
  cardDetails: CardDetails | null;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('GET', '/api/transactions');
        const data = await response.json();
        setTransactions(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load transactions. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load transaction history.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [toast]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleString();
  };

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseReceipt = () => {
    setSelectedTransaction(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">Transaction History</h1>
        <Link href="/">
          <Button variant="outline">Back to Register</Button>
        </Link>
      </div>

      {loading ? (
        <Card className="p-6">
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-6">
          <div className="text-center text-destructive py-8">
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {selectedTransaction ? (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Receipt Details</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleCloseReceipt}>
                    Close
                  </Button>
                </div>
                <CardDescription>
                  Transaction #{selectedTransaction.id} - {formatDate(selectedTransaction.dateTime)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium">{selectedTransaction.id}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{formatAmount(selectedTransaction.amount)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium">
                      {selectedTransaction.paymentMethod === 'cash' 
                        ? 'Cash' 
                        : 'Credit Card'}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Date/Time:</span>
                    <span className="font-medium">{formatDate(selectedTransaction.dateTime)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      selectedTransaction.status === 'approved' || selectedTransaction.status === 'completed' 
                        ? 'text-success' 
                        : selectedTransaction.status === 'declined' 
                          ? 'text-destructive' 
                          : selectedTransaction.status === 'refunded'
                            ? 'text-amber-600'
                            : ''
                    }`}>
                      {selectedTransaction.status === 'approved' ? 'Approved' : 
                       selectedTransaction.status === 'completed' ? 'Completed' : 
                       selectedTransaction.status === 'declined' ? 'Declined' :
                       selectedTransaction.status === 'refunded' ? 'Refunded' : 
                       selectedTransaction.status}
                    </span>
                  </div>
                  
                  {selectedTransaction.cardDetails && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Card Type:</span>
                        <span className="font-medium">{selectedTransaction.cardDetails.type}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Card Number:</span>
                        <span className="font-medium">{selectedTransaction.cardDetails.number}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Auth Code:</span>
                        <span className="font-medium">{selectedTransaction.cardDetails.authCode}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    className="flex items-center"
                    onClick={() => {
                      toast({
                        title: "Print Receipt",
                        description: "Printing functionality would be implemented here.",
                      });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Transaction List</CardTitle>
              <CardDescription>
                View and manage your recent transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transactions found. Process a payment to see it here.
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="bg-gray-100 grid grid-cols-5 py-2 px-4 text-sm font-medium">
                    <div>ID</div>
                    <div>Date/Time</div>
                    <div>Amount</div>
                    <div>Status</div>
                    <div>Actions</div>
                  </div>
                  <div className="divide-y">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="grid grid-cols-5 py-3 px-4 hover:bg-gray-50">
                        <div className="font-medium">{transaction.id}</div>
                        <div>{formatDate(transaction.dateTime)}</div>
                        <div>{formatAmount(transaction.amount)}</div>
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.status === 'approved' || transaction.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : transaction.status === 'refunded'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status === 'approved' ? 'Approved' : 
                             transaction.status === 'completed' ? 'Completed' : 
                             transaction.status === 'declined' ? 'Declined' :
                             transaction.status === 'refunded' ? 'Refunded' : 
                             transaction.status}
                          </span>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReceipt(transaction)}
                          >
                            View Receipt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}