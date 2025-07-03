import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calculator, Globe, Star, Building2, Users, Euro, ChevronRight, Sparkles } from "lucide-react";
import type { WorkflowData } from "@/pages/workflow";
import { calculatePricing } from "@/lib/pricing";

const pricingSchema = z.object({
  hotelName: z.string().min(1, "Hotel name is required"),
  hotelUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  stars: z.number().min(1).max(5),
  roomCount: z.number().min(1, "Room count must be at least 1"),
  occupancyRate: z.number().min(0).max(100),
  averagePrice: z.number().min(0, "Average price must be positive"),
  voucherPrice: z.number().min(0, "Voucher price must be positive"),
  operationalCosts: z.number().min(0, "Operational costs must be positive"),
  vatRate: z.number().min(0).max(100)
});

type PricingFormData = z.infer<typeof pricingSchema>;

interface Props {
  data: WorkflowData;
  onUpdate: (data: Partial<WorkflowData>) => void;
  onNext: () => void;
}

export default function PricingCalculatorStep({ data, onUpdate, onNext }: Props) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(Boolean(data.calculationResult));

  const form = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      hotelName: data.hotelName || "",
      hotelUrl: data.hotelUrl || "",
      stars: data.stars || 3,
      roomCount: data.roomCount || 50,
      occupancyRate: data.occupancyRate || 75,
      averagePrice: data.averagePrice || 120,
      voucherPrice: data.voucherPrice || 100,
      operationalCosts: data.operationalCosts || 25,
      vatRate: data.vatRate || 19
    }
  });

  const watchedValues = form.watch();

  const onSubmit = async (formData: PricingFormData) => {
    setIsCalculating(true);
    
    try {
      // Simulate calculation delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const calculationResult = calculatePricing({
        averagePrice: formData.averagePrice,
        voucherPrice: formData.voucherPrice,
        operationalCosts: formData.operationalCosts,
        vatRate: formData.vatRate
      });

      onUpdate({
        ...formData,
        calculationResult
      });

      setShowResults(true);
    } catch (error) {
      console.error("Calculation error:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleContinue = () => {
    if (data.calculationResult) {
      onNext();
    }
  };

  const handleUrlScrape = async () => {
    if (watchedValues.hotelUrl) {
      // Simulate URL scraping
      const mockData = {
        hotelName: "Grand Hotel Example",
        stars: 4,
        roomCount: 120,
        averagePrice: 150
      };
      
      form.setValue("hotelName", mockData.hotelName);
      form.setValue("stars", mockData.stars);
      form.setValue("roomCount", mockData.roomCount);
      form.setValue("averagePrice", mockData.averagePrice);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Calculator className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Hotel Pricing Calculator</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Enter your hotel details and pricing information to calculate VAT, profit margins, and optimal pricing strategy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2">
          <Card className="glass-card border-blue-200/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Hotel Information
              </CardTitle>
              <CardDescription>
                Enter basic hotel details and pricing data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Hotel Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hotelName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hotel Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter hotel name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hotelUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hotel URL (Optional)</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="https://booking.com/hotel..." {...field} />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleUrlScrape}
                              disabled={!watchedValues.hotelUrl}
                            >
                              <Globe className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="stars"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Star Rating</FormLabel>
                          <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select stars" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(star => (
                                <SelectItem key={star} value={star.toString()}>
                                  <div className="flex items-center gap-2">
                                    {Array.from({ length: star }).map((_, i) => (
                                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                  </div>
                                </SelectItem>
                              ))}
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
                          <FormLabel>Room Count</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
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
                          <FormLabel>Occupancy Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="75"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Pricing Information */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Euro className="h-5 w-5 text-green-600" />
                      Pricing Details
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="averagePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Average Market Price (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="120.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="voucherPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Voucher Price (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="100.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="operationalCosts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operational Costs (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="25.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vatRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VAT Rate (%)</FormLabel>
                            <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select VAT rate" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="7">7% (Tourism)</SelectItem>
                                <SelectItem value="19">19% (Standard)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isCalculating}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isCalculating ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate Pricing
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {showResults && data.calculationResult ? (
            <Card className="glass-card border-green-200/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Calculator className="h-5 w-5" />
                  Calculation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">Total Price (incl. VAT)</span>
                    <span className="text-lg font-bold text-blue-900">
                      €{data.calculationResult.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-700">Profit Margin</span>
                    <span className="text-lg font-bold text-green-900">
                      €{data.calculationResult.profitMargin.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-700">VAT Amount</span>
                    <span className="text-lg font-bold text-purple-900">
                      €{data.calculationResult.vatAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Margin Percentage</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {data.calculationResult.marginPercentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Market Discount</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {data.calculationResult.discountPercentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleContinue} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Continue to Price Comparison
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card border-gray-200/30">
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Complete the form to see calculation results</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}