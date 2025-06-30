import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
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

export default function Calculations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: calculations = [], isLoading } = useQuery({
    queryKey: ["/api/pricing-calculations"],
  });

  // Filter and sort calculations
  const filteredCalculations = calculations
    .filter((calc: any) => 
      calc.hotelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calc.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: any, b: any) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (calculation: any) => {
    const margin = calculation.profitMargin;
    if (margin > 50) return { variant: "default" as const, text: "High Profit" };
    if (margin > 20) return { variant: "secondary" as const, text: "Good Profit" };
    return { variant: "outline" as const, text: "Low Profit" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Calculator className="h-8 w-8 text-blue-600" />
            All Calculations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and review your pricing calculations
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Calculation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Calculations</p>
                <p className="text-2xl font-bold">{calculations.length}</p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Revenue</p>
                <p className="text-2xl font-bold">
                  {calculations.length > 0 ? formatCurrency(
                    calculations.reduce((acc: number, calc: any) => acc + calc.voucherPrice, 0) / calculations.length
                  ) : "€0"}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Profit</p>
                <p className="text-2xl font-bold">
                  {calculations.length > 0 ? formatCurrency(
                    calculations.reduce((acc: number, calc: any) => acc + calc.profitMargin, 0) / calculations.length
                  ) : "€0"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hotels</p>
                <p className="text-2xl font-bold">
                  {new Set(calculations.map((calc: any) => calc.hotelName)).size}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search calculations by hotel name or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation History</CardTitle>
          <CardDescription>
            {filteredCalculations.length} calculation{filteredCalculations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredCalculations.length > 0 ? (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-3 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                <button 
                  onClick={() => handleSort("hotelName")}
                  className="flex items-center gap-1 text-left hover:text-foreground"
                >
                  Hotel <ArrowUpDown className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => handleSort("voucherPrice")}
                  className="flex items-center gap-1 text-left hover:text-foreground"
                >
                  Revenue <ArrowUpDown className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => handleSort("profitMargin")}
                  className="flex items-center gap-1 text-left hover:text-foreground"
                >
                  Profit <ArrowUpDown className="h-3 w-3" />
                </button>
                <span>Status</span>
                <button 
                  onClick={() => handleSort("createdAt")}
                  className="flex items-center gap-1 text-left hover:text-foreground"
                >
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
                <span>Actions</span>
              </div>

              {/* Table Rows */}
              {filteredCalculations.map((calculation: any, index: number) => {
                const status = getStatusBadge(calculation);
                return (
                  <div 
                    key={calculation.id || index} 
                    className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{calculation.hotelName || "Unnamed Hotel"}</span>
                      <span className="text-sm text-muted-foreground">
                        {calculation.hotelStars}★ • {calculation.roomCount} rooms
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-medium">{formatCurrency(calculation.voucherPrice)}</span>
                      <span className="text-sm text-muted-foreground">
                        VAT: {formatCurrency(calculation.vatAmount)}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-medium text-green-600">{formatCurrency(calculation.profitMargin)}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatPercentage(calculation.profitMargin / calculation.voucherPrice * 100)}%
                      </span>
                    </div>

                    <div>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-sm">{formatDate(calculation.createdAt || new Date().toISOString())}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Calculation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}