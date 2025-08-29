import React, { createContext, useState, useContext, useCallback, useEffect } from "react";
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  PaymentMethod, 
  TerminalStatus, 
  StatusType, 
  Receipt,
  CardDetails,
  TerminalConfig
} from "@/types";
import { generateTransactionId } from "./utils";

interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  iPosToken: string | null;
  tokenStatus: string | null;
  cardType: string | null;
  cardLast4: string | null;
}

interface CashRegisterContextType {
  amount: string;
  setAmount: (amount: string) => void;
  selectedPaymentMethod: PaymentMethod | null;
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
  selectedCustomer: CustomerProfile | null;
  setSelectedCustomer: (customer: CustomerProfile | null) => void;
  terminalStatus: TerminalStatus;
  terminalIp: string;
  terminalConfig: TerminalConfig;
  checkTerminalConnection: (ip: string, forceCheck?: boolean) => void;
  updateTerminalConfig: (config: TerminalConfig) => void;
  isTransactionInProgress: boolean;
  isProcessing: boolean;
  statusMessage: string;
  statusType: StatusType;
  processingMessage: string;
  processingDetails: string;
  receipt: Receipt | null;
  isReceiptVisible: boolean;
  processTransaction: () => void;
  processRefund: () => void;
  resetTransaction: () => void;
  isRefundMode: boolean;
  setRefundMode: (isRefund: boolean) => void;
  lastTransactionId: string | null;
}

// Default terminal configuration
const defaultTerminalConfig: TerminalConfig = {
  terminalIp: "",
  apiKey: "JZiRUusizc",
  terminalType: "z11invtest69", // Must be at least 10 characters
  enableTipping: false,
  enableSignature: true,
  testMode: false,
  transactionTimeout: 90,
  iPosAuthToken: ""
};

const CashRegisterContext = createContext<CashRegisterContextType>({
  amount: "0.00",
  setAmount: () => {},
  selectedPaymentMethod: null,
  setSelectedPaymentMethod: () => {},
  selectedCustomer: null,
  setSelectedCustomer: () => {},
  terminalStatus: "not-configured",
  terminalIp: "",
  terminalConfig: defaultTerminalConfig,
  checkTerminalConnection: () => {},
  updateTerminalConfig: () => {},
  isTransactionInProgress: false,
  isProcessing: false,
  statusMessage: "Ready for transaction",
  statusType: "info",
  processingMessage: "",
  processingDetails: "",
  receipt: null,
  isReceiptVisible: false,
  processTransaction: () => {},
  processRefund: () => {},
  resetTransaction: () => {},
  isRefundMode: false,
  setRefundMode: () => {},
  lastTransactionId: null,
});

