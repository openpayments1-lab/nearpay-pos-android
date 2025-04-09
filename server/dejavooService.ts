/**
 * dejavooService.ts
 * 
 * Service for integrating with Dejavoo payment terminals using the SPIN REST API.
 * This file provides the implementation for terminal check, card payment processing,
 * and other payment-related operations.
 */

import { DejavooApiService, DejavooTerminalConfig, CardPaymentOptions } from './services/DejavooApiService';
import { DejavooTransactionResponse } from '../shared/schema';

/**
 * Check the connection status of a Dejavoo terminal
 * 
 * @param ipAddress IP address of the terminal (optional with remote API)
 * @param options Terminal configuration options
 * @returns Promise<boolean> indicating if terminal is connected
 */
export async function checkTerminalConnection(
  ipAddress: string,
  options: {
    terminalType?: string;
    apiKey?: string;
    testMode?: boolean;
  } = {}
): Promise<boolean> {
  try {
    // Create a terminal configuration using the provided options
    const config: DejavooTerminalConfig = {
      tpn: options.terminalType || "2247257465", // 10-digit Test TPN (meets length requirement)
      authKey: options.apiKey || "JEkE6S7jPk",   // Use provided API key
      testMode: options.testMode || false
    };
    
    // Create a Dejavoo API service instance
    const dejavooService = new DejavooApiService(config);
    
    // Check terminal status
    const statusResponse = await dejavooService.checkStatus();
    console.log('Terminal status response:', JSON.stringify(statusResponse));
    
    // Return whether the terminal is online
    return statusResponse.online;
  } catch (error) {
    console.error("Terminal connection check failed:", error);
    return false;
  }
}

/**
 * Process a card payment with a Dejavoo terminal
 * 
 * @param ipAddress IP address of the terminal (optional with remote API)
 * @param amount Payment amount
 * @param options Additional payment options
 * @returns Promise with transaction response
 */
export async function processCardPayment(
  ipAddress: string, 
  amount: number,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Generate a unique reference ID for this transaction
    const referenceId = generateUniqueId();
    
    // Create terminal configuration
    const config: DejavooTerminalConfig = {
      tpn: options.terminalType || "2247257465", // Default to test TPN if not provided
      authKey: options.apiKey || "JEkE6S7jPk",     // Default to test key if not provided
      testMode: options.testMode
    };
    
    // Create Dejavoo API service instance
    const dejavooService = new DejavooApiService(config);
    
    // Process the sale transaction
    const response = await dejavooService.processSale(amount, {
      enableTipping: options.enableTipping,
      enableSignature: options.enableSignature,
      transactionTimeout: options.transactionTimeout,
      printReceipt: true  // Use printReceipt instead of getReceipt
    });
    
    console.log('Received response from Dejavoo API:', JSON.stringify(response));
    
    // Parse the response based on the structure
    if (response.generalResponse && 
        response.generalResponse.statusCode && 
        response.generalResponse.statusCode.includes("Approved")) {
      return {
        status: "approved",
        transactionId: response.transactionNumber || response.referenceId || referenceId,
        dateTime: new Date().toISOString(),
        cardType: response.cardData?.cardType || "Credit",
        maskedPan: response.cardData?.last4 ? `**** **** **** ${response.cardData.last4}` : "**** **** **** ****",
        authCode: response.authCode || "",
        hostResponseCode: response.generalResponse.hostResponseCode || "",
        hostResponseMessage: response.generalResponse.hostResponseMessage || ""
      };
    } else {
      return {
        status: "declined",
        message: response.generalResponse?.detailedMessage || 
                 response.generalResponse?.message || 
                 "Transaction declined",
        hostResponseCode: response.generalResponse?.hostResponseCode || "",
        hostResponseMessage: response.generalResponse?.hostResponseMessage || ""
      };
    }
  } catch (error) {
    console.error("Card payment processing failed:", error);
    
    // Generate a meaningful error message
    let errorMessage = "Payment processing failed: Could not communicate with Dejavoo API";
    if (error instanceof Error) {
      errorMessage = `Payment processing failed: ${error.message}`;
    }
    
    // Return a declined transaction response
    return {
      status: "declined",
      message: errorMessage
    };
  }
}

