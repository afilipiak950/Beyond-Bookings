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
  
  // Review search states for hotel extraction
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [extractedReviews, setExtractedReviews] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("basic-data");
  
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
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  
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
      setExtractedReviews(null);
      setActiveTab("basic-data");
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
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete hotel: ${response.status} ${response.statusText}`);
      }
      
      // Try to parse as JSON, but handle cases where response might not be JSON
      try {
        return await response.json();
      } catch (e) {
        // If JSON parsing fails but response was OK, assume success
        return { success: true, message: "Hotel deleted successfully" };
      }
    },
    onSuccess: () => {
      // Force refetch of hotels data immediately
      queryClient.invalidateQueries({ queryKey: ["/api/hotels"] });
      queryClient.refetchQueries({ queryKey: ["/api/hotels"] });
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

  // Handle review search
  const handleSearchReviews = async () => {
    if (!hotelName.trim()) {
      toast({
        title: "Hotel name required",
        description: "Bitte geben Sie einen Hotelnamen ein",
        variant: "destructive"
      });
      return;
    }

    setReviewsLoading(true);
    try {
      const response = await fetch('/api/hotels/search-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelName: hotelName.trim(),
          location: extractedData?.location || ""
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search reviews');
      }

      const reviewData = await response.json();
      setExtractedReviews(reviewData.reviews);
      
      toast({
        title: "Reviews gefunden",
        description: `${reviewData.reviews.totalReviewCount} Reviews von 4 Plattformen gefunden`,
      });

    } catch (error) {
      console.error('Review search error:', error);
      toast({
        title: "Fehler",
        description: "Review-Suche fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setReviewsLoading(false);
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

    // Include review data if available
    const hotelDataWithReviews = {
      ...extractedData,
      bookingReviews: extractedReviews?.bookingReviews || null,
      googleReviews: extractedReviews?.googleReviews || null,
      holidayCheckReviews: extractedReviews?.holidayCheckReviews || null,
      tripadvisorReviews: extractedReviews?.tripadvisorReviews || null,
      reviewSummary: extractedReviews?.reviewSummary || null,
      lastReviewUpdate: extractedReviews?.lastReviewUpdate || null,
    };
    
    createHotelMutation.mutate(hotelDataWithReviews);
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
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Hotel Daten & Reviews Extrahieren
                </DialogTitle>
                <DialogDescription>
                  Extrahieren Sie automatisch Hoteldaten und Reviews von 4 Plattformen
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic-data">Grunddaten</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews & Bewertungen</TabsTrigger>
                </TabsList>

                <TabsContent value="basic-data" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hotelName">Hotel Name</Label>
                      <Input
                        id="hotelName"
                        value={hotelName}
                        onChange={(e) => setHotelName(e.target.value)}
                        placeholder="Hotel name eingeben..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="hotelUrl">Hotel URL (optional)</Label>
                      <Input
                        id="hotelUrl"
                        value={hotelUrl}
                        onChange={(e) => setHotelUrl(e.target.value)}
                        placeholder="https://www.hotel-website.de"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={handleExtractData}
                      disabled={extractionLoading || !hotelName.trim()}
                      className="flex-1"
                    >
                      {extractionLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extrahiere Daten...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Hotel Daten Extrahieren
                        </>
                      )}
                    </Button>
                    
                    {extractedData && extractedReviews && (
                      <Button 
                        onClick={handleCreateHotel}
                        disabled={createHotelMutation.isPending}
                        variant="outline"
                        className="flex-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        Hotel mit Reviews Erstellen
                      </Button>
                    )}
                  </div>

                  {/* Extracted Data Display */}
                  {extractedData && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">Extrahierte Hotel Daten:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Name:</span>
                          <p className="text-sm text-gray-900">{extractedData.name || 'Nicht gefunden'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Sterne:</span>
                          <p className="text-sm text-gray-900">{extractedData.stars || 'Nicht gefunden'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Zimmer:</span>
                          <p className="text-sm text-gray-900">{extractedData.roomCount || 'Nicht gefunden'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Lage:</span>
                          <p className="text-sm text-gray-900">{extractedData.location || 'Nicht gefunden'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Durchschnittspreis:</span>
                          <p className="text-sm text-gray-900">
                            {extractedData.averagePrice ? 
                              `${Number(extractedData.averagePrice).toFixed(2)} €` : 
                              'Nicht gefunden'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Website:</span>
                          <p className="text-sm text-gray-900">{extractedData.url || 'Nicht gefunden'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reviews" className="space-y-6">
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleSearchReviews}
                      disabled={reviewsLoading || !hotelName.trim()}
                      className="flex-1"
                    >
                      {reviewsLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Suche Reviews...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          AI Review Search (4 Plattformen)
                        </>
                      )}
                    </Button>
                  </div>

                  {extractedReviews && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">Review Zusammenfassung</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-sm font-medium text-blue-600">Gesamt Reviews:</span>
                            <p className="text-sm text-blue-800">{extractedReviews.totalReviewCount}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-blue-600">Durchschnitt:</span>
                            <p className="text-sm text-blue-800 flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              {extractedReviews.averageRating?.toFixed(1)}/10
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-blue-700">{extractedReviews.reviewSummary}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Platform Reviews */}
                        {extractedReviews.bookingReviews && (
                          <div className="p-4 bg-white rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-gray-800">Booking.com</h5>
                              <a 
                                href={extractedReviews.bookingReviews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Öffnen →
                              </a>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium">{extractedReviews.bookingReviews.rating}/10</span>
                              <span className="text-sm text-gray-600">({extractedReviews.bookingReviews.reviewCount} Reviews)</span>
                            </div>
                          </div>
                        )}

                        {extractedReviews.googleReviews && (
                          <div className="p-4 bg-white rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-gray-800">Google Reviews</h5>
                              <a 
                                href={extractedReviews.googleReviews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Öffnen →
                              </a>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium">{extractedReviews.googleReviews.rating}/5</span>
                              <span className="text-sm text-gray-600">({extractedReviews.googleReviews.reviewCount} Reviews)</span>
                            </div>
                          </div>
                        )}

                        {extractedReviews.holidayCheckReviews && (
                          <div className="p-4 bg-white rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-gray-800">HolidayCheck</h5>
                              <a 
                                href={extractedReviews.holidayCheckReviews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Öffnen →
                              </a>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium">{extractedReviews.holidayCheckReviews.rating}/6</span>
                              <span className="text-sm text-gray-600">({extractedReviews.holidayCheckReviews.reviewCount} Reviews)</span>
                            </div>
                          </div>
                        )}

                        {extractedReviews.tripadvisorReviews && (
                          <div className="p-4 bg-white rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-gray-800">TripAdvisor</h5>
                              <a 
                                href={extractedReviews.tripadvisorReviews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Öffnen →
                              </a>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium">{extractedReviews.tripadvisorReviews.rating}/5</span>
                              <span className="text-sm text-gray-600">({extractedReviews.tripadvisorReviews.reviewCount} Reviews)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddHotelOpen(false);
                    setHotelName("");
                    setHotelUrl("");
                    setExtractedData(null);
                    setExtractedReviews(null);
                    setActiveTab("basic-data");
                  }}
                >
                  Abbrechen
                </Button>
                {extractedData && !extractedReviews && (
                  <Button 
                    onClick={handleCreateHotel}
                    disabled={createHotelMutation.isPending}
                    variant="outline"
                    className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                  >
                    {createHotelMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Erstelle...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Hotel ohne Reviews Erstellen
                      </>
                    )}
                  </Button>
                )}
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
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div>
                        <Label>Star Rating</Label>
                        <Select value={filters.stars} onValueChange={(value) => setFilters(prev => ({ ...prev, stars: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Any rating" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any rating</SelectItem>
                            <SelectItem value="5">5 Stars</SelectItem>
                            <SelectItem value="4">4 Stars</SelectItem>
                            <SelectItem value="3">3 Stars</SelectItem>
                            <SelectItem value="2">2 Stars</SelectItem>
                            <SelectItem value="1">1 Star</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Location</Label>
                        <Input 
                          placeholder="Filter by location..."
                          value={filters.location}
                          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ q: '', stars: '', location: '' })}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hotels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotelData?.map((hotel: any) => (
            <Card key={hotel.id} className="relative group hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {hotel.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {hotel.location}
                    </CardDescription>
                  </div>
                  <div className="flex items-center">
                    {Array.from({ length: hotel.stars || 0 }, (_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Rooms:</span>
                      <p className="font-medium">{hotel.roomCount || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg. Price:</span>
                      <p className="font-medium">{hotel.averagePrice ? `€${hotel.averagePrice}` : 'N/A'}</p>
                    </div>
                  </div>
                  
                  {hotel.url && (
                    <div className="text-sm">
                      <span className="text-gray-600">Website:</span>
                      <a 
                        href={hotel.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:text-blue-800 underline"
                      >
                        Visit Site
                      </a>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHotel(hotel);
                        setSearchDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48" align="end">
                        <div className="space-y-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteHotel(hotel.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Hotel
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {hotelData?.length === 0 && !hotelsLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Hotels Found</h3>
              <p className="text-gray-600 mb-6">
                {hotels?.length === 0 
                  ? "Add your first hotel to get started with customer management." 
                  : "Try adjusting your search filters to find hotels."
                }
              </p>
              <Button 
                onClick={() => setAddHotelOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Hotel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Hotel Details Dialog */}
        <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Hotel Details - {selectedHotel?.name}
              </DialogTitle>
              <DialogDescription>
                View all extracted hotel information and reviews
              </DialogDescription>
            </DialogHeader>
            
            {selectedHotel && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Hotel Details</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  {/* Basic Information */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Building2 className="h-6 w-6 text-blue-600" />
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-gray-800">{selectedHotel.name}</h4>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedHotel.location || 'Location not available'}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {Array.from({ length: selectedHotel.stars || 0 }, (_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                        ))}
                        {selectedHotel.stars && (
                          <span className="ml-2 text-sm text-gray-600">{selectedHotel.stars} Stars</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-800 mb-3">Basic Information</h5>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-600">Hotel Name:</span>
                            <p className="font-medium">{selectedHotel.name}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Star Rating:</span>
                            <p className="font-medium">{selectedHotel.stars ? `${selectedHotel.stars} Stars` : 'Not available'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Category:</span>
                            <p className="font-medium">{selectedHotel.category || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Room Count:</span>
                            <p className="font-medium">{selectedHotel.roomCount || 'Not available'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Average Price:</span>
                            <p className="font-medium">{selectedHotel.averagePrice ? `€${selectedHotel.averagePrice}` : 'Not available'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Location Information */}
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-800 mb-3">Location</h5>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-600">Address:</span>
                            <p className="font-medium">{selectedHotel.location || 'Not available'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">City:</span>
                            <p className="font-medium">{selectedHotel.city || 'Not available'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Country:</span>
                            <p className="font-medium">{selectedHotel.country || 'Not available'}</p>
                          </div>
                          {selectedHotel.url && (
                            <div>
                              <span className="text-sm text-gray-600">Website:</span>
                              <a 
                                href={selectedHotel.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block font-medium text-blue-600 hover:text-blue-800 underline"
                              >
                                Visit Hotel Website
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Amenities */}
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-800 mb-3">Amenities</h5>
                        {selectedHotel.amenities && selectedHotel.amenities.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedHotel.amenities.map((amenity: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No amenities listed</p>
                        )}
                      </div>

                      {/* Review Summary */}
                      {selectedHotel.reviewSummary && (
                        <div className="p-4 bg-white rounded-lg border border-gray-200">
                          <h5 className="font-semibold text-gray-800 mb-3">Review Summary</h5>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {selectedHotel.reviewSummary}
                          </p>
                        </div>
                      )}

                      {/* Creation Info */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-800 mb-3">System Information</h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">Created:</span>
                            <p className="font-medium">
                              {selectedHotel.createdAt ? new Date(selectedHotel.createdAt).toLocaleDateString() : 'Not available'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Last Updated:</span>
                            <p className="font-medium">
                              {selectedHotel.updatedAt ? new Date(selectedHotel.updatedAt).toLocaleDateString() : 'Not available'}
                            </p>
                          </div>
                          {selectedHotel.lastReviewUpdate && (
                            <div>
                              <span className="text-gray-600">Reviews Last Updated:</span>
                              <p className="font-medium">
                                {new Date(selectedHotel.lastReviewUpdate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="space-y-6">
                  {/* Review Platforms */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Booking.com Reviews */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-600" />
                          Booking.com
                        </h5>
                        {selectedHotel.bookingReviews?.url && (
                          <a 
                            href={selectedHotel.bookingReviews.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View on Site →
                          </a>
                        )}
                      </div>
                      {selectedHotel.bookingReviews ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">
                              {selectedHotel.bookingReviews.rating ? 
                                `${selectedHotel.bookingReviews.rating}/10` : 
                                'No rating'
                              }
                            </span>
                            {selectedHotel.bookingReviews.reviewCount && (
                              <span className="text-sm text-gray-600">
                                ({selectedHotel.bookingReviews.reviewCount} reviews)
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
                            {selectedHotel.bookingReviews.insights || selectedHotel.bookingReviews.summary || 'No summary available'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No Booking.com reviews available</p>
                      )}
                    </div>

                    {/* Google Reviews */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Search className="h-4 w-4 text-green-600" />
                          Google Reviews
                        </h5>
                        {selectedHotel.googleReviews?.url && (
                          <a 
                            href={selectedHotel.googleReviews.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View on Site →
                          </a>
                        )}
                      </div>
                      {selectedHotel.googleReviews ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">
                              {selectedHotel.googleReviews.rating ? 
                                `${selectedHotel.googleReviews.rating}/5` : 
                                'No rating'
                              }
                            </span>
                            {selectedHotel.googleReviews.reviewCount && (
                              <span className="text-sm text-gray-600">
                                ({selectedHotel.googleReviews.reviewCount} reviews)
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
                            {selectedHotel.googleReviews.insights || selectedHotel.googleReviews.summary || 'No summary available'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No Google reviews available</p>
                      )}
                    </div>

                    {/* HolidayCheck Reviews */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-600" />
                          HolidayCheck
                        </h5>
                        {selectedHotel.holidayCheckReviews?.url && (
                          <a 
                            href={selectedHotel.holidayCheckReviews.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View on Site →
                          </a>
                        )}
                      </div>
                      {selectedHotel.holidayCheckReviews ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">
                              {selectedHotel.holidayCheckReviews.rating ? 
                                `${selectedHotel.holidayCheckReviews.rating}/6` : 
                                'No rating'
                              }
                            </span>
                            {selectedHotel.holidayCheckReviews.reviewCount && (
                              <span className="text-sm text-gray-600">
                                ({selectedHotel.holidayCheckReviews.reviewCount} reviews)
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
                            {selectedHotel.holidayCheckReviews.insights || selectedHotel.holidayCheckReviews.summary || 'No summary available'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No HolidayCheck reviews available</p>
                      )}
                    </div>

                    {/* TripAdvisor Reviews */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-600" />
                          TripAdvisor
                        </h5>
                        {selectedHotel.tripadvisorReviews?.url && (
                          <a 
                            href={selectedHotel.tripadvisorReviews.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View on Site →
                          </a>
                        )}
                      </div>
                      {selectedHotel.tripadvisorReviews ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">
                              {selectedHotel.tripadvisorReviews.rating ? 
                                `${selectedHotel.tripadvisorReviews.rating}/5` : 
                                'No rating'
                              }
                            </span>
                            {selectedHotel.tripadvisorReviews.reviewCount && (
                              <span className="text-sm text-gray-600">
                                ({selectedHotel.tripadvisorReviews.reviewCount} reviews)
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
                            {selectedHotel.tripadvisorReviews.insights || selectedHotel.tripadvisorReviews.summary || 'No summary available'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No TripAdvisor reviews available</p>
                      )}
                    </div>
                  </div>

                  {/* Overall Review Summary */}
                  {selectedHotel.reviewSummary && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-semibold text-blue-800 mb-3">Overall Review Summary</h5>
                      <p className="text-sm text-blue-700 leading-relaxed">
                        {selectedHotel.reviewSummary}
                      </p>
                    </div>
                  )}

                  {/* No Reviews Message */}
                  {!selectedHotel.bookingReviews && !selectedHotel.googleReviews && 
                   !selectedHotel.holidayCheckReviews && !selectedHotel.tripadvisorReviews && 
                   !selectedHotel.reviewSummary && (
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-800 mb-2">No Reviews Available</h3>
                      <p className="text-gray-600">
                        No review data has been extracted for this hotel yet.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