export const CashRegisterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [amount, setAmount] = useState("0.00");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>("not-configured");
  const [terminalIp, setTerminalIp] = useState("");
  const [terminalConfig, setTerminalConfig] = useState<TerminalConfig>(defaultTerminalConfig);
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready for transaction");
  const [statusType, setStatusType] = useState<StatusType>("info");
  const [processingMessage, setProcessingMessage] = useState("");
  const [processingDetails, setProcessingDetails] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);
  const [isRefundMode, setRefundMode] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const updateStatus = useCallback((message: string, type: StatusType) => {
    setStatusMessage(message);
    setStatusType(type);
  }, []);

  const updateTerminalConfig = useCallback(async (config: TerminalConfig) => {
    setTerminalConfig(config);
    setTerminalIp(config.terminalIp);
    
    try {
      // Save terminal configuration to database
      await apiRequest("POST", "/api/settings/terminal", config);
      console.log("Terminal configuration saved to database");
    } catch (error) {
      console.error("Failed to save terminal configuration:", error);
      toast({
        title: "Save Error",
        description: "Failed to save terminal configuration to the database",
        variant: "destructive",
      });
    }
  }, [toast]);

  const checkTerminalConnection = useCallback(async (ip: string, forceCheck = false) => {
    // First, check if we already have a connected state with this IP
    const currentConnectionStatus = localStorage.getItem('terminalConnectionStatus');
    const currentIp = localStorage.getItem('terminalIp');
    
    if (!forceCheck && 
        currentConnectionStatus === 'connected' && 
        currentIp === ip && 
        terminalStatus === 'connected') {
      console.log(`Terminal already connected to ${ip} - skipping check`);
      return true;
    }
    
    // If we're not already connected or forcing a check, proceed as normal
    setTerminalIp(ip);
    localStorage.setItem('terminalIp', ip);
    updateStatus("Checking terminal connection...", "info");
    
    try {
      // Pass terminal ID (TPN) and API key for the Dejavoo API
      const payload = { 
        ip, // This is optional now with the remote API
        terminalType: terminalConfig.terminalType, // This is now used as TPN (Terminal ID)
        apiKey: terminalConfig.apiKey,
        testMode: terminalConfig.testMode
      };
      
      const res = await apiRequest("POST", "/api/terminal/check", payload);
      const data = await res.json();
      
      if (data.connected) {
        // Terminal is properly connected
        setTerminalStatus("connected");
        updateStatus("Terminal connected successfully", "success");
        
        // Store the terminal connection status in local storage
        try {
          localStorage.setItem('terminalConnectionStatus', 'connected');
          localStorage.setItem('terminalIp', ip);
        } catch (e) {
          // Ignore local storage errors
        }
        
        toast({
          title: "Terminal Connected",
          description: "Successfully connected to Dejavoo terminal.",
          variant: "default",
        });
      } else {
        // Terminal exists but is not connected or has an issue
        setTerminalStatus("failed");
        
        // Clear the terminal connection status from local storage
        try {
          localStorage.removeItem('terminalConnectionStatus');
        } catch (e) {
          // Ignore local storage errors
        }
        
        // Use the detailed message from the API if available
        if (data.message) {
          let statusType: StatusType = "error";
          let toastVariant: "default" | "destructive" = "destructive";
          let title = "Connection Failed";
          
          // Handle different terminal states
          if (data.status === "success") {
            // We have a response from the API but the terminal is not ready
            if (data.message.includes("in use")) {
              statusType = "warning";
              toastVariant = "default";
              title = "Terminal Busy";
              
              // If terminal is busy, it's still connected
              setTerminalStatus("connected");
              try {
                localStorage.setItem('terminalConnectionStatus', 'connected');
              } catch (e) {
                // Ignore local storage errors
              }
            } else if (data.message.includes("busy")) {
              statusType = "warning";
              toastVariant = "default";
              title = "Service Busy";
              
              // If service is busy, the terminal is still connected
              setTerminalStatus("connected");
              try {
                localStorage.setItem('terminalConnectionStatus', 'connected');
              } catch (e) {
                // Ignore local storage errors
              }
            } else if (data.message.includes("not found")) {
              statusType = "error";
              title = "Invalid Terminal ID";
            }
          }
          
          updateStatus(data.message, statusType);
          
          toast({
            title: title,
            description: data.message,
            variant: toastVariant,
          });
        } else {
          // Fallback to generic error message
          updateStatus("Could not connect to terminal. Please check settings.", "error");
          
          toast({
            title: "Connection Failed",
            description: "Could not connect to Dejavoo terminal. Please check the connection settings.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      setTerminalStatus("failed");
      updateStatus("Error connecting to terminal", "error");
      
      // Clear the terminal connection status from local storage
      try {
        localStorage.removeItem('terminalConnectionStatus');
      } catch (e) {
        // Ignore local storage errors
      }
      
      toast({
        title: "Connection Error",
        description: "An error occurred while trying to connect to the terminal.",
        variant: "destructive",
      });
    }
  }, [terminalConfig, updateStatus, toast]);

  const processCashPayment = useCallback(async (amount: string) => {
    updateStatus("Processing cash payment...", "info");
    setProcessingMessage("Processing Cash Payment");
    setProcessingDetails("Please wait...");
    setIsProcessing(true);
    
    try {
      // Process cash payment through API
      const res = await apiRequest("POST", "/api/payment/cash", { 
        amount,
        customerId: selectedCustomer?.id || null
      });
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
  }, [selectedCustomer, updateStatus, toast]);

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
      // Send transaction to Dejavoo terminal with all terminal config settings
      const res = await apiRequest("POST", "/api/payment/card", { 
        amount,
        terminalConfig,
        customerId: selectedCustomer?.id || null
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
          description: data.message || "Card payment was declined. Please try another method.",
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
  }, [terminalStatus, terminalConfig, selectedCustomer, updateStatus, toast]);

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
  
  const processRefund = useCallback(() => {
    if (terminalStatus !== "connected") {
      updateStatus("Terminal not connected. Please check configuration.", "error");
      return;
    }
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) return;
    
    setIsTransactionInProgress(true);
    setIsProcessing(true);
    setProcessingMessage("Processing Refund");
    setProcessingDetails("Please complete the refund on the terminal");
    updateStatus("Sending refund request to terminal...", "info");
    
    // Only card refunds are supported through the terminal
    apiRequest("POST", "/api/payment/refund", { 
      amount,
      terminalConfig
    })
      .then(res => res.json())
      .then(data => {
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
            status: "refunded",
            cardDetails
          };
          
          setReceipt(newReceipt);
          setIsReceiptVisible(true);
          updateStatus("Card refund approved", "success");
          
          // Reset refund mode after successful refund
          setRefundMode(false);
          
          toast({
            title: "Refund Approved",
            description: `Card refund of $${parseFloat(amount).toFixed(2)} approved`,
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
          updateStatus("Card refund declined", "error");
          
          // Also reset refund mode even if declined
          setRefundMode(false);
          
          toast({
            title: "Refund Declined",
            description: data.message || "Card refund was declined.",
            variant: "destructive",
          });
        }
      })
      .catch(error => {
        setIsProcessing(false);
        updateStatus("Card refund processing failed", "error");
        
        // Reset refund mode on error too
        setRefundMode(false);
        
        toast({
          title: "Refund Failed",
          description: "Failed to process card refund. Please try again.",
          variant: "destructive",
        });
      });
  }, [amount, terminalConfig, terminalStatus, updateStatus, toast, setRefundMode]);

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
  
  // Load terminal configuration from database on initialization - only once
  useEffect(() => {
    const loadTerminalConfig = async () => {
      try {
        console.log("Loading terminal configuration from database...");
        const res = await apiRequest("GET", "/api/settings/terminal");
        const data = await res.json();
        
        // Only update if we have valid data
        if (data && data.terminalIp) {
          console.log("Terminal configuration loaded:", data);
          setTerminalConfig(data);
          setTerminalIp(data.terminalIp);
          
          // Don't auto-check connection - just assume it's there if we have config
          // This prevents excessive terminal polling
          if (data.terminalIp && data.apiKey && data.terminalType) {
            // Just set the terminal status to configured, but don't check connection
            setTerminalStatus("configured");
            setStatusMessage("Terminal configured");
            setStatusType("info");
            
            // Optionally check local storage for a previously successful connection
            try {
              const storedStatus = localStorage.getItem('terminalConnectionStatus');
              if (storedStatus === 'connected') {
                setTerminalStatus("connected");
                setStatusMessage("Terminal connected");
                setStatusType("success");
              }
            } catch (e) {
              // Ignore local storage errors
            }
          }
        }
      } catch (error) {
        console.error("Failed to load terminal configuration:", error);
      }
    };
    
    loadTerminalConfig();
  }, []); // Empty dependency array to ensure it only runs once

  const value = {
    amount,
    setAmount,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    selectedCustomer,
    setSelectedCustomer,
    terminalStatus,
    terminalIp,
    terminalConfig,
    checkTerminalConnection,
    updateTerminalConfig,
    isTransactionInProgress,
    isProcessing,
    statusMessage,
    statusType,
    processingMessage,
    processingDetails,
    receipt,
    isReceiptVisible,
    processTransaction,
    processRefund,
    resetTransaction,
    isRefundMode,
    setRefundMode,
    lastTransactionId
  };

  return (
    <CashRegisterContext.Provider value={value}>
      {children}
    </CashRegisterContext.Provider>
  );
};

export const useCashRegister = () => useContext(CashRegisterContext);
