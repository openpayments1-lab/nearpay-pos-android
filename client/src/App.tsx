import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import CashRegister from "@/pages/CashRegister";
import TransactionHistory from "@/pages/TransactionHistory";
import RefundTest from "@/pages/RefundTest";
import TokenCaptureTest from "@/pages/TokenCaptureTest";
import CustomerManagement from "@/pages/CustomerManagement";
import { CashRegisterProvider } from "@/lib/cashRegisterContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CashRegister} />
      <Route path="/history" component={TransactionHistory} />
      <Route path="/refund-test" component={RefundTest} />
      <Route path="/token-test" component={TokenCaptureTest} />
      <Route path="/customers" component={CustomerManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CashRegisterProvider>
        <Router />
        <Toaster />
      </CashRegisterProvider>
    </QueryClientProvider>
  );
}

export default App;
