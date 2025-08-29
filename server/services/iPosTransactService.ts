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
  terminalId?: string; // TPN from terminal config
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
  private productionUrl = 'https://payment.ipospays.com/api/v3/iposTransact';

  /**
   * Process a recurring charge using a stored iPOS token
   */
  async processRecurringCharge(request: iPosChargeRequest): Promise<iPosChargeResponse> {
    try {
      console.log('Processing recurring charge with iPOS Transact API V3:', {
        amount: request.amount,
        description: request.description,
        tokenPresent: !!request.iPosToken,
        authTokenPresent: !!request.iPosAuthToken
      });

      // Use TPN from auth token - it must match what's encoded in the JWT
      const decodedToken = this.decodeJWT(request.iPosAuthToken);
      const tpn = decodedToken?.tpn || request.terminalId || "224725231775";
      
      console.log('Using TPN from JWT token:', tpn, 'decoded from:', decodedToken);
      
      // Generate unique transaction reference ID (must be 20 chars or fewer, alphanumeric)
      const transactionReferenceId = `${Date.now()}${Math.random().toString(36).substr(2, 7)}`.substr(0, 20);
      
      // Convert amount to cents string format
      const amountInCents = Math.round(request.amount * 100).toString();

      const payload = {
        merchantAuthentication: {
          merchantId: tpn,
          transactionReferenceId: transactionReferenceId
        },
        transactionRequest: {  // Fixed: was "transactRequest", should be "transactionRequest"
          transactionType: 1, // Sale transaction
          amount: amountInCents,
          cardToken: request.iPosToken,
          applySteamSettingTipFeeTax: "false"
        },
        preferences: {
          eReceipt: false
        }
      };

      console.log('iPOS Transact API V3 payload:', JSON.stringify(payload, null, 2));

      // Try production endpoint since TPN 224725575584 might be production-only
      const apiUrl = this.productionUrl;
      
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'token': request.iPosAuthToken
        },
        timeout: 30000
      });

      console.log('iPOS Transact API V3 response:', response.data);

      // Check if the response indicates success (iPOS Transact V3 format)
      const iposResponse = response.data.iposTransactResponse;
      
      if (iposResponse && (iposResponse.responseCode === "200" || iposResponse.responseCode === "00")) {
        return {
          success: true,
          transactionId: iposResponse.transactionId,
          authCode: iposResponse.responseApprovalCode,
          message: iposResponse.responseMessage || 'Charge processed successfully',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: iposResponse?.responseMessage || 'Charge failed',
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
   * Decode JWT token to get TPN and other details
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  /**
   * Validate an iPOS token using a test transaction
   */
  async validateToken(iPosToken: string, iPosAuthToken: string): Promise<boolean> {
    try {
      // Test with a minimal amount (1 cent) to validate the token
      const testResponse = await this.processRecurringCharge({
        amount: 0.01,
        description: 'Token validation test',
        iPosToken: iPosToken,
        iPosAuthToken: iPosAuthToken
      });

      return testResponse.success;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

export const iPosService = new iPosTransactService();