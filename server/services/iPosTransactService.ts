/**
 * iPOS Transact Service for recurring payments using stored tokens
 * This service handles token-based transactions through the iPOS Transact API
 */

import axios from 'axios';

export interface iPosChargeRequest {
  amount: number;
  description?: string;
  cardToken: string; // Card token from SPIn transaction
  authToken: string; // iPOS auth token (Bearer token)
  merchantId: string; // Terminal ID (TPN)
  isProduction?: boolean;
  customerInfo?: {
    name?: string;
    email?: string;
    mobile?: string;
  };
  avsInfo?: {
    streetNo?: string;
    zip?: string;
  };
}

export interface iPosChargeResponse {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  message?: string;
  error?: string;
  rawResponse?: any;
}

export class iPosTransactService {
  private sandboxUrl = 'https://payment.ipospays.tech/api/v3/iposTransact';
  private productionUrl = 'https://api.ipospays.com/ipos-transact';


  /**
   * Process a recurring charge using a stored card token from SPIn
   */
  async processRecurringCharge(request: iPosChargeRequest): Promise<iPosChargeResponse> {
    try {
      console.log('Processing recurring charge with iPOS Transact API:', {
        amount: request.amount,
        description: request.description,
        cardTokenPresent: !!request.cardToken,
        merchantId: request.merchantId
      });
      
      // Generate unique transaction reference ID (must be 20 chars or fewer, alphanumeric)
      const transactionReferenceId = `${Date.now()}${Math.random().toString(36).substr(2, 7)}`.substr(0, 20);
      
      // Convert amount to cents string format
      const amountInCents = Math.round(request.amount * 100).toString();

      // Build payload matching the user's example structure
      const payload = {
        merchantAuthentication: {
          merchantId: request.merchantId,
          transactionReferenceId: transactionReferenceId
        },
        transactionRequest: {
          transactionType: 5, // Pre-Auth (using token) as per user's example
          amount: amountInCents,
          cardToken: request.cardToken, // Card token obtained from SPIn
          applySteamSettingTipFeeTax: false
        },
        preferences: {
          eReceipt: true,
          customerName: request.customerInfo?.name || "",
          customerEmail: request.customerInfo?.email || "",
          customerMobile: request.customerInfo?.mobile || ""
        },
        Avs: {
          StreetNo: request.avsInfo?.streetNo || "",
          Zip: request.avsInfo?.zip || ""
        }
      };

      console.log('iPOS Transact API payload:', JSON.stringify(payload, null, 2));

      // Use the appropriate endpoint
      const apiUrl = request.isProduction ? this.productionUrl : this.sandboxUrl;
      
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.authToken}` // Bearer token authentication
        },
        timeout: 30000
      });

      console.log('iPOS Transact API response:', response.data);

      // Check if the response indicates success
      const iposResponse = response.data;
      
      if (iposResponse && (iposResponse.responseCode === "200" || iposResponse.responseCode === "00" || iposResponse.success)) {
        return {
          success: true,
          transactionId: iposResponse.transactionId || iposResponse.id,
          authCode: iposResponse.authCode || iposResponse.approvalCode,
          message: iposResponse.message || iposResponse.responseMessage || 'Charge processed successfully',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: iposResponse?.message || iposResponse?.responseMessage || 'Charge failed',
          rawResponse: response.data
        };
      }

    } catch (error: any) {
      console.error('iPOS Transact API error:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        return {
          success: false,
          error: error.response.data?.message || error.response.data?.Message || 'API request failed',
          rawResponse: error.response.data
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'Network error - unable to reach iPOS Transact API'
        };
      } else {
        return {
          success: false,
          error: error.message || 'Unknown error occurred'
        };
      }
    }
  }

  /**
   * Validate a card token using a test transaction
   */
  async validateToken(cardToken: string, authToken: string, merchantId: string): Promise<boolean> {
    try {
      // Test with a minimal amount (1 cent) to validate the token
      const testResponse = await this.processRecurringCharge({
        amount: 0.01,
        description: 'Token validation test',
        cardToken: cardToken,
        authToken: authToken,
        merchantId: merchantId
      });

      return testResponse.success;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

export const iPosService = new iPosTransactService();