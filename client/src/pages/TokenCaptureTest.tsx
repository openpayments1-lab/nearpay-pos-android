import TokenCapture from "@/components/TokenCapture";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TokenCaptureTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            iPOS Token Capture Testing
          </h1>
          <p className="text-lg text-gray-600">
            Test Dejavoo iPOS token capture functionality for SaaS recurring and membership payments
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Token Capture Component */}
          <div>
            <TokenCapture />
          </div>
          
          {/* Information Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>How iPOS Token Capture Works</CardTitle>
                <CardDescription>
                  Two-step process: SPIn token capture + iPOS Transact reuse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-800">Step 1: SPIn Token Capture</h4>
                  <p className="text-sm text-gray-600">
                    Use Dejavoo SPIn API to process the initial payment through your terminal. 
                    The response includes an iPOS token that securely represents the customer's payment method.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-800">Step 2: iPOS Transact Token Reuse</h4>
                  <p className="text-sm text-gray-600">
                    Use the captured iPOS token with iPOS Transact API for subsequent recurring payments.
                    This requires an iPOS authentication token from your merchant portal.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-800">SaaS Integration Benefits</h4>
                  <p className="text-sm text-gray-600">
                    Perfect for SaaS applications: automated billing cycles, membership renewals,
                    subscription management, and recurring payments without customer re-entry.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Authentication Requirements</CardTitle>
                <CardDescription>
                  Required credentials for token operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-800">SPIn API Credentials</h4>
                  <p className="text-sm text-gray-600">
                    <strong>TPN:</strong> Terminal Provider Number (12 digits)<br/>
                    <strong>Auth Key:</strong> SPIn API authentication key<br/>
                    Used for initial token capture through terminal processing.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-800">iPOS Auth Token</h4>
                  <p className="text-sm text-gray-600">
                    Required for recurring payments via iPOS Transact API.<br/>
                    <strong>Get from:</strong> iPOSpays portal → Settings → Generate Ecom/TOP Merchant Keys<br/>
                    <strong>Scope:</strong> PaymentTokenization
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-800">API Endpoints</h4>
                  <p className="text-sm text-gray-600">
                    • <code className="text-xs bg-gray-100 px-1 rounded">/api/payment/token-capture</code> - SPIn token capture<br/>
                    • <code className="text-xs bg-gray-100 px-1 rounded">/api/payment/token-reuse</code> - iPOS Transact reuse
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Test Workflow</CardTitle>
                <CardDescription>
                  Complete iPOS token testing sequence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <p className="text-sm text-gray-700">Configure SPIn terminal settings (TPN + Auth Key)</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <p className="text-sm text-gray-700">Get iPOS Auth Token from iPOSpays portal settings</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <p className="text-sm text-gray-700">Enter test amount, customer info, and iPOS Auth Token</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <p className="text-sm text-gray-700">Click "Capture Token" to process SPIn payment + capture iPOS token</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">5</div>
                  <p className="text-sm text-gray-700">Click "Test Token Reuse" to validate iPOS Transact recurring payment</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}