import { 
  users, transactions, settings, customerProfiles, tenants, subscriptions, paymentLogs, notificationLogs,
  type User, type InsertUser, type Transaction, type InsertTransaction, type InsertSettings, type Settings, 
  type CustomerProfile, type InsertCustomerProfile, type Tenant, type InsertTenant,
  type Subscription, type InsertSubscription, type PaymentLog, type InsertPaymentLog,
  type NotificationLog, type InsertNotificationLog
} from "@shared/schema";
import pg from "pg";

// Modify the interface with CRUD methods for all entities
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(): Promise<Transaction[]>;
  getTransactionsByCustomer(customerId: string): Promise<Transaction[]>;
  
  // Settings methods
  getSetting(key: string): Promise<any>;
  saveSetting(key: string, value: any): Promise<void>;
  getSettings(key: string): Promise<Settings | undefined>;
  
  // Customer management methods
  getCustomerProfiles(): Promise<CustomerProfile[]>;
  getCustomerProfile(id: string): Promise<CustomerProfile | undefined>;
  createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile>;
  updateCustomerProfile(id: string, updates: Partial<InsertCustomerProfile>): Promise<CustomerProfile | undefined>;
  
  // Tenant methods
  getTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant | undefined>;
  
  // Subscription methods
  getSubscriptions(tenantId?: string): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  getSubscriptionsByCustomer(customerId: string): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
  
  // Payment log methods
  createPaymentLog(log: InsertPaymentLog): Promise<PaymentLog>;
  getPaymentLogs(subscriptionId?: string, tenantId?: string): Promise<PaymentLog[]>;
  getPaymentLogsBySubscription(subscriptionId: string): Promise<PaymentLog[]>;
  getDailyPaymentFailures(tenantId: string, date: Date): Promise<PaymentLog[]>;
  
  // Notification log methods
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  getNotificationLogs(tenantId: string): Promise<NotificationLog[]>;
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

  async getSettings(key: string): Promise<Settings | undefined> {
    const value = this.settings.get(key);
    if (!value) return undefined;
    
    return {
      id: 1,
      key,
      value,
      updatedAt: new Date()
    };
  }

  async getTransactionsByCustomer(customerId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      t => (t as any).customerId === customerId
    );
  }

  // Customer management methods (basic in-memory implementation)
  async getCustomerProfiles(): Promise<CustomerProfile[]> {
    // This would be empty in MemStorage, database implementation handles this
    return [];
  }

  async getCustomerProfile(id: string): Promise<CustomerProfile | undefined> {
    return undefined;
  }

  async createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile> {
    const customer: CustomerProfile = {
      id: `customer_${Date.now()}`,
      email: profile.email,
      firstName: profile.firstName || null,
      lastName: profile.lastName || null,
      phone: profile.phone || null,
      company: profile.company || null,
      iPosToken: profile.iPosToken || null,
      tokenCreatedAt: profile.tokenCreatedAt || null,
      tokenStatus: profile.tokenStatus || null,
      cardType: profile.cardType || null,
      cardLast4: profile.cardLast4 || null,
      cardExpiry: profile.cardExpiry || null,
      subscriptionId: profile.subscriptionId || null,
      subscriptionStatus: profile.subscriptionStatus || null,
      billingCycle: profile.billingCycle || null,
      nextBillingDate: profile.nextBillingDate || null,
      notes: profile.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return customer;
  }

  // Stub implementations for new methods
  async getTenants(): Promise<Tenant[]> { return []; }
  async getTenant(id: string): Promise<Tenant | undefined> { return undefined; }
  async createTenant(tenant: InsertTenant): Promise<Tenant> { throw new Error("Not implemented in MemStorage"); }
  async updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant | undefined> { return undefined; }
  
  async getSubscriptions(tenantId?: string): Promise<Subscription[]> { return []; }
  async getSubscription(id: string): Promise<Subscription | undefined> { return undefined; }
  async getSubscriptionsByCustomer(customerId: string): Promise<Subscription[]> { return []; }
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> { throw new Error("Not implemented in MemStorage"); }
  async updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> { return undefined; }
  async deleteSubscription(id: string): Promise<boolean> { return false; }
  
  async createPaymentLog(log: InsertPaymentLog): Promise<PaymentLog> { throw new Error("Not implemented in MemStorage"); }
  async getPaymentLogs(subscriptionId?: string, tenantId?: string): Promise<PaymentLog[]> { return []; }
  async getPaymentLogsBySubscription(subscriptionId: string): Promise<PaymentLog[]> { return []; }
  async getDailyPaymentFailures(tenantId: string, date: Date): Promise<PaymentLog[]> { return []; }
  
  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> { throw new Error("Not implemented in MemStorage"); }
  async getNotificationLogs(tenantId: string): Promise<NotificationLog[]> { return []; }

  async updateCustomerProfile(id: string, updates: Partial<InsertCustomerProfile>): Promise<CustomerProfile | undefined> {
    return undefined;
  }
}

