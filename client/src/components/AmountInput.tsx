import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCashRegister } from "@/lib/cashRegisterContext";
import { formatAmount } from "@/lib/utils";

export default function AmountInput() {
  const { amount, setAmount, isTransactionInProgress } = useCashRegister();
  const [inputValue, setInputValue] = useState(amount);

  const appendToAmount = (digit: string) => {
    if (isTransactionInProgress) return;

    let newValue = inputValue;

    // Handle first digit input (replace 0.00)
    if (newValue === "0.00") {
      if (digit === ".") {
        newValue = "0.";
      } else {
        newValue = digit;
      }
    } else {
      // Handle decimal point
      if (digit === "." && newValue.includes(".")) {
        return; // Ignore if already contains decimal
      }
      
      // Append digit
      newValue += digit;
    }

    const formattedValue = formatAmount(newValue);
    setInputValue(formattedValue);
    setAmount(formattedValue);
  };

  const clearAmount = () => {
    if (isTransactionInProgress) return;
    setInputValue("0.00");
    setAmount("0.00");
  };

  const backspaceAmount = () => {
    if (isTransactionInProgress) return;
    let current = inputValue;
    
    if (current.length <= 1 || (current.length <= 4 && current.includes('.'))) {
      current = "0.00";
    } else {
      // Remove last character
      current = current.slice(0, -1);
      current = formatAmount(current);
    }
    
    setInputValue(current);
    setAmount(current);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isTransactionInProgress) return;
    
    const value = e.target.value.replace(/[^\d.]/g, '');
    const formattedValue = formatAmount(value);
    
    setInputValue(formattedValue);
    setAmount(formattedValue);
  };

  return (
    <div>
      <div className="mb-6">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xl">$</span>
          <Input
            id="amount"
            type="text"
            className="pl-10 pr-4 py-6 text-2xl font-semibold bg-gray-50"
            value={inputValue}
            onChange={handleInputChange}
            disabled={isTransactionInProgress}
          />
        </div>
      </div>
      
      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "."].map((key) => (
          <Button
            key={key}
            variant="outline"
            className="py-4 text-xl font-medium"
            onClick={() => appendToAmount(key)}
            disabled={isTransactionInProgress}
          >
            {key}
          </Button>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Button
          variant="secondary"
          className="py-3 text-gray-700 font-medium"
          onClick={clearAmount}
          disabled={isTransactionInProgress}
        >
          Clear
        </Button>
        <Button
          variant="secondary"
          className="py-3 text-gray-700 font-medium"
          onClick={backspaceAmount}
          disabled={isTransactionInProgress}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
