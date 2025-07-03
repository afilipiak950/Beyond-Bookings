import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Calculator, BarChart3, FileText, Check, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

// Import step components - temporarily creating inline to fix imports
// import PricingCalculatorStep from "@/components/workflow/pricing-calculator-step";
// import PriceComparisonStep from "@/components/workflow/price-comparison-step";
// import PdfGenerationStep from "@/components/workflow/pdf-generation-step";

export interface WorkflowData {
  // Step 1: Hotel Pricing Calculator
  hotelName: string;
  hotelUrl: string;
  stars: number;
  roomCount: number;
  occupancyRate: number;
  averagePrice: number;
  voucherPrice: number;
  operationalCosts: number;
  vatRate: number;
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
    hotelName: "",
    hotelUrl: "",
    stars: 0,
    roomCount: 0,
    occupancyRate: 0,
    averagePrice: 0,
    voucherPrice: 0,
    operationalCosts: 0,
    vatRate: 19
  });

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
        return Boolean(workflowData.hotelName && workflowData.voucherPrice > 0);
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
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Hotel Pricing Calculator
              </CardTitle>
              <CardDescription>
                Enter hotel details and calculate pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Hotel Name</label>
                  <input 
                    type="text"
                    placeholder="Enter hotel name"
                    className="w-full p-2 border rounded-lg"
                    value={workflowData.hotelName}
                    onChange={(e) => updateWorkflowData({ hotelName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Voucher Price (€)</label>
                  <input 
                    type="number"
                    placeholder="100.00"
                    className="w-full p-2 border rounded-lg"
                    value={workflowData.voucherPrice}
                    onChange={(e) => updateWorkflowData({ voucherPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Button 
                onClick={nextStep} 
                disabled={!workflowData.hotelName || workflowData.voucherPrice <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continue to Price Comparison
              </Button>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Price Comparison Analysis
              </CardTitle>
              <CardDescription>
                Compare with market rates and competitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900">Your Hotel: {workflowData.hotelName}</h4>
                <p className="text-blue-700">Price: €{workflowData.voucherPrice}</p>
                <p className="text-sm text-blue-600">Analyzing market position...</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={prevStep}>
                  Back to Calculator
                </Button>
                <Button 
                  onClick={() => {
                    updateWorkflowData({
                      marketAnalysis: {
                        averageMarketPrice: 120,
                        positionRanking: 2,
                        recommendedPrice: 115
                      }
                    });
                    nextStep();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Generate PDF Report
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
                Generate PDF Report
              </CardTitle>
              <CardDescription>
                Create professional pricing report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900">Report Ready for: {workflowData.hotelName}</h4>
                <p className="text-green-700">Price: €{workflowData.voucherPrice}</p>
                <p className="text-green-700">Market Position: #{workflowData.marketAnalysis?.positionRanking}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={prevStep}>
                  Back to Comparison
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Download PDF Report
                </Button>
              </div>
              <div className="text-center pt-4">
                <Badge className="bg-green-100 text-green-800">
                  Workflow Complete
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Hotel Pricing Workflow
              </h1>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Step {currentStep} of {steps.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <div
                  className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 cursor-pointer ${
                    currentStep === step.id
                      ? `bg-${step.color}-500 border-${step.color}-500 text-white shadow-lg`
                      : currentStep > step.id
                      ? `bg-green-500 border-green-500 text-white`
                      : canProceedToStep(step.id)
                      ? `border-${step.color}-300 text-${step.color}-600 hover:border-${step.color}-400`
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
                    <div className={`absolute inset-0 rounded-full bg-${step.color}-500 opacity-20 animate-ping`} />
                  )}
                </div>

                {/* Step Label */}
                <div className="ml-4 min-w-0 flex-1">
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

                {/* Arrow */}
                {index < steps.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
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
    </div>
  );
}