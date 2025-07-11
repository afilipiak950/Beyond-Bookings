import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Sparkles, 
  CheckCircle, 
  Clock,
  Star,
  MapPin,
  Users,
  Calendar,
  Calculator,
  Zap,
  ArrowRight,
  Loader2
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";

const customerRequestSchema = z.object({
  hotelName: z.string().min(2, "Hotel name is required"),
  hotelUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  contactPerson: z.string().min(2, "Contact person is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(5, "Phone number is required"),
  financingVolume: z.number().min(1000, "Minimum financing volume is €1,000"),
  projectDescription: z.string().min(10, "Please provide a brief project description"),
  expectedRoomCount: z.number().min(1, "Room count is required"),
  averageRoomPrice: z.number().min(10, "Average room price is required"),
  occupancyRate: z.number().min(10).max(100, "Occupancy rate must be between 10-100%"),
  urgency: z.enum(["low", "medium", "high"], { required_error: "Please select urgency level" }),
  additionalNotes: z.string().optional()
});

type CustomerRequestForm = z.infer<typeof customerRequestSchema>;

export default function CustomerRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [hotelData, setHotelData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);

  const form = useForm<CustomerRequestForm>({
    resolver: zodResolver(customerRequestSchema),
    defaultValues: {
      hotelName: "",
      hotelUrl: "",
      contactPerson: "",
      email: "",
      phone: "",
      financingVolume: 25000,
      projectDescription: "",
      expectedRoomCount: 50,
      averageRoomPrice: 100,
      occupancyRate: 70,
      urgency: "medium",
      additionalNotes: ""
    }
  });

  // Hotel data extraction mutation
  const hotelSearchMutation = useMutation({
    mutationFn: async ({ hotelName, hotelUrl }: { hotelName: string; hotelUrl?: string }) => {
      setIsSearching(true);
      setSearchProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSearchProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const response = await apiRequest('/api/scrape-hotel', 'POST', {
          name: hotelName,
          url: hotelUrl || `https://www.google.com/search?q=${encodeURIComponent(hotelName + " hotel")}`
        });
        
        clearInterval(progressInterval);
        setSearchProgress(100);
        return response;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      setHotelData(data);
      setIsSearching(false);
      
      // Auto-fill form fields if data is available
      if (data) {
        if (data.roomCount) form.setValue('expectedRoomCount', data.roomCount);
        if (data.averagePrice) form.setValue('averageRoomPrice', data.averagePrice);
        if (data.stars) {
          // Estimate occupancy based on star rating
          const estimatedOccupancy = Math.min(95, 50 + (data.stars * 8));
          form.setValue('occupancyRate', estimatedOccupancy);
        }
      }
      
      toast({
        title: "Hotel Daten erfolgreich extrahiert",
        description: "Formularfelder wurden automatisch ausgefüllt basierend auf den gefundenen Daten.",
      });
      
      setCurrentStep(2);
    },
    onError: (error) => {
      setIsSearching(false);
      setSearchProgress(0);
      console.error('Hotel search error:', error);
      toast({
        title: "Fehler bei der Hotel-Suche",
        description: "Bitte versuchen Sie es erneut oder füllen Sie die Felder manuell aus.",
        variant: "destructive",
      });
    }
  });

  // Customer request submission mutation
  const submitRequestMutation = useMutation({
    mutationFn: async (data: CustomerRequestForm) => {
      setIsSubmitting(true);
      setSubmissionProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSubmissionProgress(prev => Math.min(prev + 8, 90));
      }, 150);

      try {
        // Create a pricing calculation with the customer request data
        const calculationData = {
          hotelName: data.hotelName,
          hotelUrl: data.hotelUrl,
          stars: hotelData?.stars || 3,
          roomCount: data.expectedRoomCount,
          averagePrice: data.averageRoomPrice,
          occupancyRate: data.occupancyRate,
          voucherPrice: data.averageRoomPrice * 0.6, // 60% of average price
          operationalCosts: data.averageRoomPrice * 0.3, // 30% operational costs
          vatRate: 19, // 19% VAT
          vatAmount: (data.averageRoomPrice * 0.6) * 0.19, // VAT calculation
          profitMargin: (data.averageRoomPrice * 0.6) * 0.1, // 10% profit margin
          totalPrice: (data.averageRoomPrice * 0.6) * 1.29, // Total with VAT and profit
          financingVolume: data.financingVolume,
          contactPerson: data.contactPerson,
          contactEmail: data.email,
          contactPhone: data.phone,
          projectDescription: data.projectDescription,
          urgency: data.urgency,
          additionalNotes: data.additionalNotes,
          status: 'submitted',
          requestType: 'customer_financing',
          isDraft: false
        };

        const response = await apiRequest('/api/pricing-calculations', 'POST', calculationData);
        
        clearInterval(progressInterval);
        setSubmissionProgress(100);
        return response;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-calculations'] });
      
      toast({
        title: "Anfrage erfolgreich eingereicht",
        description: "Ihre Finanzierungsanfrage wurde erstellt und wird in Kürze bearbeitet.",
      });
      
      setCurrentStep(3);
    },
    onError: (error) => {
      setIsSubmitting(false);
      setSubmissionProgress(0);
      console.error('Submission error:', error);
      toast({
        title: "Fehler beim Einreichen",
        description: "Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.",
        variant: "destructive",
      });
    }
  });

  const handleHotelSearch = () => {
    const hotelName = form.getValues('hotelName');
    const hotelUrl = form.getValues('hotelUrl');
    
    if (!hotelName.trim()) {
      toast({
        title: "Hotel Name fehlt",
        description: "Bitte geben Sie einen Hotel Namen ein.",
        variant: "destructive",
      });
      return;
    }
    
    hotelSearchMutation.mutate({ hotelName, hotelUrl });
  };

  const onSubmit = (data: CustomerRequestForm) => {
    submitRequestMutation.mutate(data);
  };

  const urgencyColors = {
    low: "bg-green-100 text-green-800 border-green-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    high: "bg-red-100 text-red-800 border-red-300"
  };

  const urgencyLabels = {
    low: "Niedrig",
    medium: "Mittel", 
    high: "Hoch"
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Hotel Finanzierung Anfrage
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Erstellen Sie eine maßgeschneiderte Finanzierungslösung für Ihr Hotel
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[
                { step: 1, label: "Hotel Daten", icon: Building2 },
                { step: 2, label: "Finanzierung", icon: DollarSign },
                { step: 3, label: "Bestätigung", icon: CheckCircle }
              ].map((item, index) => (
                <div key={item.step} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                    ${currentStep >= item.step 
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-transparent text-white shadow-lg' 
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                    }
                  `}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= item.step ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  }`}>
                    {item.label}
                  </span>
                  {index < 2 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Hotel Information */}
              {currentStep === 1 && (
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 shadow-xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Building2 className="h-6 w-6 text-blue-600" />
                      Hotel Informationen
                    </CardTitle>
                    <CardDescription className="text-base">
                      Geben Sie Ihren Hotel Namen ein und wir extrahieren automatisch relevante Daten
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="hotelName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Hotel Name *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="z.B. Hotel Excelsior München"
                                className="h-12 text-base bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </FormControl>
                            <FormDescription>
                              Der vollständige Name Ihres Hotels
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hotelUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Hotel Website (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="https://www.ihr-hotel.de"
                                className="h-12 text-base bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </FormControl>
                            <FormDescription>
                              Für genauere Datenextraktion
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Hotel Search Button */}
                    <div className="flex justify-center pt-4">
                      <Button
                        type="button"
                        onClick={handleHotelSearch}
                        disabled={isSearching}
                        className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg transition-all duration-300 transform hover:scale-105"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analysiere Hotel Daten...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-5 w-5" />
                            Hotel Daten Extrahieren
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Search Progress */}
                    {isSearching && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Suche nach Hotel Daten...</span>
                          <span>{searchProgress}%</span>
                        </div>
                        <Progress value={searchProgress} className="h-2" />
                      </div>
                    )}

                    {/* Hotel Data Display */}
                    {hotelData && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800 dark:text-green-200">
                            Hotel Daten erfolgreich extrahiert
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {hotelData.stars && (
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{hotelData.stars} Sterne</span>
                            </div>
                          )}
                          {hotelData.roomCount && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{hotelData.roomCount} Zimmer</span>
                            </div>
                          )}
                          {hotelData.averagePrice && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span className="text-sm">~€{hotelData.averagePrice}/Nacht</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Financing Details */}
              {currentStep === 2 && (
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 shadow-xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <DollarSign className="h-6 w-6 text-green-600" />
                      Finanzierungsdetails
                    </CardTitle>
                    <CardDescription className="text-base">
                      Geben Sie Ihre Finanzierungsanforderungen und Kontaktdaten ein
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Kontaktdaten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="contactPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ansprechpartner *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Max Mustermann"
                                  className="h-11 bg-white/80 dark:bg-gray-700/80"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-Mail *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="email"
                                  placeholder="max@hotel.de"
                                  className="h-11 bg-white/80 dark:bg-gray-700/80"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefon *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="+49 123 456 7890"
                                  className="h-11 bg-white/80 dark:bg-gray-700/80"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Financing Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Finanzierungsanfrage</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="financingVolume"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Finanzierungsvolumen (€) *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="1000"
                                  step="1000"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  className="h-11 bg-white/80 dark:bg-gray-700/80"
                                />
                              </FormControl>
                              <FormDescription>
                                Gewünschter Finanzierungsbetrag
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="urgency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dringlichkeit *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11 bg-white/80 dark:bg-gray-700/80">
                                    <SelectValue placeholder="Wählen Sie die Dringlichkeit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Niedrig</SelectItem>
                                  <SelectItem value="medium">Mittel</SelectItem>
                                  <SelectItem value="high">Hoch</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Hotel Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Hotel Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="expectedRoomCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Anzahl Zimmer *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="1"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  className="h-11 bg-white/80 dark:bg-gray-700/80"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="averageRoomPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Durchschnittspreis/Nacht (€) *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="10"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  className="h-11 bg-white/80 dark:bg-gray-700/80"
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
                              <FormLabel>Auslastung (%) *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="10"
                                  max="100"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  className="h-11 bg-white/80 dark:bg-gray-700/80"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Project Description */}
                    <FormField
                      control={form.control}
                      name="projectDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Projektbeschreibung *</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Beschreiben Sie Ihr Finanzierungsprojekt..."
                              className="min-h-[100px] bg-white/80 dark:bg-gray-700/80"
                            />
                          </FormControl>
                          <FormDescription>
                            Erläutern Sie wofür die Finanzierung benötigt wird
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="additionalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zusätzliche Anmerkungen</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Weitere Informationen oder spezielle Anforderungen..."
                              className="min-h-[80px] bg-white/80 dark:bg-gray-700/80"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="h-11 px-6"
                      >
                        Zurück
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-11 px-8 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium shadow-lg transition-all duration-300 transform hover:scale-105"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Erstelle Anfrage...
                          </>
                        ) : (
                          <>
                            <Calculator className="mr-2 h-5 w-5" />
                            Finanzierungsanfrage Erstellen
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Submission Progress */}
                    {isSubmitting && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Erstelle Finanzierungsanfrage...</span>
                          <span>{submissionProgress}%</span>
                        </div>
                        <Progress value={submissionProgress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === 3 && (
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 shadow-xl">
                  <CardContent className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full mb-6 shadow-lg">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                      Anfrage erfolgreich eingereicht!
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                      Ihre Finanzierungsanfrage wurde erstellt und wird in Kürze von unserem Team bearbeitet.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button
                        onClick={() => {
                          setCurrentStep(1);
                          form.reset();
                          setHotelData(null);
                        }}
                        variant="outline"
                        className="h-11 px-6"
                      >
                        Neue Anfrage erstellen
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/pricing-calculator'}
                        className="h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        Zu Berechnungen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>
          </Form>
        </div>
      </div>
    </AppLayout>
  );
}