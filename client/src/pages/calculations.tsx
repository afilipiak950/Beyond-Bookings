import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { 
  Calculator,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Building2,
  TrendingUp
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/pricing";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PricingCalculation } from "@shared/schema";

export default function Calculations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "hotel" | "revenue" | "profit">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCalculation, setSelectedCalculation] = useState<PricingCalculation | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: calculations, isLoading } = useQuery({
    queryKey: ["/api/pricing-calculations"],
    retry: false,
  });

  const calculationsData = calculations as PricingCalculation[] || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/pricing-calculations/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-calculations"] });
      toast({
        title: "Success",
        description: "Calculation deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete calculation",
        variant: "destructive",
      });
    },
  });

  // Action handlers
  const handleView = (calculation: PricingCalculation) => {
    setSelectedCalculation(calculation);
  };

  const handleEdit = (calculation: PricingCalculation) => {
    // Navigate to workflow with calculation data
    setLocation(`/workflow?id=${calculation.id}`);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Filter and sort calculations
  const filteredCalculations = calculationsData
    .filter(calc => 
      calc.hotelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calc.hotelUrl?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "hotel":
          aValue = a.hotelName || "";
          bValue = b.hotelName || "";
          break;
        case "revenue":
          aValue = a.totalPrice || 0;
          bValue = b.totalPrice || 0;
          break;
        case "profit":
          aValue = a.profitMargin || 0;
          bValue = b.profitMargin || 0;
          break;
        default:
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  // Calculate statistics
  const totalCalculations = calculationsData.length;
  const totalRevenue = calculationsData.reduce((sum, calc) => sum + (calc.totalPrice || 0), 0);
  const totalProfit = calculationsData.reduce((sum, calc) => sum + (calc.profitMargin || 0), 0);
  const uniqueHotels = new Set(calculationsData.map(calc => calc.hotelName)).size;

  const getStatusBadge = (profitMargin: number) => {
    const margin = profitMargin || 0;
    if (margin > 30) return { variant: "default" as const, text: "High Profit" };
    if (margin > 20) return { variant: "secondary" as const, text: "Good Profit" };
    return { variant: "outline" as const, text: "Low Profit" };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Calculator className="h-8 w-8 text-blue-600" />
              All Calculations
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and review all your pricing calculations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Calculation
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calculations</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCalculations}</div>
              <p className="text-xs text-muted-foreground">Active pricing models</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Combined revenue potential</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalCalculations > 0 ? totalProfit / totalCalculations : 0)}
              </div>
              <p className="text-xs text-muted-foreground">Per calculation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Hotels</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueHotels}</div>
              <p className="text-xs text-muted-foreground">Properties analyzed</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pricing Calculations</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search hotels..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : filteredCalculations.length > 0 ? (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 rounded-lg font-medium text-sm">
                  <div className="col-span-3 flex items-center gap-2 cursor-pointer" onClick={() => setSortBy("hotel")}>
                    Hotel Name
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 cursor-pointer" onClick={() => setSortBy("revenue")}>
                    Revenue
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 cursor-pointer" onClick={() => setSortBy("profit")}>
                    Profit
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                  <div className="col-span-2">VAT Amount</div>
                  <div className="col-span-2 flex items-center gap-2 cursor-pointer" onClick={() => setSortBy("date")}>
                    Date Created
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                  <div className="col-span-1">Actions</div>
                </div>

                {/* Table Rows */}
                {filteredCalculations.map((calculation) => {
                  const status = getStatusBadge(calculation.profitMargin || 0);
                  return (
                    <div key={calculation.id} className="grid grid-cols-12 gap-4 py-4 px-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="col-span-3">
                        <div className="font-medium">{calculation.hotelName || "Unnamed Hotel"}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {calculation.hotelUrl || "No URL provided"}
                        </div>
                        <Badge variant={status.variant} className="mt-1">
                          {status.text}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <div className="font-medium">{formatCurrency(calculation.totalPrice || 0)}</div>
                        <div className="text-sm text-muted-foreground">
                          Base: {formatCurrency(calculation.voucherPrice || 0)}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-medium">{formatCurrency(calculation.profitMargin || 0)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatPercentage((calculation.profitMargin || 0) / (calculation.totalPrice || 1) * 100)}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-medium">{formatCurrency(calculation.vatAmount || 0)}</div>
                        <div className="text-sm text-muted-foreground">
                          Rate: {calculation.vatRate || 0}%
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-medium">
                          {new Date(calculation.createdAt || 0).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(calculation.createdAt || 0).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleView(calculation)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(calculation)}
                            title="Edit Calculation"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                title="Delete Calculation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Calculation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this calculation? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(calculation.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No calculations found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Start by creating your first pricing calculation"}
                </p>
                <Button onClick={() => setLocation("/workflow")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Calculation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <Dialog open={!!selectedCalculation} onOpenChange={() => setSelectedCalculation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Calculation Details</DialogTitle>
          </DialogHeader>
          {selectedCalculation && (
            <div className="space-y-6">
              {/* Hotel Information */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Hotel Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">{selectedCalculation.hotelName || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Stars</div>
                    <div className="font-medium">{selectedCalculation.stars || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Room Count</div>
                    <div className="font-medium">{selectedCalculation.roomCount || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Occupancy Rate</div>
                    <div className="font-medium">{selectedCalculation.occupancyRate || "N/A"}%</div>
                  </div>
                </div>
                {selectedCalculation.hotelUrl && (
                  <div className="mt-3">
                    <div className="text-sm text-muted-foreground">URL</div>
                    <div className="font-medium text-blue-600 truncate">{selectedCalculation.hotelUrl}</div>
                  </div>
                )}
              </div>

              {/* Financial Details */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Average Price</div>
                    <div className="font-medium">{formatCurrency(selectedCalculation.averagePrice || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Voucher Price</div>
                    <div className="font-medium">{formatCurrency(selectedCalculation.voucherPrice || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Operational Costs</div>
                    <div className="font-medium">{formatCurrency(selectedCalculation.operationalCosts || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">VAT Amount</div>
                    <div className="font-medium">{formatCurrency(selectedCalculation.vatAmount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">VAT Rate</div>
                    <div className="font-medium">{selectedCalculation.vatRate || 0}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Profit Margin</div>
                    <div className="font-medium">{formatCurrency(selectedCalculation.profitMargin || 0)}</div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-green-800 dark:text-green-200">
                  <TrendingUp className="h-4 w-4" />
                  Total Price
                </h3>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(selectedCalculation.totalPrice || 0)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Discount vs Market: {formatCurrency(selectedCalculation.discountVsMarket || 0)}
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="font-medium">
                      {new Date(selectedCalculation.createdAt || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                    <div className="font-medium">
                      {new Date(selectedCalculation.updatedAt || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}