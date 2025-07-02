import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Edit, Copy, Trash2, Star } from "lucide-react";

export default function RecentCalculations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: calculations, isLoading } = useQuery({
    queryKey: ["/api/pricing-calculations"],
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/pricing-calculations/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Calculation deleted",
        description: "The pricing calculation has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-calculations"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete calculation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (id: number) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit functionality",
      description: "Edit functionality will be implemented soon",
    });
  };

  const handleCopy = (calculation: any) => {
    // TODO: Implement copy functionality
    toast({
      title: "Copy functionality",
      description: "Copy functionality will be implemented soon",
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this calculation?")) {
      deleteMutation.mutate(id);
    }
  };

  const renderStars = (stars: number) => {
    return (
      <div className="flex items-center">
        <span className="text-amber-400">
          {Array.from({ length: stars }, (_, i) => (
            <Star key={i} className="h-3 w-3 fill-current inline" />
          ))}
        </span>
        <span className="text-muted-foreground">
          {Array.from({ length: 5 - stars }, (_, i) => (
            <Star key={i} className="h-3 w-3 inline" />
          ))}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Calculations</CardTitle>
          <CardDescription>Your latest pricing calculations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="space-x-2">
                  <Skeleton className="h-8 w-16 inline-block" />
                  <Skeleton className="h-8 w-16 inline-block" />
                  <Skeleton className="h-8 w-16 inline-block" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Calculations</CardTitle>
        <CardDescription>
          Your latest pricing calculations and similar cases
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!calculations || calculations.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No calculations yet</h3>
            <p className="text-muted-foreground">
              Start by creating your first pricing calculation
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Hotel</th>
                  <th className="text-left py-3 px-4 font-medium">Stars</th>
                  <th className="text-left py-3 px-4 font-medium">Avg Price</th>
                  <th className="text-left py-3 px-4 font-medium">Voucher Price</th>
                  <th className="text-left py-3 px-4 font-medium">Margin</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calculations.map((calc: any) => (
                  <tr key={calc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium">{calc.hotelName}</div>
                        {calc.hotelUrl && (
                          <div className="text-xs text-muted-foreground">
                            {new URL(calc.hotelUrl).hostname}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {calc.stars ? renderStars(calc.stars) : "-"}
                    </td>
                    <td className="py-4 px-4 font-medium">
                      €{parseFloat(calc.averagePrice).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 font-medium">
                      €{parseFloat(calc.voucherPrice).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="default" className="bg-accent/10 text-accent">
                        +{(parseFloat(calc.profitMargin) / parseFloat(calc.voucherPrice) * 100).toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {new Date(calc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(calc.id)}
                          className="text-primary hover:text-primary/80"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(calc)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(calc.id)}
                          className="text-destructive hover:text-destructive/80"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
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
  );
}
