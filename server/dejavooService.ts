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
    // Determine endpoint URL based on terminal type
    let url = `http://${ipAddress}/spin/v1/status`;
    
    // If it's not a SPIN terminal, adjust the endpoint
    if (options.terminalType && options.terminalType !== 'SPIN') {
      url = `http://${ipAddress}/rest/v1/status`;
    }
    
    // Prepare request headers with API key if provided
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    if (options.apiKey) {
      headers["X-API-Key"] = options.apiKey;
    }
    
    // Add test mode param if specified
    if (options.testMode) {
      url += "?test=true";
    }
    
    // Send request to check if terminal is reachable
    const response = await axios.get(url, { 
      headers,
      timeout: 5000 
    });
    
    // If we get a response, the terminal is connected
    return response.status === 200;
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
    // Format amount for Dejavoo (in cents)
    const amountInCents = Math.round(amount * 100).toString();
    
    // Determine endpoint URL based on terminal type
    let url = `http://${ipAddress}/spin/v1/txn`;
    
    // If it's not a SPIN terminal, adjust the endpoint
    if (options.terminalType && options.terminalType !== 'SPIN') {
      url = `http://${ipAddress}/rest/v1/transaction`;
    }
    
    // Prepare request headers with API key if provided
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    if (options.apiKey) {
      headers["X-API-Key"] = options.apiKey;
    }
    
    // Add test mode param if specified
    if (options.testMode) {
      url += "?test=true";
    }
    
    // Create payment request payload
    const payload: any = {
      TxnType: "Sale",
      AmtInfo: {
        TotAmt: amountInCents,
      },
      ClerkID: "1",
      TrlNum: "1",
    };
    
    // Add tipping option if enabled
    if (options.enableTipping) {
      payload.TipInfo = {
        TipEnable: true
      };
    }
    
    // Add signature option if enabled
    if (options.enableSignature !== undefined) {
      payload.SignCapture = options.enableSignature;
    }
    
    // Determine timeout (default to 90 seconds if not specified)
    const timeout = options.transactionTimeout ? options.transactionTimeout * 1000 : 90000;
    
    // Send request to terminal
    const response = await axios.post(url, payload, {
      headers,
      timeout
    });
    
    const data = response.data;
    
    // Parse the response
    if (data.ApprovedDE38 === "APPROVED") {
      return {
        status: "approved",
        transactionId: data.TxnId || "",
        dateTime: new Date().toISOString(),
        cardType: data.CardType || "Credit",
        maskedPan: data.PAN || "**** **** **** ****",
        authCode: data.AuthCode || "",
        hostResponseCode: data.RespCode || "",
        hostResponseMessage: data.ResponseDE44 || ""
      };
    } else {
      return {
        status: "declined",
        message: data.ResponseDE44 || "Transaction declined",
        hostResponseCode: data.RespCode || "",
        hostResponseMessage: data.ResponseDE44 || ""
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
      message: "Payment processing failed: Could not communicate with terminal"
    };
  }
}

// Void transaction (can be used to cancel or refund)
export async function voidTransaction(
  ipAddress: string,
  transactionId: string,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Determine endpoint URL based on terminal type
    let url = `http://${ipAddress}/spin/v1/txn`;
    
    // If it's not a SPIN terminal, adjust the endpoint
    if (options.terminalType && options.terminalType !== 'SPIN') {
      url = `http://${ipAddress}/rest/v1/transaction`;
    }
    
    // Prepare request headers with API key if provided
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    if (options.apiKey) {
      headers["X-API-Key"] = options.apiKey;
    }
    
    // Add test mode param if specified
    if (options.testMode) {
      url += "?test=true";
    }
    
    const payload = {
      TxnType: "Void",
      TxnId: transactionId,
      ClerkID: "1",
      TrlNum: "1",
    };
    
    const response = await axios.post(url, payload, {
      headers,
      timeout: 30000,
    });
    
    const data = response.data;
    
    if (data.ApprovedDE38 === "APPROVED") {
      return {
        status: "approved",
        message: "Transaction voided successfully",
        transactionId: data.TxnId || "",
      };
    } else {
      return {
        status: "declined",
        message: data.ResponseDE44 || "Void transaction declined",
      };
    }
  } catch (error) {
    console.error("Void transaction failed:", error);
    return {
      status: "declined",
      message: "Void transaction failed: Could not communicate with terminal",
    };
  }
}

// Settle batch (end of day)
export async function settleBatch(
  ipAddress: string,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Determine endpoint URL based on terminal type
    let url = `http://${ipAddress}/spin/v1/settle`;
    
    // If it's not a SPIN terminal, adjust the endpoint
    if (options.terminalType && options.terminalType !== 'SPIN') {
      url = `http://${ipAddress}/rest/v1/settle`;
    }
    
    // Prepare request headers with API key if provided
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    if (options.apiKey) {
      headers["X-API-Key"] = options.apiKey;
    }
    
    // Add test mode param if specified
    if (options.testMode) {
      url += "?test=true";
    }
    
    const payload = {
      ClerkID: "1",
    };
    
    const response = await axios.post(url, payload, {
      headers,
      timeout: 60000,
    });
    
    const data = response.data;
    
    if (data.ApprovedDE38 === "APPROVED") {
      return {
        status: "approved",
        message: "Batch settled successfully",
      };
    } else {
      return {
        status: "declined",
        message: data.ResponseDE44 || "Batch settlement declined",
      };
    }
  } catch (error) {
    console.error("Batch settlement failed:", error);
    return {
      status: "declined",
      message: "Batch settlement failed: Could not communicate with terminal",
    };
  }
}
