import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { hotels } from "@/../../shared/schema";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Building2, Search, Plus, Globe, MapPin, Star, Loader2, Trash2, MoreHorizontal, Send, Bot, User, Clock, Brain, MessageSquare } from "lucide-react";
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
  
  // Hotel details dialog state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Format AI response with proper styling
  const formatAIResponse = (response: string) => {
    const lines = response.split('\n');
    const formattedElements: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        formattedElements.push(<div key={index} className="h-2" />);
        return;
      }
      
      // Headers (lines starting with ##, ###, or **bold text**:)
      if (trimmedLine.startsWith('##') || trimmedLine.startsWith('###') || 
          (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.includes(':'))) {
        const headerText = trimmedLine.replace(/^#+\s*/, '').replace(/^\*\*(.*)\*\*:?$/, '$1').replace(/:$/, '');
        formattedElements.push(
          <h4 key={index} className="font-semibold text-gray-900 mt-3 mb-2 text-base">
            {headerText}
          </h4>
        );
        return;
      }
      
      // Bullet points (lines starting with - or •)
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        const bulletText = trimmedLine.replace(/^[-•]\s*/, '');
        formattedElements.push(
          <div key={index} className="flex items-start gap-2 mb-1">
            <span className="text-blue-600 mt-1">•</span>
            <span className="text-gray-700">{bulletText}</span>
          </div>
        );
        return;
      }
      
      // Bold text inline formatting
      if (trimmedLine.includes('**')) {
        const parts = trimmedLine.split('**');
        const formattedParts: JSX.Element[] = [];
        
        parts.forEach((part, partIndex) => {
          if (partIndex % 2 === 0) {
            formattedParts.push(<span key={partIndex}>{part}</span>);
          } else {
            formattedParts.push(<strong key={partIndex} className="font-semibold text-gray-900">{part}</strong>);
          }
        });
        
        formattedElements.push(
          <p key={index} className="text-gray-700 mb-2 leading-relaxed">
            {formattedParts}
          </p>
        );
        return;
      }
      
      // Regular paragraphs
      formattedElements.push(
        <p key={index} className="text-gray-700 mb-2 leading-relaxed">
          {trimmedLine}
        </p>
      );
    });
    
    return <div className="space-y-1">{formattedElements}</div>;
  };

  const { data: hotelData = [], isLoading: hotelsLoading } = useQuery<typeof hotels.$inferSelect[]>({
    queryKey: ["/api/hotels"],
    retry: false,
  });

  // Mutation for authentic hotel data extraction with real search URLs
  const scrapeHotelMutation = useMutation({
    mutationFn: async (data: { name: string; url?: string }) => {
      const response = await apiRequest('/api/hotels/extract-authentic', 'POST', data);
      return await response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      
      // Count review platforms found
      const reviewPlatforms = [
        data.bookingReviews && 'Booking.com',
        data.googleReviews && 'Google Reviews', 
        data.holidayCheckReviews && 'HolidayCheck',
        data.tripadvisorReviews && 'TripAdvisor'
      ].filter(Boolean);
      
      // Display comprehensive success message
      if (reviewPlatforms.length > 0) {
        toast({
          title: "Complete hotel data with reviews extracted!",
          description: `Found ${data.name} with reviews from ${reviewPlatforms.join(', ')}${data.averagePrice ? ` and average price: ${data.averagePrice}€` : ''}`,
        });
      } else if (data.averagePrice && data.priceResearch) {
        toast({
          title: "Hotel data with pricing extracted!",
          description: `Found ${data.name} with AI-researched average price: ${data.averagePrice}€ (${data.priceResearch.confidence} confidence)`,
        });
      } else if (data.stars || data.roomCount || data.location) {
        toast({
          title: "Hotel data found!",
          description: "Successfully extracted detailed hotel information",
        });
      } else {
        toast({
          title: "Basic hotel data created",
          description: "Hotel name saved for further enhancement",
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

  // Handle hotel details view
  const handleViewDetails = (hotel: any) => {
    setSelectedHotel(hotel);
    setSearchQuery("");
    setSearchResults([]);
    setDetailsOpen(true);
  };

  // Handle OpenAI search about hotel
  const handleHotelSearch = async () => {
    if (!searchQuery.trim() || !selectedHotel) return;
    
    setSearchLoading(true);
    try {
      const response = await apiRequest('/api/ai/hotel-search', 'POST', {
        query: searchQuery,
        hotel: {
          name: selectedHotel.name,
          location: selectedHotel.location,
          stars: selectedHotel.stars,
          category: selectedHotel.category,
          amenities: selectedHotel.amenities,
          url: selectedHotel.url,
          roomCount: selectedHotel.roomCount
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get OpenAI response');
      }
      
      const data = await response.json();
      setSearchResults(prev => [...prev, {
        query: searchQuery,
        response: data.response,
        timestamp: new Date().toISOString()
      }]);
      
      setSearchQuery("");
    } catch (error) {
      console.error('OpenAI search error:', error);
      toast({
        title: "Search failed",
        description: "Could not get OpenAI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
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

                {/* Extracted Data Display - Tabbed Interface */}
                {extractedData && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-4 flex items-center">
                      <Star className="h-4 w-4 mr-2" />
                      Hotel Information (Editable)
                    </h3>
                    
                    <Tabs defaultValue="hotel-info" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="hotel-info">Hotel Details</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews & Ratings</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="hotel-info" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="editName">Hotel Name</Label>
                        <Input
                          id="editName"
                          value={extractedData.name}
                          onChange={(e) => setExtractedData({...extractedData, name: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editLocation">Location</Label>
                        <Input
                          id="editLocation"
                          value={extractedData.location || ''}
                          onChange={(e) => setExtractedData({...extractedData, location: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editStars">Stars</Label>
                        <Input
                          id="editStars"
                          type="number"
                          min="1"
                          max="5"
                          value={extractedData.stars || ''}
                          onChange={(e) => setExtractedData({...extractedData, stars: parseInt(e.target.value) || 0})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editRoomCount">Room Count</Label>
                        <Input
                          id="editRoomCount"
                          type="number"
                          value={extractedData.roomCount || ''}
                          onChange={(e) => setExtractedData({...extractedData, roomCount: parseInt(e.target.value) || 0})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editCategory">Category</Label>
                        <Input
                          id="editCategory"
                          value={extractedData.category || ''}
                          onChange={(e) => setExtractedData({...extractedData, category: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editUrl">Website URL</Label>
                        <Input
                          id="editUrl"
                          value={extractedData.url || ''}
                          onChange={(e) => setExtractedData({...extractedData, url: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editAveragePrice" className="flex items-center gap-2">
                          Durchschnittlicher Zimmerpreis (€)
                          {extractedData.averagePrice && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                              Auto-recherchiert
                            </span>
                          )}
                        </Label>
                        <Input
                          id="editAveragePrice"
                          type="number"
                          step="0.01"
                          value={extractedData.averagePrice || ''}
                          onChange={(e) => setExtractedData({...extractedData, averagePrice: parseFloat(e.target.value) || 0})}
                          className="mt-1"
                          placeholder="12-Monats-Durchschnitt automatisch recherchiert"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="editAmenities">Amenities (comma-separated)</Label>
                        <Input
                          id="editAmenities"
                          value={extractedData.amenities ? extractedData.amenities.join(', ') : ''}
                          onChange={(e) => setExtractedData({...extractedData, amenities: e.target.value.split(',').map(a => a.trim()).filter(a => a)})}
                          className="mt-1"
                          placeholder="Wi-Fi, Spa, Restaurant, Bar, etc."
                        />
                      </div>
                      
                      {/* Price research information display */}
                      {extractedData.priceResearch && (
                        <div className="md:col-span-2 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-2">
                            <Brain className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 text-xs">
                              <p className="font-medium text-blue-800 mb-1">
                                12-Monats-Preisrecherche ({extractedData.priceResearch.confidence} Zuverlässigkeit)
                              </p>
                              <p className="text-blue-700 mb-2">
                                {extractedData.priceResearch.methodology}
                              </p>
                              {extractedData.priceResearch.priceRange && (
                                <div className="flex flex-wrap gap-2 text-blue-600">
                                  <span>Spanne: {extractedData.priceResearch.priceRange.low}€ - {extractedData.priceResearch.priceRange.high}€</span>
                                  <span>•</span>
                                  <span>Quellen: {extractedData.priceResearch.dataSource}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="reviews" className="mt-4">
                        {/* Comprehensive Review Data Section */}
                        {(extractedData.bookingReviews || extractedData.googleReviews || extractedData.holidayCheckReviews || extractedData.tripadvisorReviews) && (
                        <div className="md:col-span-2 mt-6">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                            Hotel Reviews & Ratings
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Booking.com Reviews */}
                            {extractedData.bookingReviews && (
                              <div className="p-3 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-blue-800 flex items-center">
                                    <Globe className="h-3 w-3 mr-1" />
                                    Booking.com
                                  </h5>
                                  {extractedData.bookingReviews.url && (
                                    <a 
                                      href={extractedData.bookingReviews.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                                    >
                                      View Reviews →
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  {extractedData.bookingReviews.rating ? (
                                    <>
                                      <span className="text-sm font-medium">{extractedData.bookingReviews.rating}/10</span>
                                      <div className="flex">
                                        {Array.from({length: 5}, (_, i) => (
                                          <Star 
                                            key={i} 
                                            className={`h-3 w-3 ${i < Math.round(extractedData.bookingReviews.rating / 2) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs text-gray-600">({extractedData.bookingReviews.reviewCount} reviews)</span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-blue-600 font-medium">Click to view authentic ratings & reviews</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700">{extractedData.bookingReviews.summary}</p>
                              </div>
                            )}

                            {/* Google Reviews */}
                            {extractedData.googleReviews && (
                              <div className="p-3 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-green-800 flex items-center">
                                    <Globe className="h-3 w-3 mr-1" />
                                    Google Reviews
                                  </h5>
                                  {extractedData.googleReviews.url && (
                                    <a 
                                      href={extractedData.googleReviews.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-green-600 hover:text-green-800 underline"
                                    >
                                      View Reviews →
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  {extractedData.googleReviews.rating ? (
                                    <>
                                      <span className="text-sm font-medium">{extractedData.googleReviews.rating}/5</span>
                                      <div className="flex">
                                        {Array.from({length: 5}, (_, i) => (
                                          <Star 
                                            key={i} 
                                            className={`h-3 w-3 ${i < Math.round(extractedData.googleReviews.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs text-gray-600">({extractedData.googleReviews.reviewCount} reviews)</span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-green-600 font-medium">Click to view authentic ratings & reviews</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700">{extractedData.googleReviews.summary}</p>
                              </div>
                            )}

                            {/* HolidayCheck Reviews */}
                            {extractedData.holidayCheckReviews && (
                              <div className="p-3 border border-orange-200 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-orange-800 flex items-center">
                                    <Globe className="h-3 w-3 mr-1" />
                                    HolidayCheck
                                  </h5>
                                  {extractedData.holidayCheckReviews.url && (
                                    <a 
                                      href={extractedData.holidayCheckReviews.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-orange-600 hover:text-orange-800 underline"
                                    >
                                      View Reviews →
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  {extractedData.holidayCheckReviews.rating ? (
                                    <>
                                      <span className="text-sm font-medium">{extractedData.holidayCheckReviews.rating}/6</span>
                                      <div className="flex">
                                        {Array.from({length: 6}, (_, i) => (
                                          <Star 
                                            key={i} 
                                            className={`h-3 w-3 ${i < Math.round(extractedData.holidayCheckReviews.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs text-gray-600">({extractedData.holidayCheckReviews.reviewCount} reviews)</span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-orange-600 font-medium">Click to view authentic ratings & reviews</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700">{extractedData.holidayCheckReviews.summary}</p>
                              </div>
                            )}

                            {/* TripAdvisor Reviews */}
                            {extractedData.tripadvisorReviews && (
                              <div className="p-3 border border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-red-100">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-red-800 flex items-center">
                                    <Globe className="h-3 w-3 mr-1" />
                                    TripAdvisor
                                  </h5>
                                  {extractedData.tripadvisorReviews.url && (
                                    <a 
                                      href={extractedData.tripadvisorReviews.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-red-600 hover:text-red-800 underline"
                                    >
                                      View Reviews →
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  {extractedData.tripadvisorReviews.rating ? (
                                    <>
                                      <span className="text-sm font-medium">{extractedData.tripadvisorReviews.rating}/5</span>
                                      <div className="flex">
                                        {Array.from({length: 5}, (_, i) => (
                                          <Star 
                                            key={i} 
                                            className={`h-3 w-3 ${i < Math.round(extractedData.tripadvisorReviews.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs text-gray-600">({extractedData.tripadvisorReviews.reviewCount} reviews)</span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-red-600 font-medium">Click to view authentic ratings & reviews</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700">{extractedData.tripadvisorReviews.summary}</p>
                              </div>
                            )}
                          </div>

                          {/* Overall Review Summary */}
                          {extractedData.reviewSummary && (
                            <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                              <h5 className="font-medium text-purple-800 mb-2 flex items-center">
                                <Brain className="h-4 w-4 mr-2" />
                                AI Review Summary
                              </h5>
                              <p className="text-sm text-purple-700">{extractedData.reviewSummary}</p>
                              {extractedData.lastReviewUpdate && (
                                <p className="text-xs text-purple-600 mt-2">
                                  Last updated: {new Date(extractedData.lastReviewUpdate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        )}
                      </TabsContent>
                    </Tabs>
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
              {hotelData?.length || 0} hotels in your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hotelsLoading ? (
              <div className="text-center py-6">
                <div className="text-muted-foreground">Loading customers...</div>
              </div>
            ) : !hotelData || hotelData.length === 0 ? (
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
                {hotelData.map((hotel) => (
                  <Card key={hotel.id} className="hover:shadow-md transition-shadow h-[280px] flex flex-col">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg truncate">{hotel.name}</CardTitle>
                            {hotel.location && (
                              <p className="text-sm text-muted-foreground truncate">{hotel.location}</p>
                            )}
                          </div>
                        </div>
                        {hotel.stars && (
                          <div className="flex items-center flex-shrink-0 ml-2">
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
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <div className="space-y-2 text-sm flex-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rooms:</span>
                          <span>{hotel.roomCount || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Website:</span>
                          {hotel.url ? (
                            <a 
                              href={hotel.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate max-w-32 text-right"
                            >
                              {new URL(hotel.url).hostname}
                            </a>
                          ) : (
                            <span>N/A</span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Added:</span>
                          <span>{hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-4 flex-shrink-0">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleViewDetails(hotel)}>
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
        
        {/* Hotel Details Dialog with AI Search */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {selectedHotel?.name || 'Hotel Details'}
              </DialogTitle>
              <DialogDescription>
                Ask AI anything about this hotel for detailed information
              </DialogDescription>
            </DialogHeader>
            
            {selectedHotel && (
              <div className="space-y-6">
                {/* Hotel Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{selectedHotel.stars} Stars</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span>{selectedHotel.roomCount} Rooms</span>
                      </div>
                      {selectedHotel.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span className="text-xs">{selectedHotel.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Additional Details</h3>
                    <div className="space-y-2 text-sm">
                      {selectedHotel.category && (
                        <div>
                          <span className="font-medium">Category:</span> {selectedHotel.category}
                        </div>
                      )}
                      {selectedHotel.url && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-600" />
                          <a href={selectedHotel.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                            Visit Website
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-xs">Added: {new Date(selectedHotel.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* AI Search Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-800">Ask OpenAI about this hotel</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Powered by GPT-4o</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="What would you like to know about this hotel? (e.g., amenities, location, reviews, pricing)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleHotelSearch()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleHotelSearch}
                      disabled={searchLoading || !searchQuery.trim()}
                      className="px-4"
                    >
                      {searchLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                            <User className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{result.query}</p>
                              <span className="text-xs text-gray-500">
                                {new Date(result.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                            <Bot className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm text-gray-800 space-y-2">
                                {formatAIResponse(result.response)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Quick suggestion buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSearchQuery("What are the key amenities and facilities?");
                        await new Promise(resolve => setTimeout(resolve, 100));
                        handleHotelSearch();
                      }}
                      disabled={searchLoading}
                    >
                      Amenities
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSearchQuery("What's the location like and nearby attractions?");
                        await new Promise(resolve => setTimeout(resolve, 100));
                        handleHotelSearch();
                      }}
                      disabled={searchLoading}
                    >
                      Location
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSearchQuery("What do recent reviews say about this hotel?");
                        await new Promise(resolve => setTimeout(resolve, 100));
                        handleHotelSearch();
                      }}
                      disabled={searchLoading}
                    >
                      Reviews
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSearchQuery("What are typical room rates and pricing?");
                        await new Promise(resolve => setTimeout(resolve, 100));
                        handleHotelSearch();
                      }}
                      disabled={searchLoading}
                    >
                      Pricing
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