/**
 * Helper function to generate a unique reference ID
 * @returns Unique string ID
 */
function generateUniqueId(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(36);
}

/**
 * Void a transaction
 * 
 * @param ipAddress IP address of the terminal (optional with remote API)
 * @param transactionId ID of the transaction to void
 * @param options Additional options
 * @returns Promise with transaction response
 */
export async function voidTransaction(
  ipAddress: string,
  transactionId: string,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Create terminal configuration
    const config: DejavooTerminalConfig = {
      tpn: options.terminalType || "2247257465", // Default to test TPN if not provided
      authKey: options.apiKey || "JEkE6S7jPk",     // Default to test key if not provided
      testMode: options.testMode
    };
    
    // Create Dejavoo API service instance
    const dejavooService = new DejavooApiService(config);
    
    // Void the transaction
    const response = await dejavooService.voidTransaction(transactionId);
    
    console.log('Received void response from Dejavoo API:', JSON.stringify(response));
    
    // Parse the response
    if (response.generalResponse && 
        response.generalResponse.statusCode && 
        response.generalResponse.statusCode.includes("Approved")) {
      return {
        status: "approved",
        message: "Transaction voided successfully",
        transactionId: response.transactionNumber || response.referenceId || transactionId,
      };
    } else {
      return {
        status: "declined",
        message: response.generalResponse?.detailedMessage || 
                 response.generalResponse?.message || 
                 "Void transaction declined",
      };
    }
  } catch (error) {
    console.error("Void transaction failed:", error);
    
    // Generate a meaningful error message
    let errorMessage = "Void transaction failed: Could not communicate with Dejavoo API";
    if (error instanceof Error) {
      errorMessage = `Void transaction failed: ${error.message}`;
    }
    
    // Return a declined transaction response
    return {
      status: "declined",
      message: errorMessage
    };
  }
}

/**
 * Settle the current batch
 * 
 * @param ipAddress IP address of the terminal (optional with remote API)
 * @param options Additional options
 * @returns Promise with transaction response
 */
export async function settleBatch(
  ipAddress: string,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Create terminal configuration
    const config: DejavooTerminalConfig = {
      tpn: options.terminalType || "2247257465", // Default to test TPN if not provided
      authKey: options.apiKey || "JEkE6S7jPk",     // Default to test key if not provided
      testMode: options.testMode
    };
    
    // Create Dejavoo API service instance
    const dejavooService = new DejavooApiService(config);
    
    // Settle the batch
    const response = await dejavooService.settleBatch();
    
    console.log('Received batch settlement response from Dejavoo API:', JSON.stringify(response));
    
    // Parse the response
    if (response.generalResponse && 
        response.generalResponse.statusCode && 
        response.generalResponse.statusCode.includes("Approved")) {
      return {
        status: "approved",
        message: "Batch settled successfully",
      };
    } else {
      return {
        status: "declined",
        message: response.generalResponse?.detailedMessage || 
                 response.generalResponse?.message || 
                 "Batch settlement declined",
      };
    }
  } catch (error) {
    console.error("Batch settlement failed:", error);
    
    // Generate a meaningful error message
    let errorMessage = "Batch settlement failed: Could not communicate with Dejavoo API";
    if (error instanceof Error) {
      errorMessage = `Batch settlement failed: ${error.message}`;
    }
    
    // Return a declined transaction response
    return {
      status: "declined",
      message: errorMessage
    };
  }
}

/**
 * Process a refund to a card
 * 
 * @param ipAddress IP address of the terminal (optional with remote API)
 * @param amount Refund amount
 * @param options Additional options
 * @returns Promise with transaction response
 */
