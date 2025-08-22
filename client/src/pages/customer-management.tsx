import React, { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Search,
  Filter,
  Building2,
  Plus,
  RefreshCw,
  X,
  CheckCircle,
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  Star,
  Eye,
  TrendingUp,
  Calculator,
  BarChart3,
  DollarSign,
  Users,
  Calendar,
  Target,
  Zap,
  FileText,
  AlertCircle,
  Info,
  ExternalLink,
  MessageSquare,
  Heart,
  ThumbsUp,
  Award,
  Bookmark,
  Send
} from "lucide-react";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const formatRating = (rating: number | null) => {
  if (!rating) return 'N/A';
  return rating.toFixed(1);
};

export default function CustomerManagement() {
  // State management
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
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc',
    page: 1,
    limit: 12
  });

  const [appliedFilters, setAppliedFilters] = useState({ ...filters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [addHotelOpen, setAddHotelOpen] = useState(false);
  const [batchExtractionOpen, setBatchExtractionOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [hotelName, setHotelName] = useState('');
  const [hotelUrl, setHotelUrl] = useState('');
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [batchExtractionLoading, setBatchExtractionLoading] = useState(false);
  const [batchExtractionResults, setBatchExtractionResults] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showApplyDialog, setShowApplyDialog] = useState({ field: '', value: 0, show: false });

  // Filter options
  const starOptions = [1, 2, 3, 4, 5];
  const countryOptions = ['Germany', 'Switzerland', 'Austria', 'Netherlands', 'Belgium', 'France', 'Italy', 'Spain', 'United Kingdom'];
  const dataQualityOptions = [
    { value: 'complete', label: 'Complete Data' },
    { value: 'partial', label: 'Partial Data' },
    { value: 'minimal', label: 'Minimal Data' },
    { value: 'needs_update', label: 'Needs Update' }
  ];
  const sortOptions = [
    { value: 'name', label: 'Hotel Name' },
    { value: 'stars', label: 'Star Rating' },
    { value: 'country', label: 'Country' },
    { value: 'city', label: 'City' },
    { value: 'roomCount', label: 'Room Count' },
    { value: 'averagePrice', label: 'Average Price' },
    { value: 'createdAt', label: 'Date Added' }
  ];

  // Data fetching
  const { data: hotelData, isLoading: hotelsLoading, refetch: refetchHotels } = useQuery({
    queryKey: ['/api/hotels', appliedFilters],
    enabled: true
  });

  const { data: pagination } = useQuery({
    queryKey: ['/api/hotels/pagination', appliedFilters],
    enabled: true
  });

  const { data: filterInfo } = useQuery({
    queryKey: ['/api/hotels/filter-info', appliedFilters],
    enabled: true
  });

  // Helper functions
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.stars.length > 0) count++;
    if (filters.category.length > 0) count++;
    if (filters.country) count++;
    if (filters.city) count++;
    if (filters.roomCountMin || filters.roomCountMax) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.approvalStatus.length > 0) count++;
    if (filters.dataQuality.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  };

  const clearAllFilters = () => {
    const defaultFilters = {
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
      sortBy: 'name',
      sortOrder: 'asc' as 'asc' | 'desc',
      page: 1,
      limit: 12
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setFilterOpen(false);
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters, page: 1 });
    setFilterOpen(false);
  };

  // Event handlers
  const handleExtractData = async () => {
    if (!hotelName.trim()) return;
    
    setExtractionLoading(true);
    try {
      const response = await fetch('/api/hotels/extract-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hotelName: hotelName.trim(),
          hotelUrl: hotelUrl.trim() || undefined
        })
      });
      
      if (!response.ok) throw new Error('Failed to extract hotel data');
      
      const data = await response.json();
      setExtractedData(data);
      toast({
        title: "Data extracted successfully",
        description: `Found information for ${hotelName}`
      });
    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: "Extraction failed",
        description: "Could not extract hotel data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setExtractionLoading(false);
    }
  };

  const handleBatchReviewExtraction = async () => {
    setBatchExtractionLoading(true);
    setBatchExtractionResults(null);
    
    try {
      const response = await fetch('/api/hotels/batch-extract-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to start batch extraction');
      
      const results = await response.json();
      setBatchExtractionResults(results);
      refetchHotels();
      
      toast({
        title: "Batch extraction completed",
        description: `Processed ${results.summary.totalHotels} hotels`
      });
    } catch (error) {
      console.error('Batch extraction error:', error);
      toast({
        title: "Batch extraction failed",
        description: "Could not complete the batch extraction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBatchExtractionLoading(false);
    }
  };

  const handleSaveHotel = async () => {
    if (!extractedData) return;
    
    try {
      const response = await fetch('/api/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractedData)
      });
      
      if (!response.ok) throw new Error('Failed to save hotel');
      
      refetchHotels();
      setAddHotelOpen(false);
      setHotelName('');
      setHotelUrl('');
      setExtractedData(null);
      
      toast({
        title: "Hotel added successfully",
        description: `${extractedData.name} has been added to your database`
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: "Could not save the hotel. Please try again.",
        variant: "destructive"
      });
    }
  };

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
          <div className="flex gap-3">
            <Dialog open={batchExtractionOpen} onOpenChange={setBatchExtractionOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none hover:from-purple-600 hover:to-indigo-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Extract All Reviews
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Batch Review Extraction</DialogTitle>
                  <DialogDescription>
                    Extract reviews from all platforms for every hotel in your database
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {batchExtractionLoading ? (
                    <div className="text-center py-6">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Extracting reviews for all hotels...</p>
                    </div>
                  ) : (
                    <Button onClick={handleBatchReviewExtraction} className="w-full">
                      Start Extraction
                    </Button>
                  )}
                  
                  {batchExtractionResults && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-900">Extraction Complete!</p>
                      <p className="text-sm text-green-700">
                        Processed {batchExtractionResults.summary.totalHotels} hotels
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
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
                      placeholder="e.g., Hotel Adlon Berlin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hotelUrl">Hotel Website (Optional)</Label>
                    <Input
                      id="hotelUrl"
                      value={hotelUrl}
                      onChange={(e) => setHotelUrl(e.target.value)}
                      placeholder="https://hotel-website.com"
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleExtractData}
                      disabled={extractionLoading || !hotelName.trim()}
                      className="bg-gradient-to-r from-blue-500 to-green-500"
                    >
                      {extractionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Extract Data
                        </>
                      )}
                    </Button>
                  </div>

                  {extractedData && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h3 className="font-medium text-green-900">{extractedData.name}</h3>
                        <p className="text-sm text-green-700">
                          {extractedData.city}, {extractedData.country} • {extractedData.stars} stars
                        </p>
                      </div>
                      
                      <Button onClick={handleSaveHotel} className="w-full">
                        Save Hotel
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                <PopoverContent className="w-[400px]" align="start">
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
                              checked={filters.stars.includes(String(star))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({ ...prev, stars: [...prev.stars, String(star)] }));
                                } else {
                                  setFilters(prev => ({ ...prev, stars: prev.stars.filter(s => s !== String(star)) }));
                                }
                              }}
                            />
                            <Label htmlFor={`star-${star}`} className="text-sm">
                              {"★".repeat(star)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Country Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Country</Label>
                      <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Countries</SelectItem>
                          {countryOptions.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={applyFilters} className="flex-1">
                        Apply Filters
                      </Button>
                      <Button variant="outline" onClick={clearAllFilters}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

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
                  Start by adding your first hotel client
                </p>
                <Button onClick={() => setAddHotelOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Hotel
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hotelData.map((hotel: any) => (
                  <Card key={hotel.id} className="relative hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                            {hotel.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-3 w-3" />
                            {hotel.city}, {hotel.country}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < hotel.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">{hotel.stars} stars</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {hotel.roomCount && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Rooms:</span>
                            <span className="font-medium">{hotel.roomCount}</span>
                          </div>
                        )}
                        {hotel.averagePrice && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Avg. Price:</span>
                            <span className="font-medium">{formatPrice(hotel.averagePrice)}</span>
                          </div>
                        )}
                      </div>

                      {/* Review Data Summary */}
                      {(hotel.bookingRating || hotel.googleRating || hotel.tripadvisorRating || hotel.holidaycheckRating) && (
                        <div className="mt-4 pt-3 border-t">
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">Review Ratings</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {hotel.bookingRating && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Booking:</span>
                                <span className="font-medium">{formatRating(hotel.bookingRating)}</span>
                              </div>
                            )}
                            {hotel.googleRating && (
                              <div className="flex justify-between">
                                <span className="text-green-600">Google:</span>
                                <span className="font-medium">{formatRating(hotel.googleRating)}</span>
                              </div>
                            )}
                            {hotel.tripadvisorRating && (
                              <div className="flex justify-between">
                                <span className="text-red-600">TripAdvisor:</span>
                                <span className="font-medium">{formatRating(hotel.tripadvisorRating)}</span>
                              </div>
                            )}
                            {hotel.holidaycheckRating && (
                              <div className="flex justify-between">
                                <span className="text-orange-600">HolidayCheck:</span>
                                <span className="font-medium">{formatRating(hotel.holidaycheckRating)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedHotel(hotel)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Badge variant="outline" className="text-xs">
                          {hotel.category || 'Business'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hotel Details Dialog */}
      {selectedHotel && (
        <Dialog open={!!selectedHotel} onOpenChange={() => setSelectedHotel(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedHotel.name}
              </DialogTitle>
              <DialogDescription>
                Detailed information and review data for this hotel
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm">{selectedHotel.city}, {selectedHotel.country}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Star Rating</Label>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < selectedHotel.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                </div>
                {selectedHotel.roomCount && (
                  <div>
                    <Label className="text-sm font-medium">Room Count</Label>
                    <p className="text-sm">{selectedHotel.roomCount}</p>
                  </div>
                )}
                {selectedHotel.averagePrice && (
                  <div>
                    <Label className="text-sm font-medium">Average Price</Label>
                    <p className="text-sm">{formatPrice(selectedHotel.averagePrice)}</p>
                  </div>
                )}
              </div>

              {/* Review Data */}
              {(selectedHotel.bookingRating || selectedHotel.googleRating || selectedHotel.tripadvisorRating || selectedHotel.holidaycheckRating) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Review Ratings & Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedHotel.bookingRating && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-blue-600">Booking.com</span>
                            <span className="font-bold">{formatRating(selectedHotel.bookingRating)}/10</span>
                          </div>
                          {selectedHotel.bookingReviewCount && (
                            <p className="text-sm text-muted-foreground">
                              {selectedHotel.bookingReviewCount} reviews
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    {selectedHotel.googleRating && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-green-600">Google Reviews</span>
                            <span className="font-bold">{formatRating(selectedHotel.googleRating)}/5</span>
                          </div>
                          {selectedHotel.googleReviewCount && (
                            <p className="text-sm text-muted-foreground">
                              {selectedHotel.googleReviewCount} reviews
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    {selectedHotel.tripadvisorRating && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-red-600">TripAdvisor</span>
                            <span className="font-bold">{formatRating(selectedHotel.tripadvisorRating)}/5</span>
                          </div>
                          {selectedHotel.tripadvisorReviewCount && (
                            <p className="text-sm text-muted-foreground">
                              {selectedHotel.tripadvisorReviewCount} reviews
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    {selectedHotel.holidaycheckRating && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-orange-600">HolidayCheck</span>
                            <span className="font-bold">{formatRating(selectedHotel.holidaycheckRating)}/6</span>
                          </div>
                          {selectedHotel.holidaycheckReviewCount && (
                            <p className="text-sm text-muted-foreground">
                              {selectedHotel.holidaycheckReviewCount} reviews
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}