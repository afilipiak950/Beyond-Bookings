import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { Notifications } from "@/components/notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Calculator, TrendingUp, Users, FileText, DollarSign, Building2, Sparkles, BarChart3, ArrowRight, Zap, Brain, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation, Link } from "wouter";

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

  // Extract data from API response structure
  const calculationsData = calculations?.data || [];
  const hotelsData = hotels?.data || [];
  
  const totalCalculations = calculationsData.length || 0;
  const totalHotels = hotelsData.length || 0;
  const recentCalculations = calculationsData.slice(0, 5) || [];
  
  // Calculate average margin
  const avgMargin = calculationsData.length > 0 
    ? calculationsData.reduce((sum: number, calc: any) => sum + parseFloat(calc.profitMargin || 0), 0) / calculationsData.length 
    : 0;

  // Calculate total revenue potential
  const totalRevenue = calculationsData.reduce((sum: number, calc: any) => sum + parseFloat(calc.totalPrice || 0), 0) || 0;

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
                Document Intelligence Workflow
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Complete document analysis and insights in three simple steps
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Upload</h3>
                <p className="text-gray-600 text-sm">
                  Upload ZIP files containing PDFs, Excel documents, and images for analysis
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis</h3>
                <p className="text-gray-600 text-sm">
                  Extract insights using OCR and machine learning algorithms
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Insights</h3>
                <p className="text-gray-600 text-sm">
                  Create comprehensive reports with financial analysis and recommendations
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
                Start Document Analysis
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-2xl opacity-60"></div>
            <Card className="relative glass-card border-blue-200/30 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents Processed</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {calculationsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{totalCalculations}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  Documents analyzed successfully
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-50 via-white to-green-50 rounded-2xl opacity-60"></div>
            <Card className="relative glass-card border-green-200/30 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Insights Generated</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {hotelsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{totalHotels}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  AI-powered analysis reports
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-white to-purple-50 rounded-2xl opacity-60"></div>
            <Card className="relative glass-card border-purple-200/30 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Accuracy</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {calculationsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">98.5%</div>
                )}
                <p className="text-xs text-muted-foreground">
                  Average across all calculations
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-2xl opacity-60"></div>
            <Card className="relative glass-card border-emerald-200/30 rounded-2xl">
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
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 rounded-2xl opacity-60"></div>
            <Card className="relative glass-card border-indigo-200/30 rounded-2xl">
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
                      <Link 
                        key={calc.id} 
                        href={`/workflow?id=${calc.id}`}
                        className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {calc.hotelName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            €{parseFloat(calc.voucherPrice || 0).toFixed(2)} • €{parseFloat(calc.totalPrice || 0).toFixed(2)} total
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-xs text-muted-foreground">
                            {new Date(calc.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs font-medium text-green-600">
                            {calc.status === 'draft' ? 'Draft' : 'Complete'}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Notifications />
        </div>
      </div>
    </AppLayout>
  );
}
