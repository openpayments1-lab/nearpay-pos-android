import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCashRegister } from "@/lib/cashRegisterContext";
import { useToast } from "@/hooks/use-toast";

interface TerminalConfigProps {
  onClose: () => void;
}

export default function TerminalConfig({ onClose }: TerminalConfigProps) {
  const [terminalIp, setTerminalIp] = useState('');
  const { checkTerminalConnection } = useCashRegister();
  const { toast } = useToast();

  useEffect(() => {
    // Load saved terminal IP from localStorage if available
    const savedIp = localStorage.getItem('terminalIp');
    if (savedIp) {
      setTerminalIp(savedIp);
    }
  }, []);

  const handleSave = () => {
    // Basic IP address validation
    if (!terminalIp || !/^(\d{1,3}\.){3}\d{1,3}$/.test(terminalIp)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IP address.",
        variant: "destructive"
      });
      return;
    }

    // Save to localStorage and check connection
    localStorage.setItem('terminalIp', terminalIp);
    checkTerminalConnection(terminalIp);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Terminal Configuration</h2>
        <div className="mb-4">
          <label htmlFor="terminal-ip" className="block text-sm font-medium text-gray-700 mb-1">
            Dejavoo Terminal IP Address
          </label>
          <Input
            type="text"
            id="terminal-ip"
            placeholder="192.168.1.100"
            value={terminalIp}
            onChange={(e) => setTerminalIp(e.target.value)}
          />
          <p className="mt-1 text-sm text-gray-500">Enter the IP address of your Dejavoo terminal</p>
        </div>
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
