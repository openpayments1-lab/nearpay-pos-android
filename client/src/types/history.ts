import { CardDetails } from '.';

export interface Transaction {
  id: number;
  amount: number;
  paymentMethod: string;
  status: string;
  dateTime: Date;
  terminalIp: string | null;
  cardDetails: CardDetails | null;
}