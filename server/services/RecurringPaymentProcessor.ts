/**
 * RecurringPaymentProcessor.ts
 * 
 * Service for processing recurring payments on scheduled intervals
 * Handles daily, weekly, and monthly billing cycles with retry logic
 */

import { storage } from '../storage';
import { iPosService } from './iPosTransactService';
import type { Subscription, PaymentLog } from '@shared/schema';

export interface PaymentProcessorConfig {
  maxRetryAttempts: number;
  retryDelayDays: number[];
  enableNotifications: boolean;
  dryRun: boolean;
}

export interface ProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  results: Array<{
    subscriptionId: string;
    customerId: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
    transactionId?: string;
    authCode?: string;
  }>;
}

export class RecurringPaymentProcessor {
  private config: PaymentProcessorConfig;

  constructor(config: Partial<PaymentProcessorConfig> = {}) {
    this.config = {
      maxRetryAttempts: 3,
      retryDelayDays: [1, 3, 7], // Retry after 1 day, 3 days, then 7 days
      enableNotifications: true,
      dryRun: false,
      ...config
    };
  }

  /**
   * Process all due subscriptions across all tenants
   */
  async processAllDueSubscriptions(): Promise<ProcessingResult> {
    console.log('Starting recurring payment processing...');
    
    const results: ProcessingResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: []
    };

