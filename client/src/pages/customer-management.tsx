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
import { Users, Building2, Search, Plus, Globe, MapPin, Star, Loader2, Trash2, MoreHorizontal, Send, Bot, User, Clock, Brain, MessageSquare, RefreshCw, Eye, AlertCircle, CheckCircle, X, Filter, Calendar, Euro, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

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
  
  // AI enrichment state
  const [aiEnrichment, setAiEnrichment] = useState<{
    roomCount?: { value: number; source: string; confidence: 'Low' | 'Medium' | 'High'; sources: any[] };
    averagePrice?: { value: number; source: string; confidence: 'Low' | 'Medium' | 'High'; sources: any[] };
  }>({});
  const [enrichmentLoading, setEnrichmentLoading] = useState<{
    roomCount?: boolean;
    averagePrice?: boolean;
  }>({});
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());
  const [showApplyDialog, setShowApplyDialog] = useState<{
    field: string;
    value: number;
    show: boolean;
  }>({ field: '', value: 0, show: false });
  const [lastAutoEnrichmentName, setLastAutoEnrichmentName] = useState<string>('');
  
  // Hotel details dialog state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Comprehensive filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    q: '',
    stars: [] as string[],
    category: [] as string[],
    country: '',
    city: '',
    roomCountMin: '',
    roomCountMax: '',
    priceMin: '',
    priceMax: '',
    approvalStatus: [] as string[],
    dataQuality: [] as string[],
    dateFrom: '',
    dateTo: '',
    amenities: [] as string[],
    amenitiesMode: 'any' as 'any' | 'all',
    owner: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
    limit: 20
  });
  const [appliedFilters, setAppliedFilters] = useState({ ...filters });
  
  // Available filter options
  const starOptions = ['1', '2', '3', '4', '5', 'unrated'];
  const categoryOptions = ['Luxury', 'Business', 'Boutique', 'Resort', 'Budget', 'Aparthotel'];
  const approvalStatusOptions = ['none_required', 'required_not_sent', 'pending', 'approved', 'rejected'];
  const dataQualityOptions = [
    { value: 'missingRoomCount', label: 'Missing Room Count' },
    { value: 'missingAvgPrice', label: 'Missing Avg Price' },
    { value: 'lowAIConfidence', label: 'Low AI Confidence' }
  ];
  const sortOptions = [
    { value: 'updatedAt', label: 'Updated (newest)' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'stars', label: 'Stars' },
    { value: 'roomCount', label: 'Room Count' },
    { value: 'averagePrice', label: 'Avg Price' }
  ];
  
  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedFilters(prev => ({ ...prev, q: filters.q, page: 1 }));
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.q]);
  
  // Apply other filters immediately
  const applyFilters = () => {
    setAppliedFilters({ ...filters, page: 1 });
    setFilterOpen(false);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    const resetFilters = {
      q: '',
      stars: [],
      category: [],
      country: '',
      city: '',
      roomCountMin: '',
      roomCountMax: '',
      priceMin: '',
      priceMax: '',
      approvalStatus: [],
      dataQuality: [],
      dateFrom: '',
      dateTo: '',
      amenities: [],
      amenitiesMode: 'any' as 'any' | 'all',
      owner: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc' as 'asc' | 'desc',
      page: 1,
      limit: 20
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
  };
  
  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (appliedFilters.q) count++;
    if (appliedFilters.stars.length > 0) count++;
    if (appliedFilters.category.length > 0) count++;
    if (appliedFilters.country) count++;
    if (appliedFilters.city) count++;
    if (appliedFilters.roomCountMin || appliedFilters.roomCountMax) count++;
    if (appliedFilters.priceMin || appliedFilters.priceMax) count++;
    if (appliedFilters.approvalStatus.length > 0) count++;
    if (appliedFilters.dataQuality.length > 0) count++;
    if (appliedFilters.dateFrom || appliedFilters.dateTo) count++;
    if (appliedFilters.amenities.length > 0) count++;
    if (appliedFilters.owner) count++;
    return count;
  };

  // AI enrichment functions
  const runAIEnrichment = async (field: 'roomCount' | 'averagePrice', hotelName: string, hotelLocation?: string) => {
    setEnrichmentLoading((prev: any) => ({ ...prev, [field]: true }));
    
    try {
      const response = await fetch('/api/hotels/enrich-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          field, 
          hotelName, 
          hotelLocation,
          city: extractedData?.city,
          country: extractedData?.country
        })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        setAiEnrichment((prev: any) => ({
          ...prev,
          [field]: result.data
        }));
        
        // Auto-apply if user hasn't manually edited this field
        if (!userEditedFields.has(field)) {
          setExtractedData((prev: any) => ({
            ...prev,
            [field]: result.data.value
          }));
        } else {
          // Show apply dialog if user has manually edited
          setShowApplyDialog({
            field,
            value: result.data.value,
            show: true
          });
        }
      } else {
        // Show subtle hint instead of toast for better UX
        console.log(`No reliable data found for ${field}`);
        setAiEnrichment((prev: any) => ({
          ...prev,
          [field]: {
            value: null,
            source: "No reliable data found",
            confidence: "Low",
            sources: []
          }
        }));
      }
    } catch (error) {
      console.error(`AI enrichment error for ${field}:`, error);
      toast({
        title: "Recherche-Fehler",
        description: "Die automatische Recherche ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
        variant: "destructive"
      });
    } finally {
      setEnrichmentLoading((prev: any) => ({ ...prev, [field]: false }));
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setUserEditedFields((prev: any) => new Set(prev).add(field));
    setExtractedData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Auto-enrichment for both Room Count and Average Price when hotel data is extracted
  useEffect(() => {
    if (extractedData?.name && extractedData.name !== lastAutoEnrichmentName) {
      const timeoutId = setTimeout(() => {
        console.log('🤖 Auto-enriching Room Count and Average Price for:', extractedData.name);
        
        // Auto-enrich Room Count
        if (!userEditedFields.has('roomCount') && !enrichmentLoading.roomCount) {
          runAIEnrichment('roomCount', extractedData.name, extractedData.location);
        }
        
        // Auto-enrich Average Price
        if (!userEditedFields.has('averagePrice') && !enrichmentLoading.averagePrice) {
          runAIEnrichment('averagePrice', extractedData.name, extractedData.location);
        }
        
        setLastAutoEnrichmentName(extractedData.name);
      }, 2000); // 2-second debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [extractedData?.name, extractedData?.location, userEditedFields, enrichmentLoading, lastAutoEnrichmentName]);



  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };



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

  // Fetch hotels with filters
  const { data: hotelResponse, isLoading: hotelsLoading, refetch: refetchHotels } = useQuery({
    queryKey: ["/api/hotels", appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Build query string from applied filters
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && 
            !(Array.isArray(value) && value.length === 0)) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/hotels?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch hotels');
      }
      
      return response.json();
    }
  });
  
  const hotelData = hotelResponse?.data || [];
  const pagination = hotelResponse?.pagination;
  const filterInfo = hotelResponse?.filters;

  // Mutation for authentic hotel data extraction with real search URLs
  const scrapeHotelMutation = useMutation({
    mutationFn: async (data: { name: string; url?: string }) => {
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
        title: "Hotel Not Found",
        description: error.message || "Could not find hotel. Please try a more specific hotel name with location (e.g., 'Hotel Adlon Berlin', 'Marriott Frankfurt').",
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
      setAiEnrichment({});
      setUserEditedFields(new Set());
      setEnrichmentLoading({});
      setLastAutoEnrichmentName('');
      setFilters(prev => ({ ...prev, q: '' }));
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

  // Handle refresh reviews for existing hotel
  const handleRefreshReviews = async (hotel: any) => {
    if (!hotel?.name) return;
    
    setExtractionLoading(true);
    try {
      // Extract review data for this hotel
      const extractResponse = await apiRequest(`/api/hotels/extract-authentic`, 'POST', {
        name: hotel.name,
        url: hotel.url
      }) as any;

      // Update the hotel with the new review data
      const updateResponse = await apiRequest(`/api/hotels/${hotel.id}`, 'PUT', {
        ...hotel,
        bookingReviews: extractResponse.bookingReviews,
        googleReviews: extractResponse.googleReviews,
        tripadvisorReviews: extractResponse.tripadvisorReviews,
        holidayCheckReviews: extractResponse.holidayCheckReviews,
        reviewSummary: extractResponse.reviewSummary,
        lastReviewUpdate: extractResponse.lastReviewUpdate
      }) as any;

      // Update the selected hotel in state
      setSelectedHotel(updateResponse);
      
      // Refresh hotels list
      queryClient.invalidateQueries({ queryKey: ['/api/hotels'] });

      // Count review platforms found
      const reviewPlatforms = [
        extractResponse.bookingReviews && 'Booking.com',
        extractResponse.googleReviews && 'Google Reviews', 
        extractResponse.holidayCheckReviews && 'HolidayCheck',
        extractResponse.tripadvisorReviews && 'TripAdvisor'
      ].filter(Boolean);

      toast({
        title: "Review data refreshed!",
        description: reviewPlatforms.length > 0 
          ? `Found reviews from ${reviewPlatforms.join(', ')}` 
          : "Hotel data updated (no review data found on platforms)",
      });

    } catch (error: any) {
      toast({
        title: "Failed to refresh reviews",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setExtractionLoading(false);
    }
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
                        <Label htmlFor="editRoomCount" className="flex items-center gap-2">
                          Room Count
                          {aiEnrichment.roomCount && aiEnrichment.roomCount.value !== null && (
                            <Badge variant="secondary" className="text-xs">
                              <Bot className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {aiEnrichment.roomCount && aiEnrichment.roomCount.value !== null && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={
                                      aiEnrichment.roomCount.confidence === 'High' ? 'default' :
                                      aiEnrichment.roomCount.confidence === 'Medium' ? 'secondary' : 'outline'
                                    }>
                                      {aiEnrichment.roomCount.confidence} Confidence
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Source: {aiEnrichment.roomCount.source}
                                  </p>
                                  {aiEnrichment.roomCount.sources?.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium">Sources:</p>
                                      {aiEnrichment.roomCount.sources.slice(0, 3).map((source, idx) => (
                                        <div key={idx} className="text-xs">
                                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {source.title}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => extractedData?.name && runAIEnrichment('roomCount', extractedData.name, extractedData.location)}
                            disabled={enrichmentLoading.roomCount || !extractedData?.name}
                          >
                            {enrichmentLoading.roomCount ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </Button>
                        </Label>
                        <Input
                          id="editRoomCount"
                          type="number"
                          value={extractedData.roomCount || ''}
                          onChange={(e) => handleFieldChange('roomCount', parseInt(e.target.value) || 0)}
                          className="mt-1"
                          placeholder={
                            aiEnrichment.roomCount?.value 
                              ? "AI-Recherche verfügbar" 
                              : aiEnrichment.roomCount?.value === null
                                ? "Keine verlässlichen Daten gefunden"
                                : "Anzahl wird automatisch recherchiert"
                          }
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
                          {aiEnrichment.averagePrice && aiEnrichment.averagePrice.value !== null && (
                            <Badge variant="secondary" className="text-xs">
                              <Bot className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {aiEnrichment.averagePrice && aiEnrichment.averagePrice.value !== null && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={
                                      aiEnrichment.averagePrice.confidence === 'High' ? 'default' :
                                      aiEnrichment.averagePrice.confidence === 'Medium' ? 'secondary' : 'outline'
                                    }>
                                      {aiEnrichment.averagePrice.confidence} Confidence
                                    </Badge>
                                    <span className="text-sm font-medium">
                                      {formatPrice(aiEnrichment.averagePrice.value)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    12-Monats-Durchschnitt
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Source: {aiEnrichment.averagePrice.source}
                                  </p>
                                  {aiEnrichment.averagePrice.sources?.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium">Sources:</p>
                                      {aiEnrichment.averagePrice.sources.slice(0, 3).map((source, idx) => (
                                        <div key={idx} className="text-xs">
                                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {source.title}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => extractedData?.name && runAIEnrichment('averagePrice', extractedData.name, extractedData.location)}
                            disabled={enrichmentLoading.averagePrice || !extractedData?.name}
                          >
                            {enrichmentLoading.averagePrice ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </Button>
                        </Label>
                        <Input
                          id="editAveragePrice"
                          type="number"
                          step="0.01"
                          value={extractedData.averagePrice || ''}
                          onChange={(e) => handleFieldChange('averagePrice', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          placeholder={
                            aiEnrichment.averagePrice?.value 
                              ? "AI-Recherche verfügbar" 
                              : aiEnrichment.averagePrice?.value === null
                                ? "Keine verlässlichen Daten gefunden"
                                : "12-Monats-Durchschnitt automatisch recherchiert"
                          }
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

                          {/* Overall Review Summary - Hidden
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
                          */}
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
                      setAiEnrichment({});
                      setUserEditedFields(new Set());
                      setEnrichmentLoading({});
                      setLastAutoEnrichmentName('');
                      setFilters(prev => ({ ...prev, q: '' }));
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

          {/* AI Override Confirmation Dialog */}
          <AlertDialog open={showApplyDialog.show} onOpenChange={(open) => setShowApplyDialog(prev => ({ ...prev, show: open }))}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>AI-Daten anwenden?</AlertDialogTitle>
                <AlertDialogDescription>
                  Die KI hat neue Daten für {showApplyDialog.field === 'roomCount' ? 'Zimmeranzahl' : 'Durchschnittspreis'} gefunden:
                  <br />
                  <span className="font-medium">
                    {showApplyDialog.field === 'roomCount' 
                      ? `${showApplyDialog.value} Zimmer`
                      : formatPrice(showApplyDialog.value)
                    }
                  </span>
                  <br />
                  Möchten Sie diesen Wert übernehmen?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ignorieren</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setExtractedData((prev: any) => ({
                    ...prev,
                    [showApplyDialog.field]: showApplyDialog.value
                  }));
                  setShowApplyDialog({ field: '', value: 0, show: false });
                }}>
                  Anwenden
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                  value={filters.q}
                  onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                />
              </div>
              {filters.q && (
                <Button 
                  variant="outline" 
                  onClick={() => setFilters(prev => ({ ...prev, q: "" }))}
                  className="px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="relative">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    {getActiveFilterCount() > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {getActiveFilterCount()}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] max-h-[600px] overflow-y-auto" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Advanced Filters</h4>
                      {getActiveFilterCount() > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                          Clear All
                        </Button>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Stars Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Stars</Label>
                      <div className="flex flex-wrap gap-2">
                        {starOptions.map((star) => (
                          <div key={star} className="flex items-center space-x-1">
                            <Checkbox
                              id={`star-${star}`}
                              checked={filters.stars.includes(star)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({ ...prev, stars: [...prev.stars, star] }));
                                } else {
                                  setFilters(prev => ({ ...prev, stars: prev.stars.filter(s => s !== star) }));
                                }
                              }}
                            />
                            <Label htmlFor={`star-${star}`} className="text-sm">
                              {star === 'unrated' ? 'Unrated' : `${star} ★`}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Category Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Category</Label>
                      <div className="flex flex-wrap gap-2">
                        {categoryOptions.map((category) => (
                          <div key={category} className="flex items-center space-x-1">
                            <Checkbox
                              id={`category-${category}`}
                              checked={filters.category.includes(category)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({ ...prev, category: [...prev.category, category] }));
                                } else {
                                  setFilters(prev => ({ ...prev, category: prev.category.filter(c => c !== category) }));
                                }
                              }}
                            />
                            <Label htmlFor={`category-${category}`} className="text-sm">
                              {category}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Location Filters */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                        <Input
                          id="country"
                          placeholder="Germany"
                          value={filters.country}
                          onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium">City</Label>
                        <Input
                          id="city"
                          placeholder="Berlin"
                          value={filters.city}
                          onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    {/* Room Count Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Room Count</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Min"
                          type="number"
                          value={filters.roomCountMin}
                          onChange={(e) => setFilters(prev => ({ ...prev, roomCountMin: e.target.value }))}
                        />
                        <Input
                          placeholder="Max"
                          type="number"
                          value={filters.roomCountMax}
                          onChange={(e) => setFilters(prev => ({ ...prev, roomCountMax: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    {/* Price Range (EUR) */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center">
                        <Euro className="h-4 w-4 mr-1" />
                        Durchschnittlicher Zimmerpreis (€)
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Min €"
                          type="number"
                          value={filters.priceMin}
                          onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                        />
                        <Input
                          placeholder="Max €"
                          type="number"
                          value={filters.priceMax}
                          onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    {/* Data Quality Filters */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Data Quality</Label>
                      <div className="space-y-2">
                        {dataQualityOptions.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`quality-${option.value}`}
                              checked={filters.dataQuality.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({ ...prev, dataQuality: [...prev.dataQuality, option.value] }));
                                } else {
                                  setFilters(prev => ({ ...prev, dataQuality: prev.dataQuality.filter(q => q !== option.value) }));
                                }
                              }}
                            />
                            <Label htmlFor={`quality-${option.value}`} className="text-sm">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Date Range
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                        />
                        <Input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Apply/Reset Buttons */}
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setFilters({ ...appliedFilters })}>
                        Reset
                      </Button>
                      <Button onClick={applyFilters}>
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Active Filter Chips and Sort Controls */}
        {(getActiveFilterCount() > 0 || appliedFilters.sortBy !== 'updatedAt') && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  
                  {appliedFilters.q && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{appliedFilters.q}"
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, q: '' }));
                        setAppliedFilters(prev => ({ ...prev, q: '' }));
                      }} />
                    </Badge>
                  )}
                  
                  {appliedFilters.stars.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      Stars: {appliedFilters.stars.join(', ')}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, stars: [] }));
                        setAppliedFilters(prev => ({ ...prev, stars: [] }));
                      }} />
                    </Badge>
                  )}
                  
                  {appliedFilters.category.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      Category: {appliedFilters.category.join(', ')}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, category: [] }));
                        setAppliedFilters(prev => ({ ...prev, category: [] }));
                      }} />
                    </Badge>
                  )}
                  
                  {appliedFilters.country && (
                    <Badge variant="secondary" className="gap-1">
                      Country: {appliedFilters.country}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, country: '' }));
                        setAppliedFilters(prev => ({ ...prev, country: '' }));
                      }} />
                    </Badge>
                  )}
                  
                  {appliedFilters.city && (
                    <Badge variant="secondary" className="gap-1">
                      City: {appliedFilters.city}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, city: '' }));
                        setAppliedFilters(prev => ({ ...prev, city: '' }));
                      }} />
                    </Badge>
                  )}
                  
                  {(appliedFilters.roomCountMin || appliedFilters.roomCountMax) && (
                    <Badge variant="secondary" className="gap-1">
                      Rooms: {appliedFilters.roomCountMin || '0'}-{appliedFilters.roomCountMax || '∞'}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, roomCountMin: '', roomCountMax: '' }));
                        setAppliedFilters(prev => ({ ...prev, roomCountMin: '', roomCountMax: '' }));
                      }} />
                    </Badge>
                  )}
                  
                  {(appliedFilters.priceMin || appliedFilters.priceMax) && (
                    <Badge variant="secondary" className="gap-1">
                      Price: €{appliedFilters.priceMin || '0'}-€{appliedFilters.priceMax || '∞'}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, priceMin: '', priceMax: '' }));
                        setAppliedFilters(prev => ({ ...prev, priceMin: '', priceMax: '' }));
                      }} />
                    </Badge>
                  )}
                  
                  {appliedFilters.dataQuality.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      Quality: {appliedFilters.dataQuality.length} filters
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, dataQuality: [] }));
                        setAppliedFilters(prev => ({ ...prev, dataQuality: [] }));
                      }} />
                    </Badge>
                  )}
                  
                  {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
                    <Badge variant="secondary" className="gap-1">
                      Date Range
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
                        setAppliedFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
                      }} />
                    </Badge>
                  )}
                  
                  {getActiveFilterCount() > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2">
                      Clear All
                    </Button>
                  )}
                </div>
                
                {/* Sort Control */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select 
                    value={appliedFilters.sortBy} 
                    onValueChange={(value) => {
                      setFilters(prev => ({ ...prev, sortBy: value }));
                      setAppliedFilters(prev => ({ ...prev, sortBy: value, page: 1 }));
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newOrder = appliedFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                      setFilters(prev => ({ ...prev, sortOrder: newOrder }));
                      setAppliedFilters(prev => ({ ...prev, sortOrder: newOrder, page: 1 }));
                    }}
                  >
                    {appliedFilters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customers List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Hotel Clients</CardTitle>
                <CardDescription>
                  {pagination ? `${pagination.total} hotel${pagination.total !== 1 ? 's' : ''}${filterInfo?.applied ? ' (filtered)' : ''}` : `${hotelData?.length || 0} hotels in your database`}
                </CardDescription>
              </div>
              {pagination && pagination.total > 0 && (
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              )}
            </div>
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
                        
                        {/* Review Data Display */}
                        {(hotel.bookingReviews?.rating || hotel.googleReviews?.rating || hotel.tripadvisorReviews?.rating || hotel.holidayCheckReviews?.rating) && (
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs text-muted-foreground mb-2 font-medium">Reviews</div>
                            <div className="space-y-1">
                              {hotel.bookingReviews && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-blue-600">Booking.com</span>
                                  <div className="flex items-center space-x-1">
                                    {hotel.bookingReviews.rating ? (
                                      <>
                                        <span className="text-xs font-medium">{hotel.bookingReviews.rating}/10</span>
                                        <span className="text-xs text-muted-foreground">({hotel.bookingReviews.reviewCount || hotel.bookingReviews.count})</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No rating</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {hotel.googleReviews && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-red-600">Google</span>
                                  <div className="flex items-center space-x-1">
                                    {hotel.googleReviews.rating ? (
                                      <>
                                        <span className="text-xs font-medium">{hotel.googleReviews.rating}/5</span>
                                        <span className="text-xs text-muted-foreground">({hotel.googleReviews.reviewCount || hotel.googleReviews.count})</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No rating</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {hotel.tripadvisorReviews && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-green-600">TripAdvisor</span>
                                  <div className="flex items-center space-x-1">
                                    {hotel.tripadvisorReviews.rating ? (
                                      <>
                                        <span className="text-xs font-medium">{hotel.tripadvisorReviews.rating}/5</span>
                                        <span className="text-xs text-muted-foreground">({hotel.tripadvisorReviews.reviewCount || hotel.tripadvisorReviews.count})</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No rating</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {hotel.holidayCheckReviews && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-orange-600">HolidayCheck</span>
                                  <div className="flex items-center space-x-1">
                                    {hotel.holidayCheckReviews.rating ? (
                                      <>
                                        <span className="text-xs font-medium">{hotel.holidayCheckReviews.rating}/6</span>
                                        <span className="text-xs text-muted-foreground">({hotel.holidayCheckReviews.reviewCount || hotel.holidayCheckReviews.count})</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No rating</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
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
            
            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    disabled={!pagination.hasPrev}
                    onClick={() => setAppliedFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={!pagination.hasNext}
                    onClick={() => setAppliedFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
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
                
                {/* Review Data Section */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2 text-purple-600" />
                      Reviews & Ratings
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshReviews(selectedHotel)}
                      disabled={extractionLoading}
                      className="text-purple-600 border-purple-300 hover:bg-purple-100"
                    >
                      {extractionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh Reviews
                    </Button>
                  </div>
                  
                  {(selectedHotel.bookingReviews || selectedHotel.googleReviews || selectedHotel.tripadvisorReviews || selectedHotel.holidayCheckReviews) ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Booking.com Reviews */}
                      {selectedHotel.bookingReviews && (
                        <div className="p-3 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-blue-800 flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              Booking.com
                            </h5>
                            {selectedHotel.bookingReviews.url && (
                              <a 
                                href={selectedHotel.bookingReviews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                View Reviews →
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            {selectedHotel.bookingReviews.rating ? (
                              <>
                                <span className="text-sm font-medium">{selectedHotel.bookingReviews.rating}/10</span>
                                <div className="flex">
                                  {Array.from({length: 5}, (_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`h-3 w-3 ${i < Math.round(selectedHotel.bookingReviews.rating / 2) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-600">({selectedHotel.bookingReviews.reviewCount || selectedHotel.bookingReviews.count} reviews)</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Rating data not available - click link to view manually</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700">{selectedHotel.bookingReviews.summary}</p>
                        </div>
                      )}

                      {/* Google Reviews */}
                      {selectedHotel.googleReviews && (
                        <div className="p-3 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-green-800 flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              Google Reviews
                            </h5>
                            {selectedHotel.googleReviews.url && (
                              <a 
                                href={selectedHotel.googleReviews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:text-green-800 underline"
                              >
                                View Reviews →
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            {selectedHotel.googleReviews.rating ? (
                              <>
                                <span className="text-sm font-medium">{selectedHotel.googleReviews.rating}/5</span>
                                <div className="flex">
                                  {Array.from({length: 5}, (_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`h-3 w-3 ${i < Math.round(selectedHotel.googleReviews.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-600">({selectedHotel.googleReviews.reviewCount || selectedHotel.googleReviews.count} reviews)</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Rating data not available - click link to view manually</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700">{selectedHotel.googleReviews.summary}</p>
                        </div>
                      )}

                      {/* TripAdvisor Reviews */}
                      {selectedHotel.tripadvisorReviews && (
                        <div className="p-3 border border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-red-100">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-red-800 flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              TripAdvisor
                            </h5>
                            {selectedHotel.tripadvisorReviews.url && (
                              <a 
                                href={selectedHotel.tripadvisorReviews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-red-600 hover:text-red-800 underline"
                              >
                                View Reviews →
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            {selectedHotel.tripadvisorReviews.rating ? (
                              <>
                                <span className="text-sm font-medium">{selectedHotel.tripadvisorReviews.rating}/5</span>
                                <div className="flex">
                                  {Array.from({length: 5}, (_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`h-3 w-3 ${i < Math.round(selectedHotel.tripadvisorReviews.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-600">({selectedHotel.tripadvisorReviews.reviewCount || selectedHotel.tripadvisorReviews.count} reviews)</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Rating data not available - click link to view manually</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700">{selectedHotel.tripadvisorReviews.summary}</p>
                        </div>
                      )}

                      {/* HolidayCheck Reviews */}
                      {selectedHotel.holidayCheckReviews && (
                        <div className="p-3 border border-orange-200 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-orange-800 flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              HolidayCheck
                            </h5>
                            {selectedHotel.holidayCheckReviews.url && (
                              <a 
                                href={selectedHotel.holidayCheckReviews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-orange-600 hover:text-orange-800 underline"
                              >
                                View Reviews →
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            {selectedHotel.holidayCheckReviews.rating ? (
                              <>
                                <span className="text-sm font-medium">{selectedHotel.holidayCheckReviews.rating}/6</span>
                                <div className="flex">
                                  {Array.from({length: 6}, (_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`h-3 w-3 ${i < Math.round(selectedHotel.holidayCheckReviews.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-600">({selectedHotel.holidayCheckReviews.reviewCount || selectedHotel.holidayCheckReviews.count} reviews)</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Rating data not available - click link to view manually</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700">{selectedHotel.holidayCheckReviews.summary}</p>
                        </div>
                      )}
                      </div>

                      {/* Overall Review Summary */}
                      {selectedHotel.reviewSummary && (
                        <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                          <h5 className="font-medium text-purple-800 mb-2 flex items-center">
                            <Brain className="h-4 w-4 mr-2" />
                            AI Review Summary
                          </h5>
                          <p className="text-sm text-purple-700">{selectedHotel.reviewSummary}</p>
                          {selectedHotel.lastReviewUpdate && (
                            <p className="text-xs text-purple-600 mt-2">
                              Last updated: {new Date(selectedHotel.lastReviewUpdate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm mb-2">No review data available for this hotel</p>
                      <p className="text-xs text-gray-400">Click "Refresh Reviews" to extract review data from booking platforms</p>
                    </div>
                  )}
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
