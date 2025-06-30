import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Search, Plus } from "lucide-react";

export default function CustomerManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Customer Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your hotel clients and their pricing strategies
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search Customers</CardTitle>
            <CardDescription>Find and filter your hotel clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by hotel name, location, or contact..."
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Filter</Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers List */}
        <Card>
          <CardHeader>
            <CardTitle>Hotel Clients</CardTitle>
            <CardDescription>
              {hotels?.length || 0} hotels in your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hotelsLoading ? (
              <div className="text-center py-6">
                <div className="text-muted-foreground">Loading customers...</div>
              </div>
            ) : !hotels || hotels.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No customers yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your first hotel client or create a pricing calculation
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Customer
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {hotels.map((hotel: any) => (
                  <Card key={hotel.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{hotel.name}</CardTitle>
                            {hotel.location && (
                              <p className="text-sm text-muted-foreground">{hotel.location}</p>
                            )}
                          </div>
                        </div>
                        {hotel.stars && (
                          <div className="flex items-center">
                            <span className="text-amber-400">
                              {"★".repeat(hotel.stars)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">
                              {"★".repeat(5 - hotel.stars)}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {hotel.roomCount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rooms:</span>
                            <span>{hotel.roomCount}</span>
                          </div>
                        )}
                        {hotel.url && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Website:</span>
                            <a 
                              href={hotel.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate max-w-32"
                            >
                              {new URL(hotel.url).hostname}
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Added:</span>
                          <span>{new Date(hotel.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1">
                          View Details
                        </Button>
                        <Button size="sm" className="flex-1">
                          New Calculation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
