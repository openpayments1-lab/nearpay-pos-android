import axios from "axios";
import { DejavooTransactionResponse } from "@shared/schema";

// Check if the terminal is reachable
export async function checkTerminalConnection(ipAddress: string): Promise<boolean> {
  try {
    // Try to connect to the terminal using the Dejavoo Spin API
    const url = `http://${ipAddress}/spin/v1/status`;
    const response = await axios.get(url, { timeout: 5000 });
    
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
  amount: number
): Promise<DejavooTransactionResponse> {
  try {
    // Format amount for Dejavoo (in cents)
    const amountInCents = Math.round(amount * 100).toString();
    
    // Create Dejavoo Spin API payment request
    const url = `http://${ipAddress}/spin/v1/txn`;
    const payload = {
      TxnType: "Sale",
      AmtInfo: {
        TotAmt: amountInCents,
      },
      ClerkID: "1",
      TrlNum: "1",
    };
    
    // Send request to terminal
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 90000, // 90 second timeout to allow for card processing
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
  transactionId: string
): Promise<DejavooTransactionResponse> {
  try {
    const url = `http://${ipAddress}/spin/v1/txn`;
    const payload = {
      TxnType: "Void",
      TxnId: transactionId,
      ClerkID: "1",
      TrlNum: "1",
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
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
export async function settleBatch(ipAddress: string): Promise<DejavooTransactionResponse> {
  try {
    const url = `http://${ipAddress}/spin/v1/settle`;
    const payload = {
      ClerkID: "1",
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
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
