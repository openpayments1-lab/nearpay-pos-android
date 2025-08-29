/**
 * iPOS Transact API Service
 * 
 * This service handles iPOS Transact API integration for token-based recurring payments.
 * Based on official documentation: https://docs.ipospays.com/ipos-transact/apidocs
 * 
 * Flow:
 * 1. Use SPIn API to capture initial payment and get iPOS token
 * 2. Use iPOS Transact API for subsequent recurring payments with the token
 */

export interface iPosTransactConfig {
  authToken: string; // Authentication token from iPOSpays portal
  tpn: string; // Terminal Provider Number (12 digits)
  testMode: boolean; // Use sandbox or production endpoints
}

export interface iPosTransactRequest {
  merchantAuthentication: {
    merchantId: number; // TPN as number
    transactionReferenceId: string; // Unique reference (max 20 chars)
  };
  transactRequest: {
    amount: string; // Amount in cents (e.g., "12525" for $125.25)
    transactionType: number; // 1=Sale, 5=PreAuth, 10=ACH
    cardToken?: string; // iPOS token from SPIn/HPP
    paymentTokenId?: string; // Alternative token field
    applySteamSettingTipFeeTax: string; // "true" or "false"
    RRN?: number; // For void/refund transactions
  };
  preferences: {
    eReceipt: boolean; // Send receipt via email/SMS
    customerName?: string;
    customerEmail?: string;
    customerMobile?: string;
    addressVerificationService: boolean; // AVS verification
  };
  AVS?: {
    street: string;
    zip: string;
  };
}

export interface iPosTransactResponse {
  merchantAuthentication: {
    merchantId: number;
    transactionReferenceId: string;
  };
  transactResponse: {
    amount: string;
    transactionType: number;
    RRN: number;
    cardToken?: string;
    responseCode: string;
    responseDescription: string;
    authorizationCode?: string;
    transactionDateTime: string;
    cardType?: string;
    cardLast4?: string;
    // Additional fields based on transaction type
  };
  preferences: {
    eReceipt: boolean;
    addressVerificationService: boolean;
  };
  AVS?: {
    street: string;
    zip: string;
    responseCode: string;
    responseDescription: string;
  };
}

export class iPosTransactService {
  private config: iPosTransactConfig;
  private baseUrl: string;

  constructor(config: iPosTransactConfig) {
    this.config = config;
    // Use V3 endpoint for latest features including encrypted card data
    this.baseUrl = config.testMode 
      ? 'https://payment.ipospays.tech/api/v3/iposTransact'
      : 'https://payment.ipospays.com/api/v3/iposTransact';
  }

