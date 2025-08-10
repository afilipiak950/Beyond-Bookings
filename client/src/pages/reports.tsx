import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { 
  TrendingUp, 
  Calendar, 
  Filter, 
  MapPin, 
  Star, 
  Building,
  DollarSign,
  BarChart3,
  FileSpreadsheet,
  Search,
  Settings,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Globe,
  Users,
  PieChart,
  Calculator
} from "lucide-react";
import type { PricingCalculation } from "@shared/schema";

interface ReportFilters {
  cities: string[];
  starRatings: number[];
  priceRange: { min: number; max: number; enabled: boolean };
  profitRange: { min: number; max: number; enabled: boolean };
  dateRange: { startDate: string; endDate: string; enabled: boolean };
  vatRates: number[];
  roomCountRange: { min: number; max: number; enabled: boolean };
  occupancyRange: { min: number; max: number; enabled: boolean };
}



export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    cities: [],
    starRatings: [],
    priceRange: { min: 0, max: 5000, enabled: false },
    profitRange: { min: 0, max: 1000, enabled: false },
    dateRange: { startDate: "", endDate: "", enabled: false },
    vatRates: [],
    roomCountRange: { min: 1, max: 1000, enabled: false },
    occupancyRange: { min: 0, max: 100, enabled: false }
  });



  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCalculations, setSelectedCalculations] = useState<number[]>([]);

  // Fetch calculations
  const { data: calculations, isLoading: calculationsLoading } = useQuery({
    queryKey: ["/api/pricing-calculations"],
    retry: false,
  });

  const calculationsData = calculations as PricingCalculation[] || [];

  // Extract unique values for filters
  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    calculationsData.forEach(calc => {
      if (calc.hotelName) {
        // Extract city from hotel name or use a placeholder
        const cityMatch = calc.hotelName.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
        if (cityMatch) {
          cities.add(cityMatch[0]);
        }
      }
    });
    return Array.from(cities).sort();
  }, [calculationsData]);

  const uniqueStarRatings = useMemo(() => {
    const stars = new Set<number>();
    calculationsData.forEach(calc => {
      if (calc.stars) {
        stars.add(parseInt(calc.stars.toString()));
      }
    });
    return Array.from(stars).sort();
  }, [calculationsData]);

  const uniqueVatRates = useMemo(() => {
    const rates = new Set<number>();
    calculationsData.forEach(calc => {
      if (calc.vatRate) {
        rates.add(parseFloat(calc.vatRate.toString()));
      }
    });
    return Array.from(rates).sort();
  }, [calculationsData]);

  // Filter calculations based on current filters
  const filteredCalculations = useMemo(() => {
    return calculationsData.filter(calc => {
      // Search filter
      if (searchTerm) {
        const searchMatch = calc.hotelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           calc.hotelUrl?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!searchMatch) return false;
      }

      // City filter
      if (reportFilters.cities.length > 0) {
        const hotelCity = calc.hotelName?.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)?.[0];
        if (!hotelCity || !reportFilters.cities.includes(hotelCity)) return false;
      }

      // Star rating filter
      if (reportFilters.starRatings.length > 0) {
        const stars = parseInt(calc.stars?.toString() || "0");
        if (!reportFilters.starRatings.includes(stars)) return false;
      }

      // Price range filter
      if (reportFilters.priceRange.enabled) {
        const price = parseFloat(calc.totalPrice?.toString() || "0");
        if (price < reportFilters.priceRange.min || price > reportFilters.priceRange.max) return false;
      }

      // Profit range filter
      if (reportFilters.profitRange.enabled) {
        const profit = parseFloat(calc.profitMargin?.toString() || "0");
        if (profit < reportFilters.profitRange.min || profit > reportFilters.profitRange.max) return false;
      }

      // Date range filter
      if (reportFilters.dateRange.enabled) {
        const calcDate = new Date(calc.createdAt || 0);
        const startDate = reportFilters.dateRange.startDate ? new Date(reportFilters.dateRange.startDate) : null;
        const endDate = reportFilters.dateRange.endDate ? new Date(reportFilters.dateRange.endDate) : null;
        
        if (startDate && calcDate < startDate) return false;
        if (endDate && calcDate > endDate) return false;
      }

      // VAT rate filter
      if (reportFilters.vatRates.length > 0) {
        const vatRate = parseFloat(calc.vatRate?.toString() || "0");
        if (!reportFilters.vatRates.includes(vatRate)) return false;
      }

      // Room count filter
      if (reportFilters.roomCountRange.enabled) {
        const roomCount = parseInt(calc.roomCount?.toString() || "0");
        if (roomCount < reportFilters.roomCountRange.min || roomCount > reportFilters.roomCountRange.max) return false;
      }

      // Occupancy range filter
      if (reportFilters.occupancyRange.enabled) {
        const occupancyRate = parseFloat(calc.occupancyRate?.toString() || "0");
        if (occupancyRate < reportFilters.occupancyRange.min || occupancyRate > reportFilters.occupancyRange.max) return false;
      }

      return true;
    });
  }, [calculationsData, searchTerm, reportFilters]);

  // Calculate analytics for filtered data
  const analytics = useMemo(() => {
    if (filteredCalculations.length === 0) {
      return {
        totalCalculations: 0,
        totalRevenue: 0,
        averageProfit: 0,
        averagePrice: 0,
        totalHotels: 0,
        averageStars: 0,
        averageOccupancy: 0,
        topCities: [],
        profitDistribution: [],
        priceDistribution: []
      };
    }

    const totalRevenue = filteredCalculations.reduce((sum, calc) => {
      const price = parseFloat(calc.totalPrice?.toString() || "0");
      const rooms = parseInt(calc.roomCount?.toString() || "0");
      const occupancy = parseFloat(calc.occupancyRate?.toString() || "0");
      return sum + (price * rooms * (occupancy / 100));
    }, 0);

    const totalProfit = filteredCalculations.reduce((sum, calc) => {
      return sum + parseFloat(calc.profitMargin?.toString() || "0");
    }, 0);

    const averagePrice = filteredCalculations.reduce((sum, calc) => {
      return sum + parseFloat(calc.totalPrice?.toString() || "0");
    }, 0) / filteredCalculations.length;

    const cityCount = new Map<string, number>();
    filteredCalculations.forEach(calc => {
      const city = calc.hotelName?.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)?.[0];
      if (city) {
        cityCount.set(city, (cityCount.get(city) || 0) + 1);
      }
    });

    const topCities = Array.from(cityCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    return {
      totalCalculations: filteredCalculations.length,
      totalRevenue,
      averageProfit: totalProfit / filteredCalculations.length,
      averagePrice,
      totalHotels: new Set(filteredCalculations.map(c => c.hotelName)).size,
      averageStars: filteredCalculations.reduce((sum, calc) => sum + parseInt(calc.stars?.toString() || "0"), 0) / filteredCalculations.length,
      averageOccupancy: filteredCalculations.reduce((sum, calc) => sum + parseFloat(calc.occupancyRate?.toString() || "0"), 0) / filteredCalculations.length,
      topCities,
      profitDistribution: [], // Could add more detailed distribution analysis
      priceDistribution: []
    };
  }, [filteredCalculations]);



  // Excel Export Mutation
  const exportExcelMutation = useMutation({
    mutationFn: async () => {
      const calculationsToExport = selectedCalculations.length > 0 
        ? filteredCalculations.filter(calc => selectedCalculations.includes(calc.id))
        : filteredCalculations;

      const response = await fetch("/api/export/calculations-excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ calculations: calculationsToExport })
      });
      
      if (!response.ok) {
        throw new Error(`Excel export failed: ${response.statusText}`);
      }
      
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hotel-calculations-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Excel Export Successful",
        description: `Exported ${selectedCalculations.length > 0 ? selectedCalculations.length : filteredCalculations.length} calculations`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Excel Export Failed",
        description: error.message || "Failed to export to Excel",
        variant: "destructive",
      });
    },
  });

  // Reset filters
  const resetFilters = () => {
    setReportFilters({
      cities: [],
      starRatings: [],
      priceRange: { min: 0, max: 5000, enabled: false },
      profitRange: { min: 0, max: 1000, enabled: false },
      dateRange: { startDate: "", endDate: "", enabled: false },
      vatRates: [],
      roomCountRange: { min: 1, max: 1000, enabled: false },
      occupancyRange: { min: 0, max: 100, enabled: false }
    });
    setSearchTerm("");
    setSelectedCalculations([]);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (reportFilters.cities.length > 0) count++;
    if (reportFilters.starRatings.length > 0) count++;
    if (reportFilters.priceRange.enabled) count++;
    if (reportFilters.profitRange.enabled) count++;
    if (reportFilters.dateRange.enabled) count++;
    if (reportFilters.vatRates.length > 0) count++;
    if (reportFilters.roomCountRange.enabled) count++;
    if (reportFilters.occupancyRange.enabled) count++;
    if (searchTerm) count++;
    return count;
  };

  // Handle calculation selection
  const toggleCalculationSelection = (id: number) => {
    setSelectedCalculations(prev => 
      prev.includes(id) 
        ? prev.filter(calcId => calcId !== id)
        : [...prev, id]
    );
  };

  const selectAllCalculations = () => {
    setSelectedCalculations(filteredCalculations.map(calc => calc.id));
  };

  const clearSelection = () => {
    setSelectedCalculations([]);
  };

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminGuard>
      <AppLayout>
        <div className="space-y-8 max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-100/60 backdrop-blur-xl border border-indigo-200/40 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-purple-500/10 animate-gradient-x"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                    <FileSpreadsheet className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-indigo-400 animate-ping opacity-20"></div>
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-800 via-purple-700 to-indigo-800 bg-clip-text text-transparent">
                    Excel Reports
                  </h1>
                  <p className="text-lg text-indigo-700 font-medium mt-2">
                    Export calculation data to Excel with advanced filtering and analytics
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{analytics.totalCalculations}</div>
                  <div className="text-sm text-gray-600">Filtered Results</div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 text-center">
                  <div className="text-2xl font-bold text-purple-600">€{analytics.totalRevenue.toFixed(0)}</div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Hotels</p>
                  <p className="text-3xl font-bold text-blue-800">{analytics.totalHotels}</p>
                </div>
                <Building className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Avg. Profit</p>
                  <p className="text-3xl font-bold text-green-800">€{analytics.averageProfit.toFixed(0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Avg. Stars</p>
                  <p className="text-3xl font-bold text-yellow-800">{analytics.averageStars.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Avg. Occupancy</p>
                  <p className="text-3xl font-bold text-purple-800">{analytics.averageOccupancy.toFixed(1)}%</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                  {getActiveFilterCount() > 0 && (
                    <Badge className="bg-indigo-600 text-white">
                      {getActiveFilterCount()}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Filter calculations for report generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Search Hotels</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Hotel name or URL..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Cities Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Cities ({uniqueCities.length})
                  </Label>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {uniqueCities.map(city => (
                      <div key={city} className="flex items-center space-x-2">
                        <Checkbox
                          id={`city-${city}`}
                          checked={reportFilters.cities.includes(city)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setReportFilters(prev => ({
                                ...prev,
                                cities: [...prev.cities, city]
                              }));
                            } else {
                              setReportFilters(prev => ({
                                ...prev,
                                cities: prev.cities.filter(c => c !== city)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`city-${city}`} className="text-sm">
                          {city}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Star Ratings Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Star Ratings
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {uniqueStarRatings.map(stars => (
                      <div key={stars} className="flex items-center space-x-2">
                        <Checkbox
                          id={`stars-${stars}`}
                          checked={reportFilters.starRatings.includes(stars)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setReportFilters(prev => ({
                                ...prev,
                                starRatings: [...prev.starRatings, stars]
                              }));
                            } else {
                              setReportFilters(prev => ({
                                ...prev,
                                starRatings: prev.starRatings.filter(s => s !== stars)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`stars-${stars}`} className="text-sm">
                          {stars}★
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Price Range (€)
                    </Label>
                    <Checkbox
                      checked={reportFilters.priceRange.enabled}
                      onCheckedChange={(checked) => {
                        setReportFilters(prev => ({
                          ...prev,
                          priceRange: { ...prev.priceRange, enabled: !!checked }
                        }));
                      }}
                    />
                  </div>
                  {reportFilters.priceRange.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={reportFilters.priceRange.min}
                        onChange={(e) => {
                          setReportFilters(prev => ({
                            ...prev,
                            priceRange: { ...prev.priceRange, min: Number(e.target.value) }
                          }));
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={reportFilters.priceRange.max}
                        onChange={(e) => {
                          setReportFilters(prev => ({
                            ...prev,
                            priceRange: { ...prev.priceRange, max: Number(e.target.value) }
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date Range
                    </Label>
                    <Checkbox
                      checked={reportFilters.dateRange.enabled}
                      onCheckedChange={(checked) => {
                        setReportFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, enabled: !!checked }
                        }));
                      }}
                    />
                  </div>
                  {reportFilters.dateRange.enabled && (
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={reportFilters.dateRange.startDate}
                        onChange={(e) => {
                          setReportFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, startDate: e.target.value }
                          }));
                        }}
                      />
                      <Input
                        type="date"
                        value={reportFilters.dateRange.endDate}
                        onChange={(e) => {
                          setReportFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, endDate: e.target.value }
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Reset Filters Button */}
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="w-full"
                  disabled={getActiveFilterCount() === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Export Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Excel Export</span>
                  <div className="flex items-center space-x-2">
                    {selectedCalculations.length > 0 && (
                      <Badge className="bg-blue-600 text-white">
                        {selectedCalculations.length} selected
                      </Badge>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  Export {filteredCalculations.length} filtered calculations to Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  {/* Excel Export */}
                  <Button 
                    variant="outline"
                    className="h-16 flex items-center space-x-3 border-green-200 bg-green-600 hover:bg-green-700 w-full max-w-2xl px-8"
                    onClick={() => exportExcelMutation.mutate()}
                    disabled={filteredCalculations.length === 0 || exportExcelMutation.isPending}
                  >
                    {exportExcelMutation.isPending ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <FileSpreadsheet className="h-5 w-5 text-white" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold text-white">Excel Export</div>
                      <div className="text-xs text-white opacity-90">Raw data with formulas</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calculations Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Filtered Calculations ({filteredCalculations.length})</CardTitle>
                    <CardDescription>
                      Select specific calculations for export to Excel from all filtered results
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedCalculations.length > 0 && (
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear Selection
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllCalculations}
                      disabled={filteredCalculations.length === 0}
                    >
                      Select All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {calculationsLoading ? (
                  <div className="text-center py-6">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                    <div className="text-muted-foreground mt-2">Loading calculations...</div>
                  </div>
                ) : filteredCalculations.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No calculations found</h3>
                    <p className="text-muted-foreground mb-4">
                      {calculationsData.length === 0 
                        ? "Create pricing calculations to generate reports" 
                        : "Try adjusting your filters to see more results"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">
                            <Checkbox
                              checked={selectedCalculations.length === filteredCalculations.length && filteredCalculations.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllCalculations();
                                } else {
                                  clearSelection();
                                }
                              }}
                            />
                          </th>
                          <th className="text-left py-3 px-4 font-medium">Hotel</th>
                          <th className="text-left py-3 px-4 font-medium">City</th>
                          <th className="text-left py-3 px-4 font-medium">Stars</th>
                          <th className="text-left py-3 px-4 font-medium">Price</th>
                          <th className="text-left py-3 px-4 font-medium">Profit</th>
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-right py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredCalculations.map((calc) => {
                          const city = calc.hotelName?.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)?.[0] || "Unknown";
                          const isSelected = selectedCalculations.includes(calc.id);
                          
                          return (
                            <tr 
                              key={calc.id} 
                              className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                            >
                              <td className="py-3 px-4">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleCalculationSelection(calc.id)}
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium">{calc.hotelName}</div>
                                  {calc.hotelUrl && (
                                    <div className="text-xs text-muted-foreground">
                                      {new URL(calc.hotelUrl).hostname}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                  {city}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <Star className="h-3 w-3 mr-1 text-yellow-400" />
                                  {calc.stars || 0}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-medium">
                                €{parseFloat(calc.totalPrice?.toString() || "0").toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  €{parseFloat(calc.profitMargin?.toString() || "0").toFixed(0)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(calc.createdAt || 0).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
}