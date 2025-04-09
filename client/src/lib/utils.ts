import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(value: string): string {
  // Remove non-numeric characters except decimal point
  let numericValue = value.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = numericValue.split('.');
  if (parts.length > 2) {
    numericValue = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Format with 2 decimal places
  const amount = parseFloat(numericValue) || 0;
  return amount.toFixed(2);
}

export function generateTransactionId(): string {
  return 'TXN' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}
