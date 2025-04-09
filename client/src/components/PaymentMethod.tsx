import { Button } from "@/components/ui/button";
import { useCashRegister } from "@/lib/cashRegisterContext";
import { PaymentMethod as PaymentMethodType } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function PaymentMethod() {
  const { 
    selectedPaymentMethod, 
    setSelectedPaymentMethod, 
    isTransactionInProgress,
    processTransaction,
    processRefund,
    resetTransaction,
    amount,
    terminalStatus,
    isRefundMode
  } = useCashRegister();
  
  const { toast } = useToast();

  const handleSelectPaymentMethod = (method: PaymentMethodType) => {
    if (isTransactionInProgress) return;
    
    setSelectedPaymentMethod(method);
    
    if (method === 'card' && terminalStatus !== 'connected') {
      toast({
        title: "Terminal Not Connected",
        description: "Please configure the terminal IP address to process card payments.",
        variant: "destructive"
      });
    }
  };

  const handleProcessTransaction = () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method before processing.",
        variant: "destructive"
      });
      return;
    }
    
    if (parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedPaymentMethod === 'card' && terminalStatus !== 'connected') {
      toast({
        title: "Terminal Not Connected",
        description: "Please configure the terminal IP address to process card payments.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if we're in refund mode
    if (isRefundMode) {
      if (selectedPaymentMethod !== 'card') {
        toast({
          title: "Only Card Refunds",
          description: "Only card transactions can be refunded through this interface.",
          variant: "destructive"
        });
        return;
      }
      processRefund();
    } else {
      processTransaction();
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-700">
          {isRefundMode ? 'Refund Method' : 'Payment Method'}
        </h2>
        {isRefundMode && (
          <div className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded">
            Refund Mode
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="outline"
          className={`flex items-center justify-center py-6 px-5 text-gray-700 font-medium ${
            selectedPaymentMethod === 'cash' ? 'ring-2 ring-primary bg-blue-50' : ''
          } ${
            isRefundMode ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => handleSelectPaymentMethod('cash')}
          disabled={isTransactionInProgress || isRefundMode}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <line x1="12" y1="6" x2="12" y2="8" />
            <line x1="12" y1="16" x2="12" y2="18" />
          </svg>
          Cash {isRefundMode ? '(Not Available for Refunds)' : 'Payment'}
        </Button>
        <Button
          variant="outline"
          className={`flex items-center justify-center py-6 px-5 text-gray-700 font-medium ${
            selectedPaymentMethod === 'card' ? 'ring-2 ring-primary bg-blue-50' : ''
          }`}
          onClick={() => handleSelectPaymentMethod('card')}
          disabled={isTransactionInProgress}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          {isRefundMode ? 'Card Refund' : 'Credit Card'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <Button
          variant="secondary"
          className="py-3 text-gray-700 font-medium"
          onClick={resetTransaction}
          disabled={isTransactionInProgress}
        >
          Cancel
        </Button>
        <Button
          variant={isRefundMode ? "outline" : "default"}
          className={`py-3 font-medium ${
            isRefundMode 
              ? 'text-amber-600 border-amber-600 hover:bg-amber-100'
              : 'bg-primary hover:bg-blue-700'
          } ${
            (!selectedPaymentMethod || parseFloat(amount) <= 0 || isTransactionInProgress) 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
          onClick={handleProcessTransaction}
          disabled={!selectedPaymentMethod || parseFloat(amount) <= 0 || isTransactionInProgress}
        >
          {isRefundMode ? 'Process Refund' : 'Process Payment'}
        </Button>
      </div>
    </div>
  );
}
