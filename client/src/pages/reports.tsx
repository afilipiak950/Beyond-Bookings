import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, TrendingUp, Calendar } from "lucide-react";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: calculations, isLoading: calculationsLoading } = useQuery({
    queryKey: ["/api/pricing-calculations"],
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Generate and export detailed pricing reports
          </p>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-red-500 mb-2" />
              <CardTitle>PDF Reports</CardTitle>
              <CardDescription>
                Generate professional PDF reports for clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Create detailed PDF reports including pricing calculations, market analysis, and recommendations.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Executive summary</li>
                  <li>• Detailed calculations</li>
                  <li>• Market comparisons</li>
                  <li>• Professional formatting</li>
                </ul>
              </div>
              <Button className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Generate PDF Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-accent mb-2" />
              <CardTitle>Excel Exports</CardTitle>
              <CardDescription>
                Export data for further analysis in Excel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Export all pricing data in Excel format for advanced analysis and custom reporting.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Raw calculation data</li>
                  <li>• Formulas included</li>
                  <li>• Multiple worksheets</li>
                  <li>• Chart templates</li>
                </ul>
              </div>
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calculations</CardTitle>
            <CardDescription>
              Your latest pricing calculations available for export
            </CardDescription>
          </CardHeader>
          <CardContent>
            {calculationsLoading ? (
              <div className="text-center py-6">
                <div className="text-muted-foreground">Loading calculations...</div>
              </div>
            ) : !calculations || calculations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No calculations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create pricing calculations to generate reports
                </p>
                <Button>
                  <Calculator className="h-4 w-4 mr-2" />
                  Create First Calculation
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">Hotel</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Voucher Price</th>
                      <th className="text-left py-3 px-4 font-medium">Margin</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {calculations.map((calc: any) => (
                      <tr key={calc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
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
                        <td className="py-3 px-4 text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(calc.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          €{parseFloat(calc.voucherPrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                            +{parseFloat(calc.profitMargin).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button size="sm" variant="outline">
                              PDF
                            </Button>
                            <Button size="sm" variant="outline">
                              Excel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
