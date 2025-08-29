/**
 * iPOS Transact Service for recurring payments using stored tokens
 * This service handles token-based transactions through the iPOS Transact API
 */

import axios from 'axios';

export interface iPosChargeRequest {
  amount: number;
  description?: string;
  iPosToken: string;
  apiKey: string;
  secretKey: string;
  terminalId?: string; // TPN from terminal config
  isProduction?: boolean;
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
  private authSandboxUrl = 'https://auth.ipospays.tech/v1/authenticate-token';
  private authProductionUrl = 'https://auth.ipospays.com/v1/authenticate-token';

  /**
   * Get authentication token using API Key and Secret Key
   */
  private async getAuthToken(apiKey: string, secretKey: string, isProduction = false): Promise<string> {
    const authUrl = isProduction ? this.authProductionUrl : this.authSandboxUrl;
    
    const payload = {
      apiKey: apiKey,
      secretKey: secretKey,
      scope: "PaymentTokenization"
    };

    console.log('Getting iPOS auth token from:', authUrl);
    
    const response = await axios.post(authUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.responseCode === "00") {
      console.log('iPOS auth token obtained successfully');
      return response.data.token;
    } else {
      throw new Error(`Failed to get auth token: ${response.data.responseMessage || 'Unknown error'}`);
    }
  }

  /**
   * Process a recurring charge using a stored iPOS token
   */
  async processRecurringCharge(request: iPosChargeRequest): Promise<iPosChargeResponse> {
    try {
      console.log('Processing recurring charge with iPOS Transact API V3:', {
        amount: request.amount,
        description: request.description,
        tokenPresent: !!request.iPosToken,
        apiKeyPresent: !!request.apiKey,
        secretKeyPresent: !!request.secretKey
      });

      // Get proper authentication token using API Key and Secret Key
      const authToken = await this.getAuthToken(request.apiKey, request.secretKey, request.isProduction);
      
      // Use the terminal ID provided
      const tpn = request.terminalId || "224725575584";
      
      console.log('Using TPN:', tpn, 'with proper iPOS auth token');
      
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

      // Use sandbox endpoint since tokens are coming from Dejavoo test environment
      const apiUrl = request.isProduction ? this.productionUrl : this.sandboxUrl;
      
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'token': authToken
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
   * Validate an iPOS token using a test transaction
   */
  async validateToken(iPosToken: string, apiKey: string, secretKey: string, terminalId?: string): Promise<boolean> {
    try {
      // Test with a minimal amount (1 cent) to validate the token
      const testResponse = await this.processRecurringCharge({
        amount: 0.01,
        description: 'Token validation test',
        iPosToken: iPosToken,
        apiKey: apiKey,
        secretKey: secretKey,
        terminalId: terminalId
      });

      return testResponse.success;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

export const iPosService = new iPosTransactService();