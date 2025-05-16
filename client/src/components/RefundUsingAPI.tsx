import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCashRegister } from "@/lib/cashRegisterContext";
import { useToast } from "@/hooks/use-toast";

/**
 * This component demonstrates a direct refund implementation using the Dejavoo API
 * as shown in the provided code sample.
 */
export default function RefundUsingAPI() {
  const [amount, setAmount] = useState('1.00');
  const [referenceId, setReferenceId] = useState(generateUniqueId());
  const [invoiceNumber, setInvoiceNumber] = useState('3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const { toast } = useToast();
  const { terminalConfig } = useCashRegister();
  
  function generateUniqueId(): string {
    return Math.random().toString(16).slice(2, 14);
  }
  
  async function processRefund() {
    setIsProcessing(true);
    setResult(null);
    
    try {
      // Using your example format
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      
      // Convert amount from dollars to the smallest unit (cents/pennies)
      const numericAmount = parseFloat(amount);
      
      const raw = JSON.stringify({
        "Amount": numericAmount,
        "PaymentType": "Credit",
        "ReferenceId": referenceId,
        "PrintReceipt": "No",
        "GetReceipt": "No",
        "MerchantNumber": null,
        "InvoiceNumber": invoiceNumber,
        "CaptureSignature": false,
        "GetExtendedData": true,
        "CallbackInfo": {
          "Url": ""
        },
        "Tpn": terminalConfig.terminalType || "z11invtest69",
        "Authkey": terminalConfig.apiKey || "JZiRUusizc",
        "SPInProxyTimeout": terminalConfig.transactionTimeout || 90,
        "CustomFields": {}
      });
      
      // First, make the request through our server API for security reasons
      const response = await fetch('/api/payment/refund-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: numericAmount,
          referenceId: referenceId,
          invoiceNumber: invoiceNumber,
          terminalConfig: terminalConfig
        })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.status === 'approved' || 
          (data.GeneralResponse && data.GeneralResponse.StatusCode === "0000") ||
          (data.GeneralResponse && data.GeneralResponse.Message === "Approved")) {
        toast({
          title: "Refund Approved",
          description: `Successfully processed refund for $${amount}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Refund Declined",
          description: data.message || "The refund was declined by the processor",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Refund processing error:", error);
      toast({
        title: "Refund Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Process Direct Refund</CardTitle>
        <CardDescription>
          Process a refund using Dejavoo SPIN API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.00"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Reference ID</label>
          <Input
            type="text"
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            placeholder="Unique reference ID"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Invoice Number</label>
          <Input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Invoice number"
          />
        </div>
        
        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md overflow-auto max-h-60">
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            setReferenceId(generateUniqueId());
            setResult(null);
          }}
        >
          Generate New ID
        </Button>
        <Button
          onClick={processRefund}
          disabled={isProcessing}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isProcessing ? 'Processing...' : 'Process Refund'}
        </Button>
      </CardFooter>
    </Card>
  );
}