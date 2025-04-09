import { useCashRegister } from "@/lib/cashRegisterContext";
import { Button } from "@/components/ui/button";

const StatusIcon = ({ type }: { type: 'success' | 'error' | 'warning' | 'info' }) => {
  switch (type) {
    case 'success':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-success mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'error':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-destructive mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case 'warning':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-warning mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
};

// Refund icon component using SVG for consistency with other icons
const RefundIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);

export default function TransactionStatus() {
  const { 
    statusMessage, 
    statusType, 
    terminalStatus, 
    isTransactionInProgress, 
    receipt,
    resetTransaction,
    isRefundMode,
    setRefundMode,
    processRefund 
  } = useCashRegister();

  let bgClass = 'bg-gray-50';
  let textClass = 'text-gray-700';
  
  switch (statusType) {
    case 'success':
      bgClass = 'bg-green-50';
      textClass = 'text-success';
      break;
    case 'error':
      bgClass = 'bg-red-50';
      textClass = 'text-destructive';
      break;
    case 'warning':
      bgClass = 'bg-yellow-50';
      textClass = 'text-warning';
      break;
  }

  // Check if this transaction is refundable (only approved card transactions can be refunded)
  const isRefundable = receipt && 
                     receipt.status === 'approved' && 
                     receipt.paymentMethod === 'card';
  
  const handleRefund = () => {
    // If not in refund mode, just toggle the mode
    if (!isRefundMode) {
      setRefundMode(true);
    } else {
      // Actually process the refund when in refund mode
      processRefund();
    }
  };
  
  const handleCancelRefund = () => {
    setRefundMode(false);
  };

  return (
    <div className="border-t border-gray-200 pt-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Transaction Status</h2>
      <div className={`${bgClass} rounded-lg p-4 mb-4 min-h-[120px] flex flex-col justify-center items-center`}>
        <div className="text-center">
          <StatusIcon type={statusType} />
          <p className={`${textClass} font-medium`}>
            {isRefundMode ? "Enter the refund amount and click 'Process Refund'" : statusMessage}
          </p>
          
          {/* Action Buttons */}
          {isTransactionInProgress && (
            <div className="mt-4 flex justify-center space-x-2">
              {isRefundable && !isRefundMode && (
                <Button 
                  variant="outline"
                  onClick={handleRefund}
                  className="text-amber-600 border-amber-600 hover:bg-amber-100"
                >
                  <RefundIcon />
                  Refund
                </Button>
              )}
              
              {isRefundMode && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleCancelRefund}
                  >
                    Cancel Refund
                  </Button>
                  <Button 
                    variant="default"
                    onClick={handleRefund}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <RefundIcon />
                    Process Refund
                  </Button>
                </>
              )}
              
              {!isRefundMode && (
                <Button 
                  variant="outline" 
                  onClick={resetTransaction}
                >
                  New Transaction
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Terminal connection status */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-4">
        <span className="text-sm font-medium text-gray-700">Terminal Status</span>
        <div className="flex items-center">
          <span className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${
            terminalStatus === 'connected' 
              ? 'bg-success' 
              : terminalStatus === 'failed' 
                ? 'bg-destructive' 
                : 'bg-gray-300'
          }`}></span>
          <span className="text-sm text-gray-600">
            {terminalStatus === 'connected' 
              ? 'Connected' 
              : terminalStatus === 'failed' 
                ? 'Connection failed' 
                : 'Not configured'}
          </span>
        </div>
      </div>
    </div>
  );
}
