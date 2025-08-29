import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCashRegister } from "@/lib/cashRegisterContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Component for testing Dejavoo iPOS token capture for recurring payments
 * This enables SaaS membership and subscription functionality
 */
export default function TokenCapture() {
  const [amount, setAmount] = useState('1.00');
  const [customerId, setCustomerId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [iPosAuthToken, setIPosAuthToken] = useState('');
  const [captureToken, setCaptureToken] = useState(true);
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [capturedToken, setCapturedToken] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { terminalConfig } = useCashRegister();
  
  function generateUniqueId(): string {
    return Math.random().toString(16).slice(2, 14);
  }
  
  async function processTokenCapture() {
    setIsProcessing(true);
    setResult(null);
    setCapturedToken(null);
    
    try {
      const numericAmount = parseFloat(amount);
      const referenceId = generateUniqueId();
      
      // Create payload for token capture transaction
      const payload = {
        amount: numericAmount,
        referenceId: referenceId,
        customerId: customerId || `customer_${Date.now()}`,
        subscriptionId: subscriptionId || `sub_${Date.now()}`,
        captureToken: captureToken,
        saveCustomer: saveCustomer,
        terminalConfig: terminalConfig
      };
      
      console.log('Processing token capture transaction:', payload);
      
      const response = await fetch('/api/payment/token-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      setResult(data);
      
      // Extract iPOS token from SPIn response if available
      if (data.iPosToken || data.IPosToken || data.Token || data.token) {
        const token = data.iPosToken || data.IPosToken || data.Token || data.token;
        setCapturedToken(token);
        
        toast({
          title: "iPOS Token Captured via SPIn",
          description: `Token ready for iPOS Transact recurring payments`,
          variant: "default",
        });
      } else if (data.status === 'approved') {
        toast({
          title: "Payment Approved",
          description: `Transaction successful for $${amount}. Check response for iPOS token.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Transaction Failed",
          description: data.message || "The transaction was declined",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Token capture error:", error);
      toast({
        title: "Token Capture Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }
  
  async function testTokenReuse() {
    if (!capturedToken) {
      toast({
        title: "No iPOS Token Available",
        description: "Please capture an iPOS token first using SPIn API",
        variant: "destructive",
      });
      return;
    }
    
    if (!iPosAuthToken) {
      toast({
        title: "iPOS Auth Token Required",
        description: "Please enter your iPOS authentication token for recurring payments",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const payload = {
        amount: parseFloat(amount),
        token: capturedToken,
        customerId: customerId,
        terminalConfig: terminalConfig,
        iPosAuthToken: iPosAuthToken
      };
      
      const response = await fetch('/api/payment/token-reuse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.status === 'approved') {
        toast({
          title: "iPOS Transact Token Reuse Successful",
          description: `Charged $${amount} using stored iPOS token via iPOS Transact API`,
          variant: "default",
        });
      } else {
        toast({
          title: "iPOS Transact Token Reuse Failed",
          description: data.message || "Failed to process using stored iPOS token",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Token reuse error:", error);
      toast({
        title: "Token Reuse Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }
  
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>iPOS Token Capture for SaaS</CardTitle>
        <CardDescription>
          Capture payment tokens for recurring and membership payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Transaction Amount</Label>
          <Input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.00"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Customer ID</Label>
          <Input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Auto-generated if empty"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Subscription ID</Label>
          <Input
            type="text"
            value={subscriptionId}
            onChange={(e) => setSubscriptionId(e.target.value)}
            placeholder="Auto-generated if empty"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">iPOS Auth Token (for token reuse)</Label>
          <Input
            type="password"
            value={iPosAuthToken}
            onChange={(e) => setIPosAuthToken(e.target.value)}
            placeholder="Get from iPOSpays portal settings"
          />
          <p className="text-xs text-gray-500">
            Required for token reuse. Get from iPOSpays portal → Settings → Generate Ecom/TOP Merchant Keys
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="capture-token"
            checked={captureToken}
            onCheckedChange={setCaptureToken}
          />
          <Label htmlFor="capture-token" className="text-sm font-medium">
            Capture iPOS Token
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="save-customer"
            checked={saveCustomer}
            onCheckedChange={setSaveCustomer}
          />
          <Label htmlFor="save-customer" className="text-sm font-medium">
            Save Customer Profile
          </Label>
        </div>
        
        {capturedToken && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <Label className="text-sm font-medium text-green-800">Captured Token:</Label>
            <p className="text-xs text-green-700 font-mono break-all mt-1">{capturedToken}</p>
          </div>
        )}
        
        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md overflow-auto max-h-60">
            <Label className="text-sm font-medium">API Response:</Label>
            <pre className="text-xs whitespace-pre-wrap mt-2">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          onClick={processTokenCapture}
          disabled={isProcessing}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isProcessing ? 'Processing...' : 'Capture Token'}
        </Button>
        <Button
          onClick={testTokenReuse}
          disabled={isProcessing || !capturedToken}
          variant="outline"
          className="border-green-600 text-green-600 hover:bg-green-50"
        >
          Test Token Reuse
        </Button>
      </CardFooter>
    </Card>
  );
}