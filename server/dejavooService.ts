import axios from "axios";
import { DejavooTransactionResponse } from "@shared/schema";

interface TerminalCheckOptions {
  terminalType?: string;
  apiKey?: string;
  testMode?: boolean;
}

interface CardPaymentOptions {
  terminalType?: string;
  apiKey?: string;
  enableTipping?: boolean;
  enableSignature?: boolean;
  testMode?: boolean;
  transactionTimeout?: number;
}

// Check if the terminal is reachable
export async function checkTerminalConnection(
  ipAddress: string, 
  options: TerminalCheckOptions = {}
): Promise<boolean> {
  try {
    // Use the Dejavoo API endpoint to check status
    const url = 'https://api.spinpos.net/v2/Terminal/Status';
    
    // Prepare request payload
    const payload = {
      Tpn: options.terminalType || "z11invtest69",  // Default to test TPN if not provided
      Authkey: options.apiKey || "JZiRUusizc",      // Default to test key if not provided
    };
    
    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    console.log('Checking terminal status with Dejavoo API:', JSON.stringify(payload));
    
    // Send request to check terminal status
    const response = await axios.post(url, payload, { 
      headers,
      timeout: 10000 
    });
    
    console.log('Terminal status response:', JSON.stringify(response.data));
    
    // Handle the Dejavoo API response format
    if (response.status === 200 && response.data) {
      // Check if the terminal is online based on GeneralResponse if it exists
      if (response.data.GeneralResponse) {
        return response.data.GeneralResponse.ResultCode === "Ok" || 
               (response.data.GeneralResponse.StatusCode && response.data.GeneralResponse.StatusCode.includes("Approved"));
      }
      // Fallback to the old Status field if GeneralResponse doesn't exist
      if (response.data.Status) {
        return response.data.Status === "Online" || response.data.Status === "Success";
      }
    }
    
    return false;
  } catch (error) {
    console.error("Terminal connection check failed:", error);
    return false;
  }
}

// Process card payment with Dejavoo terminal
export async function processCardPayment(
  ipAddress: string, 
  amount: number,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Use the Dejavoo API endpoint directly
    const url = 'https://api.spinpos.net/v2/Payment/Sale';
    
    // Generate a unique reference ID
    const referenceId = generateUniqueId();
    
    // Create payment request payload
    const payload: any = {
      Amount: amount,
      TipAmount: options.enableTipping ? null : 0, // Allow tipping if enabled
      ExternalReceipt: "",
      PaymentType: "Credit",
      ReferenceId: referenceId,
      PrintReceipt: "No",
      GetReceipt: "No",
      MerchantNumber: null,
      InvoiceNumber: "",
      CaptureSignature: options.enableSignature || false,
      GetExtendedData: true,
      CallbackInfo: {
        Url: ""
      },
      Tpn: options.terminalType || "z11invtest69",  // Default to test TPN if not provided
      Authkey: options.apiKey || "JZiRUusizc",      // Default to test key if not provided
      SPInProxyTimeout: options.transactionTimeout || null,
      CustomFields: {}
    };
    
    console.log('Sending payment request to Dejavoo API:', JSON.stringify(payload));
    
    // Determine timeout (default to 90 seconds if not specified)
    const timeout = options.transactionTimeout ? options.transactionTimeout * 1000 : 90000;
    
    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    // Send request to Dejavoo API
    const response = await axios.post(url, payload, {
      headers,
      timeout
    });
    
    const data = response.data;
    console.log('Received response from Dejavoo API:', JSON.stringify(data));
    
    // Parse the response based on the structure you provided
    if (data.GeneralResponse && data.GeneralResponse.StatusCode && data.GeneralResponse.StatusCode.startsWith("Approved")) {
      return {
        status: "approved",
        transactionId: data.TransactionNumber || data.ReferenceId || referenceId,
        dateTime: new Date().toISOString(),
        cardType: data.CardData?.CardType || "Credit",
        maskedPan: data.CardData?.Last4 ? `**** **** **** ${data.CardData.Last4}` : "**** **** **** ****",
        authCode: data.AuthCode || "",
        hostResponseCode: data.GeneralResponse.HostResponseCode || "",
        hostResponseMessage: data.GeneralResponse.HostResponseMessage || ""
      };
    } else {
      return {
        status: "declined",
        message: data.GeneralResponse?.DetailedMessage || data.GeneralResponse?.Message || "Transaction declined",
        hostResponseCode: data.GeneralResponse?.HostResponseCode || "",
        hostResponseMessage: data.GeneralResponse?.HostResponseMessage || ""
      };
    }
  } catch (error) {
    console.error("Card payment processing failed:", error);
    
    // Check if it's an Axios error with response data
    if (axios.isAxiosError(error) && error.response) {
      const responseData = error.response.data;
      return {
        status: "declined",
        message: responseData.message || "Payment processing failed",
        hostResponseCode: responseData.code || "",
        hostResponseMessage: responseData.message || ""
      };
    }
    
    // Generic error
    return {
      status: "declined",
      message: "Payment processing failed: Could not communicate with Dejavoo API"
    };
  }
}

