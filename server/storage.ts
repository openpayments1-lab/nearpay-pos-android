import { users, transactions, settings, type User, type InsertUser, type Transaction, type InsertTransaction, type InsertSettings, type Settings } from "@shared/schema";
import pg from "pg";

// Modify the interface with CRUD methods for transactions and settings
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(): Promise<Transaction[]>;
  
  // Settings methods
  getSetting(key: string): Promise<any>;
  saveSetting(key: string, value: any): Promise<void>;
}

// Memory storage implementation for fallback
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private settings: Map<string, any>;
  currentUserId: number;
  currentTransactionId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.settings = new Map();
    this.currentUserId = 1;
    this.currentTransactionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    // Ensure dateTime is a Date object
    const dateTime = typeof insertTransaction.dateTime === 'string'
      ? new Date(insertTransaction.dateTime)
      : insertTransaction.dateTime;
    
    const transaction: Transaction = { 
      id, 
      amount: insertTransaction.amount,
      paymentMethod: insertTransaction.paymentMethod,
      status: insertTransaction.status,
      dateTime,
      terminalIp: insertTransaction.terminalIp,
      cardDetails: insertTransaction.cardDetails
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async getSetting(key: string): Promise<any> {
    return this.settings.get(key);
  }

  async saveSetting(key: string, value: any): Promise<void> {
    this.settings.set(key, value);
  }
}

// PostgreSQL storage implementation
export class PostgresStorage implements IStorage {
  private pool: any;
  
  constructor() {
    this.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Initialize database tables if they don't exist
    this.initDatabase();
  }
  
  private async initDatabase() {
    try {
      // Create users table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        )
      `);
      
      // Create transactions table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          amount INTEGER NOT NULL,
          payment_method TEXT NOT NULL,
          status TEXT NOT NULL,
          date_time TIMESTAMP NOT NULL,
          terminal_ip TEXT,
          card_details JSONB
        )
      `);
      
      // Create settings table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value JSONB NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        password: result.rows[0].password
      };
    } catch (error) {
      console.error("Failed to get user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        password: result.rows[0].password
      };
    } catch (error) {
      console.error("Failed to get user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await this.pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
        [insertUser.username, insertUser.password]
      );
      
      return {
        id: result.rows[0].id,
        username: insertUser.username,
        password: insertUser.password
      };
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    try {
      // Convert date string to Date object if necessary
      const dateTime = typeof insertTransaction.dateTime === 'string' 
        ? new Date(insertTransaction.dateTime) 
        : insertTransaction.dateTime;
        
      // Convert card details to JSON string
      const cardDetailsJson = insertTransaction.cardDetails 
        ? JSON.stringify(insertTransaction.cardDetails) 
        : null;
      
      const result = await this.pool.query(
        `INSERT INTO transactions 
         (amount, payment_method, status, date_time, terminal_ip, card_details) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id`,
        [
          insertTransaction.amount,
          insertTransaction.paymentMethod,
          insertTransaction.status,
          dateTime,
          insertTransaction.terminalIp,
          cardDetailsJson
        ]
      );
      
      return {
        id: result.rows[0].id,
        amount: insertTransaction.amount,
        paymentMethod: insertTransaction.paymentMethod,
        status: insertTransaction.status,
        dateTime: dateTime,
        terminalIp: insertTransaction.terminalIp,
        cardDetails: insertTransaction.cardDetails
      };
    } catch (error) {
      console.error("Failed to create transaction:", error);
      throw error;
    }
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM transactions WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        amount: row.amount,
        paymentMethod: row.payment_method,
        status: row.status,
        dateTime: row.date_time,
        terminalIp: row.terminal_ip,
        cardDetails: row.card_details ? JSON.parse(row.card_details) : null
      };
    } catch (error) {
      console.error("Failed to get transaction:", error);
      return undefined;
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM transactions ORDER BY date_time DESC'
      );
      
      return result.rows.map((row: any) => ({
        id: row.id,
        amount: row.amount,
        paymentMethod: row.payment_method,
        status: row.status,
        dateTime: row.date_time,
        terminalIp: row.terminal_ip,
        cardDetails: row.card_details ? JSON.parse(row.card_details) : null
      }));
    } catch (error) {
      console.error("Failed to get transactions:", error);
      return [];
    }
  }

  async getSetting(key: string): Promise<any> {
    try {
      const result = await this.pool.query(
        'SELECT value FROM settings WHERE key = $1',
        [key]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0].value;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return undefined;
    }
  }

  async saveSetting(key: string, value: any): Promise<void> {
    try {
      // Use upsert (insert or update) with ON CONFLICT
      await this.pool.query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
      
      console.log(`Setting ${key} saved successfully`);
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
      throw error;
    }
  }
}

// Create and export the appropriate storage implementation
// Use PostgresStorage if DATABASE_URL is available, otherwise fall back to MemStorage
export const storage = process.env.DATABASE_URL 
  ? new PostgresStorage() 
  : new MemStorage();
