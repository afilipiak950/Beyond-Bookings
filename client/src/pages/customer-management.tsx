import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Building2, Search, Plus, Globe, MapPin, Star, Loader2, Trash2, MoreHorizontal } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CustomerManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [addHotelOpen, setAddHotelOpen] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [hotelUrl, setHotelUrl] = useState("");
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);

  const { data: hotels, isLoading: hotelsLoading } = useQuery({
    queryKey: ["/api/hotels"],
    retry: false,
  });

  // Mutation for scraping hotel data
  const scrapeHotelMutation = useMutation({
    mutationFn: async (data: { name: string; url?: string }) => {
      const response = await apiRequest('/api/scrape-hotel', 'POST', data);
      return await response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      
      // Show different messages based on data availability
      if (data.stars || data.roomCount || data.location) {
        toast({
          title: "Hotel data found!",
          description: "Successfully extracted detailed hotel information",
        });
      } else {
        toast({
          title: "Basic hotel data created",
          description: "Hotel name saved. AI extraction limited due to rate limits - you can edit details manually.",
        });
      }
    },
    onError: (error: any) => {
      console.error('Hotel scraping error:', error);
      toast({
        title: "Extraction failed",
        description: "Could not extract hotel data. Please check the hotel name and try again.",
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
      setHotelUrl("");
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

  // Mutation for deleting hotel
  const deleteHotelMutation = useMutation({
    mutationFn: async (hotelId: number) => {
      const response = await apiRequest(`/api/hotels/${hotelId}`, 'DELETE');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotels"] });
      toast({
        title: "Hotel deleted successfully!",
        description: "The hotel has been removed from your database",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete hotel",
        description: error.message || "Could not delete hotel from database",
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
        name: hotelName.trim(), 
        url: hotelUrl.trim() || undefined 
      });
    } catch (error) {
      console.error('Error during hotel data extraction:', error);
      // Error is already handled by the mutation's onError callback
    } finally {
      setExtractionLoading(false);
    }
  };

  // Handle hotel creation
  const handleCreateHotel = () => {
    if (!extractedData) {
      toast({
        title: "No data to save",
        description: "Please extract hotel data first",
        variant: "destructive",
      });
      return;
    }

    createHotelMutation.mutate(extractedData);
  };

  // Handle hotel deletion
  const handleDeleteHotel = async (hotelId: number, hotelName: string) => {
    if (confirm(`Are you sure you want to delete "${hotelName}"? This action cannot be undone.`)) {
      try {
        await deleteHotelMutation.mutateAsync(hotelId);
      } catch (error) {
        console.error('Error deleting hotel:', error);
      }
    }
  };

  // Handle new calculation with pre-filled hotel data
  const handleNewCalculation = (hotel: any) => {
    // Store hotel data in sessionStorage to pass to workflow
    const hotelData = {
      hotelName: hotel.name || '',
      stars: hotel.stars || 0,
      roomCount: hotel.roomCount || 0,
      averagePrice: hotel.averagePrice || 0,
      occupancyRate: 70, // Default value
      projectCosts: 0, // User will input this
      hotelVoucherValue: hotel.stars === 5 ? 50 : hotel.stars === 4 ? 40 : hotel.stars === 3 ? 30 : hotel.stars === 2 ? 25 : hotel.stars === 1 ? 20 : 30,
      date: new Date().toISOString().split('T')[0], // Today's date
      hotelUrl: hotel.url || '',
      location: hotel.location || '',
      category: hotel.category || '',
      amenities: hotel.amenities || []
    };
    
    // Store in sessionStorage
    sessionStorage.setItem('prefilledHotelData', JSON.stringify(hotelData));
    
    // Navigate to workflow
    setLocation('/workflow');
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Customer Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your hotel clients and their pricing strategies
            </p>
          </div>
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
                {/* Hotel Name Input */}
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

                {/* Optional URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="hotelUrl">Hotel Website (Optional)</Label>
                  <Input
                    id="hotelUrl"
                    value={hotelUrl}
                    onChange={(e) => setHotelUrl(e.target.value)}
                    placeholder="https://hotel-website.com"
                    className="w-full"
                  />
                </div>

                {/* Extract Data Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleExtractData}
                    disabled={extractionLoading || !hotelName.trim()}
                    className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white px-8"
                  >
                    {extractionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

                {/* Extracted Data Display */}
                {extractedData && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                      <Star className="h-4 w-4 mr-2" />
                      Extracted Hotel Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Name:</strong> {extractedData.name}
                      </div>
                      {extractedData.location && (
                        <div>
                          <strong>Location:</strong> {extractedData.location}
                        </div>
                      )}
                      {extractedData.stars && (
                        <div>
                          <strong>Stars:</strong> {extractedData.stars} ⭐
                        </div>
                      )}
                      {extractedData.roomCount && (
                        <div>
                          <strong>Rooms:</strong> {extractedData.roomCount}
                        </div>
                      )}
                      {extractedData.category && (
                        <div>
                          <strong>Category:</strong> {extractedData.category}
                        </div>
                      )}
                      {extractedData.url && (
                        <div className="md:col-span-2">
                          <strong>Website:</strong> 
                          <a href={extractedData.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                            {extractedData.url}
                          </a>
                        </div>
                      )}
                      {extractedData.amenities && extractedData.amenities.length > 0 && (
                        <div className="md:col-span-2">
                          <strong>Amenities:</strong> {extractedData.amenities.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddHotelOpen(false);
                      setHotelName("");
                      setHotelUrl("");
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
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                        <Button size="sm" className="flex-1" onClick={() => handleNewCalculation(hotel)}>
                          New Calculation
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                          disabled={deleteHotelMutation.isPending}
                          className="px-3"
                        >
                          {deleteHotelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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