// Helper function to generate a unique reference ID
function generateUniqueId(): string {
  return Math.random().toString(16).slice(2);
}

// Void transaction (can be used to cancel or refund)
export async function voidTransaction(
  ipAddress: string,
  transactionId: string,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Use the Dejavoo API endpoint directly
    const url = 'https://api.spinpos.net/v2/Payment/Void';
    
    // Generate a unique reference ID
    const referenceId = generateUniqueId();
    
    // Prepare request payload
    const payload = {
      TransactionId: transactionId,
      ReferenceId: referenceId,
      Tpn: options.terminalType || "z11invtest69",  // Default to test TPN if not provided
      Authkey: options.apiKey || "JZiRUusizc",      // Default to test key if not provided
    };
    
    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    console.log('Sending void request to Dejavoo API:', JSON.stringify(payload));
    
    // Send request to Dejavoo API
    const response = await axios.post(url, payload, {
      headers,
      timeout: 30000,
    });
    
    const data = response.data;
    console.log('Received void response from Dejavoo API:', JSON.stringify(data));
    
    if (data.GeneralResponse && data.GeneralResponse.StatusCode && data.GeneralResponse.StatusCode.startsWith("Approved")) {
      return {
        status: "approved",
        message: "Transaction voided successfully",
        transactionId: data.TransactionNumber || data.ReferenceId || transactionId,
      };
    } else {
      return {
        status: "declined",
        message: data.GeneralResponse?.DetailedMessage || data.GeneralResponse?.Message || "Void transaction declined",
      };
    }
  } catch (error) {
    console.error("Void transaction failed:", error);
    
    // Check if it's an Axios error with response data
    if (axios.isAxiosError(error) && error.response) {
      const responseData = error.response.data;
      return {
        status: "declined",
        message: responseData.message || "Void failed",
        hostResponseCode: responseData.code || "",
        hostResponseMessage: responseData.message || ""
      };
    }
    
    return {
      status: "declined",
      message: "Void transaction failed: Could not communicate with Dejavoo API",
    };
  }
}

// Settle batch (end of day)
export async function settleBatch(
  ipAddress: string,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Use the Dejavoo API endpoint directly
    const url = 'https://api.spinpos.net/v2/Payment/Settle';
    
    // Generate a unique reference ID
    const referenceId = generateUniqueId();
    
    // Prepare request payload
    const payload = {
      ReferenceId: referenceId,
      Tpn: options.terminalType || "z11invtest69",  // Default to test TPN if not provided
      Authkey: options.apiKey || "JZiRUusizc",      // Default to test key if not provided
    };
    
    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    console.log('Sending batch settlement request to Dejavoo API:', JSON.stringify(payload));
    
    // Send request to Dejavoo API
    const response = await axios.post(url, payload, {
      headers,
      timeout: 60000,
    });
    
    const data = response.data;
    console.log('Received batch settlement response from Dejavoo API:', JSON.stringify(data));
    
    if (data.GeneralResponse && data.GeneralResponse.StatusCode && data.GeneralResponse.StatusCode.startsWith("Approved")) {
      return {
        status: "approved",
        message: "Batch settled successfully",
      };
    } else {
      return {
        status: "declined",
        message: data.GeneralResponse?.DetailedMessage || data.GeneralResponse?.Message || "Batch settlement declined",
      };
    }
  } catch (error) {
    console.error("Batch settlement failed:", error);
    
    // Check if it's an Axios error with response data
    if (axios.isAxiosError(error) && error.response) {
      const responseData = error.response.data;
      return {
        status: "declined",
        message: responseData.message || "Batch settlement failed",
        hostResponseCode: responseData.code || "",
        hostResponseMessage: responseData.message || ""
      };
    }
    
    return {
      status: "declined",
      message: "Batch settlement failed: Could not communicate with Dejavoo API",
    };
  }
}
