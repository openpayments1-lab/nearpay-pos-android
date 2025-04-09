import React, { createContext, useState, useContext, useCallback } from "react";
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  PaymentMethod, 
  TerminalStatus, 
  StatusType, 
  Receipt,
  CardDetails 
} from "@/types";
import { generateTransactionId } from "./utils";

interface CashRegisterContextType {
  amount: string;
  setAmount: (amount: string) => void;
  selectedPaymentMethod: PaymentMethod | null;
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
  terminalStatus: TerminalStatus;
  terminalIp: string;
  checkTerminalConnection: (ip: string) => void;
  isTransactionInProgress: boolean;
  isProcessing: boolean;
  statusMessage: string;
  statusType: StatusType;
  processingMessage: string;
  processingDetails: string;
  receipt: Receipt | null;
  isReceiptVisible: boolean;
  processTransaction: () => void;
  resetTransaction: () => void;
}

const CashRegisterContext = createContext<CashRegisterContextType>({
  amount: "0.00",
  setAmount: () => {},
  selectedPaymentMethod: null,
  setSelectedPaymentMethod: () => {},
  terminalStatus: "not-configured",
  terminalIp: "",
  checkTerminalConnection: () => {},
  isTransactionInProgress: false,
  isProcessing: false,
  statusMessage: "Ready for transaction",
  statusType: "info",
  processingMessage: "",
  processingDetails: "",
  receipt: null,
  isReceiptVisible: false,
  processTransaction: () => {},
  resetTransaction: () => {},
});

export const CashRegisterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [amount, setAmount] = useState("0.00");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>("not-configured");
  const [terminalIp, setTerminalIp] = useState("");
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready for transaction");
  const [statusType, setStatusType] = useState<StatusType>("info");
  const [processingMessage, setProcessingMessage] = useState("");
  const [processingDetails, setProcessingDetails] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);
  
  const { toast } = useToast();

  const updateStatus = useCallback((message: string, type: StatusType) => {
    setStatusMessage(message);
    setStatusType(type);
  }, []);

  const checkTerminalConnection = useCallback(async (ip: string) => {
    setTerminalIp(ip);
    updateStatus("Connecting to terminal...", "info");
    
    try {
      const res = await apiRequest("POST", "/api/terminal/check", { ip });
      const data = await res.json();
      
      if (data.connected) {
        setTerminalStatus("connected");
        updateStatus("Terminal connected successfully", "success");
        
        toast({
          title: "Terminal Connected",
          description: "Successfully connected to Dejavoo terminal.",
          variant: "default",
        });
      } else {
        setTerminalStatus("failed");
        updateStatus("Could not connect to terminal. Please check IP address.", "error");
        
        toast({
          title: "Connection Failed",
          description: "Could not connect to Dejavoo terminal. Please check the IP address.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTerminalStatus("failed");
      updateStatus("Error connecting to terminal", "error");
      
      toast({
        title: "Connection Error",
        description: "An error occurred while trying to connect to the terminal.",
        variant: "destructive",
      });
    }
  }, [updateStatus, toast]);

  const processCashPayment = useCallback(async (amount: string) => {
    updateStatus("Processing cash payment...", "info");
    setProcessingMessage("Processing Cash Payment");
    setProcessingDetails("Please wait...");
    setIsProcessing(true);
    
    try {
      // Process cash payment through API
      const res = await apiRequest("POST", "/api/payment/cash", { amount });
      const data = await res.json();
      
      setIsProcessing(false);
      
      const newReceipt: Receipt = {
        transactionId: data.transactionId || generateTransactionId(),
        amount,
        paymentMethod: "cash",
        dateTime: data.dateTime || new Date().toLocaleString(),
        status: "completed"
      };
      
      setReceipt(newReceipt);
      setIsReceiptVisible(true);
      updateStatus("Cash payment completed successfully", "success");
      
      toast({
        title: "Payment Successful",
        description: `Cash payment of $${parseFloat(amount).toFixed(2)} completed`,
        variant: "default",
      });
    } catch (error) {
      setIsProcessing(false);
      updateStatus("Cash payment processing failed", "error");
      
      toast({
        title: "Payment Failed",
        description: "Failed to process cash payment. Please try again.",
        variant: "destructive",
      });
    }
  }, [updateStatus, toast]);

  const processCardPayment = useCallback(async (amount: string) => {
    if (terminalStatus !== "connected") {
      updateStatus("Terminal not connected. Please check configuration.", "error");
      return;
    }
    
    setIsProcessing(true);
    setProcessingMessage("Processing Card Payment");
    setProcessingDetails("Please complete the transaction on the terminal");
    updateStatus("Sending transaction to terminal...", "info");
    
    try {
      // Send transaction to Dejavoo terminal
      const res = await apiRequest("POST", "/api/payment/card", { 
        amount,
        terminalIp 
      });
      
      const data = await res.json();
      setIsProcessing(false);
      
      if (data.status === "approved") {
        const cardDetails: CardDetails = {
          type: data.cardType || "Credit",
          number: data.maskedPan || "**** **** **** ****",
          authCode: data.authCode || "N/A"
        };
        
        const newReceipt: Receipt = {
          transactionId: data.transactionId || generateTransactionId(),
          amount,
          paymentMethod: "card",
          dateTime: data.dateTime || new Date().toLocaleString(),
          status: "approved",
          cardDetails
        };
        
        setReceipt(newReceipt);
        setIsReceiptVisible(true);
        updateStatus("Card payment approved", "success");
        
        toast({
          title: "Payment Approved",
          description: `Card payment of $${parseFloat(amount).toFixed(2)} approved`,
          variant: "default",
        });
      } else {
        const newReceipt: Receipt = {
          transactionId: data.transactionId || generateTransactionId(),
          amount,
          paymentMethod: "card",
          dateTime: data.dateTime || new Date().toLocaleString(),
          status: "declined"
        };
        
        setReceipt(newReceipt);
        setIsReceiptVisible(true);
        updateStatus("Card payment declined", "error");
        
        toast({
          title: "Payment Declined",
          description: "Card payment was declined. Please try another method.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsProcessing(false);
      updateStatus("Card payment processing failed", "error");
      
      toast({
        title: "Payment Failed",
        description: "Failed to process card payment. Please try again.",
        variant: "destructive",
      });
    }
  }, [terminalStatus, terminalIp, updateStatus, toast]);

  const processTransaction = useCallback(() => {
    if (!selectedPaymentMethod) return;
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) return;
    
    setIsTransactionInProgress(true);
    
    if (selectedPaymentMethod === "cash") {
      processCashPayment(amount);
    } else if (selectedPaymentMethod === "card") {
      processCardPayment(amount);
    }
  }, [selectedPaymentMethod, amount, processCashPayment, processCardPayment]);

  const resetTransaction = useCallback(() => {
    setAmount("0.00");
    setSelectedPaymentMethod(null);
    setIsTransactionInProgress(false);
    setIsProcessing(false);
    setIsReceiptVisible(false);
    setReceipt(null);
    setProcessingMessage("");
    setProcessingDetails("");
    updateStatus("Ready for transaction", "info");
  }, [updateStatus]);

  const value = {
    amount,
    setAmount,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    terminalStatus,
    terminalIp,
    checkTerminalConnection,
    isTransactionInProgress,
    isProcessing,
    statusMessage,
    statusType,
    processingMessage,
    processingDetails,
    receipt,
    isReceiptVisible,
    processTransaction,
    resetTransaction
  };

  return (
    <CashRegisterContext.Provider value={value}>
      {children}
    </CashRegisterContext.Provider>
  );
};

export const useCashRegister = () => useContext(CashRegisterContext);
