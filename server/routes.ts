/**
 * routes.ts
 * 
 * This file defines the API routes for the application.
 */

import { Express, Request, Response, NextFunction } from 'express';
import { Server, createServer } from 'http';
import { storage } from './storage';
import { insertTransactionSchema2 } from '../shared/schema';
import { 
  checkTerminalConnection, 
  processCardPayment, 
  processRefund, 
  voidTransaction, 
  settleBatch, 
  getBatchDetails,
  getTerminalInfo
} from './dejavooService';
import { DejavooApiService, DejavooTerminalConfig } from './services/DejavooApiService';

// Create a route handler with error catching
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Register all application routes
 * @param app Express application
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Register route handlers
  
  // Get all transactions
  app.get('/api/transactions', asyncHandler(async (req, res) => {
    console.log('Fetching all transactions');
    try {
      const transactions = await storage.getTransactions();
      console.log('Transactions retrieved successfully:', JSON.stringify(transactions));
      res.json(transactions);
    } catch (error) {
      console.error('Error retrieving transactions:', error);
      throw error;
    }
  }));
  
  // Get terminal settings
  app.get('/api/settings/terminal', asyncHandler(async (req, res) => {
    try {
      const terminalConfig = await storage.getSetting('terminalConfig');
      res.json(terminalConfig || {});
    } catch (error) {
      console.error("Error loading terminal settings:", error);
      res.status(500).json({ error: "Failed to load terminal settings" });
    }
  }));
  
  // Save terminal settings
  app.post('/api/settings/terminal', asyncHandler(async (req, res) => {
    try {
      const terminalConfig = req.body;
      await storage.saveSetting('terminalConfig', terminalConfig);
      res.json({ success: true, message: "Terminal settings saved successfully" });
    } catch (error) {
      console.error("Error saving terminal settings:", error);
      res.status(500).json({ error: "Failed to save terminal settings" });
    }
  }));
  
  // Get single transaction by ID
  app.get('/api/transactions/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const transaction = await storage.getTransaction(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  }));
  
  // Check terminal connection
  app.post('/api/terminal/check', asyncHandler(async (req, res) => {
    const { ip, terminalType, apiKey, testMode } = req.body;
    
    try {
      // Create Dejavoo API Service to get detailed status
      const dejavooService = new DejavooApiService({
        tpn: terminalType || "2247257465", // 10-digit Test TPN (meets length requirement)
        authKey: apiKey || "JEkE6S7jPk",   // Use valid API key
        testMode: testMode || false
      });
      
      // Create a reusable reference ID for consistent checking
      // This helps prevent mixed responses from multiple status checks
      const referenceId = Math.random().toString(16).slice(2) + Date.now().toString(36);
      
      // Get detailed terminal status with a consistent referenceId - matching documentation format
      const statusPayload = {
        ReferenceId: referenceId,
        PaymentType: "Credit",
        Tpn: terminalType || "2247257465",
        Authkey: apiKey || "JEkE6S7jPk"
      };
      
      // Make a direct API request to ensure we use the same referenceId
      let statusResponse;
      try {
        // Try to make a direct API call with consistent referenceId
        // TypeScript typing for the API response
        interface DejavooStatusResponse {
          SerialNumber?: string;
          GeneralResponse?: {
            StatusCode?: string;
            ResultCode?: string;
            Message?: string;
            DetailedMessage?: string;
          };
        }
        
        const result = await dejavooService.makeApiRequest<DejavooStatusResponse>('Payment/Status', statusPayload, {
          timeout: 10000
        });
        
        // Process the response into a standard status format
        // First check if we have a response with a Serial Number - if so, the terminal exists
        const hasSerialNumber = result.SerialNumber && result.SerialNumber.length > 0;
        
        // Now check specific status codes
        const terminalExists = 
          hasSerialNumber || // If we have a serial number, the terminal exists
          result.GeneralResponse?.StatusCode === "2008" || // Terminal in use
          result.GeneralResponse?.StatusCode === "1000" || // Service busy
          result.GeneralResponse?.StatusCode === "1001" || // Transaction data not found
          result.GeneralResponse?.ResultCode === "Ok" ||
          result.GeneralResponse?.StatusCode?.includes("Approved");
        
        let message = "Terminal is not responding";
        let online = false;
        
        if (terminalExists) {
          if (result.GeneralResponse?.StatusCode === "2008") {
            message = "Terminal is online but currently in use";
            online = true; // It's online, just busy
          } else if (result.GeneralResponse?.StatusCode === "1000") {
            message = "Terminal is online but service is busy";
            online = true; // It's online, just busy
          } else if (result.GeneralResponse?.StatusCode === "1001" && hasSerialNumber) {
            // This means the terminal is online but no transaction was found with this reference ID
            message = "Terminal is online and ready";
            online = true; // It's connected!
          } else if (result.GeneralResponse?.StatusCode?.includes("Approved")) {
            message = "Terminal is online and ready";
            online = true;
          }
        } else if (result.GeneralResponse?.StatusCode === "2003") {
          message = "Terminal ID not found - please check your credentials";
          online = false;
        }
        
        statusResponse = {
          success: true,
          online: online,
          message: message,
          details: result
        };
      } catch (err) {
        // If direct API call fails, fall back to the standard method
        statusResponse = await dejavooService.checkStatus();
      }
      
      console.log('Terminal detailed status:', JSON.stringify(statusResponse));
      
      // Return detailed status information
      res.json({
        connected: statusResponse.online,
        status: statusResponse.success ? 'success' : 'error',
        message: statusResponse.message,
        details: statusResponse.details || {}
      });
    } catch (error) {
      console.error("Terminal check error:", error);
      // Use the original method as fallback
      const connected = await checkTerminalConnection(ip, {
        terminalType,
        apiKey,
        testMode
      });
      
      res.json({ 
        connected, 
        status: 'error',
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }));
  
  // Process card payment
  app.post('/api/payment/card', asyncHandler(async (req, res) => {
    const { amount, terminalConfig, customerId } = req.body;
    
    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    console.log(`Card payment request received with amount: $${numericAmount.toFixed(2)}`);
    console.log(`Using terminal config:`, JSON.stringify(terminalConfig));
    
    const result = await processCardPayment(
      terminalConfig.terminalIp, 
      numericAmount, 
      {
        terminalType: terminalConfig.terminalType,
        apiKey: terminalConfig.apiKey,
        enableTipping: terminalConfig.enableTipping,
        enableSignature: terminalConfig.enableSignature,
        testMode: terminalConfig.testMode,
        transactionTimeout: terminalConfig.transactionTimeout
      }
    );
    
    // Log transaction result for debugging
    console.log('Transaction result from processCardPayment:', JSON.stringify(result));
    
    // Check if transaction was approved - handle both simplified and full response formats
    console.log("Checking response for approval indicators:", JSON.stringify(result));
    
    // Type assertion to safely handle mixed case properties
    const resp = result as any;
    
    const isApproved = 
      // Check simplified format from our service
      result.status === 'approved' || 
      
      // Check PascalCase properties directly from Dejavoo API
      (resp.GeneralResponse?.StatusCode === "0000" || 
       resp.GeneralResponse?.StatusCode?.includes("Approved")) ||
      (resp.GeneralResponse?.ResultCode === "0") ||
      (resp.GeneralResponse?.HostResponseCode === "00") ||
      (resp.GeneralResponse?.Message?.includes("Approved")) ||
      
      // Check camelCase properties from our interface
      (resp.generalResponse?.statusCode === "0000" || 
       resp.generalResponse?.statusCode?.includes("Approved")) ||
      (resp.generalResponse?.resultCode === "0") ||
      (resp.generalResponse?.hostResponseCode === "00") ||
      (resp.generalResponse?.message?.includes("Approved"));
    
    console.log("Transaction approval check result:", isApproved);
    
    // If the response is from the raw Dejavoo API, it might not have our expected 'status' field
    // Let's ensure the response has the correct status for the client
    if (isApproved && !result.status) {
      resp.status = 'approved';
    }
    
    if (isApproved) {
      try {
        console.log("Transaction approved, saving to database");
        
        // Parse transaction data using type assertion to handle mixed case
        console.log("Extracting transaction data from response");
        console.log("Raw response structure:", Object.keys(resp).join(', '));
        if (resp.CardData) {
          console.log("PascalCase CardData structure:", Object.keys(resp.CardData).join(', '));
        }
        if (resp.cardData) {
          console.log("camelCase cardData structure:", Object.keys(resp.cardData).join(', '));
        }
        
        // Get card information from various possible formats
        let cardType = "Credit";
        let cardLast4 = "****";
        let authCode = "N/A";
        
        // First try PascalCase (direct API response format)
        if (resp.CardData && resp.CardData.CardType) {
          console.log("Found PascalCase CardData");
          cardType = resp.CardData.CardType;
          cardLast4 = resp.CardData.Last4 || "****";
          authCode = resp.AuthCode || "N/A";
        } 
        // Then try camelCase (our interface format)
        else if (resp.cardData && resp.cardData.cardType) {
          console.log("Found camelCase cardData");
          cardType = resp.cardData.cardType;
          cardLast4 = resp.cardData.last4 || "****";
          authCode = resp.authCode || "N/A";
        } 
        // Fallback to our simplified service response format
        else if (result.cardType) {
          console.log("Using simplified format");
          cardType = result.cardType;
          cardLast4 = result.maskedPan ? result.maskedPan.slice(-4) : "****";
          authCode = result.authCode || "N/A";
        }
        
        console.log(`Card information extracted - Type: ${cardType}, Last4: ${cardLast4}, AuthCode: ${authCode}`);
        
        const transactionData = {
          amount: numericAmount,
          paymentMethod: 'card',
          status: 'approved',
          dateTime: new Date(),
          terminalIp: terminalConfig.terminalIp,
          customerId: customerId || null,
          cardDetails: {
            type: cardType,
            number: `**** **** **** ${cardLast4}`,
            authCode: authCode
          }
        };
        
        // Validate transaction data
        const validatedData = insertTransactionSchema2.parse(transactionData);
        
        // Save transaction to database
        const savedTransaction = await storage.createTransaction(validatedData);
        console.log('Transaction saved:', savedTransaction);
        
        // Automatic token capture for customer profiles
        if (customerId && isApproved) {
          try {
            console.log(`Processing automatic token capture for customer: ${customerId}`);
            
            // Get customer profile - always attempt token capture for selected customers
            const customer = await storage.getCustomerProfile(customerId);
            if (customer) {
              console.log(`Customer ${customerId} selected - attempting token capture from transaction`);
              
              // Extract iPOS token from the original transaction response
              let iPosToken = null;
              
              console.log('Searching for iPOS token in response...');
              console.log('Response structure:', Object.keys(resp));
              if (resp.rawResponse) {
                console.log('Raw response structure:', Object.keys(resp.rawResponse));
              }
              
              // Check for iPOS token in various possible locations in the response
              if (resp.rawResponse?.IPosToken) {
                iPosToken = resp.rawResponse.IPosToken;
                console.log('Found iPOS token in rawResponse.IPosToken');
              } else if (resp.rawResponse?.iposToken) {
                iPosToken = resp.rawResponse.iposToken;
                console.log('Found iPOS token in rawResponse.iposToken');
              } else if (resp.IPosToken) {
                iPosToken = resp.IPosToken;
                console.log('Found iPOS token in resp.IPosToken');
              } else if (resp.iposToken) {
                iPosToken = resp.iposToken;
                console.log('Found iPOS token in resp.iposToken');
              } else if (resp.ExtendedDataByApplication?.['0']?.iposToken) {
                iPosToken = resp.ExtendedDataByApplication['0'].iposToken;
                console.log('Found iPOS token in ExtendedDataByApplication');
              } else if (resp.extendedDataByApplication?.['0']?.iposToken) {
                iPosToken = resp.extendedDataByApplication['0'].iposToken;
                console.log('Found iPOS token in extendedDataByApplication');
              } else {
                console.log('No iPOS token found in expected locations');
              }
              
              // If no token in response, try to perform token capture using SPIn API
              if (!iPosToken && resp.ReferenceId) {
                console.log(`No iPOS token in response, attempting token capture via SPIn API`);
                
                try {
                  // Import the token capture service
                  const { DejavooApiService } = await import('./services/DejavooApiService');
                  
                  // Create service instance
                  const dejavooService = new DejavooApiService({
                    terminalType: terminalConfig.terminalType,
                    apiKey: terminalConfig.apiKey,
                    testMode: terminalConfig.testMode
                  });
                  
                  // Attempt token capture using the transaction reference
                  const tokenResponse = await dejavooService.tokenizeCard({
                    referenceId: resp.ReferenceId,
                    amount: numericAmount,
                    enableExtendedData: true
                  });
                  
                  console.log('Token capture response:', JSON.stringify(tokenResponse));
                  
                  // Extract iPOS token from token capture response
                  if (tokenResponse?.ExtendedDataByApplication?.['0']?.iposToken) {
                    iPosToken = tokenResponse.ExtendedDataByApplication['0'].iposToken;
                  }
                  
                } catch (tokenError) {
                  console.error('Error during token capture:', tokenError);
                }
              }
              
              // Always save/update token to customer profile if found
              if (iPosToken) {
                console.log(`Successfully captured iPOS token for customer ${customerId}: ${iPosToken.substring(0, 10)}... (Card: ${cardType} ****${cardLast4})`);
                
                await storage.updateCustomerProfile(customerId, {
                  iPosToken: iPosToken,
                  tokenCreatedAt: new Date(),
                  tokenStatus: 'active',
                  cardType: cardType,
                  cardLast4: cardLast4,
                  cardExpiry: resp.CardData?.ExpirationDate || null
                });
                
                console.log(`iPOS token ${customer.iPosToken ? 'updated' : 'saved'} to customer profile ${customerId}`);
              } else {
                console.log(`No iPOS token could be captured from transaction for customer ${customerId}`);
              }
            }
          } catch (tokenCaptureError) {
            console.error('Error during automatic token capture:', tokenCaptureError);
            // Don't fail the transaction if token capture fails
          }
        }
      } catch (error) {
        console.error('Error saving transaction:', error);
        // Continue even if saving fails - don't affect the response
      }
    } else {
      console.log('Transaction was not approved, status:', result.status);
    }
    
    res.json(result);
  }));
  
  // Process cash payment
  app.post('/api/payment/cash', asyncHandler(async (req, res) => {
    const { amount, customerId } = req.body;
    
    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Generate a unique transaction ID
    const transactionId = Math.random().toString(16).slice(2);
    
    // Save transaction to database
    try {
      const transactionData = {
        amount: numericAmount,
        paymentMethod: 'cash',
        status: 'completed',
        dateTime: new Date(),
        terminalIp: null,
        customerId: customerId || null,
        cardDetails: null
      };
      
      // Validate transaction data
      const validatedData = insertTransactionSchema2.parse(transactionData);
      
      // Save transaction to database
      const savedTransaction = await storage.createTransaction(validatedData);
      console.log('Cash transaction saved:', savedTransaction);
      
      // Return transaction information
      res.json({
        status: 'completed',
        transactionId,
        dateTime: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving cash transaction:', error);
      res.status(500).json({ error: 'Failed to process cash payment' });
    }
  }));
  
  // Process card refund
  app.post('/api/payment/refund', asyncHandler(async (req, res) => {
    const { amount, terminalConfig } = req.body;
    
    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    console.log(`Card refund request received with amount: $${numericAmount.toFixed(2)}`);
    console.log(`Using terminal config:`, JSON.stringify(terminalConfig));
    
    const result = await processRefund(
      terminalConfig.terminalIp, 
      numericAmount, 
      {
        terminalType: terminalConfig.terminalType,
        apiKey: terminalConfig.apiKey,
        enableSignature: terminalConfig.enableSignature,
        testMode: terminalConfig.testMode,
        transactionTimeout: terminalConfig.transactionTimeout
      }
    );
    
    // Log transaction result for debugging
    console.log('Refund result from processRefund:', JSON.stringify(result));
    
    // Check if refund was approved - handle both simplified and full response formats
    console.log("Checking refund response for approval indicators:", JSON.stringify(result));
    
    // Type assertion to safely handle mixed case properties
    const resp = result as any;
    
    const isApproved = 
      // Check simplified format from our service
      result.status === 'approved' || 
      
      // Special check for Return transaction type
      (resp.TransactionType === "Return" && 
       (resp.GeneralResponse?.StatusCode === "0000" || resp.GeneralResponse?.ResultCode === "0")) ||
      
      // Check PascalCase properties directly from Dejavoo API
      (resp.GeneralResponse?.StatusCode === "0000" || 
       resp.GeneralResponse?.StatusCode?.includes("Approved")) ||
      (resp.GeneralResponse?.ResultCode === "0") ||
      (resp.GeneralResponse?.HostResponseCode === "00") ||
      ((resp.GeneralResponse?.Message || "").includes("Approved")) ||
      
      // Check camelCase properties from our interface
      (resp.generalResponse?.statusCode === "0000" || 
       resp.generalResponse?.statusCode?.includes("Approved")) ||
      (resp.generalResponse?.resultCode === "0") ||
      (resp.generalResponse?.hostResponseCode === "00") ||
      ((resp.generalResponse?.message || "").includes("Approved"));
    
    console.log("Refund approval check result:", isApproved);
    
    // If the response is from the raw Dejavoo API, it might not have our expected 'status' field
    // Let's ensure the response has the correct status for the client
    if (isApproved && !result.status) {
      resp.status = 'approved';
    }
    
    if (isApproved) {
      try {
        console.log("Refund approved, saving to database");
        
        // Parse transaction data using type assertion to handle mixed case
        console.log("Extracting refund transaction data from response");
        
        // Get card information from various possible formats
        let cardType = "Credit";
        let cardLast4 = "****";
        let authCode = "N/A";
        
        // First try PascalCase (direct API response format)
        if (resp.CardData && resp.CardData.CardType) {
          console.log("Found PascalCase CardData in refund");
          cardType = resp.CardData.CardType;
          cardLast4 = resp.CardData.Last4 || "****";
          authCode = resp.AuthCode || "N/A";
        } 
        // Then try camelCase (our interface format)
        else if (resp.cardData && resp.cardData.cardType) {
          console.log("Found camelCase cardData in refund");
          cardType = resp.cardData.cardType;
          cardLast4 = resp.cardData.last4 || "****";
          authCode = resp.authCode || "N/A";
        } 
        // Fallback to our simplified service response format
        else if (result.cardType) {
          console.log("Using simplified format for refund");
          cardType = result.cardType;
          cardLast4 = result.maskedPan ? result.maskedPan.slice(-4) : "****";
          authCode = result.authCode || "N/A";
        }
        
        console.log(`Refund card information extracted - Type: ${cardType}, Last4: ${cardLast4}, AuthCode: ${authCode}`);
        
        const transactionData = {
          amount: numericAmount,
          paymentMethod: 'card',
          status: 'refunded',
          dateTime: new Date(),
          terminalIp: terminalConfig.terminalIp,
          cardDetails: {
            type: cardType,
            number: `**** **** **** ${cardLast4}`,
            authCode: authCode
          }
        };
        
        // Validate transaction data
        const validatedData = insertTransactionSchema2.parse(transactionData);
        
        // Save transaction to database
        const savedTransaction = await storage.createTransaction(validatedData);
        console.log('Refund transaction saved:', savedTransaction);
      } catch (error) {
        console.error('Error saving refund transaction:', error);
        // Continue even if saving fails - don't affect the response
      }
    } else {
      console.log('Refund was not approved, status:', result.status);
    }
    
    res.json(result);
  }));
  
  // Process a direct refund (exactly matching provided format)
  app.post('/api/payment/refund-direct', asyncHandler(async (req, res) => {
    const { amount, referenceId, invoiceNumber, terminalConfig } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    // Use the direct JSON format as shown in the example
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    
    const payload = {
      "Amount": amount,
      "PaymentType": "Credit",
      "ReferenceId": referenceId || Math.random().toString(16).slice(2, 14),
      "PrintReceipt": "No",
      "GetReceipt": "No",
      "MerchantNumber": null,
      "InvoiceNumber": invoiceNumber || "",
      "CaptureSignature": false,
      "GetExtendedData": true,
      "CallbackInfo": {
        "Url": ""
      },
      "Tpn": terminalConfig.terminalType || "z11invtest69",
      "Authkey": terminalConfig.apiKey || "JZiRUusizc",
      "SPInProxyTimeout": terminalConfig.transactionTimeout || 90,
      "CustomFields": {}
    };
    
    console.log(`Processing direct refund with payload:`, JSON.stringify(payload));
    
    // Use our existing refund function to process the request
    const result = await processRefund(
      terminalConfig.terminalIp, 
      amount, 
      {
        terminalType: terminalConfig.terminalType || "z11invtest69",
        apiKey: terminalConfig.apiKey || "JZiRUusizc",
        enableSignature: false,
        testMode: terminalConfig.testMode,
        transactionTimeout: terminalConfig.transactionTimeout,
        referenceId: referenceId,
        invoiceNumber: invoiceNumber
      }
    );
    
    // Log the response for debugging
    console.log('Direct refund result:', JSON.stringify(result));
    
    // Return the full response to match the format in the example
    res.json(result);
  }));
  
  // Process token capture for recurring payments using SPIn API
  app.post('/api/payment/token-capture', asyncHandler(async (req, res) => {
    const { amount, referenceId, customerId, subscriptionId, captureToken, saveCustomer, terminalConfig } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    console.log(`Processing SPIn token capture for amount: $${amount.toFixed(2)}`);
    console.log(`Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`);
    
    try {
      // Step 1: Use SPIn API to process payment and capture iPOS token
      const config = {
        tpn: terminalConfig.terminalType || "z11invtest69",
        authKey: terminalConfig.apiKey || "JZiRUusizc",
        testMode: terminalConfig.testMode || false
      };
      
      const dejavooService = new DejavooApiService(config);
      
      // Process regular sale to get iPOS token in response
      const response = await dejavooService.processCardPayment(amount, {
        referenceId: referenceId,
        enableSignature: terminalConfig.enableSignature,
        transactionTimeout: terminalConfig.transactionTimeout,
        getReceipt: true,
        printReceipt: false
      });
      
      console.log('SPIn token capture response:', JSON.stringify(response));
      
      // Check if transaction was approved and extract token
      const resp = response as any;
      const isApproved = 
        (resp.GeneralResponse?.StatusCode === "0000") ||
        (resp.GeneralResponse?.ResultCode === "0") ||
        (resp.GeneralResponse?.HostResponseCode === "00") ||
        (resp.GeneralResponse?.Message && resp.GeneralResponse.Message.includes("Approved"));
      
      if (isApproved) {
        // Extract iPOS token from SPIn response
        const iPosToken = resp.IPosToken || resp.iPosToken || resp.Token || 
                         resp.ExtendedData?.IPosToken || resp.ExtendedData?.iPosToken;
        
        const result = {
          status: "approved",
          transactionId: resp.TransactionNumber || resp.ReferenceId || referenceId,
          dateTime: new Date().toISOString(),
          cardType: resp.CardData?.CardType || "Credit",
          maskedPan: resp.CardData?.Last4 ? `**** **** **** ${resp.CardData.Last4}` : "**** **** **** ****",
          authCode: resp.AuthCode || "",
          hostResponseCode: resp.GeneralResponse?.HostResponseCode || "",
          hostResponseMessage: resp.GeneralResponse?.HostResponseMessage || "",
          // Token capture specific fields
          iPosToken: iPosToken,
          rrn: resp.RRN || resp.RetrievalReferenceNumber,
          customerId: customerId,
          subscriptionId: subscriptionId,
          // For future iPOS Transact usage
          tokenCaptureMethod: "SPIn",
          note: "Use this iPOS token with iPOS Transact API for recurring payments",
          // Raw response for debugging
          rawResponse: response
        };
        
        // Save transaction to database if approved
        try {
          await apiRequest("POST", "/api/transactions", {
            amount: Math.round(amount * 100), // Convert to cents
            paymentMethod: "card",
            status: "approved",
            dateTime: new Date().toISOString(),
            terminalIp: terminalConfig.terminalIp,
            cardDetails: {
              type: result.cardType,
              number: result.maskedPan,
              authCode: result.authCode,
              token: result.iPosToken, // Store iPOS token for future use
              rrn: result.rrn
            }
          });
        } catch (dbError) {
          console.error('Error saving token capture transaction:', dbError);
        }
        
        res.json(result);
      } else {
        res.json({
          status: "declined",
          message: resp.GeneralResponse?.DetailedMessage || 
                   resp.GeneralResponse?.Message || 
                   "Token capture transaction declined",
          rawResponse: response
        });
      }
    } catch (error) {
      console.error("SPIn token capture processing failed:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }));
  
  // Process payment using stored iPOS token with iPOS Transact API
  app.post('/api/payment/token-reuse', asyncHandler(async (req, res) => {
    const { amount, token, customerId, terminalConfig, iPosAuthToken } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    if (!token) {
      return res.status(400).json({ error: 'iPOS token is required' });
    }
    
    console.log(`Processing iPOS Transact token reuse for amount: $${amount.toFixed(2)}`);
    console.log(`Using iPOS token: ${token.substring(0, 12)}...`);
    
    try {
      // Import iPOS Transact service
      const { iPosService } = await import('./services/iPosTransactService');
      
      // Create iPOS Transact service instance
      const iPosConfig = {
        authToken: iPosAuthToken || terminalConfig.iPosAuthToken || "default_auth_token", // From portal
        tpn: terminalConfig.terminalType || "z11invtest69",
        testMode: terminalConfig.testMode !== false // Default to test mode
      };
      
      // Process payment using card token from SPIn
      const response = await iPosService.processRecurringCharge({
        amount: amount,
        description: 'Token reuse payment',
        cardToken: token, // Card token from SPIn
        authToken: iPosAuthToken || terminalConfig.iPosAuthToken || "default_auth_token",
        merchantId: terminalConfig.terminalType || "224725575584"
      });
      
      console.log('iPOS Transact recurring charge response:', JSON.stringify(response));
      
      if (response.success) {
        const result = {
          status: "approved",
          transactionId: response.transactionId,
          authCode: response.authCode,
          message: response.message,
          rawResponse: response.rawResponse
        };
        
        // Log to server console
        console.log("iPOS token reuse result:", JSON.stringify(result));
        
        // Return result
        res.json(result);
      } else {
        res.status(400).json({
          status: "declined",
          error: response.error || 'Payment declined',
          rawResponse: response.rawResponse
        });
      }
    } catch (error) {
      console.error("Error processing recurring charge:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }));
  
  // Legacy token reuse endpoint (for backward compatibility)
  app.post('/api/payment/token-legacy', asyncHandler(async (req, res) => {
    const { amount, token, customerId, terminalConfig, iPosAuthToken } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    if (!token) {
      return res.status(400).json({ error: 'iPOS token is required' });
    }
    
    console.log(`Processing legacy iPOS token for amount: $${amount.toFixed(2)}`);
    
    try {
      res.json({
        status: "not_implemented",
        message: "Legacy token processing not implemented"
      });
    } catch (error) {
      console.error("iPOS Transact token reuse processing failed:", error);
      
      // Fallback error handling for missing auth token or configuration
      if (error.message && error.message.includes("auth")) {
        res.status(400).json({
          status: "error",
          message: "iPOS authentication token required. Please configure your iPOS Transact auth token.",
          note: "Get your auth token from iPOSpays portal Settings > Generate Ecom/TOP Merchant Keys"
        });
      } else {
        res.status(500).json({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error occurred"
        });
      }
    }
  }));

  // Void a transaction
  app.post('/api/payment/void', asyncHandler(async (req, res) => {
    const { transactionId, terminalConfig } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    
    const result = await voidTransaction(
      terminalConfig.terminalIp,
      transactionId,
      {
        terminalType: terminalConfig.terminalType,
        apiKey: terminalConfig.apiKey,
        testMode: terminalConfig.testMode
      }
    );
    
    console.log('Void transaction result:', JSON.stringify(result));
    
    // Type assertion to safely handle mixed case properties
    const resp = result as any;
    
    // Check if void was successful using the same logic as approvals
    const isSuccessful = 
      // Check simplified format from our service
      result.status === 'approved' || 
      
      // Check PascalCase properties directly from Dejavoo API
      (resp.GeneralResponse?.StatusCode === "0000" || 
       resp.GeneralResponse?.StatusCode?.includes("Approved")) ||
      (resp.GeneralResponse?.ResultCode === "0") ||
      (resp.GeneralResponse?.HostResponseCode === "00") ||
      (resp.GeneralResponse?.Message?.includes("Approved")) ||
      
      // Check camelCase properties from our interface
      (resp.generalResponse?.statusCode === "0000" || 
       resp.generalResponse?.statusCode?.includes("Approved")) ||
      (resp.generalResponse?.resultCode === "0") ||
      (resp.generalResponse?.hostResponseCode === "00") ||
      (resp.generalResponse?.message?.includes("Approved"));
    
    // If the response is from the raw Dejavoo API, it might not have our expected 'status' field
    // Let's ensure the response has the correct status for the client
    if (isSuccessful && !result.status) {
      resp.status = 'approved';
    }
    
    res.json(result);
  }));
  
  // Settle batch
  app.post('/api/terminal/settle', asyncHandler(async (req, res) => {
    const { terminalConfig } = req.body;
    
    const result = await settleBatch(
      terminalConfig.terminalIp,
      {
        terminalType: terminalConfig.terminalType,
        apiKey: terminalConfig.apiKey,
        testMode: terminalConfig.testMode
      }
    );
    
    console.log('Settle batch result:', JSON.stringify(result));
    
    // Type assertion to safely handle mixed case properties
    const resp = result as any;
    
    // Check if settle was successful using the same logic as approvals
    const isSuccessful = 
      // Check simplified format from our service
      result.status === 'approved' || 
      
      // Check PascalCase properties directly from Dejavoo API
      (resp.GeneralResponse?.StatusCode === "0000" || 
       resp.GeneralResponse?.StatusCode?.includes("Approved")) ||
      (resp.GeneralResponse?.ResultCode === "0") ||
      (resp.GeneralResponse?.HostResponseCode === "00") ||
      (resp.GeneralResponse?.Message?.includes("Approved")) ||
      
      // Check camelCase properties from our interface
      (resp.generalResponse?.statusCode === "0000" || 
       resp.generalResponse?.statusCode?.includes("Approved")) ||
      (resp.generalResponse?.resultCode === "0") ||
      (resp.generalResponse?.hostResponseCode === "00") ||
      (resp.generalResponse?.message?.includes("Approved"));
    
    // If the response is from the raw Dejavoo API, it might not have our expected 'status' field
    // Let's ensure the response has the correct status for the client
    if (isSuccessful && !result.status) {
      resp.status = 'approved';
    }
    
    res.json(result);
  }));
  
  // Get batch details
  app.post('/api/terminal/batch', asyncHandler(async (req, res) => {
    const { terminalConfig } = req.body;
    
    const result = await getBatchDetails(
      terminalConfig.terminalIp,
      {
        terminalType: terminalConfig.terminalType,
        apiKey: terminalConfig.apiKey,
        testMode: terminalConfig.testMode
      }
    );
    
    res.json(result);
  }));
  
  // Get terminal info
  app.post('/api/terminal/info', asyncHandler(async (req, res) => {
    const { terminalConfig } = req.body;
    
    const result = await getTerminalInfo(
      terminalConfig.terminalIp,
      {
        terminalType: terminalConfig.terminalType,
        apiKey: terminalConfig.apiKey,
        testMode: terminalConfig.testMode
      }
    );
    
    res.json(result);
  }));
  
  // Demonstrate using DejavooApiService directly
  app.post('/api/terminal/api-service-demo', asyncHandler(async (req, res) => {
    const { operation, terminalConfig, params } = req.body;
    
    // Create configuration for Dejavoo service
    const config: DejavooTerminalConfig = {
      tpn: terminalConfig.terminalType,
      authKey: terminalConfig.apiKey,
      testMode: terminalConfig.testMode
    };
    
    // Create service instance
    const dejavooService = new DejavooApiService(config);
    
    // Execute the requested operation
    let result;
    try {
      switch (operation) {
        case 'status':
          result = await dejavooService.checkStatus();
          break;
        case 'sale':
          result = await dejavooService.processSale(params.amount, params.options);
          break;
        case 'refund':
          result = await dejavooService.processRefund(params.amount, params.options);
          break;
        case 'void':
          result = await dejavooService.voidTransaction(params.transactionId);
          break;
        case 'settle':
          result = await dejavooService.settleBatch();
          break;
        case 'batch':
          result = await dejavooService.getBatchDetails();
          break;
        case 'terminal-info':
          result = await dejavooService.getTerminalInfo();
          break;
        case 'tokenize':
          result = await dejavooService.tokenizeCard(params.options);
          break;
        case 'pre-auth':
          result = await dejavooService.processPreAuth(params.amount, params.options);
          break;
        case 'capture':
          result = await dejavooService.capturePreAuth(params.transactionId, params.amount, params.options);
          break;
        case 'transaction-details':
          result = await dejavooService.getTransactionDetails(params.transactionId);
          break;
        case 'adjust-tip':
          result = await dejavooService.adjustTip(params.transactionId, params.tipAmount);
          break;
        case 'cash':
          result = await dejavooService.processCashTransaction(params.amount, params.options);
          break;
        case 'verify-card':
          result = await dejavooService.verifyCard(params.options);
          break;
        case 'receipt':
          result = await dejavooService.getReceipt(params.transactionId);
          break;
        case 'restart':
          result = await dejavooService.restartTerminal();
          break;
        case 'update':
          result = await dejavooService.updateTerminalSoftware();
          break;
        case 'diagnostics':
          result = await dejavooService.runDiagnostics();
          break;
        default:
          return res.status(400).json({ error: 'Unknown operation' });
      }
      
      res.json({ success: true, result });
    } catch (error) {
      console.error('API service demo error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }));
  
  // Customer Management Endpoints
  
  // Get all customer profiles
  app.get('/api/customers', asyncHandler(async (req, res) => {
    try {
      const customers = await storage.getCustomerProfiles();
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }));
  
  // Get customer by ID
  app.get('/api/customers/:id', asyncHandler(async (req, res) => {
    try {
      const customer = await storage.getCustomerProfile(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ error: 'Failed to fetch customer' });
    }
  }));
  
  // Create new customer profile
  app.post('/api/customers', asyncHandler(async (req, res) => {
    try {
      const customer = await storage.createCustomerProfile(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }));
  
  // Update customer profile
  app.put('/api/customers/:id', asyncHandler(async (req, res) => {
    try {
      const customer = await storage.updateCustomerProfile(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }));
  
  // Save iPOS token to customer profile
  app.post('/api/customers/:id/token', asyncHandler(async (req, res) => {
    const { iPosToken, cardType, cardLast4, cardExpiry } = req.body;
    
    if (!iPosToken) {
      return res.status(400).json({ error: 'iPOS token is required' });
    }
    
    try {
      const customer = await storage.updateCustomerProfile(req.params.id, {
        iPosToken: iPosToken,
        tokenCreatedAt: new Date(),
        tokenStatus: 'active',
        cardType: cardType,
        cardLast4: cardLast4,
        cardExpiry: cardExpiry
      });
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json({
        success: true,
        message: 'Token saved successfully',
        customer: customer
      });
    } catch (error) {
      console.error('Error saving token:', error);
      res.status(500).json({ error: 'Failed to save token' });
    }
  }));
  
  // Charge customer using stored token
  app.post('/api/customers/:id/charge', asyncHandler(async (req, res) => {
    const { amount, description, iPosAuthToken } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    try {
      // Get customer profile with token
      const customer = await storage.getCustomerProfile(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      if (!customer.iPosToken || customer.tokenStatus !== 'active') {
        return res.status(400).json({ error: 'No active payment token found for customer' });
      }
      
      // Import iPOS Transact service
      const { iPosService } = await import('./services/iPosTransactService');
      
      // Get the terminal config that has the numeric TPN for iPOS
      const terminalSettings = await storage.getSetting('terminalConfig');
      const terminalConfig = terminalSettings || {
        terminalType: "224725575584", // iPOS uses numeric TPN, not Dejavoo's alphanumeric
        apiKey: "JEkE6S7jPk",
        testMode: false
      };
      
      // Create iPOS Transact service instance
      const iPosConfig = {
        authToken: iPosAuthToken || "default_auth_token", // Requires valid auth token
        tpn: terminalConfig.terminalType,
        testMode: terminalConfig.testMode !== false
      };
      
      // Process recurring payment using stored card token
      const response = await iPosService.processRecurringCharge({
        amount: amount,
        description: description || 'Recurring payment',
        cardToken: customer.iPosToken, // Card token from SPIn stored in customer profile
        authToken: iPosAuthToken || terminalConfig.iPosAuthToken || "default_auth_token",
        merchantId: terminalConfig.terminalType || "224725575584" // Use TPN from terminal config
      });
      
      console.log('iPOS recurring charge response:', JSON.stringify(response));
      
      if (response.success) {
        const result = {
          status: "approved",
          transactionId: response.transactionId,
          authCode: response.authCode,
          message: response.message,
          amount: amount,
          customer: {
            id: customer.id,
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
            email: customer.email
          }
        };
        
        // Log successful transaction
        console.log("Customer charge result:", JSON.stringify(result));
        
        res.json(result);
      } else {
        res.status(400).json({
          status: "declined",
          error: response.error || 'Payment declined',
          amount: amount,
          customer: {
            id: customer.id,
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
            email: customer.email
          }
        });
      }
    } catch (error) {
      console.error("Error processing recurring charge:", error);
      res.status(500).json({ error: "Failed to process recurring charge" });
    }
  }));
  
  // Get customer transaction history
  app.get('/api/customers/:id/transactions', asyncHandler(async (req, res) => {
    try {
      const transactions = await storage.getCustomerTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching customer transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }));
  
  // Legacy customer charging for backward compatibility
  app.post('/api/customers/:id/charge-legacy', asyncHandler(async (req, res) => {
    const { amount, description, iPosAuthToken } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    try {
      // Get customer profile with token
      const customer = await storage.getCustomerProfile(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      if (!customer.iPosToken || customer.tokenStatus !== 'active') {
        return res.status(400).json({ error: 'No active payment token found for customer' });
      }
      
      // Process with legacy validation logic
      res.json({
        status: "not_implemented",
        message: "Legacy customer charging not implemented"
      });
    } catch (error) {
      console.error('Error processing recurring charge:', error);
      
      if (error.message && error.message.includes("auth")) {
        res.status(400).json({
          success: false,
          error: "iPOS authentication token required for recurring charges",
          note: "Provide valid iPOS auth token in request body"
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to process recurring charge"
        });
      }
    }
  }));
  
  // Get customer transaction history
  app.get('/api/customers/:id/transactions', asyncHandler(async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByCustomer(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching customer transactions:', error);
      res.status(500).json({ error: 'Failed to fetch customer transactions' });
    }
  }));
  
  // Create HTTP server but don't start listening (index.ts will handle that)
  const server = createServer(app);
  return server;
}