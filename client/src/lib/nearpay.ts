/**
 * NearPay Capacitor Plugin Interface
 * 
 * This module provides the TypeScript interface for the NearPay Android plugin
 */

import { registerPlugin } from '@capacitor/core';

export interface NearPayPlugin {
  /**
   * Initialize the NearPay SDK
   * @param options Configuration options for NearPay
   */
  initialize(options: {
    authToken: string;
    environment: 'sandbox' | 'production';
    googleCloudProjectNumber: number;
    country?: 'SA' | 'TR' | 'USA' | 'KEN';
  }): Promise<{ success: boolean; message: string }>;

  /**
   * Authenticate using JWT token
   * @param options JWT authentication options
   */
  jwtLogin(options: {
    jwt: string;
  }): Promise<{
    success: boolean;
    terminalUUID?: string;
    terminalId?: string;
    errorMessage?: string;
  }>;

  /**
   * Process a payment using NFC
   * @param options Payment details
   */
  processPayment(options: {
    amount: number;
  }): Promise<NearPayResponse>;

  /**
   * Check if a user session is active
   */
  checkSession(): Promise<{ sessionActive: boolean }>;
}

export interface NearPayResponse {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  cardDetails?: {
    type?: string;
    last4?: string;
  };
  amount?: number;
  errorMessage?: string;
  errorCode?: string;
}

// Register the plugin
const NearPay = registerPlugin<NearPayPlugin>('NearPay', {
  web: {
    // Web fallback for testing in browser
    initialize: async () => {
      console.warn('NearPay is only available on Android devices');
      return { success: false, message: 'Not available on web' };
    },
    jwtLogin: async () => {
      console.warn('NearPay is only available on Android devices');
      return {
        success: false,
        errorMessage: 'NearPay is only available on Android devices'
      };
    },
    processPayment: async () => {
      console.warn('NearPay is only available on Android devices');
      return {
        success: false,
        errorMessage: 'NearPay is only available on Android devices',
        errorCode: 'PLATFORM_NOT_SUPPORTED'
      };
    },
    checkSession: async () => {
      return { sessionActive: false };
    }
  }
});

export default NearPay;
