import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Calculator, BarChart3, FileText, Check, ArrowLeft, Edit3, Brain } from "lucide-react";
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
    averagePrice: 0
  });

  // AI Price Intelligence State
  const [aiSuggestedPrice, setAiSuggestedPrice] = useState(0);
  const [actualPrice, setActualPrice] = useState(0);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [editFeedback, setEditFeedback] = useState("");
  const [tempPrice, setTempPrice] = useState("");

  // Calculate AI suggested price (45% of average price, rounded up)
  useEffect(() => {
    if (workflowData.averagePrice > 0) {
      const suggested = Math.ceil(workflowData.averagePrice * 0.45);
      setAiSuggestedPrice(suggested);
      if (!isManualEdit) {
        setActualPrice(suggested);
      }
    }
  }, [workflowData.averagePrice, isManualEdit]);

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
                    value={Math.min(Math.floor((workflowData.roomCount * 365) * 0.15), 1000)}
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
              <CardContent className="space-y-5">
                {/* Calculation Results - Modern Glass Design */}
                <div className="space-y-3">
                  {/* AI-Powered Realistic Price - Hero Section */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50/80 to-blue-100/80 backdrop-blur-sm border border-blue-200/50 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent"></div>
                    <div className="relative space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                          <span className="font-semibold text-blue-900">Realistischer Hotelverkaufspreis (KI)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isManualEdit ? (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                              <Edit3 className="h-3 w-3" />
                              <span>Manuell</span>
                            </span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                              KI: 45%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-blue-800 tracking-tight">
                          {actualPrice ? `${actualPrice.toFixed(2)} €` : '0.00 €'}
                        </span>
                        <Dialog open={manualEditOpen} onOpenChange={setManualEditOpen}>
                          <DialogTrigger asChild>
                            <button 
                              onClick={handleManualEdit}
                              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Manuell bearbeiten</span>
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
                                  <strong>KI-Vorschlag:</strong> {aiSuggestedPrice.toFixed(2)} € (45% von {workflowData.averagePrice.toFixed(2)} €)
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
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                          <strong>KI-Begründung:</strong> 
                          {isManualEdit ? (
                            <>Manuell angepasst von {aiSuggestedPrice.toFixed(2)} € auf {actualPrice.toFixed(2)} €. Die KI lernt aus Ihrer Korrektur für ähnliche {workflowData.stars}-Sterne Hotels.</>
                          ) : (
                            <>Basierend auf 45% des Durchschnittspreises für {workflowData.stars}-Sterne Hotels mit {workflowData.roomCount} Zimmern und {workflowData.occupancyRate}% Auslastung. Selbstlernende KI passt sich an Ihre Korrekturen an.</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Secondary Calculations */}
                  <div className="grid gap-3">
                    {/* 65% Calculation */}
                    <div className="relative rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/70 p-3 hover:bg-white/80 transition-all duration-200 group">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                          65% des durchschnittlichen Zimmerpreises
                        </span>
                        <span className="text-lg font-bold text-gray-800">
                          {workflowData.averagePrice ? (workflowData.averagePrice * 0.65).toFixed(0) : '0'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Hotel Voucher - Highlighted */}
                    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50/80 to-red-100/80 backdrop-blur-sm border border-red-200/50 p-3 shadow-sm">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                      <div className="flex justify-between items-center ml-3">
                        <span className="font-medium text-red-800">Gutscheinwert für Hotel</span>
                        <span className="text-lg font-bold text-red-600">
                          {workflowData.averagePrice ? (workflowData.averagePrice * 0.65).toFixed(2) : '0.00'} €
                        </span>
                      </div>
                    </div>
                    
                    {/* Profit Margin - Success */}
                    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-50/80 to-green-100/80 backdrop-blur-sm border border-green-200/50 p-3 shadow-sm">
                      <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                      <div className="flex justify-between items-center ml-3">
                        <span className="font-medium text-green-800">Marge nach Steuern</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-lg font-bold text-green-600">
                            {workflowData.averagePrice ? `${((workflowData.averagePrice - (workflowData.averagePrice * 0.65)) / workflowData.averagePrice * 100).toFixed(0)}%` : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tripz Payment */}
                    <div className="relative rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/70 p-3 hover:bg-white/80 transition-all duration-200 group">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                          Zahlung von Tripz Estimate
                        </span>
                        <span className="text-lg font-bold text-gray-800">
                          {workflowData.averagePrice ? (workflowData.averagePrice * 0.75).toFixed(2) + ' €' : '0.00 €'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Contract Volume - Blue Highlight */}
                    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50/80 to-blue-100/80 backdrop-blur-sm border border-blue-200/50 p-3 shadow-sm">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                      <div className="flex justify-between items-center ml-3">
                        <span className="font-medium text-blue-800">Vertragsvolumen Estimate</span>
                        <span className="text-lg font-bold text-blue-600">
                          {workflowData.roomCount && workflowData.averagePrice ? 
                            (Math.min(Math.floor((workflowData.roomCount * 365) * 0.15), 1000) * workflowData.averagePrice * 0.75).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €' : 
                            '0.00 €'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Project Costs - Special Section */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-100/90 to-red-50/90 backdrop-blur-md border-2 border-red-200/60 p-4 shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                    <div className="relative flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="font-semibold text-red-800">Finanzierung: Projektkosten brutto</span>
                      </div>
                      <span className="text-xl font-bold text-red-600 tracking-tight">
                        {workflowData.roomCount && workflowData.averagePrice ? 
                          (Math.min(Math.floor((workflowData.roomCount * 365) * 0.15), 1000) * workflowData.averagePrice * 0.65).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €' : 
                          '0.00 €'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary - Modern Glass Card */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50/90 to-blue-50/90 backdrop-blur-md border border-slate-200/60 p-5 shadow-lg mt-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-green-500/5 to-blue-500/5 animate-pulse"></div>
                  <div className="relative">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">📊</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg">Live-Zusammenfassung</h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {workflowData.hotelName && workflowData.averagePrice > 0 ? 
                        `${workflowData.hotelName} mit ${workflowData.roomCount} Zimmern bereit für detaillierte Preisvergleichsanalyse.` :
                        "Geben Sie Hoteldaten ein, um die Live-Berechnung zu starten."
                      }
                    </p>
                    {workflowData.hotelName && workflowData.averagePrice > 0 && (
                      <div className="mt-3 flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-green-600 font-medium">Bereit für Analyse</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Preisvergleichsanalyse
              </CardTitle>
              <CardDescription>
                Vergleichen Sie mit Marktpreisen und Wettbewerbern
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900">Ihr Hotel: {workflowData.hotelName}</h4>
                <p className="text-blue-700">Durchschnittspreis: €{workflowData.averagePrice}</p>
                <p className="text-sm text-blue-600">Marktposition wird analysiert...</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={prevStep}>
                  Zurück zum Kalkulator
                </Button>
                <Button 
                  onClick={() => {
                    nextStep();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  PDF-Bericht erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                PDF-Bericht erstellen
              </CardTitle>
              <CardDescription>
                Professionellen Preisbericht erstellen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900">Bericht bereit für: {workflowData.hotelName}</h4>
                <p className="text-green-700">Durchschnittspreis: €{workflowData.averagePrice}</p>
                <p className="text-green-700">Zimmeranzahl: {workflowData.roomCount}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={prevStep}>
                  Zurück zum Vergleich
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  PDF-Bericht herunterladen
                </Button>
              </div>
              <div className="text-center pt-4">
                <Badge className="bg-green-100 text-green-800">
                  Workflow abgeschlossen
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