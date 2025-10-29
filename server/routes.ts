/**
 * routes.ts
 * 
 * Simplified API routes for NearPay payment processing
 */

import { Express, Request, Response, NextFunction } from 'express';
import { Server, createServer } from 'http';
import { storage } from './storage';
import { insertTransactionSchema2 } from '../shared/schema';

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
  
  // Get all transactions
  app.get('/api/transactions', asyncHandler(async (req, res) => {
    console.log('Fetching all transactions');
    try {
      const transactions = await storage.getTransactions();
      console.log('Transactions retrieved successfully:', transactions.length, 'transactions');
      res.json(transactions);
    } catch (error) {
      console.error('Error retrieving transactions:', error);
      throw error;
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
  
  // Create new transaction (called after NearPay processes payment)
  app.post('/api/transactions', asyncHandler(async (req, res) => {
    console.log('Creating new transaction:', req.body);
    
    try {
      // Validate the request body using schema that accepts nullable fields
      const validatedData = insertTransactionSchema2.parse(req.body);
      
      // Create the transaction
      const transaction = await storage.createTransaction(validatedData);
      
      console.log('Transaction created successfully:', transaction.id);
      res.status(201).json(transaction);
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      res.status(400).json({ error: error.message || 'Failed to create transaction' });
    }
  }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Create HTTP server
  const server = createServer(app);
  
  return server;
}
