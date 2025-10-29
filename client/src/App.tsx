import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import CashRegister from "@/pages/CashRegister";
import TransactionHistory from "@/pages/TransactionHistory";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CashRegister} />
      <Route path="/history" component={TransactionHistory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
