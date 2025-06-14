import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCashRegister } from "@/lib/cashRegisterContext";
import { useToast } from "@/hooks/use-toast";

interface TerminalConfigProps {
  onClose: () => void;
}

export default function TerminalConfig({ onClose }: TerminalConfigProps) {
  const [terminalIp, setTerminalIp] = useState('');
  const [apiKey, setApiKey] = useState('JZiRUusizc');
  const [terminalType, setTerminalType] = useState('z11invtest69'); // Must be 10-12 chars
  const [enableTipping, setEnableTipping] = useState(false);
  const [enableSignature, setEnableSignature] = useState(true);
  const [testMode, setTestMode] = useState(false);
  const [transactionTimeout, setTransactionTimeout] = useState('90');
  const [activeTab, setActiveTab] = useState('basic');
  
  const { checkTerminalConnection, updateTerminalConfig } = useCashRegister();
  const { toast } = useToast();

  useEffect(() => {
    // Load saved settings from localStorage
    const savedIp = localStorage.getItem('terminalIp');
    const savedApiKey = localStorage.getItem('apiKey');
    const savedTerminalType = localStorage.getItem('terminalType');
    const savedEnableTipping = localStorage.getItem('enableTipping');
    const savedEnableSignature = localStorage.getItem('enableSignature');
    const savedTestMode = localStorage.getItem('testMode');
    const savedTransactionTimeout = localStorage.getItem('transactionTimeout');
    
    if (savedIp) setTerminalIp(savedIp);
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedTerminalType) setTerminalType(savedTerminalType);
    if (savedEnableTipping) setEnableTipping(savedEnableTipping === 'true');
    if (savedEnableSignature) setEnableSignature(savedEnableSignature === 'true');
    if (savedTestMode) setTestMode(savedTestMode === 'true');
    if (savedTransactionTimeout) setTransactionTimeout(savedTransactionTimeout);
  }, []);

  const handleSave = () => {
    // Validate required fields - IP is not required for SPIN API
    if (!terminalType || !apiKey) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter both Terminal ID (TPN) and API Key.",
        variant: "destructive"
      });
      return;
    }

    // Save all settings to localStorage
    localStorage.setItem('terminalIp', terminalIp);
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('terminalType', terminalType);
    localStorage.setItem('enableTipping', enableTipping.toString());
    localStorage.setItem('enableSignature', enableSignature.toString());
    localStorage.setItem('testMode', testMode.toString());
    localStorage.setItem('transactionTimeout', transactionTimeout);
    
    // Create config object to pass to the context
    const config = {
      terminalIp,
      apiKey,
      terminalType,
      enableTipping,
      enableSignature,
      testMode,
      transactionTimeout: parseInt(transactionTimeout)
    };
    
    // Update terminal configuration in context
    updateTerminalConfig(config);
    
    // Check terminal connection
    checkTerminalConnection(terminalIp);
    
    onClose();
    
    toast({
      title: "Configuration Saved",
      description: "Dejavoo terminal settings have been updated.",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Dejavoo Terminal Settings</h2>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label htmlFor="terminal-ip" className="block text-sm font-medium text-gray-700 mb-1">
                Terminal IP Address (Not Required)
              </Label>
              <Input
                type="text"
                id="terminal-ip"
                placeholder="Not needed for SPIN API"
                value={terminalIp}
                onChange={(e) => setTerminalIp(e.target.value)}
                disabled
                className="bg-gray-100"
              />
              <p className="mt-1 text-sm text-gray-500">Dejavoo SPIN API communicates through cloud service - IP not needed</p>
            </div>
            
            <div>
              <Label htmlFor="terminal-type" className="block text-sm font-medium text-gray-700 mb-1">
                Terminal ID (TPN)
              </Label>
              <Input
                type="text"
                id="terminal-type"
                placeholder="z11invtest69"
                value={terminalType}
                onChange={(e) => setTerminalType(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">Your Terminal ID (TPN) from Dejavoo</p>
            </div>
            
            <div>
              <Label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
                API Key (Auth Key)
              </Label>
              <Input
                type="password"
                id="api-key"
                placeholder="JZiRUusizc"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">Your Auth Key from Dejavoo</p>
            </div>
            
            <div className="flex items-center space-x-2 mt-4">
              <Switch 
                id="test-mode"
                checked={testMode}
                onCheckedChange={setTestMode}
              />
              <Label htmlFor="test-mode" className="text-sm font-medium text-gray-700">
                Enable Test Mode
              </Label>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="enable-tipping"
                checked={enableTipping}
                onCheckedChange={setEnableTipping}
              />
              <Label htmlFor="enable-tipping" className="text-sm font-medium text-gray-700">
                Enable Tipping
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="enable-signature"
                checked={enableSignature}
                onCheckedChange={setEnableSignature}
              />
              <Label htmlFor="enable-signature" className="text-sm font-medium text-gray-700">
                Require Signature
              </Label>
            </div>
            
            <div>
              <Label htmlFor="transaction-timeout" className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Timeout (seconds)
              </Label>
              <Input
                type="number"
                id="transaction-timeout"
                placeholder="90"
                value={transactionTimeout}
                onChange={(e) => setTransactionTimeout(e.target.value)}
                min="30"
                max="300"
              />
              <p className="mt-1 text-sm text-gray-500">Time before a transaction is automatically canceled</p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
