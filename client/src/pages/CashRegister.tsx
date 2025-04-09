import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CreditCard, History } from "lucide-react";
import { Link } from "wouter";
import AmountInput from "@/components/AmountInput";
import PaymentMethod from "@/components/PaymentMethod";
import TransactionStatus from "@/components/TransactionStatus";
import Receipt from "@/components/Receipt";
import TerminalConfig from "@/components/TerminalConfig";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import { useCashRegister } from "@/lib/cashRegisterContext";

export default function CashRegister() {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const { terminalStatus, checkTerminalConnection } = useCashRegister();

  useEffect(() => {
    // Check terminal connection on component mount if IP is stored
    const savedTerminalIp = localStorage.getItem('terminalIp');
    if (savedTerminalIp) {
      checkTerminalConnection(savedTerminalIp);
    }
  }, [checkTerminalConnection]);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-dark text-center">Cash Register</h1>
        </header>

        <Card className="overflow-hidden">
          {/* Main content area with two columns on desktop, stacked on mobile */}
          <div className="flex flex-col md:flex-row">
            {/* Left column: Keypad and amount input */}
            <div className="w-full md:w-7/12 p-6 border-b md:border-b-0 md:border-r border-gray-200">
              <AmountInput />
            </div>
            
            {/* Right column: Payment methods and status */}
            <div className="w-full md:w-5/12 p-6">
              <PaymentMethod />
              <TransactionStatus />
            </div>
          </div>
          
          {/* Receipt area */}
          <Receipt />
        </Card>
        
        {/* Settings and History Buttons */}
        <div className="fixed bottom-6 right-6 flex space-x-3 z-50">
          <Link href="/history">
            <Button 
              variant="default"
              className="bg-amber-600 text-white px-5 py-3 rounded-lg shadow-lg font-medium flex items-center space-x-2 hover:bg-amber-700"
            >
              <History className="h-5 w-5 mr-1" />
              <span>Transaction History</span>
            </Button>
          </Link>
          
          <Button 
            variant="default"
            className="bg-blue-600 text-white px-5 py-3 rounded-lg shadow-lg font-medium flex items-center space-x-2 hover:bg-blue-700"
            onClick={() => setShowConfigDialog(true)}
          >
            <Settings className="h-5 w-5 mr-1" />
            <span>Terminal Settings</span>
          </Button>
        </div>
      </div>

      {/* Terminal Configuration Dialog */}
      {showConfigDialog && (
        <TerminalConfig 
          onClose={() => setShowConfigDialog(false)} 
        />
      )}

      {/* Processing Overlay */}
      <ProcessingOverlay />
    </div>
  );
}
