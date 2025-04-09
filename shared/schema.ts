import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

// Dejavoo Transaction Response
export interface DejavooTransactionResponse {
  status: string;
  message?: string;
  transactionId?: string;
  dateTime?: string;
  cardType?: string;
  maskedPan?: string;
  authCode?: string;
  hostResponseCode?: string;
  hostResponseMessage?: string;
}
