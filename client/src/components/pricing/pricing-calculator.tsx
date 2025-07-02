import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { calculatePricing } from "@/lib/pricing";
import { Search, Plus, Upload, FileText, Download, Info, Save, RotateCcw } from "lucide-react";

const pricingSchema = z.object({
  hotelUrl: z.string().url("Please enter a valid URL").optional(),
  hotelName: z.string().min(1, "Hotel name is required"),
  stars: z.coerce.number().min(1).max(5).optional(),
  roomCount: z.coerce.number().min(1).optional(),
  occupancyRate: z.coerce.number().min(0).max(100).optional(),
  averagePrice: z.coerce.number().min(0, "Average price must be positive"),
  voucherPrice: z.coerce.number().min(0, "Voucher price must be positive"),
  operationalCosts: z.coerce.number().min(0, "Operational costs must be positive"),
  vatRate: z.coerce.number().min(0).max(100).default(19),
});

type PricingFormData = z.infer<typeof pricingSchema>;

export default function PricingCalculator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResults, setCalculationResults] = useState<any>(null);

  const form = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      vatRate: 19,
    },
  });

  const scrapeHotelMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("/api/hotels/scrape", "POST", { url });
      return response.json();
    },
    onSuccess: (data) => {
      // Auto-fill form with scraped data
      if (data.name) form.setValue("hotelName", data.name);
      if (data.stars) form.setValue("stars", data.stars);
      if (data.roomCount) form.setValue("roomCount", data.roomCount);
      if (data.averagePrice) form.setValue("averagePrice", data.averagePrice);
      
      toast({
        title: "Hotel data scraped successfully",
        description: "Form has been auto-filled with available data",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to scrape hotel data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const savePricingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/pricing-calculations", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pricing calculation saved",
        description: "Your calculation has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-calculations"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to save calculation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScrapeHotelData = () => {
    const url = form.getValues("hotelUrl");
    if (url) {
      scrapeHotelMutation.mutate(url);
    } else {
      toast({
        title: "URL required",
        description: "Please enter a hotel URL first",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: PricingFormData) => {
    setIsCalculating(true);
    
    try {
      // Calculate pricing locally
      const results = calculatePricing(data);
      setCalculationResults(results);
      
      // Save to database
      const calculationData = {
        ...data,
        ...results,
      };
      
      await savePricingMutation.mutateAsync(calculationData);
    } catch (error) {
      toast({
        title: "Calculation failed",
        description: "Please check your inputs and try again",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveAsDraft = () => {
    const data = form.getValues();
    savePricingMutation.mutate({
      ...data,
      isDraft: true,
      vatAmount: 0,
      profitMargin: 0,
      totalPrice: 0,
    });
  };

  const handleClearForm = () => {
    form.reset();
    setCalculationResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            New Pricing
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Pricing Calculator Form */}
      <Card>
        <CardHeader>
          <CardTitle>Hotel Pricing Calculator</CardTitle>
          <CardDescription>
            Enter hotel details to calculate optimal pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Hotel Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="hotelUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Hotel URL
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enter the hotel's website URL for automatic data extraction</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://hotel-example.com"
                            className="pr-10"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="absolute right-2 top-2 h-6 w-6 p-0"
                          onClick={handleScrapeHotelData}
                          disabled={scrapeHotelMutation.isPending}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        We'll automatically extract hotel information from this URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hotelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Hotel Name *
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Hotel name will be auto-filled from URL or enter manually</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter hotel name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hotel Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="stars"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Star Rating
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Hotel star rating (1-5 stars)</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 Star</SelectItem>
                          <SelectItem value="2">2 Stars</SelectItem>
                          <SelectItem value="3">3 Stars</SelectItem>
                          <SelectItem value="4">4 Stars</SelectItem>
                          <SelectItem value="5">5 Stars</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roomCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Number of Rooms
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total number of available rooms in the hotel</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="e.g. 250" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupancyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Occupancy Rate (%)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Average occupancy rate for pricing calculations</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="e.g. 75" min="0" max="100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="averagePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Average Room Price (€) *
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Current average room price from booking platforms</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground">€</span>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0.00" step="0.01" className="pl-8" />
                        </FormControl>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-accent">●</span>
                        <span className="text-muted-foreground">Auto-updated from booking platforms</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="voucherPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Voucher Price (€) *
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Proposed voucher/discount price for customers</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground">€</span>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0.00" step="0.01" className="pl-8" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="operationalCosts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Operational Costs (€) *
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Estimated operational costs per room per night</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground">€</span>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0.00" step="0.01" className="pl-8" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* VAT Calculation */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h4 className="text-sm font-semibold mb-4">VAT Calculation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="vatRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          VAT Rate
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Select applicable VAT rate based on service type</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseFloat(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select VAT rate" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="7">7% (Accommodation)</SelectItem>
                            <SelectItem value="19">19% (Standard Rate)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      VAT Amount (€)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Calculated VAT amount based on voucher price</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-muted-foreground">€</span>
                      <Input
                        type="number"
                        className="pl-8 bg-muted"
                        readOnly
                        value={calculationResults?.vatAmount?.toFixed(2) || "0.00"}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto-calculated based on voucher price
                    </p>
                  </div>
                </div>
              </div>

              {/* Calculation Results */}
              {calculationResults && (
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 border border-primary/20">
                  <h4 className="text-lg font-semibold mb-4">Pricing Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">€{calculationResults.profitMargin.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Profit Margin</div>
                      <Badge variant="default" className="mt-1">
                        +{calculationResults.marginPercentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">€{calculationResults.totalPrice.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Price (incl. VAT)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">€{calculationResults.discountVsMarket.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Discount vs. Market</div>
                      <Badge variant="secondary" className="mt-1">
                        {calculationResults.discountPercentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
                <div className="flex items-center space-x-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearForm}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear Form
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSaveAsDraft}
                    disabled={savePricingMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </Button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button type="button" variant="outline">
                    Preview
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCalculating || savePricingMutation.isPending}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isCalculating ? "Calculating..." : "Calculate Pricing"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