export async function processRefund(
  ipAddress: string, 
  amount: number,
  options: CardPaymentOptions = {}
): Promise<DejavooTransactionResponse> {
  try {
    // Create terminal configuration
    const config: DejavooTerminalConfig = {
      tpn: options.terminalType || "2247257465", // Default to test TPN if not provided
      authKey: options.apiKey || "JEkE6S7jPk",     // Default to test key if not provided
      testMode: options.testMode
    };
    
    // Create Dejavoo API service instance
    const dejavooService = new DejavooApiService(config);
    
    // Process the refund
    const response = await dejavooService.processRefund(amount, {
      enableSignature: options.enableSignature,
      transactionTimeout: options.transactionTimeout,
      printReceipt: true  // Use printReceipt instead of getReceipt
    });
    
    console.log('Received refund response from Dejavoo API:', JSON.stringify(response));
    
    // Parse the response
    if (response.generalResponse && 
        response.generalResponse.statusCode && 
        response.generalResponse.statusCode.includes("Approved")) {
      return {
        status: "approved",
        transactionId: response.transactionNumber || response.referenceId || generateUniqueId(),
        dateTime: new Date().toISOString(),
        cardType: response.cardData?.cardType || "Credit",
        maskedPan: response.cardData?.last4 ? `**** **** **** ${response.cardData.last4}` : "**** **** **** ****",
        authCode: response.authCode || "",
        hostResponseCode: response.generalResponse.hostResponseCode || "",
        hostResponseMessage: response.generalResponse.hostResponseMessage || ""
      };
    } else {
      return {
        status: "declined",
        message: response.generalResponse?.detailedMessage || 
                 response.generalResponse?.message || 
                 "Refund declined",
        hostResponseCode: response.generalResponse?.hostResponseCode || "",
        hostResponseMessage: response.generalResponse?.hostResponseMessage || ""
      };
    }
  } catch (error) {
    console.error("Refund processing failed:", error);
    
    // Generate a meaningful error message
    let errorMessage = "Refund processing failed: Could not communicate with Dejavoo API";
    if (error instanceof Error) {
      errorMessage = `Refund processing failed: ${error.message}`;
    }
    
    // Return a declined transaction response
    return {
      status: "declined",
      message: errorMessage
    };
  }
}

/**
 * Get batch details
 * 
 * @param ipAddress IP address of the terminal (optional with remote API)
 * @param options Additional options
 * @returns Promise with batch details response
 */
export async function getBatchDetails(
  ipAddress: string,
  options: CardPaymentOptions = {}
): Promise<any> {
  try {
    // Create terminal configuration
    const config: DejavooTerminalConfig = {
      tpn: options.terminalType || "2247257465", // Default to test TPN if not provided
      authKey: options.apiKey || "JEkE6S7jPk",     // Default to test key if not provided
      testMode: options.testMode
    };
    
    // Create Dejavoo API service instance
    const dejavooService = new DejavooApiService(config);
    
    // Get batch details
    const response = await dejavooService.getBatchDetails();
    
    console.log('Received batch details from Dejavoo API:', JSON.stringify(response));
    
    return {
      success: true,
      batchDetails: response
    };
  } catch (error) {
    console.error("Get batch details failed:", error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Get terminal information
 * 
 * @param ipAddress IP address of the terminal (optional with remote API)
 * @param options Additional options
 * @returns Promise with terminal information
 */
export async function getTerminalInfo(
  ipAddress: string,
  options: CardPaymentOptions = {}
): Promise<any> {
  try {
    // Create terminal configuration
    const config: DejavooTerminalConfig = {
      tpn: options.terminalType || "2247257465", // Default to test TPN if not provided
      authKey: options.apiKey || "JEkE6S7jPk",     // Default to test key if not provided
      testMode: options.testMode
    };
    
    // Create Dejavoo API service instance
    const dejavooService = new DejavooApiService(config);
    
    // Get terminal info
    const response = await dejavooService.getTerminalInfo();
    
    console.log('Received terminal info from Dejavoo API:', JSON.stringify(response));
    
    return {
      success: true,
      terminalInfo: response
    };
  } catch (error) {
    console.error("Get terminal info failed:", error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}