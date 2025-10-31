import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, History, DollarSign, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import NearPay from "@/lib/nearpay";
import { Capacitor } from "@capacitor/core";

export default function CashRegister() {
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Initialize NearPay SDK on component mount using JWT authentication
  useEffect(() => {
    const initializeNearPay = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('Running in browser - NearPay not available');
        return;
      }

      try {
        // Step 1: Initialize NearPay SDK
        await NearPay.initialize({
          authToken: '', // Not used with JWT auth, but required by interface
          environment: 'sandbox'
        });
        console.log('NearPay SDK initialized');

        // Step 2: Fetch JWT token from backend
        const response = await fetch('/api/nearpay/jwt');
        const data = await response.json();
        
        if (!response.ok) {
          // Show helpful error message for missing configuration
          const errorMsg = data.message || data.error || 'Failed to generate JWT token';
          console.error('JWT token generation failed:', errorMsg);
          
          toast({
            title: "Configuration Error",
            description: errorMsg,
            variant: "destructive"
          });
          return;
        }

        // Step 3: Authenticate with NearPay using JWT
        const result = await NearPay.jwtLogin({ jwt: data.jwt });
        
        if (result.success) {
          setIsInitialized(true);
          console.log('NearPay authenticated successfully', {
            terminalUUID: result.terminalUUID,
            terminalId: result.terminalId
          });
          
          toast({
            title: "Ready to Accept Payments",
            description: `Terminal ${result.terminalId || 'connected'}`,
          });
        } else {
          console.error('NearPay JWT login failed:', result.errorMessage);
          toast({
            title: "Authentication Failed",
            description: result.errorMessage || 'Failed to authenticate with NearPay',
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error('Failed to initialize NearPay:', error);
        toast({
          title: "Initialization Error",
          description: error.message || "Failed to initialize payment system",
          variant: "destructive"
        });
      }
    };

    initializeNearPay();
  }, [toast]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handlePayment = async () => {
    const amountValue = parseFloat(amount);
    
    if (!amount || amountValue <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Platform Not Supported",
        description: "NearPay is only available on Android devices",
        variant: "destructive"
      });
      return;
    }

    if (!isInitialized) {
      toast({
        title: "Not Authenticated",
        description: "Please wait for NearPay authentication to complete",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('idle');
    setStatusMessage("");

    try {
      // Process payment with NearPay
      const result = await NearPay.processPayment({
        amount: amountValue
      });

      if (result.success) {
        // Save transaction to database
        await apiRequest('POST', '/api/transactions', {
          amount: Math.round(amountValue * 100), // Convert to cents
          status: 'approved',
          transactionId: result.transactionId,
          cardDetails: result.cardDetails,
          errorMessage: null
        });

        setPaymentStatus('success');
        setStatusMessage(`Payment of $${amountValue.toFixed(2)} approved`);
        
        toast({
          title: "Payment Successful",
          description: `Transaction ID: ${result.transactionId}`,
        });

        // Reset amount after successful payment
        setTimeout(() => {
          setAmount("");
          setPaymentStatus('idle');
          setStatusMessage("");
        }, 3000);
      } else {
        // Payment declined or error
        await apiRequest('POST', '/api/transactions', {
          amount: Math.round(amountValue * 100),
          status: 'declined',
          transactionId: null,
          cardDetails: null,
          errorMessage: result.errorMessage || 'Payment declined'
        });

        setPaymentStatus('error');
        setStatusMessage(result.errorMessage || 'Payment declined');
        
        toast({
          title: "Payment Failed",
          description: result.errorMessage || 'Payment was declined',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Log error transaction
      try {
        await apiRequest('POST', '/api/transactions', {
          amount: Math.round(amountValue * 100),
          status: 'error',
          transactionId: null,
          cardDetails: null,
          errorMessage: error.message || 'Unknown error'
        });
      } catch (logError) {
        console.error('Failed to log transaction error:', logError);
      }

      setPaymentStatus('error');
      setStatusMessage(error.message || 'Payment failed');
      
      toast({
        title: "Error",
        description: error.message || 'Failed to process payment',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const quickAmounts = [10, 20, 50, 100];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            NearPay POS
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tap to Pay on Phone
          </p>
        </div>

        {/* Main Payment Card */}
        <Card className="p-6 space-y-6" data-testid="card-payment">
          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enter Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="pl-10 text-2xl font-semibold h-14"
                disabled={isProcessing}
                data-testid="input-amount"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((value) => (
              <Button
                key={value}
                variant="outline"
                onClick={() => setAmount(value.toString())}
                disabled={isProcessing}
                data-testid={`button-quick-${value}`}
              >
                ${value}
              </Button>
            ))}
          </div>

          {/* Payment Status */}
          {paymentStatus !== 'idle' && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              paymentStatus === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`} data-testid={`status-${paymentStatus}`}>
              {paymentStatus === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{statusMessage}</span>
            </div>
          )}

          {/* Pay Button */}
          <Button
            onClick={handlePayment}
            disabled={!amount || parseFloat(amount) <= 0 || isProcessing || (Capacitor.isNativePlatform() && !isInitialized)}
            className="w-full h-14 text-lg font-semibold"
            data-testid="button-pay"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Pay with Card
              </>
            )}
          </Button>

          {!Capacitor.isNativePlatform() && (
            <p className="text-sm text-center text-amber-600 dark:text-amber-400">
              ⚠️ NearPay is only available on Android devices
            </p>
          )}
        </Card>

        {/* Navigation */}
        <Link href="/history">
          <Button variant="outline" className="w-full" data-testid="button-history">
            <History className="mr-2 h-4 w-4" />
            View Transaction History
          </Button>
        </Link>
      </div>
    </div>
  );
}
