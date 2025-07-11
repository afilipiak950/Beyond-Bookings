import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Calculator, BarChart3, FileText, Check, ArrowLeft, ArrowRight, Edit3, Brain, Gift, TrendingDown, Star, Download, Plus, Eye, Trash2, Copy, Move, Image, Type, BarChart, PieChart, Presentation, Loader2, Save, Building2, Globe } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import type { PricingCalculation } from "@shared/schema";

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

export default function Workflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    hotelName: "",
    stars: 0,
    roomCount: 0,
    occupancyRate: 0,
    averagePrice: 0,
    projectCosts: 0,
    hotelVoucherValue: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actualPrice, setActualPrice] = useState(0);
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [aiSuggestedPrice, setAiSuggestedPrice] = useState(0);
  const [manualPriceValue, setManualPriceValue] = useState("");
  const [manualProjectCosts, setManualProjectCosts] = useState("");
  const [manualVoucherValue, setManualVoucherValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleManualEdit = () => {
    setIsManualEdit(true);
  };

  const handleManualSave = () => {
    if (manualPriceValue) {
      setActualPrice(parseFloat(manualPriceValue));
      setIsManualEdit(true);
    }
    if (manualProjectCosts) {
      setWorkflowData(prev => ({
        ...prev,
        projectCosts: parseFloat(manualProjectCosts)
      }));
    }
    if (manualVoucherValue) {
      setWorkflowData(prev => ({
        ...prev,
        hotelVoucherValue: parseFloat(manualVoucherValue)
      }));
    }
    setManualEditOpen(false);
    toast({
      title: "Manuelle Anpassung gespeichert",
      description: "Die KI-Werte wurden erfolgreich überschrieben.",
    });
  };

  const handlePriceEdit = (type: 'financing' | 'project' | 'voucher') => {
    if (type === 'financing') {
      setManualEditOpen(true);
    }
  };

  const stepComponents = [
    {
      title: "Hotelpreisrechner",
      description: "Geben Sie Hoteldaten ein",
      icon: Calculator,
      component: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Hotel Input Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Hotel-Eingabeformular
              </CardTitle>
              <CardDescription>
                Geben Sie die Hoteldaten für die Preisberechnung ein
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hotelName">Hotel Name</Label>
                  <Input
                    id="hotelName"
                    value={workflowData.hotelName}
                    onChange={(e) => setWorkflowData({...workflowData, hotelName: e.target.value})}
                    placeholder="Hotel Name eingeben"
                  />
                </div>
                <div>
                  <Label htmlFor="stars">Sterne</Label>
                  <Input
                    id="stars"
                    type="number"
                    value={workflowData.stars}
                    onChange={(e) => setWorkflowData({...workflowData, stars: parseInt(e.target.value) || 0})}
                    placeholder="Anzahl Sterne"
                  />
                </div>
                <div>
                  <Label htmlFor="roomCount">Zimmeranzahl</Label>
                  <Input
                    id="roomCount"
                    type="number"
                    value={workflowData.roomCount}
                    onChange={(e) => setWorkflowData({...workflowData, roomCount: parseInt(e.target.value) || 0})}
                    placeholder="Anzahl Zimmer"
                  />
                </div>
                <div>
                  <Label htmlFor="occupancyRate">Auslastungsrate (%)</Label>
                  <Input
                    id="occupancyRate"
                    type="number"
                    value={workflowData.occupancyRate}
                    onChange={(e) => setWorkflowData({...workflowData, occupancyRate: parseInt(e.target.value) || 0})}
                    placeholder="Auslastung in %"
                  />
                </div>
                <div>
                  <Label htmlFor="averagePrice">Durchschnittspreis (€)</Label>
                  <Input
                    id="averagePrice"
                    type="number"
                    value={workflowData.averagePrice}
                    onChange={(e) => setWorkflowData({...workflowData, averagePrice: parseFloat(e.target.value) || 0})}
                    placeholder="Durchschnittspreis"
                  />
                </div>
                <div>
                  <Label htmlFor="projectCosts">Projektkosten (€)</Label>
                  <Input
                    id="projectCosts"
                    type="number"
                    value={workflowData.projectCosts}
                    onChange={(e) => setWorkflowData({...workflowData, projectCosts: parseFloat(e.target.value) || 0})}
                    placeholder="Projektkosten"
                  />
                </div>
                <div>
                  <Label htmlFor="hotelVoucherValue">Hotel-Gutscheinwert (€)</Label>
                  <Input
                    id="hotelVoucherValue"
                    type="number"
                    value={workflowData.hotelVoucherValue}
                    onChange={(e) => setWorkflowData({...workflowData, hotelVoucherValue: parseFloat(e.target.value) || 0})}
                    placeholder="Gutscheinwert"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" disabled>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
                <Button 
                  onClick={nextStep}
                  disabled={!workflowData.hotelName || workflowData.averagePrice <= 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Weiter zur Preisvergleichsanalyse
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
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
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Preisanalyse</h4>
                  <div className="text-2xl font-bold text-blue-900">
                    {workflowData.averagePrice > 0 ? `€${workflowData.averagePrice.toFixed(2)}` : '€0.00'}
                  </div>
                  <p className="text-sm text-blue-600 mt-1">Durchschnittspreis pro Nacht</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Projektkosten</h4>
                  <div className="text-2xl font-bold text-green-900">
                    {workflowData.projectCosts > 0 ? `€${workflowData.projectCosts.toFixed(2)}` : '€0.00'}
                  </div>
                  <p className="text-sm text-green-600 mt-1">Gesamte Projektkosten</p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">Gutscheinwert</h4>
                  <div className="text-2xl font-bold text-purple-900">
                    {workflowData.hotelVoucherValue > 0 ? `€${workflowData.hotelVoucherValue.toFixed(2)}` : '€0.00'}
                  </div>
                  <p className="text-sm text-purple-600 mt-1">Hotel-Gutscheinwert</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Status</h4>
                  <div className="flex items-center space-x-2">
                    {workflowData.hotelName && workflowData.averagePrice > 0 ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600">Bereit für Analyse</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">Daten eingeben</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      title: "Preisvergleichsanalyse",
      description: "Marktvergleich und Konkurrenzanalyse",
      icon: BarChart3,
      component: (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preisvergleichsanalyse</CardTitle>
              <CardDescription>
                Vergleichen Sie Ihre Preise mit dem Markt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Marktanalyse wird geladen...</h3>
                <p className="text-gray-600">Bitte warten Sie, während wir Marktdaten abrufen.</p>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
                <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Weiter zu PowerPoint
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      title: "PowerPoint-Präsentation",
      description: "Erstellen Sie eine professionelle Präsentation",
      icon: Presentation,
      component: (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PowerPoint-Präsentation erstellen</CardTitle>
              <CardDescription>
                Generieren Sie eine professionelle Präsentation Ihrer Analyse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Presentation className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">PowerPoint-Editor</h3>
                <p className="text-gray-600">Erstellen Sie eine professionelle Präsentation.</p>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  PowerPoint herunterladen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  const currentStepData = stepComponents[currentStep - 1];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Pricing Workflow
            </h1>
            <p className="text-gray-600">
              Kompletter Preisanalyse-Workflow in 3 Schritten
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {stepComponents.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index + 1 <= currentStep 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index + 1 <= currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < stepComponents.length - 1 && (
                    <div className={`w-full h-1 mx-4 ${
                      index + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              {stepComponents.map((step, index) => (
                <div key={index} className="text-center">
                  <div className={`font-medium ${
                    index + 1 === currentStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {step.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Step Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {currentStepData.component}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}