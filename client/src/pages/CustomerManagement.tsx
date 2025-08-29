import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, CreditCard, Plus, DollarSign, User, Calendar, Building, Phone, Mail, Edit, History } from 'lucide-react';

interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  iPosToken: string | null;
  tokenCreatedAt: Date | null;
  tokenStatus: string | null;
  cardType: string | null;
  cardLast4: string | null;
  cardExpiry: string | null;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionStartDate: Date | null;
  subscriptionEndDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

interface Transaction {
  id: number;
  amount: number;
  paymentMethod: string;
  status: string;
  dateTime: Date;
  customerId?: string;
  cardDetails?: any;
}

export default function CustomerManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    notes: ''
  });
  const [chargeData, setChargeData] = useState({
    amount: '',
    description: '',
    iPosAuthToken: ''
  });

  // Fetch all customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['/api/customers'],
    retry: false
  });

  // Fetch customer transactions
  const { data: customerTransactions = [] } = useQuery({
    queryKey: ['/api/customers', selectedCustomer?.id, 'transactions'],
    enabled: !!selectedCustomer?.id,
    retry: false
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      return await apiRequest('POST', '/api/customers', customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsCreateDialogOpen(false);
      setNewCustomer({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        company: '',
        notes: ''
      });
      toast({
        title: "Customer Created",
        description: "New customer profile has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    }
  });

  // Charge customer mutation
  const chargeCustomerMutation = useMutation({
    mutationFn: async ({ customerId, chargeData }: { customerId: string, chargeData: any }) => {
      const response = await apiRequest('POST', `/api/customers/${customerId}/charge`, chargeData);
      return response.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'transactions'] });
      setIsChargeDialogOpen(false);
      setChargeData({
        amount: '',
        description: '',
        iPosAuthToken: ''
      });
      
      if (result.success) {
        toast({
          title: "Charge Successful",
          description: `$${result.amount} charged successfully to ${result.customer.name}`,
        });
      } else {
        toast({
          title: "Charge Failed",
          description: result.message || "Charge was declined",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Charge Error",
        description: error.message || "Failed to process charge",
        variant: "destructive",
      });
    }
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomerMutation.mutate(newCustomer);
  };

  const handleChargeCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    const amount = parseFloat(chargeData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    chargeCustomerMutation.mutate({
      customerId: selectedCustomer.id,
      chargeData: {
        ...chargeData,
        amount
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      'active': 'default',
      'inactive': 'secondary',
      'suspended': 'destructive',
      'pending': 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Customer Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage customer profiles, payment tokens, and recurring charges
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
              <DialogDescription>
                Add a new customer profile to the system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email*</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about the customer..."
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createCustomerMutation.isPending}
                  className="w-full"
                >
                  {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customers ({(customers as CustomerProfile[]).length})
              </CardTitle>
              <CardDescription>
                Select a customer to view details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (customers as CustomerProfile[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No customers yet</p>
                  <p className="text-sm">Create your first customer profile</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(customers as CustomerProfile[]).map((customer: CustomerProfile) => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {customer.firstName && customer.lastName
                              ? `${customer.firstName} ${customer.lastName}`
                              : customer.email
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                          {customer.company && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Building className="h-3 w-3" />
                              {customer.company}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {customer.iPosToken && (
                            <Badge variant="outline" className="text-xs">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Token
                            </Badge>
                          )}
                          {getStatusBadge(customer.tokenStatus)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {selectedCustomer.firstName && selectedCustomer.lastName
                          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                          : selectedCustomer.email
                        }
                      </CardTitle>
                      <CardDescription>Customer Profile Details</CardDescription>
                    </div>
                    {selectedCustomer.iPosToken && selectedCustomer.tokenStatus === 'active' && (
                      <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Charge Customer
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Charge Customer</DialogTitle>
                            <DialogDescription>
                              Process a recurring charge using the stored payment token
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleChargeCustomer} className="space-y-4">
                            <div>
                              <Label htmlFor="amount">Amount ($)</Label>
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={chargeData.amount}
                                onChange={(e) => setChargeData(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Input
                                id="description"
                                value={chargeData.description}
                                onChange={(e) => setChargeData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Monthly subscription, product purchase, etc."
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="iPosAuthToken">iPOS Auth Token*</Label>
                              <Input
                                id="iPosAuthToken"
                                type="password"
                                required
                                value={chargeData.iPosAuthToken}
                                onChange={(e) => setChargeData(prev => ({ ...prev, iPosAuthToken: e.target.value }))}
                                placeholder="iPOS authentication token from portal"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Required for recurring charges using iPOS Transact API
                              </p>
                            </div>
                            
                            <DialogFooter>
                              <Button 
                                type="submit" 
                                disabled={chargeCustomerMutation.isPending}
                                className="w-full"
                              >
                                {chargeCustomerMutation.isPending ? "Processing..." : "Process Charge"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{selectedCustomer.email}</span>
                      </div>
                      
                      {selectedCustomer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Phone:</span>
                          <span className="text-sm">{selectedCustomer.phone}</span>
                        </div>
                      )}
                      
                      {selectedCustomer.company && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Company:</span>
                          <span className="text-sm">{selectedCustomer.company}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Created:</span>
                        <span className="text-sm">
                          {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {selectedCustomer.iPosToken && (
                        <>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Payment Token:</span>
                            {getStatusBadge(selectedCustomer.tokenStatus)}
                          </div>
                          
                          {selectedCustomer.cardType && selectedCustomer.cardLast4 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Card:</span>
                              <span className="text-sm">
                                {selectedCustomer.cardType} ending in {selectedCustomer.cardLast4}
                              </span>
                            </div>
                          )}
                          
                          {selectedCustomer.tokenCreatedAt && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Token Created:</span>
                              <span className="text-sm">
                                {new Date(selectedCustomer.tokenCreatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {selectedCustomer.subscriptionStatus && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Subscription:</span>
                          {getStatusBadge(selectedCustomer.subscriptionStatus)}
                          {selectedCustomer.subscriptionPlan && (
                            <span className="text-sm text-muted-foreground">
                              ({selectedCustomer.subscriptionPlan})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedCustomer.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm font-medium">Notes:</span>
                      <p className="text-sm text-muted-foreground mt-1">{selectedCustomer.notes}</p>
                    </div>
                  )}
                  
                  {/* Recurring Charge Button */}
                  {selectedCustomer.iPosToken && selectedCustomer.tokenStatus === 'active' && (
                    <div className="mt-4 pt-4 border-t">
                      <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full" variant="default">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Charge Stored Card
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Charge Customer</DialogTitle>
                            <DialogDescription>
                              Process a recurring charge using the stored payment method for {selectedCustomer.firstName} {selectedCustomer.lastName}
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleChargeCustomer} className="space-y-4">
                            <div>
                              <Label htmlFor="amount">Amount ($)</Label>
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={chargeData.amount}
                                onChange={(e) => setChargeData(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="10.00"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Input
                                id="description"
                                required
                                value={chargeData.description}
                                onChange={(e) => setChargeData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Monthly subscription fee"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="iPosAuthToken">iPOS Auth Token</Label>
                              <Input
                                id="iPosAuthToken"
                                required
                                value={chargeData.iPosAuthToken}
                                onChange={(e) => setChargeData(prev => ({ ...prev, iPosAuthToken: e.target.value }))}
                                placeholder="Enter iPOS authentication token"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Get this token from the iPOS portal under API settings
                              </p>
                            </div>
                            
                            <div className="bg-muted p-3 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <CreditCard className="h-4 w-4" />
                                <span className="font-medium">
                                  {selectedCustomer.cardType} •••• {selectedCustomer.cardLast4}
                                </span>
                              </div>
                            </div>
                            
                            <DialogFooter>
                              <Button 
                                type="submit" 
                                disabled={chargeCustomerMutation.isPending}
                                className="w-full"
                              >
                                {chargeCustomerMutation.isPending ? "Processing..." : "Process Charge"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                  <CardDescription>
                    Payment history for this customer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(customerTransactions as Transaction[]).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No transactions yet</p>
                      <p className="text-sm">Transaction history will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(customerTransactions as Transaction[]).map((transaction: Transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.dateTime).toLocaleString()}
                            </p>
                            {transaction.cardDetails?.tokenUsed && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Token Payment
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant={transaction.status === 'approved' ? 'default' : 'destructive'}>
                              {transaction.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {transaction.paymentMethod}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a Customer</p>
                <p className="text-sm">Choose a customer from the list to view their details and transaction history</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}