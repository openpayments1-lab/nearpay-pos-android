import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";
import { z } from "zod";

// User schema (keeping it from the original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Transaction schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: integer("amount").notNull(), // Store in cents to avoid floating point issues
  paymentMethod: text("payment_method").notNull(), // 'cash' or 'card'
  status: text("status").notNull(), // 'completed', 'approved', 'declined', etc.
  dateTime: timestamp("date_time").notNull(),
  terminalIp: text("terminal_ip"),
  cardDetails: jsonb("card_details"), // Store card type, masked number, auth code, etc.
  customerId: varchar("customer_id"), // Reference to customer profile
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

export const cardDetailsSchema = z.object({
  type: z.string().optional(),
  number: z.string().optional(),
  authCode: z.string().optional(),
});

export type CardDetails = z.infer<typeof cardDetailsSchema>;

// Allow using string (ISO format) for dates in the backend
export const insertTransactionSchema2 = z.object({
  amount: z.number(),
  paymentMethod: z.string(),
  status: z.string(),
  dateTime: z.string().or(z.date()),
  terminalIp: z.string().nullable(),
  cardDetails: cardDetailsSchema.nullable(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema2>;
// Modified to handle string or Date for dateTime
export type Transaction = {
  id: number;
  amount: number;
  paymentMethod: string;
  status: string;
  dateTime: Date;
  terminalIp: string | null;
  cardDetails: CardDetails | null;
};

// Terminal configuration type
export interface TerminalConfig {
  terminalIp: string;
  apiKey: string;
  terminalType: string;
  enableTipping: boolean;
  enableSignature: boolean;
  testMode: boolean;
  transactionTimeout: number;
}

// Dejavoo General Response Structure
export interface DejavooGeneralResponse {
  hostResponseCode?: string;
  hostResponseMessage?: string;
  resultCode?: string;
  statusCode?: string;
  message?: string;
  detailedMessage?: string;
  delayBeforeNextRequest?: number | null;
}

// Dejavoo Card Data
export interface DejavooCardData {
  cardType?: string;
  entryType?: string;
  last4?: string;
  first4?: string;
  bin?: string;
  expirationDate?: string;
  name?: string;
}

// Dejavoo EMV Data
export interface DejavooEMVData {
  applicationName?: string;
  aid?: string;
  tvr?: string;
  tsi?: string;
  iad?: string;
  arc?: string;
}

// Dejavoo Receipt Data
export interface DejavooReceiptData {
  customer?: string;
  merchant?: string;
}

// Dejavoo Amount Data
export interface DejavooAmountData {
  totalAmount?: number | null;
  amount?: number | null;
  tipAmount?: number | null;
  feeAmount?: number | null;
  taxAmount?: number | null;
}

// Dejavoo Full Transaction Response
export interface DejavooFullResponse {
  generalResponse?: DejavooGeneralResponse;
  paymentType?: string;
  transactionType?: string;
  amounts?: DejavooAmountData;
  authCode?: string;
  referenceId?: string;
  invoiceNumber?: string;
  serialNumber?: string;
  batchNumber?: string;
  transactionNumber?: string;
  voided?: boolean;
  signature?: string;
  iPosToken?: string;
  token?: string;
  rrn?: string;
  extendedDataByApplication?: Record<string, any>;
  cardData?: DejavooCardData;
  emvData?: DejavooEMVData;
  receipts?: DejavooReceiptData;
}

// Simplified Dejavoo Transaction Response (for backward compatibility)
// This interface represents our internal simplified transaction response
export interface DejavooTransactionResponse {
  // Our internal status fields (normalized)
  status: string;
  message?: string;
  transactionId?: string;
  dateTime?: string;
  cardType?: string;
  maskedPan?: string;
  authCode?: string;
  hostResponseCode?: string;
  hostResponseMessage?: string;
  
  // Actual Dejavoo API response fields (PascalCase)
  GeneralResponse?: {
    HostResponseCode?: string;
    HostResponseMessage?: string;
    ResultCode?: string;
    StatusCode?: string;
    Message?: string;
    DetailedMessage?: string;
    DelayBeforeNextRequest?: number | null;
  };
  PaymentType?: string;
  TransactionType?: string;
  Amounts?: {
    TotalAmount?: number | null;
    Amount?: number | null;
    TipAmount?: number | null;
    FeeAmount?: number | null;
    TaxAmount?: number | null;
  };
  AuthCode?: string;
  ReferenceId?: string;
  InvoiceNumber?: string;
  SerialNumber?: string;
  BatchNumber?: string;
  TransactionNumber?: string;
  Voided?: boolean;
  iPosToken?: string;
  Token?: string;
  RRN?: string;
  
  // Card data in PascalCase
  CardData?: {
    CardType?: string;
    EntryType?: string;
    Last4?: string;
    First4?: string;
    BIN?: string;
    ExpirationDate?: string;
    Name?: string;
  };
  
  // EMV data in PascalCase
  EMVData?: {
    ApplicationName?: string;
    AID?: string;
    TVR?: string;
    TSI?: string;
    IAD?: string;
    ARC?: string;
  };
  
  // Extended data (for Return/Refund transactions)
  ExtendedDataByApplication?: Record<string, any>;
  
  // Our duplicated interface fields (camelCase for backward compatibility)
  generalResponse?: {
    hostResponseCode?: string;
    hostResponseMessage?: string;
    resultCode?: string;
    statusCode?: string;
    message?: string;
    detailedMessage?: string;
  };
  paymentType?: string;
  transactionType?: string;
  amounts?: {
    totalAmount?: number | null;
    amount?: number | null;
    tipAmount?: number | null;
  };
  authcode?: string;
  referenceId?: string;
  transactionNumber?: string;
  cardData?: {
    cardType?: string;
    entryType?: string;
    last4?: string;
    first4?: string;
    bin?: string;
    expirationDate?: string;
    name?: string;
  };
  
  // Allow any additional properties for future compatibility
  [key: string]: any;
}

// Settings table to store application settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Customer profiles table for storing client information and payment tokens
export const customerProfiles = pgTable("customer_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  company: varchar("company"),
  
  // Payment token information
  iPosToken: varchar("ipos_token"), // Stored token for recurring payments
  tokenCreatedAt: timestamp("token_created_at"),
  tokenStatus: varchar("token_status").default("active"), // active, expired, revoked
  
  // Subscription information
  subscriptionId: varchar("subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // active, paused, cancelled
  billingCycle: varchar("billing_cycle"), // monthly, yearly, etc.
  nextBillingDate: timestamp("next_billing_date"),
  
  // Card information (masked for security)
  cardLast4: varchar("card_last4"),
  cardType: varchar("card_type"),
  cardExpiry: varchar("card_expiry"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes")
});

export const insertCustomerProfileSchema = createInsertSchema(customerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = z.infer<typeof insertCustomerProfileSchema>;

// Relations
export const customerProfilesRelations = relations(customerProfiles, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  customerProfile: one(customerProfiles, {
    fields: [transactions.customerId],
    references: [customerProfiles.id],
  }),
}));
