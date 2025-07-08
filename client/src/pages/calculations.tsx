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
  TrendingUp,
  Gift,
  Star,
  BarChart3
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
      await apiRequest(`/api/pricing-calculations/${id}`, "DELETE");
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

      {/* View Dialog - Ultra Modern Design */}
      <Dialog open={!!selectedCalculation} onOpenChange={() => setSelectedCalculation(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 border-0 shadow-2xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 pb-6">
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                <Calculator className="h-8 w-8 text-white" />
              </div>
              Hotel Pricing Analysis
            </DialogTitle>
          </DialogHeader>
          
          {selectedCalculation && (() => {
            // Calculate real business metrics from saved data
            const averagePrice = parseFloat(selectedCalculation.averagePrice || "0");
            const voucherPrice = parseFloat(selectedCalculation.voucherPrice || "0");
            const operationalCosts = parseFloat(selectedCalculation.operationalCosts || "0");
            const vatAmount = parseFloat(selectedCalculation.vatAmount || "0");
            const profitMargin = parseFloat(selectedCalculation.profitMargin || "0");
            const totalPrice = parseFloat(selectedCalculation.totalPrice || "0");
            const discountVsMarket = parseFloat(selectedCalculation.discountVsMarket || "0");
            const roomCount = selectedCalculation.roomCount || 0;
            const occupancyRate = parseFloat(selectedCalculation.occupancyRate || "0");
            
            // Real business calculations
            const totalRevenue = totalPrice * roomCount * (occupancyRate / 100);
            const totalCosts = operationalCosts + vatAmount;
            const netProfit = totalRevenue - totalCosts;
            const profitMarginPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
            const costPerRoom = totalCosts / roomCount;
            const revenuePerRoom = totalRevenue / roomCount;
            const discountPercentage = averagePrice > 0 ? ((averagePrice - voucherPrice) / averagePrice) * 100 : 0;
            const vatPercentage = parseFloat(selectedCalculation.vatRate || "0");
            const preTaxAmount = totalPrice - vatAmount;
            
            return (
              <div className="space-y-8 p-6">
                {/* Hotel Header Card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-4xl font-bold mb-2">{selectedCalculation.hotelName}</h2>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-300" />
                            <span className="text-xl font-semibold">{selectedCalculation.stars} Stars</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-200" />
                            <span className="text-xl font-semibold">{roomCount} Rooms</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-300" />
                            <span className="text-xl font-semibold">{occupancyRate}% Occupancy</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-6xl font-bold">{formatCurrency(totalPrice)}</div>
                        <div className="text-xl opacity-80">Total Price</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Revenue Card */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 p-4 text-white shadow-lg">
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white/20 blur-lg" />
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <DollarSign className="h-5 w-5" />
                        <div className="text-xs font-medium opacity-80">Revenue</div>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(totalRevenue)}</div>
                      <div className="text-xs opacity-80">Per Room: {formatCurrency(revenuePerRoom)}</div>
                    </div>
                  </div>

                  {/* Profit Card */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white shadow-lg">
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white/20 blur-lg" />
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <TrendingUp className="h-5 w-5" />
                        <div className="text-xs font-medium opacity-80">Net Profit</div>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(netProfit)}</div>
                      <div className="text-xs opacity-80">Margin: {formatPercentage(profitMarginPercentage)}</div>
                    </div>
                  </div>

                  {/* Costs Card */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-4 text-white shadow-lg">
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white/20 blur-lg" />
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <Calculator className="h-5 w-5" />
                        <div className="text-xs font-medium opacity-80">Total Costs</div>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(totalCosts)}</div>
                      <div className="text-xs opacity-80">Per Room: {formatCurrency(costPerRoom)}</div>
                    </div>
                  </div>

                  {/* Discount Card */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-4 text-white shadow-lg">
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white/20 blur-lg" />
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <Gift className="h-5 w-5" />
                        <div className="text-xs font-medium opacity-80">Discount</div>
                      </div>
                      <div className="text-xl font-bold">{formatPercentage(discountPercentage)}</div>
                      <div className="text-xs opacity-80">Savings: {formatCurrency(discountVsMarket)}</div>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Pricing Breakdown */}
                  <div className="rounded-2xl bg-white/60 dark:bg-slate-800/60 p-5 shadow-lg backdrop-blur-lg border border-white/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      Pricing Analysis
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                        <span className="font-medium text-sm">Average Market Price</span>
                        <span className="text-lg font-bold text-blue-600">{formatCurrency(averagePrice)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                        <span className="font-medium text-sm">Voucher Price</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(voucherPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
                        <span className="font-medium text-sm">Operational Costs</span>
                        <span className="text-lg font-bold text-orange-600">{formatCurrency(operationalCosts)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                        <span className="font-medium text-sm">VAT ({vatPercentage}%)</span>
                        <span className="text-lg font-bold text-purple-600">{formatCurrency(vatAmount)}</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                          <span className="font-bold">Total Price</span>
                          <span className="text-xl font-bold text-emerald-600">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Metrics */}
                  <div className="rounded-2xl bg-white/60 dark:bg-slate-800/60 p-5 shadow-lg backdrop-blur-lg border border-white/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
                        <BarChart3 className="h-4 w-4 text-white" />
                      </div>
                      Business Metrics
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">Total Revenue</span>
                          <span className="text-lg font-bold text-blue-600">{formatCurrency(totalRevenue)}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {roomCount} rooms × {occupancyRate}% occupancy
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">Net Profit</span>
                          <span className="text-lg font-bold text-green-600">{formatCurrency(netProfit)}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Profit Margin: {formatPercentage(profitMarginPercentage)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">Cost Per Room</span>
                          <span className="text-lg font-bold text-orange-600">{formatCurrency(costPerRoom)}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Revenue Per Room: {formatCurrency(revenuePerRoom)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">Customer Savings</span>
                          <span className="text-lg font-bold text-purple-600">{formatCurrency(discountVsMarket)}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Discount: {formatPercentage(discountPercentage)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Footer */}
                <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Created</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(selectedCalculation.createdAt || 0).toLocaleDateString('de-DE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Last Updated</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(selectedCalculation.updatedAt || 0).toLocaleDateString('de-DE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}