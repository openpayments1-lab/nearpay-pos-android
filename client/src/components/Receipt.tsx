import { Button } from "@/components/ui/button";
import { useCashRegister } from "@/lib/cashRegisterContext";
import { useToast } from "@/hooks/use-toast";

export default function Receipt() {
  const { receipt, isReceiptVisible } = useCashRegister();
  const { toast } = useToast();

  if (!isReceiptVisible || !receipt) {
    return null;
  }

  const handlePrintReceipt = () => {
    toast({
      title: "Print Receipt",
      description: "Printing functionality would be implemented here.",
    });
  };

  return (
    <div className="border-t border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Receipt</h2>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Transaction ID:</span>
          <span className="font-medium">{receipt.transactionId}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Amount:</span>
          <span className="font-medium">${parseFloat(receipt.amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Payment Method:</span>
          <span className="font-medium">{receipt.paymentMethod === 'cash' ? 'Cash' : 'Credit Card'}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Date/Time:</span>
          <span className="font-medium">{receipt.dateTime}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${
            receipt.status === 'approved' || receipt.status === 'completed' 
              ? 'text-success' 
              : receipt.status === 'declined' 
                ? 'text-destructive' 
                : ''
          }`}>
            {receipt.status === 'approved' ? 'Approved' : 
             receipt.status === 'completed' ? 'Completed' : 
             receipt.status === 'declined' ? 'Declined' : receipt.status}
          </span>
        </div>
        
        {receipt.paymentMethod === 'card' && receipt.cardDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Card Type:</span>
              <span className="font-medium">{receipt.cardDetails.type}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Card Number:</span>
              <span className="font-medium">{receipt.cardDetails.number}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Auth Code:</span>
              <span className="font-medium">{receipt.cardDetails.authCode}</span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          className="flex items-center"
          onClick={handlePrintReceipt}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print
        </Button>
      </div>
    </div>
  );
}
