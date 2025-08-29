import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User, CreditCard, X } from "lucide-react";
import { useCashRegister } from "@/lib/cashRegisterContext";

interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  iPosToken: string | null;
  tokenStatus: string | null;
  cardType: string | null;
  cardLast4: string | null;
}

export function CustomerSelector() {
  const { selectedCustomer, setSelectedCustomer } = useCashRegister();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery<CustomerProfile[]>({
    queryKey: ["/api/customers"],
    enabled: isOpen,
  });

  const filteredCustomers = customers.filter((customer: CustomerProfile) =>
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.firstName && customer.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.lastName && customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectCustomer = (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
  };

  if (selectedCustomer) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Selected Customer
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCustomer}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedCustomer.firstName && selectedCustomer.lastName
                  ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                  : selectedCustomer.email
                }
              </span>
              {selectedCustomer.iPosToken && (
                <Badge variant="secondary" className="text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Token Available
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedCustomer.email}
            </div>
            {selectedCustomer.cardType && selectedCustomer.cardLast4 && (
              <div className="text-xs text-muted-foreground">
                {selectedCustomer.cardType} •••• {selectedCustomer.cardLast4}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!isOpen ? (
          <Button
            variant="outline"
            onClick={() => setIsOpen(true)}
            className="w-full justify-start"
          >
            <Search className="h-4 w-4 mr-2" />
            Select Customer (Optional)
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            
            <div className="max-h-48 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Loading customers...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {searchTerm ? "No customers found" : "No customers available"}
                </div>
              ) : (
                filteredCustomers.map((customer: CustomerProfile) => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {customer.firstName && customer.lastName
                            ? `${customer.firstName} ${customer.lastName}`
                            : customer.email
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {customer.email}
                        </div>
                        {customer.cardType && customer.cardLast4 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {customer.cardType} •••• {customer.cardLast4}
                          </div>
                        )}
                      </div>
                      {customer.iPosToken && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Token
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}