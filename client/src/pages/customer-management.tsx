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
import { Users, Building2, Search, Plus, Globe, MapPin, Star, Loader2, Grid3X3, List, Eye, Phone, Mail, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CustomerManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [addHotelOpen, setAddHotelOpen] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [hotelUrl, setHotelUrl] = useState("");
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Fetch hotels data
  const { data: hotels, isLoading: hotelsLoading } = useQuery({
    queryKey: ['/api/hotels'],
    enabled: isAuthenticated,
  });

  // Create hotel mutation
  const createHotelMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/hotels', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hotels'] });
      setAddHotelOpen(false);
      setHotelName("");
      setHotelUrl("");
      setExtractedData(null);
      toast({
        title: "Hotel added successfully",
        description: "The hotel has been added to your database.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding hotel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExtractData = async () => {
    if (!hotelName.trim()) return;
    
    setExtractionLoading(true);
    try {
      const response = await apiRequest('/api/hotels/extract', 'POST', {
        hotelName: hotelName.trim(),
        hotelUrl: hotelUrl.trim() || null,
      });
      
      const data = await response.json();
      setExtractedData(data);
      toast({
        title: "Hotel data extracted",
        description: "Hotel information has been successfully extracted.",
      });
    } catch (error: any) {
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExtractionLoading(false);
    }
  };

  const handleCreateHotel = () => {
    if (!extractedData) return;
    
    createHotelMutation.mutate({
      name: extractedData.name,
      url: extractedData.url,
      stars: extractedData.stars,
      roomCount: extractedData.roomCount,
      location: extractedData.location,
      city: extractedData.city,
      country: extractedData.country,
      category: extractedData.category,
      amenities: extractedData.amenities || [],
      averagePrice: extractedData.averagePrice,
    });
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
      toast({
        title: "Authentication required",
        description: "Please log in to access customer management.",
        variant: "destructive",
      });
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
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
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
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Extracted Hotel Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Name:</span>
                        <span className="ml-2 text-gray-900">{extractedData.name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Location:</span>
                        <span className="ml-2 text-gray-900">{extractedData.city}, {extractedData.country}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Stars:</span>
                        <span className="ml-2 text-gray-900">{extractedData.stars}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Rooms:</span>
                        <span className="ml-2 text-gray-900">{extractedData.roomCount}</span>
                      </div>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Hotel Portfolio
                </CardTitle>
                <CardDescription>
                  {Array.isArray(hotels) ? hotels.length : 0} hotels in your database
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="h-8 px-2"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 px-2"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hotelsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : Array.isArray(hotels) && hotels.length > 0 ? (
              viewMode === 'cards' ? (
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
                              {(hotel.city && hotel.country) ? (
                                <p className="text-sm text-muted-foreground">{hotel.city}, {hotel.country}</p>
                              ) : hotel.location && (
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
                          {hotel.averagePrice && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg. Price:</span>
                              <span className="font-semibold text-green-600">€{hotel.averagePrice}</span>
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
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="px-3"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {hotels.map((hotel: any) => (
                    <div key={hotel.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <Building2 className="h-8 w-8 text-gray-400" />
                        <div>
                          <h3 className="font-medium">{hotel.name}</h3>
                          <p className="text-sm text-gray-500 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {hotel.city}, {hotel.country}
                          </p>
                          {hotel.stars && (
                            <div className="flex items-center mt-1">
                              {Array.from({ length: hotel.stars }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{hotel.roomCount || 'N/A'} rooms</p>
                          {hotel.averagePrice && (
                            <p className="font-medium text-green-600">€{hotel.averagePrice}</p>
                          )}
                        </div>
                        {hotel.url && (
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hotels found</h3>
                <p className="text-gray-500">Add your first hotel to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}