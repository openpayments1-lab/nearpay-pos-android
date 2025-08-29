/**
 * iPOS Transact Service for recurring payments using stored tokens
 * This service handles token-based transactions through the iPOS Transact API
 */

import axios from 'axios';

export interface iPosChargeRequest {
  amount: number;
  description?: string;
  iPosToken: string;
  iPosAuthToken: string;
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
  private baseUrl = 'https://api.iposusa.com/transact';

  /**
   * Process a recurring charge using a stored iPOS token
   */
  async processRecurringCharge(request: iPosChargeRequest): Promise<iPosChargeResponse> {
    try {
      console.log('Processing recurring charge with iPOS Transact API:', {
        amount: request.amount,
        description: request.description,
        tokenPresent: !!request.iPosToken,
        authTokenPresent: !!request.iPosAuthToken
      });

      const payload = {
        Token: request.iPosToken,
        Amount: request.amount,
        Description: request.description || 'Recurring payment',
        AuthToken: request.iPosAuthToken
      };

      const response = await axios.post(`${this.baseUrl}/charge`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.iPosAuthToken}`
        },
        timeout: 30000
      });

      console.log('iPOS Transact API response:', response.data);

      // Check if the response indicates success
      if (response.data.Success || response.data.success) {
        return {
          success: true,
          transactionId: response.data.TransactionId || response.data.transactionId,
          authCode: response.data.AuthCode || response.data.authCode,
          message: response.data.Message || response.data.message || 'Charge processed successfully',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.Message || response.data.message || 'Charge failed',
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
          error: error.response.data?.Message || error.response.data?.message || 'API request failed',
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
   * Validate an iPOS token
   */
  async validateToken(iPosToken: string, iPosAuthToken: string): Promise<boolean> {
    try {
      const payload = {
        Token: iPosToken,
        AuthToken: iPosAuthToken
      };

      const response = await axios.post(`${this.baseUrl}/validate`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${iPosAuthToken}`
        },
        timeout: 15000
      });

      return response.data.Valid || response.data.valid || false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

export const iPosService = new iPosTransactService();