// Import drizzle components
import { db } from './db';
import { eq, gte, lte, sql } from 'drizzle-orm';

// Database storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values({
        ...insertTransaction,
        dateTime: typeof insertTransaction.dateTime === 'string'
          ? new Date(insertTransaction.dateTime)
          : insertTransaction.dateTime
      })
      .returning();
    return transaction as Transaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return (transaction as Transaction) || undefined;
  }

  async getTransactions(): Promise<Transaction[]> {
    return (await db.select().from(transactions).orderBy(transactions.dateTime)) as Transaction[];
  }

  async getTransactionsByCustomer(customerId: string): Promise<Transaction[]> {
    return (await db.select().from(transactions)
      .where(eq(transactions.customerId, customerId))
      .orderBy(transactions.dateTime)) as Transaction[];
  }

  async getSetting(key: string): Promise<any> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  }

  async saveSetting(key: string, value: any): Promise<void> {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() }
      });
  }

  async getSettings(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  // Customer management methods
  async getCustomerProfiles(): Promise<CustomerProfile[]> {
    return await db.select().from(customerProfiles).orderBy(customerProfiles.createdAt);
  }

  async getCustomerProfile(id: string): Promise<CustomerProfile | undefined> {
    const [customer] = await db.select().from(customerProfiles).where(eq(customerProfiles.id, id));
    return customer || undefined;
  }

  async createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile> {
    const [customer] = await db
      .insert(customerProfiles)
      .values(profile)
      .returning();
    return customer;
  }

  async updateCustomerProfile(id: string, updates: Partial<InsertCustomerProfile>): Promise<CustomerProfile | undefined> {
    const [customer] = await db
      .update(customerProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerProfiles.id, id))
      .returning();
    return customer || undefined;
  }

  // Tenant methods
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(tenants.createdAt);
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db
      .insert(tenants)
      .values(tenant)
      .returning();
    return newTenant;
  }

  async updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant || undefined;
  }

  // Subscription methods
  async getSubscriptions(tenantId?: string): Promise<Subscription[]> {
    if (tenantId) {
      return await db.select().from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .orderBy(subscriptions.createdAt);
    }
    return await db.select().from(subscriptions).orderBy(subscriptions.createdAt);
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription || undefined;
  }

  async getSubscriptionsByCustomer(customerId: string): Promise<Subscription[]> {
    return await db.select().from(subscriptions)
      .where(eq(subscriptions.customerId, customerId))
      .orderBy(subscriptions.createdAt);
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db
      .insert(subscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription || undefined;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Payment log methods
  async createPaymentLog(log: InsertPaymentLog): Promise<PaymentLog> {
    const [paymentLog] = await db
      .insert(paymentLogs)
      .values(log)
      .returning();
    return paymentLog;
  }

  async getPaymentLogs(subscriptionId?: string, tenantId?: string): Promise<PaymentLog[]> {
    let query = db.select().from(paymentLogs);
    
    if (subscriptionId && tenantId) {
      return await db.select().from(paymentLogs)
        .where(
          sql`${paymentLogs.subscriptionId} = ${subscriptionId} AND ${paymentLogs.tenantId} = ${tenantId}`
        )
        .orderBy(paymentLogs.attemptedAt);
    } else if (subscriptionId) {
      return await db.select().from(paymentLogs)
        .where(eq(paymentLogs.subscriptionId, subscriptionId))
        .orderBy(paymentLogs.attemptedAt);
    } else if (tenantId) {
      return await db.select().from(paymentLogs)
        .where(eq(paymentLogs.tenantId, tenantId))
        .orderBy(paymentLogs.attemptedAt);
    }
    
    return await db.select().from(paymentLogs).orderBy(paymentLogs.attemptedAt);
  }

  async getPaymentLogsBySubscription(subscriptionId: string): Promise<PaymentLog[]> {
    return await db.select().from(paymentLogs)
      .where(eq(paymentLogs.subscriptionId, subscriptionId))
      .orderBy(paymentLogs.attemptedAt);
  }

  async getDailyPaymentFailures(tenantId: string, date: Date): Promise<PaymentLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db.select().from(paymentLogs)
      .where(
        sql`${paymentLogs.tenantId} = ${tenantId} AND ${paymentLogs.status} = 'failed' AND ${paymentLogs.attemptedAt} >= ${startOfDay} AND ${paymentLogs.attemptedAt} <= ${endOfDay}`
      )
      .orderBy(paymentLogs.attemptedAt);
  }

  // Notification log methods
  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> {
    const [notificationLog] = await db
      .insert(notificationLogs)
      .values(log)
      .returning();
    return notificationLog;
  }

  async getNotificationLogs(tenantId: string): Promise<NotificationLog[]> {
    return await db.select().from(notificationLogs)
      .where(eq(notificationLogs.tenantId, tenantId))
      .orderBy(notificationLogs.createdAt);
  }
}

// Create a storage instance - use DatabaseStorage for production
export const storage = new DatabaseStorage();
