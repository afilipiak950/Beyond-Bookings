import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Calculator, TrendingUp, Users, FileText, DollarSign, Building2, Sparkles, BarChart3, ArrowRight, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: calculations, isLoading: calculationsLoading } = useQuery({
    queryKey: ["/api/pricing-calculations"],
    retry: false,
  });

  const { data: hotels, isLoading: hotelsLoading } = useQuery({
    queryKey: ["/api/hotels"],
    retry: false,
  });

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

  const totalCalculations = calculations?.length || 0;
  const totalHotels = hotels?.length || 0;
  const recentCalculations = calculations?.slice(0, 5) || [];
  
  // Calculate average margin
  const avgMargin = calculations?.length > 0 
    ? calculations.reduce((sum: number, calc: any) => sum + parseFloat(calc.profitMargin || 0), 0) / calculations.length 
    : 0;

  // Calculate total revenue potential
  const totalRevenue = calculations?.reduce((sum: number, calc: any) => sum + parseFloat(calc.totalPrice || 0), 0) || 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Three-Step Workflow Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-green-50 rounded-3xl opacity-60"></div>
          <div className="relative p-8 glass-card border-blue-200/30 rounded-3xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-3">
                Hotel Pricing Workflow
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Complete hotel pricing analysis in three simple steps
              </p>
              <Badge className="mt-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                NEW FEATURE
              </Badge>
            </div>

            {/* Three-Step Process */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center group">
                <div className="relative mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-all duration-300">
                    <Calculator className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Hotel Pricing Calculator</h3>
                <p className="text-gray-600 text-sm">
                  Enter hotel details and calculate pricing with VAT, margins, and optimal rates
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full group-hover:bg-green-200 transition-all duration-300">
                    <BarChart3 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Price Comparison</h3>
                <p className="text-gray-600 text-sm">
                  Compare with local competitors and analyze market positioning
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-all duration-300">
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate PDF Report</h3>
                <p className="text-gray-600 text-sm">
                  Create professional pricing reports with insights and recommendations
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <Button 
                onClick={() => navigate('/workflow')}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-3 text-lg"
              >
                <Zap className="h-5 w-5 mr-2" />
                Start Pricing Workflow
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calculations</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {calculationsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalCalculations}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Pricing calculations completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hotels Analyzed</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {hotelsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalHotels}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Unique hotels in database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {calculationsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{avgMargin.toFixed(1)}%</div>
              )}
              <p className="text-xs text-muted-foreground">
                Average across all calculations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {calculationsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Total pricing potential
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calculations</CardTitle>
              <CardDescription>
                Your latest pricing calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calculationsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentCalculations.length === 0 ? (
                <div className="text-center py-6">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No calculations yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start by creating your first pricing calculation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCalculations.map((calc: any) => (
                    <div key={calc.id} className="flex items-center space-x-4 p-3 rounded-lg border">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {calc.hotelName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          €{parseFloat(calc.voucherPrice).toFixed(2)} • {parseFloat(calc.profitMargin).toFixed(1)}% margin
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(calc.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Commonly used features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="/pricing-agent"
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Calculator className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">New Pricing Calculation</p>
                    <p className="text-xs text-muted-foreground">
                      Create a new hotel pricing analysis
                    </p>
                  </div>
                </a>
                
                <a
                  href="/customer-management"
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Manage Customers</p>
                    <p className="text-xs text-muted-foreground">
                      View and manage your hotel clients
                    </p>
                  </div>
                </a>
                
                <a
                  href="/reports"
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <FileText className="h-5 w-5 text-accent" />
                  <div>
                    <p className="font-medium">Generate Reports</p>
                    <p className="text-xs text-muted-foreground">
                      Export calculations to PDF or Excel
                    </p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
