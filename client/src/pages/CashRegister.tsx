import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CreditCard, History, RotateCcw, RefreshCcw } from "lucide-react";
import { Link, useLocation } from "wouter";
import AmountInput from "@/components/AmountInput";
import PaymentMethod from "@/components/PaymentMethod";
import TransactionStatus from "@/components/TransactionStatus";
import Receipt from "@/components/Receipt";
import TerminalConfig from "@/components/TerminalConfig";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import { useCashRegister } from "@/lib/cashRegisterContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Transaction } from "@/types";

export default function CashRegister() {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  const { 
    terminalStatus, 
    checkTerminalConnection,
    setAmount,
    setRefundMode,
    setSelectedPaymentMethod,
    isRefundMode
  } = useCashRegister();
  const [location] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check terminal connection on component mount if IP is stored
    const savedTerminalIp = localStorage.getItem('terminalIp');
    const connectionStatus = localStorage.getItem('terminalConnectionStatus');
    
    if (savedTerminalIp) {
      // Only force a check if not already connected, otherwise use cache
      const forceCheck = connectionStatus !== 'connected';
      checkTerminalConnection(savedTerminalIp, forceCheck);
    }
  }, [checkTerminalConnection]);

  // Function to fetch recent transactions for the refund dialog
  const fetchRecentTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const response = await apiRequest('GET', '/api/transactions');
      const data = await response.json();
      
      // Filter to show only approved card transactions that can be refunded
      const refundableTransactions = data.filter((t: Transaction) => 
        t.paymentMethod === 'card' && t.status === 'approved'
      );
      
      setTransactions(refundableTransactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions for refund.',
        variant: 'destructive',
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Function to handle opening the refund dialog
  const handleOpenRefundDialog = () => {
    fetchRecentTransactions();
    setShowRefundDialog(true);
  };

  // Function to handle selecting a transaction for refund
  const handleSelectTransactionForRefund = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  // Function to process the selected refund
  const handleProcessRefund = () => {
    if (!selectedTransaction) return;
    
    // Set up refund mode with the selected transaction
    setRefundMode(true);
    setAmount(selectedTransaction.amount.toFixed(2));
    setSelectedPaymentMethod('card');
    
    toast({
      title: "Refund Mode Activated",
      description: `Ready to process refund for $${selectedTransaction.amount.toFixed(2)}`,
      variant: "default",
    });
    
    // Close the dialog
    setShowRefundDialog(false);
    
    // Note: refund mode will be reset automatically after the refund is processed
    // in the processRefund function in the cashRegisterContext
  };

  // Format amount for display
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return String(dateString);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-dark text-center">
            {isRefundMode ? "Cash Register - Refund Mode" : "Cash Register"}
          </h1>
        </header>

        <Card className="overflow-hidden">
          {/* Main content area with two columns on desktop, stacked on mobile */}
          <div className="flex flex-col md:flex-row">
            {/* Left column: Keypad and amount input */}
            <div className="w-full md:w-7/12 p-6 border-b md:border-b-0 md:border-r border-gray-200">
              <AmountInput />
            </div>
            
            {/* Right column: Payment methods and status */}
            <div className="w-full md:w-5/12 p-6">
              <PaymentMethod />
              <TransactionStatus />
            </div>
          </div>
          
          {/* Receipt area */}
          <Receipt />
        </Card>
        
        {/* Settings, Refund and History Buttons */}
        <div className="fixed bottom-6 right-6 flex space-x-3 z-50">
          <Link href="/history">
            <Button 
              variant="default"
              className="bg-amber-600 text-white px-5 py-3 rounded-lg shadow-lg font-medium flex items-center space-x-2 hover:bg-amber-700"
            >
              <History className="h-5 w-5 mr-1" />
              <span>Transaction History</span>
            </Button>
          </Link>
          
          <Button 
            variant="default"
            className="bg-teal-600 text-white px-5 py-3 rounded-lg shadow-lg font-medium flex items-center space-x-2 hover:bg-teal-700"
            onClick={handleOpenRefundDialog}
          >
            <RefreshCcw className="h-5 w-5 mr-1" />
            <span>Process Refund</span>
          </Button>
          
          <Button 
            variant="default"
            className="bg-blue-600 text-white px-5 py-3 rounded-lg shadow-lg font-medium flex items-center space-x-2 hover:bg-blue-700"
            onClick={() => setShowConfigDialog(true)}
          >
            <Settings className="h-5 w-5 mr-1" />
            <span>Terminal Settings</span>
          </Button>
        </div>
      </div>

      {/* Terminal Configuration Dialog */}
      {showConfigDialog && (
        <TerminalConfig 
          onClose={() => setShowConfigDialog(false)} 
        />
      )}

      {/* Refund Dialog */}
      {showRefundDialog && (
        <Dialog open={true} onOpenChange={setShowRefundDialog}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                Select a transaction to refund from the list below.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[350px] overflow-y-auto">
              {loadingTransactions ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  No refundable transactions found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 my-4">
                  {transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`border rounded-md p-3 cursor-pointer transition-all ${
                        selectedTransaction?.id === transaction.id 
                          ? 'border-amber-600 bg-amber-50' 
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => handleSelectTransactionForRefund(transaction)}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">Transaction #{transaction.id}</span>
                        <span className="font-bold">{formatAmount(transaction.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <span>{transaction.cardDetails?.type || 'Card'}</span>
                        <span>{formatDate(transaction.dateTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRefundDialog(false)} className="mt-4">
                Cancel
              </Button>
              <Button 
                onClick={handleProcessRefund}
                disabled={!selectedTransaction || loadingTransactions}
                className="bg-amber-600 hover:bg-amber-700 text-white mt-4"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Process Refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Processing Overlay */}
      <ProcessingOverlay />
    </div>
  );
}
