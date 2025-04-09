// Payment method type
export type PaymentMethod = 'cash' | 'card';

// Terminal connection status
export type TerminalStatus = 'not-configured' | 'connected' | 'failed';

// Status message type for transaction status
export type StatusType = 'info' | 'success' | 'error' | 'warning';

// Terminal configuration
export interface TerminalConfig {
  terminalIp: string;
  apiKey: string;
  terminalType: string;
  enableTipping: boolean;
  enableSignature: boolean;
  testMode: boolean;
  transactionTimeout: number;
}

// Card details for receipt
export interface CardDetails {
  type: string;
  number: string;
  authCode: string;
}

// Receipt type
export interface Receipt {
  transactionId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  dateTime: string;
  status: string;
  cardDetails?: CardDetails;
}

// Transaction response from Dejavoo terminal
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
