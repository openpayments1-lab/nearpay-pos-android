import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { checkTerminalConnection, processCardPayment } from "./dejavooService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Terminal connection check endpoint
  app.post("/api/terminal/check", async (req, res) => {
    try {
      const { ip, terminalType, apiKey, testMode } = req.body;
      
      if (!ip) {
        return res.status(400).json({ error: "Terminal IP address is required" });
      }
      
      // Pass additional configuration for terminal check
      const connected = await checkTerminalConnection(ip, {
        terminalType,
        apiKey,
        testMode
      });
      
      return res.json({ connected });
    } catch (error) {
      console.error("Terminal check error:", error);
      return res.status(500).json({ error: "Failed to check terminal connection" });
    }
  });

  // Cash payment endpoint
  app.post("/api/payment/cash", async (req, res) => {
    try {
      const { amount } = req.body;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }
      
      // Store transaction in database
      const transaction = await storage.createTransaction({
        amount: parseFloat(amount),
        paymentMethod: "cash",
        status: "completed",
        terminalIp: null,
        cardDetails: null,
        dateTime: new Date().toISOString()
      });
      
      return res.json({
        transactionId: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        dateTime: transaction.dateTime
      });
    } catch (error) {
      console.error("Cash payment error:", error);
      return res.status(500).json({ error: "Failed to process cash payment" });
    }
  });

  // Card payment endpoint
  app.post("/api/payment/card", async (req, res) => {
    try {
      const { amount, terminalConfig } = req.body;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }
      
      if (!terminalConfig || !terminalConfig.terminalIp) {
        return res.status(400).json({ error: "Terminal configuration is required" });
      }
      
      // Extract terminal configuration from the request
      const config = terminalConfig;
      
      // Process payment through Dejavoo terminal with full configuration
      const result = await processCardPayment(
        config.terminalIp, 
        parseFloat(amount), 
        {
          terminalType: config.terminalType,
          apiKey: config.apiKey,
          enableTipping: config.enableTipping,
          enableSignature: config.enableSignature,
          testMode: config.testMode,
          transactionTimeout: config.transactionTimeout
        }
      );
      
      // Store transaction in database
      const transaction = await storage.createTransaction({
        amount: parseFloat(amount),
        paymentMethod: "card",
        status: result.status,
        terminalIp: config.terminalIp,
        cardDetails: result.status === "approved" ? {
          type: result.cardType || "Credit",
          number: result.maskedPan || "**** **** **** ****",
          authCode: result.authCode || "N/A"
        } : null,
        dateTime: new Date().toISOString()
      });
      
      return res.json({
        transactionId: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        dateTime: transaction.dateTime,
        cardType: result.cardType,
        maskedPan: result.maskedPan,
        authCode: result.authCode,
        message: result.message
      });
    } catch (error) {
      console.error("Card payment error:", error);
      return res.status(500).json({ error: "Failed to process card payment" });
    }
  });

  // Get transaction history endpoint
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      return res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      return res.status(500).json({ error: "Failed to get transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
