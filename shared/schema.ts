import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (for potential future admin/authentication features)
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

// Transaction schema - simplified for NearPay
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: integer("amount").notNull(), // Store in cents to avoid floating point issues
  status: text("status").notNull(), // 'approved', 'declined', 'pending', 'error'
  dateTime: timestamp("date_time").notNull().defaultNow(),
  cardDetails: jsonb("card_details"), // Store card type, masked number, auth code, etc.
  transactionId: text("transaction_id"), // NearPay transaction UUID
  errorMessage: text("error_message"), // Store error details if payment failed
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

export const cardDetailsSchema = z.object({
  type: z.string().optional(),
  last4: z.string().optional(),
  authCode: z.string().optional(),
  cardholderName: z.string().optional(),
});

export type CardDetails = z.infer<typeof cardDetailsSchema>;

// Allow using string (ISO format) for dates in the backend
export const insertTransactionSchema2 = z.object({
  amount: z.number(),
  status: z.string(),
  dateTime: z.string().or(z.date()).optional(),
  cardDetails: cardDetailsSchema.nullable().optional(),
  transactionId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema2>;

export type Transaction = {
  id: number;
  amount: number;
  status: string;
  dateTime: Date;
  cardDetails: CardDetails | null;
  transactionId: string | null;
  errorMessage: string | null;
};

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

// NearPay configuration interface
export interface NearPayConfig {
  authToken: string; // JWT token or email/phone for authentication
  environment: 'sandbox' | 'production';
  enableReceipt: boolean;
}

// NearPay payment response interface
export interface NearPayResponse {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  cardType?: string;
  last4?: string;
  amount?: number;
  errorMessage?: string;
  errorCode?: string;
}