    try {
      // Get all active subscriptions that are due for payment
      const dueSubscriptions = await this.getDueSubscriptions();
      results.totalProcessed = dueSubscriptions.length;

      console.log(`Found ${dueSubscriptions.length} subscriptions due for payment`);

      // Process each subscription
      for (const subscription of dueSubscriptions) {
        const result = await this.processSubscription(subscription);
        results.results.push(result);

        if (result.status === 'success') {
          results.successful++;
        } else if (result.status === 'failed') {
          results.failed++;
        } else {
          results.skipped++;
        }

        // Add small delay between payments to avoid overwhelming the payment processor
        if (!this.config.dryRun) {
          await this.sleep(1000); // 1 second delay
        }
      }

      console.log(`Recurring payment processing completed:`, results);
      return results;

    } catch (error) {
      console.error('Error in recurring payment processing:', error);
      throw error;
    }
  }

  /**
   * Process a single subscription payment
   */
  private async processSubscription(subscription: Subscription): Promise<{
    subscriptionId: string;
    customerId: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
    transactionId?: string;
    authCode?: string;
  }> {
    const result: {
      subscriptionId: string;
      customerId: string;
      status: 'success' | 'failed' | 'skipped';
      error?: string;
      transactionId?: string;
      authCode?: string;
    } = {
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      status: 'skipped',
    };

    try {
      // Get customer profile with payment token
      const customer = await storage.getCustomerProfile(subscription.customerId);
      if (!customer) {
        result.status = 'failed';
        result.error = 'Customer not found';
        await this.logPaymentAttempt(subscription, 'failed', 'Customer not found');
        return result;
      }

      // Check if customer has an active payment token
      if (!customer.iPosToken || customer.tokenStatus !== 'active') {
        result.status = 'failed';
        result.error = 'No active payment token';
        await this.logPaymentAttempt(subscription, 'failed', 'No active payment token');
        return result;
      }

      // Get tenant settings for iPOS configuration
      const tenant = await storage.getTenant(subscription.tenantId);
      if (!tenant) {
        result.status = 'failed';
        result.error = 'Tenant not found';
        await this.logPaymentAttempt(subscription, 'failed', 'Tenant not found');
        return result;
      }

      // Get terminal configuration for iPOS auth token
      const terminalConfig = await storage.getSetting('terminalConfig');
      if (!terminalConfig?.iPosAuthToken) {
        result.status = 'failed';
        result.error = 'iPOS auth token not configured';
        await this.logPaymentAttempt(subscription, 'failed', 'iPOS auth token not configured');
        return result;
      }

      // Skip if dry run mode
      if (this.config.dryRun) {
        console.log(`[DRY RUN] Would process payment for subscription ${subscription.id}: $${subscription.amount / 100}`);
        result.status = 'success';
        return result;
      }

      // Process the recurring payment
      const attemptNumber = (subscription.failedAttempts || 0) + 1;
      console.log(`Processing payment for subscription ${subscription.id}, attempt ${attemptNumber}`);

      const paymentResponse = await iPosService.processRecurringCharge({
        amount: subscription.amount / 100, // Convert from cents to dollars
        description: subscription.description || `Recurring payment - ${subscription.billingCycle}`,
        cardToken: customer.iPosToken,
        authToken: terminalConfig.iPosAuthToken,
        merchantId: terminalConfig.iPOSTpn || "224725717795",
        isProduction: !terminalConfig.testMode
      });

      if (paymentResponse.success) {
        // Payment successful
        result.status = 'success';
        result.transactionId = paymentResponse.transactionId;
        result.authCode = paymentResponse.authCode;

        // Update subscription with success
        await this.updateSubscriptionOnSuccess(subscription);
        
        // Log successful payment
        await this.logPaymentAttempt(subscription, 'success', paymentResponse.message, {
          transactionId: paymentResponse.transactionId,
          authCode: paymentResponse.authCode,
          rawResponse: paymentResponse
        });

        console.log(`Payment successful for subscription ${subscription.id}: ${paymentResponse.transactionId}`);

      } else {
        // Payment failed
        result.status = 'failed';
        result.error = paymentResponse.error;

        // Update subscription with failure
        await this.updateSubscriptionOnFailure(subscription, paymentResponse.error || 'Payment declined');
        
        // Log failed payment
        await this.logPaymentAttempt(subscription, 'failed', paymentResponse.error || 'Payment declined', {
          rawResponse: paymentResponse
        });

        console.log(`Payment failed for subscription ${subscription.id}: ${paymentResponse.error}`);
      }

      return result;

    } catch (error) {
      console.error(`Error processing subscription ${subscription.id}:`, error);
      
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';

      // Log the error
      await this.logPaymentAttempt(subscription, 'failed', result.error);
      
      // Update subscription failure count
      await this.updateSubscriptionOnFailure(subscription, result.error);

      return result;
    }
  }

  /**
   * Get all subscriptions that are due for payment
   */
  private async getDueSubscriptions(): Promise<Subscription[]> {
    const now = new Date();
    const allSubscriptions = await storage.getSubscriptions();

    return allSubscriptions.filter(subscription => {
      // Only process active subscriptions
      if (subscription.status !== 'active') {
        return false;
      }

      // Check if next charge date has passed
      const nextChargeDate = new Date(subscription.nextChargeDate);
      if (nextChargeDate > now) {
        return false;
      }

      // Check if we haven't exceeded maximum retry attempts
      const maxAttempts = subscription.tenantId ? 3 : this.config.maxRetryAttempts; // Use tenant-specific settings if available
      if ((subscription.failedAttempts || 0) >= maxAttempts) {
        return false;
      }

      return true;
    });
  }

  /**
   * Update subscription after successful payment
   */
  private async updateSubscriptionOnSuccess(subscription: Subscription): Promise<void> {
    const nextChargeDate = this.calculateNextChargeDate(
      subscription.billingCycle,
      subscription.billingDay || 1
    );

    await storage.updateSubscription(subscription.id, {
      status: 'active',
      lastChargeDate: new Date(),
      nextChargeDate,
      failedAttempts: 0,
      lastFailureReason: null,
    });
  }

  /**
   * Update subscription after failed payment
   */
  private async updateSubscriptionOnFailure(subscription: Subscription, failureReason: string): Promise<void> {
    const failedAttempts = (subscription.failedAttempts || 0) + 1;
    const maxAttempts = this.config.maxRetryAttempts;

    let status = subscription.status;
    let nextChargeDate = subscription.nextChargeDate;

    if (failedAttempts < maxAttempts) {
      // Schedule retry
      const retryDays = this.config.retryDelayDays[Math.min(failedAttempts - 1, this.config.retryDelayDays.length - 1)];
      nextChargeDate = new Date(Date.now() + (retryDays * 24 * 60 * 60 * 1000));
      status = 'active'; // Keep active for retry
    } else {
      // Max attempts reached, mark as failed
      status = 'failed';
    }

    await storage.updateSubscription(subscription.id, {
      status,
      nextChargeDate,
      failedAttempts,
      lastFailureReason: failureReason,
    });
  }

  /**
   * Log payment attempt to database
   */
  private async logPaymentAttempt(
    subscription: Subscription, 
    status: string, 
    failureReason?: string,
    additionalData?: any
  ): Promise<void> {
    try {
      await storage.createPaymentLog({
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        customerId: subscription.customerId,
        amount: subscription.amount,
        attemptNumber: (subscription.failedAttempts || 0) + 1,
        status,
        transactionId: additionalData?.transactionId,
        authCode: additionalData?.authCode,
        failureReason: status === 'failed' ? failureReason : null,
        rawResponse: additionalData?.rawResponse,
        processedAt: status === 'success' ? new Date() : null,
      });
    } catch (error) {
      console.error('Error logging payment attempt:', error);
    }
  }

  /**
   * Calculate next charge date based on billing cycle
   */
  private calculateNextChargeDate(billingCycle: string, billingDay: number): Date {
    const now = new Date();
    let nextDate = new Date(now);

    switch (billingCycle.toLowerCase()) {
      case 'daily':
        nextDate.setDate(now.getDate() + 1);
        break;

      case 'weekly':
        nextDate.setDate(now.getDate() + 7);
        break;

      case 'monthly':
        // Set to next month, same day
        nextDate.setMonth(now.getMonth() + 1);
        nextDate.setDate(billingDay);
        
        // Handle edge cases where billingDay doesn't exist in next month
        if (nextDate.getDate() !== billingDay) {
          nextDate.setDate(0); // Go to last day of previous month
        }
        break;

      default:
        // Default to monthly
        nextDate.setMonth(now.getMonth() + 1);
        nextDate.setDate(billingDay);
    }

    // Set time to beginning of day
    nextDate.setHours(0, 0, 0, 0);

    return nextDate;
  }

  /**
   * Process payments for a specific tenant
   */
  async processTenantSubscriptions(tenantId: string): Promise<ProcessingResult> {
    console.log(`Processing payments for tenant: ${tenantId}`);
    
    const allSubscriptions = await storage.getSubscriptions(tenantId);
    const dueSubscriptions = allSubscriptions.filter(subscription => {
      const nextChargeDate = new Date(subscription.nextChargeDate);
      const now = new Date();
      return subscription.status === 'active' && nextChargeDate <= now;
    });

    const results: ProcessingResult = {
      totalProcessed: dueSubscriptions.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: []
    };

    for (const subscription of dueSubscriptions) {
      const result = await this.processSubscription(subscription);
      results.results.push(result);

      if (result.status === 'success') results.successful++;
      else if (result.status === 'failed') results.failed++;
      else results.skipped++;

      if (!this.config.dryRun) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  /**
   * Helper method to add delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export a default instance
export const recurringPaymentProcessor = new RecurringPaymentProcessor();