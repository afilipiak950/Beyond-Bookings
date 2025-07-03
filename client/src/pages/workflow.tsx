import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Calculator, BarChart3, FileText, Check, ArrowLeft } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "@/components/layout/app-layout";

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
          <div className="grid grid-cols-2 gap-8">
            {/* Left Side - Input Form */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Hotel Information & Pricing Inputs
                </CardTitle>
                <CardDescription>
                  Enter all required details for pricing calculation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* General Hotel Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-blue-900 border-b border-blue-200 pb-2">
                    General Hotel Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Hotel Name *</label>
                      <input 
                        type="text"
                        placeholder="e.g., Hampton by Hilton Potsdam"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={workflowData.hotelName}
                        onChange={(e) => updateWorkflowData({ hotelName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Hotel URL</label>
                      <input 
                        type="url"
                        placeholder="https://example.com/hotel"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={workflowData.hotelUrl}
                        onChange={(e) => updateWorkflowData({ hotelUrl: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Category (Stars)</label>
                        <select 
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={workflowData.stars}
                          onChange={(e) => updateWorkflowData({ stars: parseInt(e.target.value) })}
                        >
                          <option value={0}>Select Stars</option>
                          <option value={1}>1 Star</option>
                          <option value={2}>2 Stars</option>
                          <option value={3}>3 Stars</option>
                          <option value={4}>4 Stars</option>
                          <option value={5}>5 Stars</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Room Count</label>
                        <input 
                          type="number"
                          placeholder="e.g., 180"
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={workflowData.roomCount}
                          onChange={(e) => updateWorkflowData({ roomCount: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-green-900 border-b border-green-200 pb-2">
                    Pricing Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Average Market Price (€) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="e.g., 120.00"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={workflowData.averagePrice}
                        onChange={(e) => updateWorkflowData({ averagePrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Voucher Price (€) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="e.g., 89.00"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={workflowData.voucherPrice}
                        onChange={(e) => updateWorkflowData({ voucherPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Operational Costs (€)</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="e.g., 15.00"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={workflowData.operationalCosts}
                        onChange={(e) => updateWorkflowData({ operationalCosts: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">VAT Rate (%)</label>
                      <select 
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={workflowData.vatRate}
                        onChange={(e) => updateWorkflowData({ vatRate: parseFloat(e.target.value) })}
                      >
                        <option value={0.07}>7% (Reduced Rate)</option>
                        <option value={0.19}>19% (Standard Rate)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    // Calculate results before moving to next step
                    const netPrice = workflowData.voucherPrice - workflowData.operationalCosts;
                    const vatAmount = netPrice * workflowData.vatRate;
                    const totalPrice = netPrice + vatAmount;
                    const profitMargin = netPrice - workflowData.operationalCosts;
                    const discountVsMarket = workflowData.averagePrice - workflowData.voucherPrice;
                    const marginPercentage = (profitMargin / workflowData.voucherPrice) * 100;
                    const discountPercentage = (discountVsMarket / workflowData.averagePrice) * 100;

                    updateWorkflowData({
                      calculationResult: {
                        vatAmount,
                        profitMargin,
                        totalPrice,
                        discountVsMarket,
                        marginPercentage,
                        discountPercentage
                      }
                    });
                    nextStep();
                  }}
                  disabled={!workflowData.hotelName || workflowData.voucherPrice <= 0 || workflowData.averagePrice <= 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                >
                  Calculate & Continue to Price Comparison
                </Button>
              </CardContent>
            </Card>

            {/* Right Side - Live Calculation Output */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Live Calculation Results
                </CardTitle>
                <CardDescription>
                  Real-time pricing calculations and analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Offer-relevant Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-blue-900 border-b border-blue-200 pb-2">
                    Offer-relevant Information
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Effective Hotel Price</span>
                      <span className="text-lg font-bold text-blue-800">
                        €{workflowData.voucherPrice ? workflowData.voucherPrice.toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>65% of average market price</span>
                      <span className="text-green-600 font-semibold">
                        {workflowData.averagePrice > 0 ? 
                          `${((workflowData.voucherPrice / workflowData.averagePrice) * 100).toFixed(0)}%` : 
                          '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Discount Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-red-900 border-b border-red-200 pb-2">
                    Discount Information
                  </h3>
                  <div className="bg-red-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Discount vs Market</span>
                      <span className="text-lg font-bold text-red-800">
                        -€{workflowData.averagePrice > 0 ? 
                          (workflowData.averagePrice - workflowData.voucherPrice).toFixed(2) : 
                          '0.00'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Discount Percentage</span>
                      <span className="text-red-600 font-semibold">
                        {workflowData.averagePrice > 0 ? 
                          `${(((workflowData.averagePrice - workflowData.voucherPrice) / workflowData.averagePrice) * 100).toFixed(1)}%` : 
                          '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* VAT Calculation */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-green-900 border-b border-green-200 pb-2">
                    VAT Calculation
                  </h3>
                  <div className="bg-green-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Price</span>
                      <span className="text-lg font-bold text-green-800">
                        €{workflowData.voucherPrice ? 
                          (workflowData.voucherPrice - workflowData.operationalCosts).toFixed(2) : 
                          '0.00'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>VAT ({(workflowData.vatRate * 100).toFixed(0)}%)</span>
                      <span className="text-green-600 font-semibold">
                        €{workflowData.voucherPrice ? 
                          ((workflowData.voucherPrice - workflowData.operationalCosts) * workflowData.vatRate).toFixed(2) : 
                          '0.00'
                        }
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center font-bold">
                      <span>Total incl. VAT</span>
                      <span className="text-lg text-green-800">
                        €{workflowData.voucherPrice ? 
                          ((workflowData.voucherPrice - workflowData.operationalCosts) * (1 + workflowData.vatRate)).toFixed(2) : 
                          '0.00'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profit Analysis */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-purple-900 border-b border-purple-200 pb-2">
                    Profit Analysis
                  </h3>
                  <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Profit</span>
                      <span className="text-lg font-bold text-purple-800">
                        €{workflowData.voucherPrice ? 
                          (workflowData.voucherPrice - workflowData.operationalCosts).toFixed(2) : 
                          '0.00'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Profit Margin</span>
                      <span className="text-purple-600 font-semibold">
                        {workflowData.voucherPrice > 0 ? 
                          `${(((workflowData.voucherPrice - workflowData.operationalCosts) / workflowData.voucherPrice) * 100).toFixed(1)}%` : 
                          '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-2">💡 Recommendation</h4>
                  <p className="text-sm text-gray-600">
                    {workflowData.voucherPrice > 0 && workflowData.averagePrice > 0 ? 
                      (workflowData.voucherPrice < workflowData.averagePrice * 0.8 ? 
                        "Excellent discount offering significant savings to customers. Consider highlighting this competitive advantage." :
                        "Moderate discount. Consider adjusting pricing strategy for better market positioning."
                      ) : 
                      "Enter pricing data to receive personalized recommendations."
                    }
                  </p>
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
    <AppLayout>
      <div className="space-y-6">
        {/* Workflow Header */}
        <div className="relative">
          {/* Back Button - Positioned Absolutely */}
          <Button
            variant="ghost"
            size="xs"
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