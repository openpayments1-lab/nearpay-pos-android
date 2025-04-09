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
    const transactions = await storage.getTransactions();
    res.json(transactions);
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
      
      // Get detailed terminal status with a consistent referenceId
      const statusPayload = {
        Tpn: terminalType || "2247257465",
        Authkey: apiKey || "JEkE6S7jPk",
        ReferenceId: referenceId,
        PaymentType: "Credit"
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
        
        const result = await dejavooService.makeApiRequest<DejavooStatusResponse>('status', statusPayload, {
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
    const { amount, terminalConfig } = req.body;
    
    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
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
    
    // If transaction was approved, save it to the database
    if (result.status === 'approved') {
      try {
        // Parse transaction data
        const transactionData = {
          amount: numericAmount,
          paymentMethod: 'card',
          status: result.status,
          dateTime: new Date(),
          terminalIp: terminalConfig.terminalIp,
          cardDetails: result.cardType ? {
            type: result.cardType,
            number: result.maskedPan || '**** **** **** ****',
            authCode: result.authCode || 'N/A'
          } : null
        };
        
        // Validate transaction data
        const validatedData = insertTransactionSchema2.parse(transactionData);
        
        // Save transaction to database
        const savedTransaction = await storage.createTransaction(validatedData);
        console.log('Transaction saved:', savedTransaction);
      } catch (error) {
        console.error('Error saving transaction:', error);
        // Continue even if saving fails - don't affect the response
      }
    }
    
    res.json(result);
  }));
  
  // Process cash payment
  app.post('/api/payment/cash', asyncHandler(async (req, res) => {
    const { amount } = req.body;
    
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
    
    res.json(result);
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
  
  // Create HTTP server but don't start listening (index.ts will handle that)
  const server = createServer(app);
  return server;
}