  /**
   * Generate unique transaction reference ID
   */
  private generateTransactionReferenceId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp.slice(-8)}${random}`.substring(0, 20);
  }

  /**
   * Make API request to iPOS Transact
   */
  private async makeApiRequest(payload: iPosTransactRequest): Promise<iPosTransactResponse> {
    const headers = {
      'Content-Type': 'application/json',
      'token': this.config.authToken
    };

    console.log('iPOS Transact API Request:', {
      url: this.baseUrl,
      headers: { ...headers, token: '[REDACTED]' },
      payload: JSON.stringify(payload)
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      
      console.log('iPOS Transact API Response:', {
        status: response.status,
        data: responseData
      });

      if (!response.ok) {
        throw new Error(`iPOS Transact API error: ${response.status} - ${JSON.stringify(responseData)}`);
      }

      return responseData as iPosTransactResponse;
    } catch (error) {
      console.error('iPOS Transact API request failed:', error);
      throw error;
    }
  }

  /**
   * Process a sale transaction using iPOS token
   * 
   * @param amount Amount in dollars (will be converted to cents)
   * @param cardToken iPOS token from SPIn/HPP API
   * @param options Additional transaction options
   */
  public async processSale(
    amount: number,
    cardToken: string,
    options: {
      transactionReferenceId?: string;
      customerName?: string;
      customerEmail?: string;
      customerMobile?: string;
      sendReceipt?: boolean;
      enableAVS?: boolean;
      street?: string;
      zip?: string;
    } = {}
  ): Promise<iPosTransactResponse> {
    const amountInCents = Math.round(amount * 100).toString();
    const referenceId = options.transactionReferenceId || this.generateTransactionReferenceId();

    const payload: iPosTransactRequest = {
      merchantAuthentication: {
        merchantId: parseInt(this.config.tpn),
        transactionReferenceId: referenceId
      },
      transactRequest: {
        amount: amountInCents,
        transactionType: 1, // Sale
        cardToken: cardToken,
        applySteamSettingTipFeeTax: "false" // Use exact amount provided
      },
      preferences: {
        eReceipt: options.sendReceipt || false,
        customerName: options.customerName,
        customerEmail: options.customerEmail,
        customerMobile: options.customerMobile,
        addressVerificationService: options.enableAVS || false
      }
    };

    // Add AVS data if provided
    if (options.enableAVS && options.street && options.zip) {
      payload.AVS = {
        street: options.street,
        zip: options.zip
      };
    }

    return this.makeApiRequest(payload);
  }

  /**
   * Process a pre-authorization using iPOS token
   * 
   * @param amount Amount in dollars (will be converted to cents)
   * @param cardToken iPOS token from SPIn/HPP API
   * @param options Additional transaction options
   */
  public async processPreAuth(
    amount: number,
    cardToken: string,
    options: {
      transactionReferenceId?: string;
      customerName?: string;
      customerEmail?: string;
      customerMobile?: string;
      sendReceipt?: boolean;
    } = {}
  ): Promise<iPosTransactResponse> {
    const amountInCents = Math.round(amount * 100).toString();
    const referenceId = options.transactionReferenceId || this.generateTransactionReferenceId();

    const payload: iPosTransactRequest = {
      merchantAuthentication: {
        merchantId: parseInt(this.config.tpn),
        transactionReferenceId: referenceId
      },
      transactRequest: {
        amount: amountInCents,
        transactionType: 5, // PreAuth
        cardToken: cardToken,
        applySteamSettingTipFeeTax: "false"
      },
      preferences: {
        eReceipt: options.sendReceipt || false,
        customerName: options.customerName,
        customerEmail: options.customerEmail,
        customerMobile: options.customerMobile,
        addressVerificationService: false
      }
    };

    return this.makeApiRequest(payload);
  }

  /**
   * Process a refund transaction
   * 
   * @param rrn Original transaction RRN number
   * @param amount Amount to refund in dollars (will be converted to cents)
   * @param options Additional options
   */
  public async processRefund(
    rrn: number,
    amount: number,
    options: {
      transactionReferenceId?: string;
      customerName?: string;
      customerEmail?: string;
      sendReceipt?: boolean;
    } = {}
  ): Promise<iPosTransactResponse> {
    const amountInCents = Math.round(amount * 100).toString();
    const referenceId = options.transactionReferenceId || this.generateTransactionReferenceId();

    const payload: iPosTransactRequest = {
      merchantAuthentication: {
        merchantId: parseInt(this.config.tpn),
        transactionReferenceId: referenceId
      },
      transactRequest: {
        amount: amountInCents,
        transactionType: 1, // Sale (refund uses same type)
        RRN: rrn,
        applySteamSettingTipFeeTax: "false"
      },
      preferences: {
        eReceipt: options.sendReceipt || false,
        customerName: options.customerName,
        customerEmail: options.customerEmail,
        addressVerificationService: false
      }
    };

    return this.makeApiRequest(payload);
  }

  /**
   * Process a void transaction
   * 
   * @param rrn Original transaction RRN number
   * @param options Additional options
   */
  public async processVoid(
    rrn: number,
    options: {
      transactionReferenceId?: string;
      sendReceipt?: boolean;
    } = {}
  ): Promise<iPosTransactResponse> {
    const referenceId = options.transactionReferenceId || this.generateTransactionReferenceId();

    const payload: iPosTransactRequest = {
      merchantAuthentication: {
        merchantId: parseInt(this.config.tpn),
        transactionReferenceId: referenceId
      },
      transactRequest: {
        amount: "0", // Amount not needed for void
        transactionType: 1, // Sale (void uses same type with RRN)
        RRN: rrn,
        applySteamSettingTipFeeTax: "false"
      },
      preferences: {
        eReceipt: options.sendReceipt || false,
        addressVerificationService: false
      }
    };

    return this.makeApiRequest(payload);
  }
}