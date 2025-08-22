import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Building2, Search, Plus, Globe, MapPin, Star, Loader2, RefreshCw, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

export default function CustomerManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [addHotelOpen, setAddHotelOpen] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch hotels
  const { data: hotelResponse, isLoading: hotelsLoading } = useQuery({
    queryKey: ["/api/hotels"],
    queryFn: async () => {
      const response = await fetch("/api/hotels", {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch hotels');
      }
      
      return response.json();
    }
  });
  
  const hotelData = hotelResponse?.data || [];

  // Mutation for authentic hotel data extraction
  const scrapeHotelMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await fetch('/api/hotels/extract-authentic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to extract hotel data');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      
      const reviewPlatforms = [
        data.bookingReviews && 'Booking.com',
        data.googleReviews && 'Google Reviews', 
        data.holidayCheckReviews && 'HolidayCheck',
        data.tripadvisorReviews && 'TripAdvisor'
      ].filter(Boolean);
      
      if (reviewPlatforms.length > 0) {
        toast({
          title: "Complete hotel data with reviews extracted!",
          description: `Found ${data.name} with reviews from ${reviewPlatforms.join(', ')}`,
        });
      } else {
        toast({
          title: "Hotel data extracted!",
          description: "Successfully extracted detailed hotel information",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Hotel Not Found",
        description: error.message || "Could not find hotel. Please try a more specific hotel name.",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating hotel
  const createHotelMutation = useMutation({
    mutationFn: async (hotelData: any) => {
      const response = await apiRequest('/api/hotels', 'POST', hotelData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotels"] });
      setAddHotelOpen(false);
      setHotelName("");
      setExtractedData(null);
      toast({
        title: "Hotel added successfully!",
        description: "The hotel has been added to your database",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add hotel",
        description: error.message || "Could not add hotel to database",
        variant: "destructive",
      });
    },
  });

  // Mutation for batch updating hotels with review data
  const batchUpdateReviewsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/hotels/batch-update-reviews', 'POST');
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotels"] });
      toast({
        title: "Batch review update completed!",
        description: `Successfully updated ${data.summary.success} hotels with authentic review data from all 4 platforms`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to batch update reviews",
        description: error.message || "Could not update hotels with review data",
        variant: "destructive",
      });
    },
  });

  // Handle hotel data extraction
  const handleExtractData = async () => {
    if (!hotelName.trim()) {
      toast({
        title: "Hotel name required",
        description: "Please enter a hotel name",
        variant: "destructive",
      });
      return;
    }

    setExtractionLoading(true);
    try {
      await scrapeHotelMutation.mutateAsync({ 
        name: hotelName.trim()
      });
    } catch (error) {
      console.error('Error during hotel data extraction:', error);
    } finally {
      setExtractionLoading(false);
    }
  };

  // Handle hotel creation
  const handleCreateHotel = async () => {
    if (!extractedData) return;
    
    await createHotelMutation.mutateAsync(extractedData);
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
    <AppLayout>
      <div className="flex min-h-screen">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Customer Management</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage your hotel clients and their pricing strategies
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => batchUpdateReviewsMutation.mutate()}
              disabled={batchUpdateReviewsMutation.isPending}
              variant="outline"
              className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
            >
              {batchUpdateReviewsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Update All Reviews
            </Button>
            <Dialog open={addHotelOpen} onOpenChange={setAddHotelOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Hotel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Hotel</DialogTitle>
                  <DialogDescription>
                    Enter the hotel name and we'll automatically extract all the details
                  </DialogDescription>
                </DialogHeader>
              
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="hotelName">Hotel Name *</Label>
                    <Input
                      id="hotelName"
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      placeholder="e.g., Hotel Adlon Berlin, Marriott Frankfurt"
                      className="w-full"
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleExtractData}
                      disabled={extractionLoading || !hotelName.trim()}
                      className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white px-8"
                    >
                      {extractionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2" />
                          Extracting Data...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Extract Hotel Data
                        </>
                      )}
                    </Button>
                  </div>

                  {extractedData && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <h3 className="font-semibold text-green-800 mb-4 flex items-center">
                        <Star className="h-4 w-4 mr-2" />
                        Hotel Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><strong>Name:</strong> {extractedData.name}</div>
                        <div><strong>Location:</strong> {extractedData.location || 'N/A'}</div>
                        <div><strong>Stars:</strong> {extractedData.stars || 'N/A'}</div>
                        <div><strong>Rooms:</strong> {extractedData.roomCount || 'N/A'}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddHotelOpen(false);
                        setHotelName("");
                        setExtractedData(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateHotel}
                      disabled={!extractedData || createHotelMutation.isPending}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    >
                      {createHotelMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2" />
                          Adding Hotel...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Hotel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Customers</CardTitle>
              <CardDescription>Find and filter your hotel clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by hotel name, location..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hotel Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotelsLoading ? (
              <div className="col-span-full text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <div className="text-muted-foreground">Loading hotels...</div>
              </div>
            ) : hotelData.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No hotels found. Add your first hotel to get started.
              </div>
            ) : (
              hotelData.map((hotel: any) => (
                <Card key={hotel.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{hotel.name}</h3>
                        <div className="flex items-center gap-1 mb-2">
                          {hotel.stars && Array.from({length: hotel.stars}).map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div>Rooms: {hotel.roomCount || 'N/A'}</div>
                      {hotel.url && (
                        <div>Website: {hotel.url.replace(/^https?:\/\//, '').substring(0, 25)}...</div>
                      )}
                      <div className="text-xs text-gray-500">
                        Added: {new Date(hotel.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-teal-500 hover:bg-teal-600 text-white border-teal-500"
                      >
                        NC
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-teal-500 hover:bg-teal-600 text-white border-teal-500"
                      >
                        Calc
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-teal-500 hover:bg-teal-600 text-white border-teal-500"
                      >
                        DA
                      </Button>
                      <Button
                        size="sm" 
                        variant="outline"
                        className="bg-teal-500 hover:bg-teal-600 text-white border-teal-500"
                      >
                        More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Sidebar - Floating Panel */}
        <div className="fixed right-4 top-20 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Hotel Clients</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">{hotelData?.length || 0} hotels</div>
              <div className="text-xs text-gray-500 mt-1">
                Page 1 of 1
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}