import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Calculator, BarChart3, FileText, Check, ArrowLeft, Edit3, Brain, Gift } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "@/components/layout/app-layout";

// Import step components - temporarily creating inline to fix imports
// import PricingCalculatorStep from "@/components/workflow/pricing-calculator-step";
// import PriceComparisonStep from "@/components/workflow/price-comparison-step";
// import PdfGenerationStep from "@/components/workflow/pdf-generation-step";

export interface WorkflowData {
  // Step 1: Hotel Pricing Calculator
  date?: string;
  hotelName: string;
  stars: number;
  roomCount: number;
  occupancyRate: number;
  averagePrice: number;
  projectCosts: number;
  hotelVoucherValue: number;
  calculationResult?: {
    vatAmount: number;
    profitMargin: number;
    totalPrice: number;
    discountVsMarket: number;
    marginPercentage: number;
    discountPercentage: number;
  };
  
  // Step 2: Price Comparison
  competitorData?: Array<{
    name: string;
    price: number;
    stars: number;
    rating: number;
  }>;
  marketAnalysis?: {
    averageMarketPrice: number;
    positionRanking: number;
    recommendedPrice: number;
  };
  
  // Step 3: PDF Generation
  pdfOptions?: {
    includeCharts: boolean;
    includeBranding: boolean;
    includeComparison: boolean;
    template: 'standard' | 'detailed' | 'executive';
  };
}

const steps = [
  {
    id: 1,
    title: "Hotel Pricing Calculator",
    description: "Enter hotel details and calculate pricing with VAT",
    icon: Calculator,
    color: "blue"
  },
  {
    id: 2,
    title: "Price Comparison",
    description: "Compare with market rates and competitors",
    icon: BarChart3,
    color: "green"
  },
  {
    id: 3,
    title: "Generate PDF Report",
    description: "Create professional pricing report",
    icon: FileText,
    color: "purple"
  }
];

