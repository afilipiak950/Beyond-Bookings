import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Calculator, BarChart3, FileText, Check, ArrowLeft, ArrowRight, Edit3, Brain, Gift, TrendingDown, Star, Download, Plus, Eye, Trash2, Copy, Move, Image, Type, BarChart, PieChart, Presentation, Upload } from "lucide-react";
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

// PowerPoint Editor Component
const PowerPointEditor = ({ workflowData, onBack }: { workflowData: WorkflowData; onBack: () => void }) => {
  const [slides, setSlides] = useState([
    {
      id: 1,
      title: "Hotel Präsentation",
      content: "Professionelle Hotelanalyse und Preisgestaltung für " + (workflowData.hotelName || "Hotel"),
      type: "title",
      backgroundGradient: "from-blue-600 to-purple-800"
    },
    {
      id: 2,
      title: "Übersicht",
      content: `${workflowData.hotelName || "Hotel"} • ${workflowData.stars || 0} Sterne • ${workflowData.roomCount || 0} Zimmer`,
      type: "content",
      backgroundGradient: "from-emerald-600 to-blue-700"
    },
    {
      id: 3,
      title: "Preisanalyse",
      content: "Detaillierte Kostenaufstellung und Gewinnmarge",
      type: "content",
      backgroundGradient: "from-orange-600 to-red-700"
    },
    {
      id: 4,
      title: "Empfehlungen",
      content: "Strategische Empfehlungen für optimale Preisgestaltung",
      type: "content",
      backgroundGradient: "from-purple-600 to-pink-700"
    },
    {
      id: 5,
      title: "Vielen Dank",
      content: "Kontakt und weitere Informationen",
      type: "closing",
      backgroundGradient: "from-gray-600 to-blue-800"
    }
  ]);
  
  // Load user's presentation as default on component mount
  useEffect(() => {
    const loadUserPresentation = async () => {
      try {
        // First try to load from localStorage (recent upload)
        const savedPresentation = localStorage.getItem('defaultPresentation');
        if (savedPresentation) {
          const userPresentation = JSON.parse(savedPresentation);
          if (userPresentation && userPresentation.slides) {
            console.log('Loading saved user presentation with', userPresentation.slides.length, 'slides');
            const loadedSlides = userPresentation.slides.map((slide: any, index: number) => ({
              id: index + 1,
              title: slide.title || `Slide ${index + 1}`,
              content: slide.content || 'Inhalt bearbeiten',
              type: slide.type || 'content',
              backgroundGradient: slide.backgroundGradient || 'from-blue-600 to-purple-800'
            }));
            setSlides(loadedSlides);
            setIsUserPresentation(true);
            return;
          }
        }
        
        // Then try to load from server
        const response = await fetch('/api/user-presentation');
        if (response.ok) {
          const userPresentation = await response.json();
          if (userPresentation && userPresentation.slides) {
            console.log('Loading server user presentation with', userPresentation.slides.length, 'slides');
            const loadedSlides = userPresentation.slides.map((slide: any, index: number) => ({
              id: index + 1,
              title: slide.title || `Slide ${index + 1}`,
              content: slide.content || 'Inhalt bearbeiten',
              type: slide.type || 'content',
              backgroundGradient: slide.backgroundGradient || 'from-blue-600 to-purple-800'
            }));
            setSlides(loadedSlides);
            setIsUserPresentation(true);
            // Save to localStorage for future use
            localStorage.setItem('defaultPresentation', JSON.stringify(userPresentation));
          }
        }
      } catch (error) {
        console.error('Error loading user presentation:', error);
      }
    };
    
    loadUserPresentation();
  }, []);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [isUserPresentation, setIsUserPresentation] = useState(false);
  
  // PowerPoint import functionality
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const addSlide = () => {
    const newSlide = {
      id: slides.length + 1,
      title: "New Slide",
      content: "Click to edit content",
      type: "content",
      backgroundGradient: "from-gray-400 to-gray-600"
    };
    setSlides([...slides, newSlide]);
    setCurrentSlide(slides.length);
  };

  const updateSlide = (index: number, updates: any) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setSlides(newSlides);
  };

  const deleteSlide = (index: number) => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, i) => i !== index);
      setSlides(newSlides);
      if (currentSlide >= newSlides.length) {
        setCurrentSlide(newSlides.length - 1);
      }
    }
  };

  const importFromPowerPoint = async (file: File) => {
    setIsImporting(true);
    try {
      console.log('Starting PowerPoint import for file:', file.name);
      
      const formData = new FormData();
      formData.append('pptx', file);
      
      const response = await fetch('/api/import/powerpoint', {
        method: 'POST',
        body: formData,
        credentials: 'include' // Include cookies for authentication
      });
      
      console.log('Import response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Import response error:', errorText);
        throw new Error(`Import failed: ${response.status} ${errorText}`);
      }
      
      const importedPresentation = await response.json();
      console.log('Imported presentation:', importedPresentation);
      
      // Replace current slides with imported ones - use exact content from your presentation
      const importedSlides = importedPresentation.slides.map((slide: any, index: number) => ({
        id: index + 1,
        title: slide.title || `Folie ${index + 1}`,
        content: slide.content || 'Inhalt bearbeiten',
        type: slide.type || 'content',
        backgroundGradient: slide.backgroundGradient || 'from-blue-600 to-purple-800'
      }));
      
      console.log('Processed slides:', importedSlides);
      
      setSlides(importedSlides);
      setCurrentSlide(0);
      setIsUserPresentation(true);
      
      // Save as default presentation in localStorage for future use
      localStorage.setItem('defaultPresentation', JSON.stringify(importedPresentation));
      
      alert(`✅ Ihre Präsentation wurde erfolgreich als Standard-Vorlage gespeichert!\n\n${importedSlides.length} Folien geladen\nTitel: ${importedPresentation.title || 'Hotel Präsentation'}\n\nDiese Präsentation wird ab sofort immer automatisch geladen.`);
    } catch (error) {
      console.error('PowerPoint import error:', error);
      alert(`❌ Fehler beim Laden der PowerPoint-Präsentation: ${error.message}\n\nBitte versuchen Sie es erneut.`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name, file.type, file.size);
      
      // Check file extension and type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint'
      ];
      
      const isValidType = validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.pptx');
      
      if (isValidType) {
        importFromPowerPoint(file);
      } else {
        alert(`Bitte wählen Sie eine PowerPoint-Datei (.pptx) aus. Ausgewählte Datei: ${file.name} (${file.type})`);
      }
    }
    
    // Reset input to allow same file selection
    event.target.value = '';
  };

  const exportToPowerPoint = async () => {
    try {
      const response = await fetch('/api/export/powerpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slides: slides.map(slide => ({
            title: slide.title,
            content: slide.content,
            type: slide.type,
            backgroundGradient: slide.backgroundGradient
          })),
          workflowData: workflowData
        })
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflowData.hotelName}_Presentation.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PowerPoint export error:', error);
      alert('Failed to export PowerPoint presentation. Please try again.');
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-gray-100 overflow-hidden">
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-4 shadow-lg animate-slideInFromTop">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 animate-slideInFromLeft">
            <Button variant="ghost" onClick={onBack} className="flex items-center space-x-2 hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center animate-morphGradient">
                <Presentation className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">PowerPoint Editor</h1>
                <p className="text-sm text-gray-600">Create professional presentations</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 animate-slideInFromRight">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".pptx"
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="bg-purple-600 hover:bg-purple-700 text-white transform hover:scale-105 transition-all duration-300"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Lade als Standard...' : 'Präsentation als Standard laden'}
            </Button>
            <Button onClick={addSlide} className="bg-emerald-600 hover:bg-emerald-700 text-white transform hover:scale-105 transition-all duration-300">
              <Plus className="h-4 w-4 mr-2" />
              New Slide
            </Button>
            <Button onClick={exportToPowerPoint} className="bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105 transition-all duration-300">
              <Download className="h-4 w-4 mr-2" />
              Export PPTX
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        <div className="w-56 bg-white/90 backdrop-blur-sm border-r border-gray-200/50 p-3 overflow-y-auto animate-slideInFromLeft">
          <div className="space-y-3">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900 animate-slideTrail">Data Summary</h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200/50">
                <h3 className="font-medium text-blue-900 mb-1 flex items-center text-sm">
                  <Calculator className="h-3 w-3 mr-1" />
                  Step 1: Calculator
                </h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hotel Name:</span>
                    <span className="font-medium text-blue-900">{workflowData.hotelName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stars:</span>
                    <span className="font-medium text-blue-900">{workflowData.stars} ⭐</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room Count:</span>
                    <span className="font-medium text-blue-900">{workflowData.roomCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Price:</span>
                    <span className="font-medium text-blue-900">€{workflowData.averagePrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Project Costs:</span>
                    <span className="font-medium text-blue-900">€{workflowData.projectCosts?.toLocaleString('de-DE')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-200/50">
                <h3 className="font-medium text-emerald-900 mb-1 flex items-center text-sm">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Step 2: Comparison
                </h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Voucher Value:</span>
                    <span className="font-medium text-emerald-900">
                      €{workflowData.stars === 5 ? 50 : workflowData.stars === 4 ? 40 : workflowData.stars === 3 ? 30 : 30}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room Nights:</span>
                    <span className="font-medium text-emerald-900">
                      {Math.round((workflowData.projectCosts || 0) / (workflowData.stars === 5 ? 50 : workflowData.stars === 4 ? 40 : workflowData.stars === 3 ? 30 : 30))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost Advantage:</span>
                    <span className="font-medium text-emerald-900">
                      €{(() => {
                        const projectCosts = workflowData.projectCosts || 0;
                        const voucherValue = workflowData.stars === 5 ? 50 : workflowData.stars === 4 ? 40 : workflowData.stars === 3 ? 30 : 30;
                        const roomnights = Math.round(projectCosts / voucherValue);
                        const beyondBookingsCosts = roomnights * 17;
                        const steuerbelastung = 1800.90;
                        const nettoKosten = projectCosts / 1.19;
                        const steuervorteil = nettoKosten * 0.19;
                        const gesamtkosten = beyondBookingsCosts + steuerbelastung - steuervorteil;
                        const advantage = projectCosts - gesamtkosten;
                        return advantage.toLocaleString('de-DE');
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-200/50">
                <h3 className="font-medium text-purple-900 mb-1 text-sm">Drag to Slides</h3>
                <div className="space-y-1">
                  {[
                    { label: "Hotel Name", value: workflowData.hotelName },
                    { label: "Star Rating", value: workflowData.stars + " Stars" },
                    { label: "Room Count", value: workflowData.roomCount },
                    { label: "Average Price", value: "€" + workflowData.averagePrice },
                    { label: "Project Costs", value: "€" + workflowData.projectCosts?.toLocaleString('de-DE') },
                    { label: "Cost Advantage", value: "€" + (() => {
                      const projectCosts = workflowData.projectCosts || 0;
                      const voucherValue = workflowData.stars === 5 ? 50 : workflowData.stars === 4 ? 40 : workflowData.stars === 3 ? 30 : 30;
                      const roomnights = Math.round(projectCosts / voucherValue);
                      const beyondBookingsCosts = roomnights * 17;
                      const steuerbelastung = 1800.90;
                      const nettoKosten = projectCosts / 1.19;
                      const steuervorteil = nettoKosten * 0.19;
                      const gesamtkosten = beyondBookingsCosts + steuerbelastung - steuervorteil;
                      const advantage = projectCosts - gesamtkosten;
                      return advantage.toLocaleString('de-DE');
                    })()}
                  ].map((field, index) => (
                    <div
                      key={index}
                      className="p-2 bg-white/80 rounded-lg border border-purple-200/50 cursor-move hover:bg-purple-50/50 transition-colors"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', field.value);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-purple-900">{field.label}</span>
                        <span className="text-xs text-purple-600 truncate max-w-20">{field.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col animate-slideInFromRight">
          <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-2 animate-slideInFromTop">
            <div className="flex space-x-2 overflow-x-auto">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`relative group min-w-24 h-16 rounded-lg cursor-pointer transition-all duration-300 ${
                    currentSlide === index
                      ? 'ring-4 ring-blue-500 shadow-lg scale-105'
                      : 'hover:shadow-md hover:scale-102'
                  }`}
                  onClick={() => setCurrentSlide(index)}
                >
                  <div className={`w-full h-full rounded-lg bg-gradient-to-r ${slide.backgroundGradient} p-1 flex flex-col justify-center`}>
                    <div className="text-white text-xs font-semibold truncate">{slide.title}</div>
                    <div className="text-white/80 text-xs truncate">{slide.content}</div>
                  </div>
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-6 h-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSlide(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="absolute bottom-1 right-1 text-white/60 text-xs">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-gray-100 p-1 overflow-auto animate-slideInFromBottom">
            <div className="max-w-sm mx-auto px-8">
              <div
                className={`aspect-[3/2] bg-gradient-to-r ${slides[currentSlide]?.backgroundGradient} rounded-lg shadow-lg p-2 text-white relative overflow-hidden cursor-text animate-slideReveal animate-morphGradient transition-all duration-500`}
                onClick={() => setIsEditing(!isEditing)}
                onDrop={(e) => {
                  e.preventDefault();
                  const data = e.dataTransfer.getData('text/plain');
                  updateSlide(currentSlide, { content: slides[currentSlide].content + ' ' + data });
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
                <div className="absolute top-2 right-2 w-8 h-8 bg-white/10 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 bg-white/5 rounded-full blur-md animate-pulse"></div>
                
                <div className="relative z-10 h-full flex flex-col justify-center">
                  {isEditing ? (
                    <div className="space-y-2 animate-slideInFromTop">
                      <Input
                        value={editingText || slides[currentSlide]?.title}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => {
                          updateSlide(currentSlide, { title: editingText });
                          setIsEditing(false);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            updateSlide(currentSlide, { title: editingText });
                            setIsEditing(false);
                          }
                        }}
                        className="bg-white/20 text-white placeholder-white/60 border-white/30 text-sm font-bold text-center backdrop-blur-sm"
                        placeholder="Slide Title"
                      />
                      <Textarea
                        value={slides[currentSlide]?.content}
                        onChange={(e) => updateSlide(currentSlide, { content: e.target.value })}
                        className="bg-white/20 text-white placeholder-white/60 border-white/30 text-xs text-center min-h-12 backdrop-blur-sm"
                        placeholder="Slide Content"
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-1 animate-slideTrail">
                      <h1 className="text-sm font-bold mb-1 drop-shadow-lg">{slides[currentSlide]?.title}</h1>
                      <p className="text-xs opacity-90 drop-shadow-md">{slides[currentSlide]?.content}</p>
                    </div>
                  )}
                </div>
                
                {!isEditing && (
                  <div className="absolute top-2 left-2 bg-white/20 rounded-full px-2 py-1 text-xs font-medium backdrop-blur-sm animate-pulse">
                    Click to edit
                  </div>
                )}
              </div>

              <div className="flex justify-center items-center space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="bg-white/80 backdrop-blur-sm text-xs"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Prev
                </Button>
                <div className="flex space-x-1">
                  {slides.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
                        currentSlide === index ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      onClick={() => setCurrentSlide(index)}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                  disabled={currentSlide === slides.length - 1}
                  className="bg-white/80 backdrop-blur-sm text-xs"
                >
                  Next
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
        return true; // Can always go to step 1
      case 2:
        return Boolean(workflowData.hotelName && workflowData.projectCosts > 0); // Need basic hotel data
      case 3:
        return Boolean(workflowData.hotelName && workflowData.projectCosts > 0); // Same requirement as step 2
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    // Debug workflow data
    if (currentStep === 2) {
      console.log("DEBUG: Current workflow data:", workflowData);
      console.log("DEBUG: Project costs:", workflowData.projectCosts);
      console.log("DEBUG: Stars:", workflowData.stars);
      console.log("DEBUG: Hotel voucher value:", workflowData.hotelVoucherValue);
      console.log("DEBUG: Actual price:", actualPrice);
    }
    
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
                    value={workflowData.roomCount === 0 ? '' : workflowData.roomCount}
                    onFocus={(e) => {
                      if (workflowData.roomCount === 0) {
                        e.target.value = '';
                      }
                    }}
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
                    value={workflowData.occupancyRate === 0 ? '' : workflowData.occupancyRate}
                    onFocus={(e) => {
                      if (workflowData.occupancyRate === 0) {
                        e.target.value = '';
                      }
                    }}
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
                    value={workflowData.averagePrice === 0 ? '' : workflowData.averagePrice}
                    onFocus={(e) => {
                      if (workflowData.averagePrice === 0) {
                        e.target.value = '';
                      }
                    }}
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
                                  value={tempPrice === '0' ? '' : tempPrice}
                                  onFocus={(e) => {
                                    if (tempPrice === '0') {
                                      e.target.value = '';
                                    }
                                  }}
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
                                      value={tempVoucherValue === '0' ? '' : tempVoucherValue}
                                      onFocus={(e) => {
                                        if (tempVoucherValue === '0') {
                                          e.target.value = '';
                                        }
                                      }}
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
                            value={workflowData.projectCosts === 0 ? '' : workflowData.projectCosts}
                            onFocus={(e) => {
                              if (workflowData.projectCosts === 0) {
                                e.target.value = '';
                              }
                            }}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : parseFloat(value) || 0;
                              setWorkflowData({...workflowData, projectCosts: numValue});
                            }}
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
                {/* Excel Column Calculation Grid - 5 Columns in First Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 px-4 sm:px-0">
                  
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

                  {/* Column F - Profit inkl. Mehrverkauf (Vertragsvolumen Estimate - Finanzierung: Projektkosten brutto) */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-rose-50/80 to-pink-50/60 backdrop-blur-sm border border-rose-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-pink-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-rose-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-rose-800 break-words">Profit inkl. Mehrverkauf</span>
                      </div>
                      <div className="text-2xl font-black text-rose-900">
                        {(() => {
                          // Get actual input values from form
                          const projectCosts = workflowData.projectCosts || 0;
                          const stars = workflowData.stars || 0;
                          const actualPrice = workflowData.averagePrice || 0;
                          
                          // Calculate hotel voucher value based on stars
                          const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : stars === 2 ? 25 : stars === 1 ? 20 : 30;
                          
                          // Formula: Vertragsvolumen Estimate = (Project Costs / Hotel Voucher Value) × (Actual Price × 0.75) × 1.1
                          const vertragsvolumenEstimate = (projectCosts / voucherValue) * (actualPrice * 0.75) * 1.1;
                          
                          // Result = Vertragsvolumen Estimate - Finanzierung: Projektkosten brutto
                          const result = vertragsvolumenEstimate - projectCosts;
                          
                          // Show 0 when no meaningful input data
                          if (projectCosts === 0 && actualPrice === 0) {
                            return '0';
                          }
                          
                          return Math.round(result).toLocaleString('de-DE');
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Column G - Gesamtvertragswert (brutto) */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-50/80 to-sky-50/60 backdrop-blur-sm border border-cyan-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-sky-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-cyan-800 break-words">Gesamtvertragswert (brutto)</span>
                      </div>
                      <div className="text-2xl font-black text-cyan-900">
                        {(() => {
                          // Get actual input values from form
                          const projectCosts = workflowData.projectCosts || 0;
                          const stars = workflowData.stars || 0;
                          const actualPrice = workflowData.averagePrice || 0;
                          
                          // Calculate hotel voucher value based on stars
                          const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : stars === 2 ? 25 : stars === 1 ? 20 : 30;
                          
                          // Formula: Vertragsvolumen Estimate = (Project Costs / Hotel Voucher Value) × (Actual Price × 0.75) × 1.1
                          const vertragsvolumenEstimate = (projectCosts / voucherValue) * (actualPrice * 0.75) * 1.1;
                          
                          // Show 0 when no meaningful input data
                          if (projectCosts === 0 && actualPrice === 0) {
                            return '0';
                          }
                          
                          return Math.round(vertragsvolumenEstimate).toLocaleString('de-DE');
                        })()}
                      </div>
                    </div>
                  </div>





                </div>

                {/* Second Row - Continuing Excel Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 px-4 sm:px-0">
                  
                  {/* Column H - Marge */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-50/80 to-emerald-50/60 backdrop-blur-sm border border-green-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-green-800 break-words">Marge</span>
                      </div>
                      <div className="text-2xl font-black text-green-900">
                        {(() => {
                          // Get actual input values from form
                          const projectCosts = workflowData.projectCosts || 0;
                          const stars = workflowData.stars || 0;
                          const actualPrice = workflowData.averagePrice || 0;
                          
                          // Calculate hotel voucher value based on stars
                          const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : stars === 2 ? 25 : stars === 1 ? 20 : 30;
                          
                          // Formula: Vertragsvolumen Estimate = (Project Costs / Hotel Voucher Value) × (Actual Price × 0.75) × 1.1
                          const vertragsvolumenEstimate = (projectCosts / voucherValue) * (actualPrice * 0.75) * 1.1;
                          
                          // Marge = Vertragsvolumen Estimate - Projektkosten brutto (absolute difference)
                          const marge = vertragsvolumenEstimate - projectCosts;
                          
                          // Show 0 when no meaningful input data
                          if (projectCosts === 0 && actualPrice === 0) {
                            return '-';
                          }
                          
                          return Math.round(marge).toLocaleString('de-DE');
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Column I - Vorsteuer Produktkauf */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-teal-50/80 to-cyan-50/60 backdrop-blur-sm border border-teal-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-cyan-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-teal-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-teal-800 break-words">Vorsteuer Produktkauf</span>
                      </div>
                      <div className="text-2xl font-black text-teal-900">
                        {(() => {
                          // Get actual input values from form
                          const projectCosts = workflowData.projectCosts || 0;
                          
                          // Vorsteuer Produktkauf = (Projektkosten × 1.19) - Projektkosten
                          // This calculates the 19% VAT amount
                          const vorsteuerProdukt = (projectCosts * 1.19) - projectCosts;
                          
                          // Show 0 when no meaningful input data
                          if (projectCosts === 0) {
                            return '-';
                          }
                          
                          return Math.round(vorsteuerProdukt).toLocaleString('de-DE');
                        })()}
                      </div>
                    </div>
                  </div>

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
                        {(() => {
                          // Get actual input values from form
                          const projectCosts = workflowData.projectCosts || 0;
                          const stars = workflowData.stars || 0;
                          const actualPrice = workflowData.averagePrice || 0;
                          
                          // Calculate hotel voucher value based on stars
                          const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : stars === 2 ? 25 : stars === 1 ? 20 : 30;
                          
                          // Formula: Vertragsvolumen Estimate = (Project Costs / Hotel Voucher Value) × (Actual Price × 0.75) × 1.1
                          const vertragsvolumenEstimate = (projectCosts / voucherValue) * (actualPrice * 0.75) * 1.1;
                          
                          // Vorsteuer Tripz Provision = (Vertragsvolumen Estimate × 0.19) × 0.23
                          const vorsteuerTripz = (vertragsvolumenEstimate * 0.19) * 0.23;
                          
                          // Show 0 when no meaningful input data
                          if (projectCosts === 0 && actualPrice === 0) {
                            return '-';
                          }
                          
                          return Math.round(vorsteuerTripz).toLocaleString('de-DE');
                        })()}
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
                        {(() => {
                          // Get actual input values from form
                          const projectCosts = workflowData.projectCosts || 0;
                          const stars = workflowData.stars || 0;
                          const actualPrice = workflowData.averagePrice || 0;
                          
                          // Calculate hotel voucher value based on stars
                          const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : stars === 2 ? 25 : stars === 1 ? 20 : 30;
                          
                          // Formula: Vertragsvolumen Estimate = (Project Costs / Hotel Voucher Value) × (Actual Price × 0.75) × 1.1
                          const vertragsvolumenEstimate = (projectCosts / voucherValue) * (actualPrice * 0.75) * 1.1;
                          
                          // Vorsteuer Produktkauf = (Projektkosten × 1.19) - Projektkosten
                          const vorsteuerProdukt = (projectCosts * 1.19) - projectCosts;
                          
                          // Vorsteuer Tripz Provision = (Vertragsvolumen Estimate × 0.19) × 0.23
                          const vorsteuerTripz = (vertragsvolumenEstimate * 0.19) * 0.23;
                          
                          // Netto Steuerzahlung = Vorsteuer Produktkauf - Vorsteuer Tripz Provision
                          const nettoSteuerzahlung = vorsteuerProdukt - vorsteuerTripz;
                          
                          // Show 0 when no meaningful input data
                          if (projectCosts === 0 && actualPrice === 0) {
                            return '-';
                          }
                          
                          return Math.round(nettoSteuerzahlung).toLocaleString('de-DE');
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Creative Profit Margin Percentage */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-yellow-50/80 to-orange-50/60 backdrop-blur-sm border border-yellow-200/50 p-4 shadow-md h-24">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-400 animate-pulse"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-50"></div>
                    <div className="flex flex-col space-y-2 h-full justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce flex-shrink-0"></div>
                        <span className="text-xs font-bold text-yellow-800 break-words">Profit Margin %</span>
                      </div>
                      <div className="text-2xl font-black text-yellow-900">
                        {(() => {
                          // Get actual input values from form
                          const projectCosts = workflowData.projectCosts || 0;
                          const stars = workflowData.stars || 0;
                          const actualPrice = workflowData.averagePrice || 0;
                          
                          // Calculate hotel voucher value based on stars
                          const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : stars === 2 ? 25 : stars === 1 ? 20 : 30;
                          
                          // Formula: Vertragsvolumen Estimate = (Project Costs / Hotel Voucher Value) × (Actual Price × 0.75) × 1.1
                          const vertragsvolumenEstimate = (projectCosts / voucherValue) * (actualPrice * 0.75) * 1.1;
                          
                          // Profit Margin = (Profit / Revenue) × 100
                          const profit = vertragsvolumenEstimate - projectCosts;
                          const profitMargin = vertragsvolumenEstimate > 0 ? (profit / vertragsvolumenEstimate) * 100 : 0;
                          
                          // Show 0 when no meaningful input data
                          if (projectCosts === 0 && actualPrice === 0) {
                            return '-';
                          }
                          
                          return Math.round(profitMargin).toLocaleString('de-DE') + '%';
                        })()}
                      </div>
                    </div>
                  </div>



                </div>


              </CardContent>
            </Card>
          </>
        );

      case 2:
        return (
          <div className="relative space-y-8">
            {/* Ultra-Modern Floating Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/80 via-emerald-50/60 to-cyan-50/40 backdrop-blur-3xl border border-white/50 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-blue-500/10 animate-gradient-x"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 animate-shimmer"></div>
              
              {/* Floating Particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-4 left-8 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl animate-float"></div>
                <div className="absolute top-12 right-16 w-12 h-12 bg-cyan-500/20 rounded-full blur-lg animate-float-delayed"></div>
                <div className="absolute bottom-8 left-1/3 w-8 h-8 bg-blue-500/20 rounded-full blur-md animate-float animation-delay-1000"></div>
              </div>
              
              <div className="relative p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                        <BarChart3 className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-emerald-400 rounded-2xl animate-ping opacity-20"></div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-700 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        Kostenvorteil Analyse
                      </h2>
                      <p className="text-gray-600 font-medium text-lg mt-1">Beyond Bookings vs. Direktbuchung</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse animation-delay-500"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse animation-delay-1000"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Comparison Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* Left Column - Kostenvorteil */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/90 via-blue-50/70 to-indigo-50/50 backdrop-blur-3xl border border-white/60 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 animate-shimmer"></div>
                
                <div className="relative p-8 space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-blue-900">Kostenvorteil</h3>
                  </div>

                  {/* Cost Breakdown Cards */}
                  <div className="space-y-4">
                    {/* Kosten für leeres Zimmer */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/50 p-4 backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 animate-pulse"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-blue-800">Kosten für leeres Zimmer</span>
                        <span className="text-xl font-black text-blue-900">25,00 €</span>
                      </div>
                    </div>

                    {/* Kosten für belegtes Zimmer */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/60 border border-indigo-200/50 p-4 backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 animate-pulse"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-indigo-800">Kosten für belegtes Zimmer</span>
                        <span className="text-xl font-black text-indigo-900">42,00 €</span>
                      </div>
                    </div>

                    {/* Reale Kosten */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-50/80 to-pink-50/60 border border-purple-200/50 p-4 backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-purple-800">Reale Kosten</span>
                        <span className="text-xl font-black text-purple-900">17,00 €</span>
                      </div>
                    </div>

                    {/* Produkt Section */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-50/80 to-gray-50/60 border border-slate-200/50 p-4 backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-slate-400 to-gray-400 animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Produkt</div>
                        <div className="text-sm font-semibold text-slate-800">Finanzierung Rechnung für Dritte</div>
                      </div>
                    </div>

                    {/* Kosten in Nächten */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-50/80 to-cyan-50/60 border border-teal-200/50 p-4 backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400 animate-pulse"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-teal-800">Kosten in Nächten</span>
                        <span className="text-xl font-black text-teal-900">
                          {(() => {
                            const projectCosts = workflowData.projectCosts || 0;
                            const stars = workflowData.stars || 0;
                            const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                            const roomnights = Math.round(projectCosts / voucherValue);
                            return roomnights > 0 ? roomnights.toLocaleString('de-DE') : '667';
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Hauptvorteil Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 p-6 shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 animate-pulse"></div>
                      <div className="relative text-center">
                        <div className="text-white/80 text-sm font-bold uppercase tracking-wider mb-2">Kostenvorteil</div>
                        <div className="text-4xl font-black text-white mb-1">
                          {(() => {
                            const projectCosts = workflowData.projectCosts || 20000;
                            const stars = workflowData.stars || 3;
                            const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                            const roomnights = Math.round(projectCosts / voucherValue);
                            
                            // Beyond Bookings real costs calculation
                            const beyondBookingsCosts = roomnights * 17; // 17€ per voucher
                            const steuerbelastung = 1800.90;
                            const nettoKosten = projectCosts / 1.19;
                            const steuervorteil = nettoKosten * 0.19;
                            const gesamtkosten = beyondBookingsCosts + steuerbelastung - steuervorteil;
                            
                            const advantage = projectCosts - gesamtkosten;
                            return advantage.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                          })()}
                        </div>
                        <div className="text-white/90 text-lg font-semibold">
                          Kostenvorteil auf Nettobetrag: {(() => {
                            const projectCosts = workflowData.projectCosts || 20000;
                            const stars = workflowData.stars || 3;
                            const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                            const roomnights = Math.round(projectCosts / voucherValue);
                            
                            // Beyond Bookings real costs calculation
                            const beyondBookingsCosts = roomnights * 17;
                            const steuerbelastung = 1800.90;
                            const nettoKosten = projectCosts / 1.19;
                            const steuervorteil = nettoKosten * 0.19;
                            const gesamtkosten = beyondBookingsCosts + steuerbelastung - steuervorteil;
                            
                            const factor = gesamtkosten / projectCosts;
                            return factor.toFixed(2);
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Selbstbeschaffung vs Beyond Bookings */}
              <div className="space-y-6">
                
                {/* Selbstbeschaffung Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/90 via-orange-50/70 to-amber-50/50 backdrop-blur-3xl border border-white/60 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/10 animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-500 animate-shimmer"></div>
                  
                  <div className="relative p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                        <Calculator className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-xl font-black text-orange-900">Selbstbeschaffung</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-orange-50/80 rounded-xl border border-orange-200/50">
                        <div className="text-xs font-bold text-orange-700 uppercase tracking-wider">Abo-Kosten</div>
                        <div className="text-lg font-black text-orange-900">
                          {(() => {
                            const projectCosts = workflowData.projectCosts || 20000;
                            const nettoKosten = projectCosts / 1.19; // Remove VAT to get netto
                            return nettoKosten.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                          })()}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-amber-50/80 rounded-xl border border-amber-200/50">
                        <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Kosten Netto</div>
                        <div className="text-lg font-black text-amber-900">
                          {(() => {
                            const projectCosts = workflowData.projectCosts || 20000;
                            const nettoKosten = projectCosts / 1.19; // Remove VAT to get netto
                            return nettoKosten.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                          })()}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-orange-50/80 rounded-xl border border-orange-200/50">
                        <div className="text-xs font-bold text-orange-700 uppercase tracking-wider">Mehrwertsteuer 7%</div>
                        <div className="text-lg font-black text-orange-900">0 €</div>
                      </div>
                      <div className="text-center p-3 bg-amber-50/80 rounded-xl border border-amber-200/50">
                        <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Mehrwertsteuer 19%</div>
                        <div className="text-lg font-black text-amber-900">
                          {(() => {
                            const projectCosts = workflowData.projectCosts || 20000;
                            const nettoKosten = projectCosts / 1.19;
                            const mwst19 = nettoKosten * 0.19;
                            return mwst19.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="text-center p-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl">
                      <div className="text-white/80 text-xs font-bold uppercase tracking-wider">Kosten brutto</div>
                      <div className="text-2xl font-black text-white">
                        {(() => {
                          const projectCosts = workflowData.projectCosts || 20000;
                          return projectCosts.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Beyond Bookings Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/90 via-emerald-50/70 to-green-50/50 backdrop-blur-3xl border border-white/60 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/10 animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500 animate-shimmer"></div>
                  
                  <div className="relative p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                        <Star className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-xl font-black text-emerald-900">Beyond Bookings Lösung</h4>
                    </div>

                    <div className="space-y-3">
                      {/* Schritt 1 Header */}
                      <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider border-b border-emerald-200 pb-2">
                        Schritt 1: Verkauf unverkaufter Zimmer an Beyond Bookings
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/50">
                        <span className="text-sm font-bold text-emerald-800">
                          {(() => {
                            const projectCosts = workflowData.projectCosts || 20000;
                            const stars = workflowData.stars || 3;
                            const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                            const roomnights = Math.round(projectCosts / voucherValue);
                            return `${roomnights} Gutscheine × ${voucherValue}€ je Gutschein`;
                          })()}
                        </span>
                        <span className="text-lg font-black text-emerald-900">
                          {(() => {
                            const projectCosts = workflowData.projectCosts || 20000;
                            const stars = workflowData.stars || 3;
                            const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                            const roomnights = Math.round(projectCosts / voucherValue);
                            const totalValue = roomnights * voucherValue;
                            return totalValue.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                          })()}
                        </span>
                      </div>

                      <div className="text-xs text-emerald-600 p-2 bg-emerald-50/50 rounded">
                        Das entspricht 8,1% des Leerstands p.a.
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-green-50/80 rounded-xl border border-green-200/50">
                          <div className="text-xs font-bold text-green-700 uppercase">MWST-Wert-Beträge 7%</div>
                          <div className="text-lg font-black text-green-900">0 €</div>
                        </div>
                        <div className="text-center p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/50">
                          <div className="text-xs font-bold text-emerald-700 uppercase">MWST-Wert-Beträge 19%</div>
                          <div className="text-lg font-black text-emerald-900">
                            {(() => {
                              const projectCosts = workflowData.projectCosts || 20000;
                              const stars = workflowData.stars || 3;
                              const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                              const roomnights = Math.round(projectCosts / voucherValue);
                              const totalVoucherValue = roomnights * voucherValue;
                              const mwst19 = totalVoucherValue * 0.19 / 1.19;
                              return mwst19.toLocaleString('de-DE', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' €';
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Splitting Frühstück pro Zimmer */}
                      <div className="text-right p-2 bg-emerald-50/50 rounded">
                        <div className="text-xs text-emerald-600">5 Splitting Frühstück pro Zimmer</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Ihre Kosten mit Beyond Bookings</div>
                        <div className="flex justify-between items-center p-3 bg-blue-50/80 rounded-xl border border-blue-200/50">
                          <span className="text-sm font-bold text-blue-800">
                            {(() => {
                              const projectCosts = workflowData.projectCosts || 20000;
                              const stars = workflowData.stars || 3;
                              const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                              const roomnights = Math.round(projectCosts / voucherValue);
                              return `17€ je Gutschein × ${roomnights} Roomnights`;
                            })()}
                          </span>
                          <span className="text-lg font-black text-blue-900">
                            {(() => {
                              const projectCosts = workflowData.projectCosts || 20000;
                              const stars = workflowData.stars || 3;
                              const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                              const roomnights = Math.round(projectCosts / voucherValue);
                              const costs = roomnights * 17;
                              return costs.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-indigo-50/80 rounded-xl border border-indigo-200/50">
                          <span className="text-sm font-bold text-indigo-800">Steuerbelastung</span>
                          <span className="text-lg font-black text-indigo-900">1.800,90 €</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50/80 rounded-xl border border-purple-200/50">
                          <span className="text-sm font-bold text-purple-800">Steuervorteil</span>
                          <span className="text-lg font-black text-purple-900">
                            {(() => {
                              const projectCosts = workflowData.projectCosts || 20000;
                              const nettoKosten = projectCosts / 1.19;
                              const mwst19 = nettoKosten * 0.19;
                              return mwst19.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="text-center p-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl">
                        <div className="text-white/80 text-xs font-bold uppercase tracking-wider">Gesamtkosten</div>
                        <div className="text-2xl font-black text-white">
                          {(() => {
                            const projectCosts = workflowData.projectCosts || 20000;
                            const stars = workflowData.stars || 3;
                            const voucherValue = stars === 5 ? 50 : stars === 4 ? 40 : stars === 3 ? 30 : 30;
                            const roomnights = Math.round(projectCosts / voucherValue);
                            const costs = roomnights * 17;
                            const steuerbelastung = 1800.90;
                            const nettoKosten = projectCosts / 1.19;
                            const steuervorteil = nettoKosten * 0.19;
                            const gesamtkosten = costs + steuerbelastung - steuervorteil;
                            return gesamtkosten.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-center">
              <div className="flex space-x-6">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="group relative overflow-hidden px-8 py-4 backdrop-blur-sm border-gray-300/50 hover:border-blue-400/60 transition-all duration-500 rounded-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-500"></div>
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  <span className="relative z-10 font-semibold">Zurück zum Kalkulator</span>
                </Button>
                <Button 
                  onClick={nextStep}
                  className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 hover:from-emerald-700 hover:via-cyan-700 hover:to-blue-700 shadow-xl shadow-emerald-500/25 transition-all duration-500 rounded-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-blue-400/20 animate-pulse"></div>
                  <span className="relative z-10 font-semibold text-white">PDF-Bericht erstellen</span>
                  <ArrowRight className="h-5 w-5 ml-2 text-white" />
                </Button>
              </div>
            </div>
          </div>
        );
      case 3:
        return <PowerPointEditor workflowData={workflowData} onBack={prevStep} />;
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
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 cursor-pointer transform hover:scale-110 ${
                        currentStep === step.id
                          ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/50'
                          : currentStep > step.id
                          ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/50'
                          : canProceedToStep(step.id)
                          ? 'border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md'
                          : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                      onClick={() => goToStep(step.id)}
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
                      <h3 className={`text-sm font-semibold cursor-pointer ${
                        currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                      }`} onClick={() => goToStep(step.id)}>
                        {step.title}
                      </h3>
                      <p className={`text-xs cursor-pointer ${
                        currentStep >= step.id ? 'text-gray-600' : 'text-gray-400'
                      }`} onClick={() => goToStep(step.id)}>
                        {step.description}
                      </p>
                      {canProceedToStep(step.id) && currentStep !== step.id && (
                        <p className="text-xs text-blue-500 mt-1 hover:text-blue-600">
                          Click to navigate
                        </p>
                      )}
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