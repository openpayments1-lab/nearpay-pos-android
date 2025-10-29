import { 
  users, transactions, settings,
  type User, type InsertUser, type Transaction, type InsertTransaction, 
  type InsertSettings, type Settings
} from "@shared/schema";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

// Simplified storage interface for NearPay app
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(): Promise<Transaction[]>;
  
  // Settings methods
  getSetting(key: string): Promise<any>;
  saveSetting(key: string, value: any): Promise<void>;
  getSettings(key: string): Promise<Settings | undefined>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    const pool = new pg.Pool({ connectionString });
    this.db = drizzle(pool);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Transaction methods
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const dateTime = transaction.dateTime 
      ? (typeof transaction.dateTime === 'string' ? new Date(transaction.dateTime) : transaction.dateTime)
      : new Date();

    const result = await this.db.insert(transactions).values({
      amount: transaction.amount,
      status: transaction.status,
      dateTime: dateTime,
      cardDetails: transaction.cardDetails || null,
      transactionId: transaction.transactionId || null,
      errorMessage: transaction.errorMessage || null,
    }).returning();
    
    return result[0] as Transaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await this.db.select().from(transactions).where(eq(transactions.id, id));
    return result[0] as Transaction | undefined;
  }

  async getTransactions(): Promise<Transaction[]> {
    const result = await this.db.select().from(transactions);
    return result as Transaction[];
  }

  // Settings methods
  async getSetting(key: string): Promise<any> {
    const result = await this.db.select().from(settings).where(eq(settings.key, key));
    return result[0]?.value;
  }

  async saveSetting(key: string, value: any): Promise<void> {
    const existing = await this.getSettings(key);
    
    if (existing) {
      await this.db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key));
    } else {
      await this.db.insert(settings).values({ key, value });
    }
  }

  async getSettings(key: string): Promise<Settings | undefined> {
    const result = await this.db.select().from(settings).where(eq(settings.key, key));
    return result[0];
  }
}

// Export a singleton instance
export const storage = new DatabaseStorage();