export default function Workflow() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    date: new Date().toISOString().split('T')[0], // Default to today's date
    hotelName: "",
    stars: 0,
    roomCount: 0,
    occupancyRate: 70,
    averagePrice: 0,
    projectCosts: 0,
    hotelVoucherValue: 0
  });

  // AI Price Intelligence State
  const [aiSuggestedPrice, setAiSuggestedPrice] = useState(0);
  const [actualPrice, setActualPrice] = useState(0);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [editFeedback, setEditFeedback] = useState("");
  const [tempPrice, setTempPrice] = useState("");

  // Hotel Voucher Value State
  const [hotelVoucherValue, setHotelVoucherValue] = useState(0);
  const [isVoucherManualEdit, setIsVoucherManualEdit] = useState(false);
  const [voucherEditOpen, setVoucherEditOpen] = useState(false);
  const [tempVoucherValue, setTempVoucherValue] = useState("");
  const [voucherEditFeedback, setVoucherEditFeedback] = useState("");

  // Calculate AI suggested price (56% of average price, rounded up)
  useEffect(() => {
    if (workflowData.averagePrice > 0) {
      const suggested = Math.ceil(workflowData.averagePrice * 0.56);
      setAiSuggestedPrice(suggested);
      if (!isManualEdit) {
        setActualPrice(suggested);
      }
    }
  }, [workflowData.averagePrice, isManualEdit]);

  // Calculate hotel voucher value based on star rating
  useEffect(() => {
    if (workflowData.averagePrice > 0 && workflowData.stars > 0) {
      let voucherValue = 0;
      
      // Calculate based on star rating according to the assumptions table
      switch (workflowData.stars) {
        case 1:
          voucherValue = 15.00;
          break;
        case 2:
          voucherValue = 20.00;
          break;
        case 3:
          voucherValue = 30.00;
          break;
        case 4:
          voucherValue = 35.00;
          break;
        case 5:
          voucherValue = 45.00;
          break;
        default:
          // For 0 stars or unknown, use 65% of average price as fallback
          voucherValue = workflowData.averagePrice * 0.65;
      }
      
      if (!isVoucherManualEdit) {
        setHotelVoucherValue(voucherValue);
      }
    }
  }, [workflowData.averagePrice, workflowData.stars, isVoucherManualEdit]);

  // Handle manual price edit
  const handleManualEdit = () => {
    setTempPrice(actualPrice.toString());
    setEditFeedback("");
    setManualEditOpen(true);
  };

  // Save manual edit with feedback
  const saveManualEdit = async () => {
    const newPrice = parseFloat(tempPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert("Bitte geben Sie einen gültigen Preis ein.");
      return;
    }
    
    if (!editFeedback.trim()) {
      alert("Bitte geben Sie eine Begründung für die Änderung ein. Dies hilft der KI beim Lernen.");
      return;
    }

    setActualPrice(newPrice);
    setIsManualEdit(true);
    setManualEditOpen(false);

    // TODO: Send to AI learning API
    console.log("Manual edit recorded:", {
      hotel: workflowData.hotelName,
      aiSuggested: aiSuggestedPrice,
      userPrice: newPrice,
      feedback: editFeedback
    });
  };

  // Handle voucher manual edit
  const handleVoucherManualEdit = () => {
    setTempVoucherValue(hotelVoucherValue.toString());
    setVoucherEditFeedback("");
    setVoucherEditOpen(true);
  };

  // Save voucher manual edit with feedback
  const saveVoucherManualEdit = async () => {
    const newVoucherValue = parseFloat(tempVoucherValue);
    if (isNaN(newVoucherValue) || newVoucherValue <= 0) {
      alert("Bitte geben Sie einen gültigen Gutscheinwert ein.");
      return;
    }
    
    if (!voucherEditFeedback.trim()) {
      alert("Bitte geben Sie eine Begründung für die Änderung ein. Dies hilft bei der Verbesserung der Berechnungen.");
      return;
    }

    setHotelVoucherValue(newVoucherValue);
    setIsVoucherManualEdit(true);
    setVoucherEditOpen(false);

    console.log("Voucher manual edit recorded:", {
      hotel: workflowData.hotelName,
      stars: workflowData.stars,
      originalValue: hotelVoucherValue,
      newValue: newVoucherValue,
      feedback: voucherEditFeedback
    });
  };

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const updateWorkflowData = (data: Partial<WorkflowData>) => {
    setWorkflowData(prev => ({ ...prev, ...data }));
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= steps.length) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return Boolean(workflowData.hotelName && workflowData.averagePrice > 0);
      case 3:
        return Boolean(workflowData.calculationResult && workflowData.marketAnalysis);
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="grid grid-cols-2 gap-8">
              {/* Left Side - Input Form */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    Hotel-Preiskalkulator
                </CardTitle>
                <CardDescription>
                  Geben Sie alle erforderlichen Details für die Preisberechnung ein
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Datum</label>
                  <input 
                    type="date"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={workflowData.date || ''}
                    onChange={(e) => updateWorkflowData({ date: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Hotelname</label>
                  <input 
                    type="text"
                    placeholder="z.B. Hampton by Hilton Potsdam"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={workflowData.hotelName}
                    onChange={(e) => updateWorkflowData({ hotelName: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Kategorie</label>
                  <select 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={workflowData.stars}
                    onChange={(e) => updateWorkflowData({ stars: parseInt(e.target.value) })}
                  >
                    <option value={0}>Kategorie wählen</option>
                    <option value={1}>1 Stern</option>
                    <option value={2}>2 Sterne</option>
                    <option value={3}>3 Sterne</option>
                    <option value={4}>4 Sterne</option>
                    <option value={5}>5 Sterne</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Zimmeranzahl</label>
                  <input 
                    type="number"
                    placeholder="z.B. 180"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={workflowData.roomCount}
                    onChange={(e) => updateWorkflowData({ roomCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Auslastung in %</label>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="z.B. 75,5"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={workflowData.occupancyRate}
                    onChange={(e) => updateWorkflowData({ occupancyRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Verfügbare Roomnights</label>
                  <input 
                    type="number"
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={Math.floor(workflowData.roomCount * 365 * (1 - workflowData.occupancyRate / 100))}
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Adressierbare Roomnights (15%, max. 1.000)</label>
                  <input 
                    type="number"
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={Math.min(Math.floor(workflowData.roomCount * 365 * (1 - workflowData.occupancyRate / 100)) * 0.15, 1000)}
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Durchschnittlicher Zimmerpreis (Google-Recherche)</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="z.B. 120,00"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={workflowData.averagePrice}
                    onChange={(e) => updateWorkflowData({ averagePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <Button 
                  onClick={() => {
                    nextStep();
                  }}
                  disabled={!workflowData.hotelName || workflowData.averagePrice <= 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 mt-6"
                >
                  Weiter zur Preisvergleichsanalyse
                </Button>
              </CardContent>
            </Card>

            {/* Right Side - Live Calculation Results */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Live-Berechnungsergebnisse
                </CardTitle>
                <CardDescription>
                  Echtzeitberechnungen und Analyse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {/* Floating Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-float"></div>
                  <div className="absolute bottom-20 right-20 w-24 h-24 bg-green-500/10 rounded-full blur-lg animate-float-delayed"></div>
                  <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-purple-500/10 rounded-full blur-md animate-pulse"></div>
                </div>

                {/* Calculation Results - Ultra Modern Glassmorphism */}
                <div className="relative space-y-3">
                  {/* AI-Powered Realistic Price - Hero Section with Advanced Effects */}
                  <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/40 to-blue-50/30 backdrop-blur-xl border border-white/20 shadow-xl transition-all duration-500">
                    {/* Animated Background Layers */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-green-500/10 animate-gradient-x"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent group-hover:via-white/10 transition-all duration-500"></div>
                    
                    {/* Floating Particles */}
                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-60"></div>
                    <div className="absolute bottom-3 left-3 w-2 h-2 bg-green-400 rounded-full animate-ping animation-delay-1000 opacity-80"></div>
                    <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-500 opacity-70"></div>
                    
                    <div className="relative p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse shadow-lg shadow-blue-500/50"></div>
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue-400 animate-ping opacity-40"></div>
                          </div>
                          <span className="font-bold text-sm bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                            Realistischer Hotelverkaufspreis (KI)
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          {isManualEdit ? (
                            <span className="text-sm bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 px-4 py-2 rounded-full font-semibold flex items-center space-x-2 shadow-lg shadow-orange-200/50 border border-orange-200/30 backdrop-blur-sm animate-bounce-gentle">
                              <Edit3 className="h-4 w-4 animate-pulse" />
                              <span>Manuell</span>
                            </span>
                          ) : (
                            <span className="text-sm bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 px-4 py-2 rounded-full font-semibold shadow-lg shadow-green-200/50 border border-green-200/30 backdrop-blur-sm animate-pulse">
                              KI: 56%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="relative">
                          <span className="text-lg font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent tracking-tight animate-text-shimmer bg-300% bg-size-200">
                            {actualPrice ? `${actualPrice.toFixed(2)} €` : '0.00 €'}
                          </span>
                          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-sm -z-10 animate-pulse"></div>
                        </div>
                        <Dialog open={manualEditOpen} onOpenChange={setManualEditOpen}>
                          <DialogTrigger asChild>
                            <button 
                              onClick={handleManualEdit}
                              className="group relative overflow-hidden px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-300/30 rounded-full text-sm font-medium text-blue-700 hover:text-white transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                              <div className="relative flex items-center space-x-2">
                                <Edit3 className="h-4 w-4 group-hover:animate-spin transition-transform duration-300" />
                                <span>Manuell bearbeiten</span>
                              </div>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <Brain className="h-5 w-5 text-blue-600" />
                                <span>KI-Preis manuell anpassen</span>
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                                <p className="text-sm text-blue-800">
                                  <strong>KI-Vorschlag:</strong> {aiSuggestedPrice.toFixed(2)} € (56% von {workflowData.averagePrice.toFixed(2)} €)
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Ihre Anpassung hilft der KI beim Lernen und verbessert zukünftige Vorschläge.
                                </p>
                              </div>
                              
                              <div>
                                <Label htmlFor="manual-price">Ihr realistischer Verkaufspreis</Label>
                                <Input
                                  id="manual-price"
                                  type="number"
                                  step="0.01"
                                  value={tempPrice}
                                  onChange={(e) => setTempPrice(e.target.value)}
                                  placeholder="Preis in Euro"
                                  className="mt-1"
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="edit-feedback">Begründung für die Änderung *</Label>
                                <Textarea
                                  id="edit-feedback"
                                  value={editFeedback}
                                  onChange={(e) => setEditFeedback(e.target.value)}
                                  placeholder="Warum ändern Sie den Preis? Z.B. 'Lage ist besonders attraktiv', 'Hotel hat Premium-Ausstattung', 'Markt ist sehr umkämpft'..."
                                  className="mt-1"
                                  rows={3}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  * Erforderlich für das KI-Lernsystem
                                </p>
                              </div>
                              
                              <div className="flex justify-end space-x-2 pt-4">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setManualEditOpen(false)}
                                >
                                  Abbrechen
                                </Button>
                                <Button onClick={saveManualEdit} className="bg-blue-600 hover:bg-blue-700">
                                  Speichern & KI trainieren
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {workflowData.averagePrice && (
                        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-purple-50/60 backdrop-blur-md border border-blue-200/40 rounded-2xl p-4 mt-4 shadow-inner animate-fade-in">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient-x"></div>
                          <div className="flex items-start space-x-3">
                            <div className="mt-1">
                              <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
                            </div>
                            <div className="flex-1">
                              <span className="font-semibold text-blue-800 text-sm">KI-Begründung:</span>
                              <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                                {isManualEdit ? (
                                  <>Manuell angepasst von <span className="font-bold text-blue-800">{aiSuggestedPrice.toFixed(2)} €</span> auf <span className="font-bold text-green-600">{actualPrice.toFixed(2)} €</span>. Die KI lernt aus Ihrer Korrektur für ähnliche {workflowData.stars}-Sterne Hotels.</>
                                ) : (
                                  <>Basierend auf <span className="font-bold text-blue-800">56%</span> des Durchschnittspreises für <span className="font-semibold">{workflowData.stars}-Sterne Hotels</span> mit <span className="font-semibold">{workflowData.roomCount} Zimmern</span> und <span className="font-semibold">{workflowData.occupancyRate}% Auslastung</span>. Selbstlernende KI passt sich an Ihre Korrekturen an.</>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Secondary Calculations - Floating Cards Grid */}
                  <div className="grid gap-3 mt-4">
                    {/* 65% Calculation - Floating Card */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/50 to-gray-50/30 backdrop-blur-xl border border-white/30 shadow-lg transition-all duration-300 h-16">
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-400/5 via-transparent to-gray-500/5 animate-gradient-x"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-gray-400 rounded-full animate-ping opacity-40"></div>
                      <div className="relative p-4 flex justify-between items-center h-full">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 animate-pulse shadow-md shadow-gray-400/30 flex-shrink-0"></div>
                          <span className="text-sm font-bold bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent break-words">
                            65% des durchschnittlichen Zimmerpreises
                          </span>
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent">
                          {workflowData.averagePrice ? (workflowData.averagePrice * 0.65).toFixed(2) : '0.00'} €
                        </span>
                      </div>
                    </div>
                    
                    {/* Hotel Voucher - Dynamic Star-Based Card with Manual Edit */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50/40 to-rose-100/30 backdrop-blur-xl border border-red-200/40 shadow-lg transition-all duration-300 h-16">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-transparent to-rose-500/10 animate-gradient-x"></div>
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-rose-500 animate-pulse"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full animate-ping opacity-60"></div>
                      <div className="relative p-4 h-full">
                        <div className="flex justify-between items-center h-full">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-rose-500 animate-pulse shadow-lg shadow-red-500/40 flex-shrink-0"></div>
                            <span className="text-sm font-bold bg-gradient-to-r from-red-700 to-red-600 bg-clip-text text-transparent break-words">
                              Gutscheinwert für Hotel
                            </span>
                            {isVoucherManualEdit && (
                              <span className="text-xs bg-gradient-to-r from-orange-100 to-orange-50 text-orange-600 px-2 py-1 rounded-full font-semibold border border-orange-200/30 flex-shrink-0">
                                Manuell
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-black bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                              {hotelVoucherValue ? hotelVoucherValue.toFixed(2) : '0.00'} €
                            </span>
                            <Dialog open={voucherEditOpen} onOpenChange={setVoucherEditOpen}>
                              <DialogTrigger asChild>
                                <button 
                                  onClick={handleVoucherManualEdit}
                                  className="group relative overflow-hidden p-1 bg-red-500/10 backdrop-blur-sm border border-red-300/30 rounded-full text-xs text-red-700 hover:text-white transition-all duration-300 hover:scale-105"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <Edit3 className="h-3 w-3 relative" />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center space-x-2">
                                    <Gift className="h-5 w-5 text-red-600" />
                                    <span>Gutscheinwert anpassen</span>
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                                    <p className="text-sm text-red-800">
                                      <strong>Standard für {workflowData.stars}-Sterne Hotels:</strong> {
                                        workflowData.stars === 1 ? '15,00 €' :
                                        workflowData.stars === 2 ? '20,00 €' :
                                        workflowData.stars === 3 ? '30,00 €' :
                                        workflowData.stars === 4 ? '35,00 €' :
                                        workflowData.stars === 5 ? '45,00 €' :
                                        'Individuell'
                                      }
                                    </p>
                                    <p className="text-xs text-red-600 mt-1">
                                      Anpassungen helfen bei der Verbesserung der Berechnungen.
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="voucher-value">Angepasster Gutscheinwert</Label>
                                    <Input
                                      id="voucher-value"
                                      type="number"
                                      step="0.01"
                                      value={tempVoucherValue}
                                      onChange={(e) => setTempVoucherValue(e.target.value)}
                                      placeholder="Gutscheinwert in Euro"
                                      className="mt-1"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="voucher-feedback">Begründung für die Anpassung *</Label>
                                    <Textarea
                                      id="voucher-feedback"
                                      value={voucherEditFeedback}
                                      onChange={(e) => setVoucherEditFeedback(e.target.value)}
                                      placeholder="Warum ändern Sie den Gutscheinwert? Z.B. 'Hotel ist sehr luxuriös', 'Konkurrenzsituation', 'Besondere Ausstattung'..."
                                      className="mt-1"
                                      rows={3}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      * Erforderlich für bessere Berechnungen
                                    </p>
                                  </div>
                                  
                                  <div className="flex justify-end space-x-2 pt-4">
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setVoucherEditOpen(false)}
                                    >
                                      Abbrechen
                                    </Button>
                                    <Button onClick={saveVoucherManualEdit} className="bg-red-600 hover:bg-red-700">
                                      Speichern
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        
                        {workflowData.stars > 0 && (
                          <div className="mt-2 text-xs text-red-600">
                            {isVoucherManualEdit ? (
                              `Manuell angepasst für ${workflowData.stars}-Sterne Hotel`
                            ) : (
                              `Basierend auf ${workflowData.stars}-Sterne Hotel Annahmen`
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Profit Margin - Animated Success Card */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50/40 to-green-100/30 backdrop-blur-xl border border-green-200/40 shadow-lg transition-all duration-300 h-16">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-transparent to-emerald-500/10 animate-gradient-x"></div>
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-60"></div>
                      <div className="relative p-4 flex justify-between items-center h-full">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse shadow-lg shadow-green-500/40 flex-shrink-0"></div>
                          <span className="text-sm font-bold bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent break-words">
                            Marge nach Steuern
                          </span>
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          {workflowData.averagePrice ? `${((workflowData.averagePrice - (workflowData.averagePrice * 0.65)) / workflowData.averagePrice * 100).toFixed(0)}%` : '0%'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tripz Payment - Ultra Modern Card */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50/40 to-purple-100/30 backdrop-blur-xl border border-indigo-200/40 shadow-lg transition-all duration-300 h-16">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 via-transparent to-purple-500/10 animate-gradient-x"></div>
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full animate-ping opacity-60"></div>
                      <div className="relative p-4 flex justify-between items-center h-full">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse shadow-lg shadow-indigo-500/40 flex-shrink-0"></div>
                          <span className="text-sm font-bold bg-gradient-to-r from-indigo-700 to-indigo-600 bg-clip-text text-transparent break-words">
                            Zahlung von Tripz Estimate
                          </span>
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {actualPrice ? (actualPrice * 0.75).toFixed(2) + ' €' : '0.00 €'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Contract Volume - Ultra Modern Blue Card */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-50/40 to-blue-100/30 backdrop-blur-xl border border-cyan-200/40 shadow-lg transition-all duration-300 h-16">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-blue-500/10 animate-gradient-x"></div>
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-60"></div>
                      <div className="relative p-4 flex justify-between items-center h-full">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse shadow-lg shadow-cyan-500/40 flex-shrink-0"></div>
                          <span className="text-sm font-bold bg-gradient-to-r from-cyan-700 to-cyan-600 bg-clip-text text-transparent break-words">
                            Vertragsvolumen Estimate
                          </span>
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                          {workflowData.projectCosts && hotelVoucherValue && actualPrice ? 
                            ((workflowData.projectCosts / hotelVoucherValue) * (actualPrice * 0.75) * 1.1).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €' : 
                            '0.00 €'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Project Costs - Manual Input Section */}
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50/50 to-red-100/40 backdrop-blur-xl border border-rose-300/50 p-4 shadow-lg transition-all duration-300">
                    {/* Multiple animated layers */}
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-400/15 via-red-500/10 to-rose-400/15 animate-gradient-x"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all duration-500"></div>
                    
                    {/* Enhanced floating particles */}
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping opacity-60"></div>
                    <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-red-400 animate-bounce opacity-50"></div>
                    <div className="absolute top-1/2 left-1/3 w-2 h-2 rounded-full bg-rose-300 animate-ping animation-delay-1000 opacity-40"></div>
                    
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 animate-pulse shadow-xl shadow-rose-500/60"></div>
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-rose-400 animate-ping opacity-30"></div>
                          </div>
                          <span className="text-sm font-black bg-gradient-to-r from-rose-800 to-red-700 bg-clip-text text-transparent">
                            Finanzierung: Projektkosten brutto
                          </span>
                        </div>
                        <div className="relative w-48">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Projektkosten eingeben..."
                            value={workflowData.projectCosts || ''}
                            onChange={(e) => setWorkflowData({...workflowData, projectCosts: parseFloat(e.target.value) || 0})}
                            className="bg-white/60 backdrop-blur-sm border-rose-300/50 focus:border-rose-500 focus:ring-rose-500/20 text-right font-bold"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-rose-600 font-bold">€</div>
                        </div>
                      </div>
                    </div>
                  </div>


                </div>

                {/* Summary - Ultra-Modern Glass Card with Advanced Effects */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50/40 to-blue-50/30 backdrop-blur-xl border border-slate-300/30 p-4 shadow-lg transition-all duration-300 mt-4">
                  {/* Animated Background Layers */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/8 via-green-500/8 to-purple-500/8 animate-gradient-x"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent group-hover:via-white/15 transition-all duration-500"></div>
                  
                  {/* Floating Elements */}
                  <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-50"></div>
                  <div className="absolute bottom-2 left-2 w-2 h-2 bg-green-400 rounded-full animate-bounce opacity-60"></div>
                  <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-pulse opacity-40"></div>
                  
                  <div className="relative">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 via-green-500 to-purple-500 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-500">
                        </div>
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue-400 animate-ping opacity-20"></div>
                      </div>
                      <h4 className="font-black text-lg bg-gradient-to-r from-slate-800 via-blue-700 to-slate-800 bg-clip-text text-transparent animate-text-shimmer bg-size-200">
                        Live-Zusammenfassung
                      </h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-base font-medium">
                      {workflowData.hotelName && workflowData.averagePrice > 0 ? 
                        `${workflowData.hotelName} mit ${workflowData.roomCount} Zimmern bereit für detaillierte Preisvergleichsanalyse.` :
                        "Geben Sie Hoteldaten ein, um die Live-Berechnung zu starten."
                      }
                    </p>
                    {workflowData.hotelName && workflowData.averagePrice > 0 && (
                      <div className="mt-3 flex items-center space-x-2">
                        <div className="relative">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
                          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-40"></div>
                        </div>
                        <span className="text-xs bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
                          Bereit für Analyse
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Output Calculation Section - Complete Platform Width */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50/60 to-teal-50/40 backdrop-blur-2xl border border-emerald-300/40 shadow-2xl mt-6">
              {/* Floating Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-8 left-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl animate-float"></div>
                <div className="absolute bottom-12 right-12 w-20 h-20 bg-teal-500/10 rounded-full blur-lg animate-float-delayed"></div>
                <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-green-500/10 rounded-full blur-md animate-pulse"></div>
              </div>

              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/40 animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-25"></div>
                  </div>
                  <span className="bg-gradient-to-r from-emerald-800 via-teal-700 to-green-800 bg-clip-text text-transparent font-black text-xl">
                    Output Calculations
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600 font-medium">
                  Comprehensive financial calculations and analysis results
                </CardDescription>
              </CardHeader>

              <CardContent className="relative space-y-6">
                {/* Excel Column Calculation Grid - Matching Screenshot Exactly */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 px-4 sm:px-0">
                  
                  {/* Column C - Finanzierung (Förderung) für Hotelbett */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50/80 to-indigo-50/60 backdrop-blur-sm border border-blue-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-blue-800 break-words">Zielpreis (in Roomnights) über Gesamtzeit</span>
                      </div>
                      <div className="text-2xl font-black text-blue-900">
                        891
                      </div>
                    </div>
                  </div>

                  {/* Column D - Förderungssumme */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-50/80 to-violet-50/60 backdrop-blur-sm border border-purple-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-violet-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-purple-800 break-words">Laufzeit</span>
                      </div>
                      <div className="text-2xl font-black text-purple-900">
                        3
                      </div>
                    </div>
                  </div>

                  {/* Column E - Abzug */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-50/80 to-amber-50/60 backdrop-blur-sm border border-orange-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-orange-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-orange-800 break-words">Gesamtkosten über Laufzeit</span>
                      </div>
                      <div className="text-2xl font-black text-orange-900">
                        {workflowData.projectCosts > 0 ? 
                          Number(workflowData.projectCosts).toLocaleString('de-DE', {minimumFractionDigits: 0, maximumFractionDigits: 0}) :
                          (workflowData.projectCosts === 0 ? '0' : '3,741')
                        }
                      </div>
                    </div>
                  </div>

                  {/* Column F - Buchungsystem */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-rose-50/80 to-pink-50/60 backdrop-blur-sm border border-rose-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-pink-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-rose-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-rose-800 break-words">Profit inkl. Mehrverkauf</span>
                      </div>
                      <div className="text-2xl font-black text-rose-900">
                        {workflowData.projectCosts > 0 ? 
                          (() => {
                            // Use default values if hotel data not yet entered
                            const defaultVoucherValue = hotelVoucherValue > 0 ? hotelVoucherValue : 30; // Default 3-star value
                            const defaultActualPrice = actualPrice > 0 ? actualPrice : 120; // Default price
                            
                            const vertragsvolumen = (workflowData.projectCosts / defaultVoucherValue) * (defaultActualPrice * 0.75) * 1.1;
                            const profit = vertragsvolumen - workflowData.projectCosts;
                            return profit.toLocaleString('de-DE', {minimumFractionDigits: 0, maximumFractionDigits: 0});
                          })() :
                          '5,625'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Column G - Rabatt Förderung */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-50/80 to-sky-50/60 backdrop-blur-sm border border-cyan-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-sky-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-cyan-800 break-words">Gesamtvertragswert (brutto)</span>
                      </div>
                      <div className="text-2xl font-black text-cyan-900">
                        27%
                      </div>
                    </div>
                  </div>

                  {/* Column H - Lieferant (Empty in Excel) */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-50/80 to-emerald-50/60 backdrop-blur-sm border border-green-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-green-800 break-words">Marge</span>
                      </div>
                      <div className="text-2xl font-black text-green-900">
                        -
                      </div>
                    </div>
                  </div>

                  {/* Column I - Lieferant Förderung */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-teal-50/80 to-cyan-50/60 backdrop-blur-sm border border-teal-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-cyan-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-teal-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-teal-800 break-words">Vorsteuer Produktkauf</span>
                      </div>
                      <div className="text-2xl font-black text-teal-900">
                        2.2
                      </div>
                    </div>
                  </div>

                </div>

                {/* Second Row - Continuing Excel Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 px-4 sm:px-0">
                  
                  {/* Column J - Vorsteuer Tripz Provision */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-50/80 to-purple-50/60 backdrop-blur-sm border border-indigo-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-indigo-800 break-words">Vorsteuer Tripz Provision</span>
                      </div>
                      <div className="text-2xl font-black text-indigo-900">
                        4,366
                      </div>
                    </div>
                  </div>

                  {/* Column K - Netto Steuerzahlung bei Vermietpreis */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-pink-50/80 to-rose-50/60 backdrop-blur-sm border border-pink-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-rose-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-pink-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-pink-800 break-words">Netto Steuerzahlung bei Vermietpreis</span>
                      </div>
                      <div className="text-2xl font-black text-pink-900">
                        16,716
                      </div>
                    </div>
                  </div>

                  {/* Column L - Profit nach Steuern */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-yellow-50/80 to-orange-50/60 backdrop-blur-sm border border-yellow-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-yellow-800 break-words">Profit nach Steuern</span>
                      </div>
                      <div className="text-2xl font-black text-yellow-900">
                        36,033
                      </div>
                    </div>
                  </div>

                  {/* Column M - Marge nach Steuern bei Vermietpreis */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-lime-50/80 to-green-50/60 backdrop-blur-sm border border-lime-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-400 to-green-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-lime-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-lime-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-lime-800 break-words">Marge nach Steuern bei Vermietpreis</span>
                      </div>
                      <div className="text-2xl font-black text-lime-900">
                        -
                      </div>
                    </div>
                  </div>

                  {/* Column N - Breakeven in Jahren */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50/80 to-teal-50/60 backdrop-blur-sm border border-emerald-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-emerald-800 break-words">Breakeven in Jahren</span>
                      </div>
                      <div className="text-2xl font-black text-emerald-900">
                        -
                      </div>
                    </div>
                  </div>

                  {/* Column O - Profit nach Steuern */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-violet-50/80 to-purple-50/60 backdrop-blur-sm border border-violet-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-purple-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-violet-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-violet-800 break-words">Profit nach Steuern</span>
                      </div>
                      <div className="text-2xl font-black text-violet-900">
                        -
                      </div>
                    </div>
                  </div>

                  {/* Column P - Profit nach Steuern Förderung */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50/80 to-gray-50/60 backdrop-blur-sm border border-slate-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-gray-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-slate-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-slate-800 break-words">Profit nach Steuern Förderung</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        -
                      </div>
                    </div>
                  </div>

                </div>

                {/* Excel Data Overview */}
                <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50/80 to-gray-50/60 backdrop-blur-sm border border-slate-200/50 p-4 shadow-md">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-gray-400 animate-pulse"></div>
                  <div className="absolute top-2 right-2 w-2 h-2 bg-slate-400 rounded-full animate-ping opacity-50"></div>
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce flex-shrink-0"></div>
                      <span className="text-sm font-bold text-slate-800 break-words">Excel Columns Mapping</span>
                    </div>
                    <div className="text-sm text-slate-700 bg-slate-100/50 p-3 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div><span className="font-semibold text-blue-700">C:</span> Zielpreis (in Roomnights) über Gesamtzeit</div>
                        <div><span className="font-semibold text-purple-700">D:</span> Laufzeit</div>
                        <div><span className="font-semibold text-orange-700">E:</span> Gesamtkosten über Laufzeit</div>
                        <div><span className="font-semibold text-rose-700">F:</span> Profit inkl. Mehrverkauf</div>
                        <div><span className="font-semibold text-cyan-700">G:</span> Gesamtvertragswert (brutto)</div>
                        <div><span className="font-semibold text-green-700">H:</span> Marge</div>
                        <div><span className="font-semibold text-teal-700">I:</span> Vorsteuer Produktkauf</div>
                      </div>
                      <div className="space-y-1">
                        <div><span className="font-semibold text-indigo-700">J:</span> Vorsteuer Tripz Provision</div>
                        <div><span className="font-semibold text-pink-700">K:</span> Netto Steuerzahlung bei Vermietpreis</div>
                        <div><span className="font-semibold text-yellow-700">L:</span> Profit nach Steuern</div>
                        <div><span className="font-semibold text-lime-700">M:</span> Marge nach Steuern bei Vermietpreis</div>
                        <div><span className="font-semibold text-emerald-700">N:</span> Breakeven in Jahren</div>
                        <div><span className="font-semibold text-violet-700">O:</span> Profit nach Steuern</div>
                        <div><span className="font-semibold text-slate-700">P:</span> Profit nach Steuern Förderung</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 bg-blue-50/50 p-2 rounded border-l-4 border-blue-400">
                      <strong>Note:</strong> Values are taken directly from Excel screenshot Row 1. Empty cells are marked with "-".
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 2:
        return (
          <Card className="relative overflow-hidden bg-gradient-to-br from-white/60 to-green-50/40 backdrop-blur-2xl border border-white/30 shadow-2xl">
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-8 left-8 w-24 h-24 bg-green-500/10 rounded-full blur-xl animate-float"></div>
              <div className="absolute bottom-12 right-12 w-20 h-20 bg-blue-500/10 rounded-full blur-lg animate-float-delayed"></div>
            </div>
            
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3">
                <div className="relative">
                  <BarChart3 className="h-6 w-6 text-green-600 animate-pulse" />
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                </div>
                <span className="bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent font-black text-xl">
                  Preisvergleichsanalyse
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Vergleichen Sie mit Marktpreisen und Wettbewerbern
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative space-y-6">
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/60 to-indigo-50/40 backdrop-blur-md border border-blue-200/40 rounded-2xl p-6 shadow-inner">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-400 animate-gradient-x"></div>
                <h4 className="font-bold text-blue-900 text-lg mb-2">Ihr Hotel: {workflowData.hotelName}</h4>
                <p className="text-blue-700 font-medium">Durchschnittspreis: €{workflowData.averagePrice}</p>
                <p className="text-sm text-blue-600 mt-2 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <span>Marktposition wird analysiert...</span>
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="group relative overflow-hidden backdrop-blur-sm border-gray-300/50 hover:border-gray-400/60 transition-all duration-300"
                >
                  <span className="relative z-10">Zurück zum Kalkulator</span>
                </Button>
                <Button 
                  onClick={() => {
                    nextStep();
                  }}
                  className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25 transition-all duration-300"
                >
                  <span className="relative z-10">PDF-Bericht erstellen</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card className="relative overflow-hidden bg-gradient-to-br from-white/60 to-purple-50/40 backdrop-blur-2xl border border-white/30 shadow-2xl">
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-6 left-6 w-28 h-28 bg-purple-500/10 rounded-full blur-xl animate-float"></div>
              <div className="absolute bottom-8 right-8 w-16 h-16 bg-green-500/10 rounded-full blur-lg animate-float-delayed"></div>
              <div className="absolute top-1/2 left-1/2 w-12 h-12 bg-blue-500/10 rounded-full blur-md animate-pulse"></div>
            </div>
            
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3">
                <div className="relative">
                  <FileText className="h-6 w-6 text-purple-600 animate-pulse" />
                  <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-20"></div>
                </div>
                <span className="bg-gradient-to-r from-purple-700 to-purple-600 bg-clip-text text-transparent font-black text-xl">
                  PDF-Bericht erstellen
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Professionellen Preisbericht erstellen
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative space-y-6">
              <div className="relative overflow-hidden bg-gradient-to-br from-green-50/60 to-emerald-50/40 backdrop-blur-md border border-green-200/40 rounded-2xl p-6 shadow-inner">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400 animate-gradient-x"></div>
                <div className="space-y-2">
                  <h4 className="font-bold text-green-900 text-lg flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Bericht bereit für: {workflowData.hotelName}</span>
                  </h4>
                  <p className="text-green-700 font-medium">Durchschnittspreis: €{workflowData.averagePrice}</p>
                  <p className="text-green-700 font-medium">Zimmeranzahl: {workflowData.roomCount}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="group relative overflow-hidden backdrop-blur-sm border-gray-300/50 hover:border-gray-400/60 transition-all duration-300"
                >
                  <span className="relative z-10">Zurück zum Vergleich</span>
                </Button>
                <Button className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/25 transition-all duration-300">
                  <span className="relative z-10">PDF-Bericht herunterladen</span>
                </Button>
              </div>
              
              <div className="text-center pt-4">
                <Badge className="relative overflow-hidden bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200/50 px-4 py-2 rounded-full font-semibold shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 animate-gradient-x"></div>
                  <span className="relative flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                    <span>Workflow abgeschlossen</span>
                  </span>
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Workflow Header */}
        <div className="relative">
          {/* Back Button - Positioned Absolutely */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="absolute right-0 top-0 flex items-center gap-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 text-xs px-2 py-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </Button>
          
          {/* Centered Title and Badge */}
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              AI Pricing Agent
            </h1>
            <p className="text-gray-600 mt-2 mb-4">Complete hotel pricing analysis in three steps</p>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Step {currentStep} of {steps.length}
            </Badge>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-6">
          {/* Step Progress Indicator */}
          <div className="flex justify-center">
            <div className="flex items-center max-w-2xl">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 cursor-pointer ${
                        currentStep === step.id
                          ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                          : currentStep > step.id
                          ? 'bg-green-500 border-green-500 text-white'
                          : canProceedToStep(step.id)
                          ? 'border-blue-300 text-blue-600 hover:border-blue-400'
                          : 'border-gray-300 text-gray-400'
                      }`}
                      onClick={() => canProceedToStep(step.id) && goToStep(step.id)}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <step.icon className="h-6 w-6" />
                      )}
                      
                      {/* Step glow effect */}
                      {currentStep === step.id && (
                        <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping" />
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="mt-2 text-center">
                      <h3 className={`text-sm font-semibold ${
                        currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-xs ${
                        currentStep >= step.id ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="w-24 h-0.5 bg-gray-200 mx-4 relative">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                        style={{ 
                          width: currentStep > step.id ? '100%' : currentStep === step.id ? '50%' : '0%' 
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {renderStepContent()}
        </div>
      </div>
    </AppLayout>
  );
}