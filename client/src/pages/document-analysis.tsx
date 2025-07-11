import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileSpreadsheet,
  Folder,
  Zap,
  Brain,
  Download,
  Eye,
  Trash2,
  RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";

interface DocumentUpload {
  id: number;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  fileType: string;
  uploadStatus: string;
  extractedFiles?: any[];
  createdAt: string;
  processedAt?: string;
}

interface DocumentAnalysis {
  id: number;
  fileName: string;
  worksheetName?: string;
  analysisType: string;
  status: string;
  insights?: any;
  priceData?: any[];
  processingTime?: number;
  createdAt: string;
  completedAt?: string;
}

interface DocumentInsight {
  id: number;
  insightType: string;
  title: string;
  description?: string;
  data: any;
  visualizationData?: any;
  createdAt: string;
}

export default function DocumentAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [showComprehensiveAnalysis, setShowComprehensiveAnalysis] = useState(false);
  const [comprehensiveAnalysisData, setComprehensiveAnalysisData] = useState<any>(null);
  const [isRunningComprehensiveAnalysis, setIsRunningComprehensiveAnalysis] = useState(false);

  // Mass AI Summary Generation
  const massAISummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ai/mass-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "KI-Zusammenfassung abgeschlossen",
        description: `${data.processedDocuments} Dokumente wurden erfolgreich analysiert.`,
      });
      
      // Refresh the analyses to show new insights
      queryClient.invalidateQueries({ queryKey: ['/api/document-analyses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler bei der KI-Zusammenfassung",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    },
  });

  const generateMassAISummary = async () => {
    try {
      await massAISummaryMutation.mutateAsync();
    } catch (error) {
      console.error('Mass AI Summary failed:', error);
    }
  };

  // Queries
  const { data: uploads = [], isLoading: uploadsLoading } = useQuery({
    queryKey: ["/api/document-uploads"],
    enabled: !!user,
  });

  const { data: analyses = [], isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/document-analyses"],
    enabled: !!user,
  });

  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/document-insights"],
    enabled: !!user,
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return await apiRequest("/api/document-uploads", "POST", formData);
    },
    onSuccess: () => {
      toast({
        title: "Upload erfolgreich",
        description: "Datei wird extrahiert und automatisch mit OCR analysiert.",
      });
      setIsUploading(false);
      setUploadProgress(0);
      
      // Immediate refresh to show extracted files
      queryClient.invalidateQueries({ queryKey: ["/api/document-uploads"] });
      
      // Progressive refresh to show OCR progress
      const refreshInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/document-uploads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/document-analyses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/document-insights"] });
      }, 2000); // Refresh every 2 seconds
      
      // Stop refreshing after 30 seconds
      setTimeout(() => {
        clearInterval(refreshInterval);
      }, 30000);
      
      // Auto-trigger OCR processing for all documents after upload
      console.log("Auto-triggering OCR processing after upload...");
      setTimeout(() => {
        console.log("Starting automatic OCR processing...");
        processAllWithOCR();
      }, 5000); // Wait 5 seconds for data to be ready
    },
    onError: (error: any) => {
      toast({
        title: "Upload fehlgeschlagen",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/document-uploads/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/document-analyses"] });
      toast({
        title: "Datei gelöscht",
        description: "Die Datei und alle zugehörigen Analysen wurden entfernt.",
      });
    },
  });

  const ocrMutation = useMutation({
    mutationFn: async ({ uploadId, fileName }: { uploadId: number; fileName: string }) => {
      return await apiRequest('/api/process-ocr', 'POST', { uploadId, fileName });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/document-uploads'] });
      toast({
        title: "OCR erfolgreich",
        description: `OCR-Verarbeitung für ${data.analysis?.fileName} abgeschlossen.`,
      });
    },
    onError: (error) => {
      console.error('OCR error:', error);
      toast({
        title: "OCR-Fehler",
        description: "Fehler bei der OCR-Verarbeitung.",
        variant: "destructive",
      });
    }
  });

  const massOcrMutation = useMutation({
    mutationFn: async (files: { uploadId: number; fileName: string }[]) => {
      const results = [];
      for (const file of files) {
        try {
          const result = await apiRequest('/api/process-ocr', 'POST', file);
          results.push({ ...file, success: true, result });
        } catch (error) {
          results.push({ ...file, success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/document-uploads'] });
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      toast({
        title: "Mass-OCR abgeschlossen",
        description: `${successful} Dateien erfolgreich verarbeitet${failed > 0 ? `, ${failed} fehlgeschlagen` : ''}.`,
      });
    },
    onError: (error) => {
      console.error('Mass OCR error:', error);
      toast({
        title: "Mass-OCR-Fehler",
        description: "Fehler bei der Mass-OCR-Verarbeitung.",
        variant: "destructive",
      });
    }
  });

  const processWithOCR = (uploadId: number, fileName: string) => {
    toast({
      title: "OCR wird verarbeitet",
      description: `Starte OCR-Verarbeitung für ${fileName}...`,
    });
    ocrMutation.mutate({ uploadId, fileName });
  };

  // Comprehensive AI Analysis Mutation
  const comprehensiveAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ai/comprehensive-analysis', 'POST', {});
      return await response.json();
    },
    onSuccess: (data) => {
      setComprehensiveAnalysisData(data);
      setShowComprehensiveAnalysis(true);
      setIsRunningComprehensiveAnalysis(false);
      toast({
        title: "KI-Analyse abgeschlossen",
        description: `${data.totalDocuments} Dokumente analysiert mit ${data.totalNumbers} Zahlen extrahiert.`,
      });
    },
    onError: (error) => {
      console.error('Comprehensive analysis error:', error);
      setIsRunningComprehensiveAnalysis(false);
      toast({
        title: "Analyse-Fehler",
        description: "Fehler bei der umfassenden KI-Analyse.",
        variant: "destructive",
      });
    },
  });

  const runComprehensiveAnalysis = () => {
    if (analyses.length === 0) {
      toast({
        title: "Keine Dokumente",
        description: "Bitte laden Sie zuerst Dokumente hoch, um eine Analyse durchzuführen.",
        variant: "destructive",
      });
      return;
    }
    
    setIsRunningComprehensiveAnalysis(true);
    comprehensiveAnalysisMutation.mutate();
  };

  const processAllWithOCR = () => {
    // Collect all files that haven't been processed yet
    const filesToProcess = [];
    
    console.log("=== MASS OCR DEBUG START ===");
    console.log(`Total uploads: ${uploadsArray.length}`);
    console.log(`Total analyses: ${analysesArray.length}`);
    
    uploadsArray.forEach(upload => {
      console.log(`\nProcessing upload ${upload.id}: ${upload.fileName}`);
      if (upload.extractedFiles && Array.isArray(upload.extractedFiles)) {
        console.log(`  Found ${upload.extractedFiles.length} extracted files`);
        upload.extractedFiles.forEach((fileInfo: any) => {
          // Check if file hasn't been processed with OCR yet
          const hasOcrAnalysis = analysesArray.some((analysis: any) => 
            analysis.fileName === fileInfo.fileName && analysis.analysisType === 'mistral_ocr'
          );
          
          // Debug: Log file types being checked
          console.log(`  File: ${fileInfo.fileName}, Type: ${fileInfo.fileType}, HasOCR: ${hasOcrAnalysis}`);
          
          // Support more file types including common image formats
          const supportedTypes = ['pdf', 'image', 'excel', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'];
          
          // Check if file type is supported - handle both direct types and file extensions
          const fileType = fileInfo.fileType?.toLowerCase();
          const fileName = fileInfo.fileName?.toLowerCase();
          const isSupported = supportedTypes.includes(fileType) || 
                             fileName?.endsWith('.pdf') || 
                             fileName?.endsWith('.png') || 
                             fileName?.endsWith('.jpg') || 
                             fileName?.endsWith('.jpeg') || 
                             fileName?.endsWith('.gif') || 
                             fileName?.endsWith('.bmp') || 
                             fileName?.endsWith('.tiff') || 
                             fileName?.endsWith('.webp');
          
          if (!hasOcrAnalysis && isSupported) {
            console.log(`  ✓ Adding file to process queue: ${fileInfo.fileName} (${fileInfo.fileType})`);
            filesToProcess.push({
              uploadId: upload.id,
              fileName: fileInfo.fileName
            });
          } else if (hasOcrAnalysis) {
            console.log(`  ⏭️ Skipping already processed file: ${fileInfo.fileName}`);
          } else {
            console.log(`  ❌ Skipping unsupported file type: ${fileInfo.fileName} (${fileInfo.fileType})`);
            console.log(`  File extension check: ${fileName?.split('.').pop()}`);
          }
        });
      } else {
        console.log(`  No extracted files found for upload ${upload.id}`);
      }
    });
    
    console.log(`\n=== MASS OCR SUMMARY ===`);
    console.log(`Found ${filesToProcess.length} files to process:`, filesToProcess);
    console.log("=== MASS OCR DEBUG END ===");
    
    if (filesToProcess.length === 0) {
      toast({
        title: "Keine Dateien zu verarbeiten",
        description: "Alle unterstützten Dateien wurden bereits mit OCR verarbeitet.",
      });
      return;
    }
    
    toast({
      title: "Mass-OCR gestartet",
      description: `Verarbeite ${filesToProcess.length} Dateien mit OCR...`,
    });
    
    massOcrMutation.mutate(filesToProcess);
  };

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(20);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  // Calculate aggregated insights
  // Type casting for safety
  const analysesArray = (analyses as DocumentAnalysis[]) || [];
  const uploadsArray = (uploads as DocumentUpload[]) || [];
  const insightsArray = (insights as DocumentInsight[]) || [];
  
  const totalPricePoints = analysesArray.reduce((sum: number, analysis: DocumentAnalysis) => 
    sum + (analysis.priceData?.length || 0), 0
  );

  // Handle document click to show OCR content
  const handleDocumentClick = (fileInfo: any) => {
    // Find the corresponding analysis with OCR content
    const ocrAnalysis = analysesArray.find(
      (analysis: any) => analysis.fileName === fileInfo.fileName && analysis.analysisType === 'mistral_ocr'
    );
    
    // Also check for regular analyses with extracted text
    const regularAnalysis = analysesArray.find(
      (analysis: any) => analysis.fileName === fileInfo.fileName && analysis.extractedData?.text
    );
    
    const analysis = ocrAnalysis || regularAnalysis;
    
    if (analysis) {
      setSelectedDocument({
        ...fileInfo,
        ocrContent: analysis.extractedData?.text || 'Kein OCR-Inhalt verfügbar',
        insights: analysis.insights,
        priceData: analysis.priceData
      });
      setDocumentDialogOpen(true);
    } else {
      // Show available content even without OCR
      setSelectedDocument({
        ...fileInfo,
        ocrContent: `Dateiname: ${fileInfo.fileName}\nDateityp: ${fileInfo.fileType?.toUpperCase() || 'UNBEKANNT'}\nPfad: ${fileInfo.originalPath || fileInfo.fileName}\n\nDiese Datei wurde noch nicht durch OCR verarbeitet oder enthält keinen extrahierten Text.`,
        insights: null,
        priceData: []
      });
      setDocumentDialogOpen(true);
    }
  };

  const averagePrice = analysesArray.length > 0 
    ? analysesArray.reduce((sum: number, analysis: DocumentAnalysis) => {
        const prices = analysis.priceData?.map((p: any) => p.value) || [];
        return sum + (prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0);
      }, 0) / analysesArray.filter((a: DocumentAnalysis) => a.priceData?.length).length
    : 0;

  const processingProgress = uploadsArray.length > 0 
    ? (uploadsArray.filter((u: DocumentUpload) => u.uploadStatus === 'completed').length / uploadsArray.length) * 100
    : 0;

  return (
    <AppLayout>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-100/60 backdrop-blur-xl border border-blue-200/40 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-indigo-500/10 animate-gradient-x"></div>
          <div className="relative">
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                  <Brain className="h-8 w-8 text-white animate-pulse" />
                </div>
                <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-blue-400 animate-ping opacity-20"></div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-800 via-indigo-700 to-blue-800 bg-clip-text text-transparent">
                  KI-Dokumentenanalyse
                </h1>
                <p className="text-lg text-blue-700 font-medium mt-2">
                  Analysieren Sie Excel-Dateien mit modernster KI-Technologie
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Dokumente</p>
                    <p className="text-2xl font-bold text-gray-900">{uploadsArray.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Analysepunkte</p>
                    <p className="text-2xl font-bold text-gray-900">{totalPricePoints}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Ø Preis</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {averagePrice > 0 ? `${averagePrice.toFixed(2)} €` : '—'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Verarbeitung</p>
                    <p className="text-2xl font-bold text-gray-900">{processingProgress.toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white/60 to-gray-50/40 backdrop-blur-xl border border-white/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Upload className="h-6 w-6 text-blue-600" />
              <span className="bg-gradient-to-r from-blue-700 to-blue-600 bg-clip-text text-transparent">
                Dokumente hochladen
              </span>
            </CardTitle>
            <CardDescription>
              Laden Sie ZIP-Dateien mit Excel-Dokumenten hoch für die KI-Analyse
            </CardDescription>
            {uploadsArray.length > 0 && (
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={processAllWithOCR}
                  disabled={massOcrMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {massOcrMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      OCR verarbeitet...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Alle OCR verarbeiten
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => runComprehensiveAnalysis()}
                  disabled={isRunningComprehensiveAnalysis || analyses.length === 0}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  {isRunningComprehensiveAnalysis ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      KI-Analyse läuft...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Umfassende KI-Analyse
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => generateMassAISummary()}
                  disabled={massAISummaryMutation.isPending || analyses.length === 0}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                >
                  {massAISummaryMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      KI-Zusammenfassung läuft...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      KI-Zusammenfassung für alle
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isUploading ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-blue-600">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="font-medium">Verarbeitung läuft...</span>
                  </div>
                </div>
                <Progress value={uploadProgress} className="w-full" />
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    Die Datei wird hochgeladen und analysiert. Dies kann einige Minuten dauern.
                  </p>
                  <div className="text-xs text-gray-500">
                    • Dateien werden extrahiert und sofort angezeigt<br/>
                    • OCR-Verarbeitung läuft automatisch im Hintergrund<br/>
                    • Fortschritt wird alle 2 Sekunden aktualisiert
                  </div>
                </div>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50/50 scale-105'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-gray-900">
                      {isDragActive ? 'Datei hier ablegen...' : 'Dateien hierher ziehen oder klicken'}
                    </p>
                    <p className="text-gray-600 mt-2">
                      Unterstützte Formate: ZIP, XLSX, XLS, CSV (max. 100MB)
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="secondary">ZIP</Badge>
                    <Badge variant="secondary">XLSX</Badge>
                    <Badge variant="secondary">XLS</Badge>
                    <Badge variant="secondary">CSV</Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Tabs */}
        <Tabs defaultValue="uploads" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full grid-cols-4 bg-white/50 backdrop-blur-sm">
              <TabsTrigger value="uploads" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Uploads ({uploadsArray.length})
              </TabsTrigger>
              <TabsTrigger value="analyses" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analysen ({analysesArray.length})
              </TabsTrigger>
              <TabsTrigger value="ocr" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Mistral OCR ({analysesArray.filter(a => a.analysisType === 'mistral_ocr').length})
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                KI-Erkenntnisse ({insightsArray.length})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2 ml-4">
              <Button
                onClick={processAllWithOCR}
                disabled={massOcrMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {massOcrMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verarbeite...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Alle OCR verarbeiten
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Debug: Log all files and their current state
                  console.log("=== DEBUG: All Files Analysis ===");
                  uploadsArray.forEach(upload => {
                    console.log(`Upload ${upload.id}: ${upload.fileName}`);
                    if (upload.extractedFiles && Array.isArray(upload.extractedFiles)) {
                      upload.extractedFiles.forEach((fileInfo: any) => {
                        const hasOcrAnalysis = analysesArray.some((analysis: any) => 
                          analysis.fileName === fileInfo.fileName && analysis.analysisType === 'mistral_ocr'
                        );
                        console.log(`  - File: ${fileInfo.fileName} (${fileInfo.fileType}) - OCR: ${hasOcrAnalysis ? 'YES' : 'NO'}`);
                      });
                    }
                  });
                  console.log("=== DEBUG: Analyses Found ===");
                  analysesArray.forEach(analysis => {
                    console.log(`Analysis ${analysis.id}: ${analysis.fileName} (${analysis.analysisType})`);
                  });
                }}
                className="text-xs"
              >
                Debug
              </Button>
            </div>
          </div>

          {/* Uploads Tab */}
          <TabsContent value="uploads" className="space-y-4">
            {uploadsLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-4 text-gray-600">Lade Uploads...</p>
              </div>
            ) : uploadsArray.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-50/60 to-white/40 backdrop-blur-xl border border-gray-200/40">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Noch keine Dateien hochgeladen</p>
                  <p className="text-gray-500 mt-2">
                    Laden Sie Ihre erste ZIP-Datei hoch, um mit der Analyse zu beginnen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {uploadsArray.map((upload: DocumentUpload) => (
                  <Card key={upload.id} className="relative overflow-hidden bg-gradient-to-br from-white/60 to-gray-50/30 backdrop-blur-xl border border-white/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{upload.originalFileName}</h3>
                            <p className="text-sm text-gray-600">
                              {(upload.fileSize / 1024 / 1024).toFixed(2)} MB • {upload.fileType.toUpperCase()}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge 
                                variant={upload.uploadStatus === 'completed' ? 'default' : 
                                        upload.uploadStatus === 'processing' ? 'secondary' : 'destructive'}
                              >
                                {upload.uploadStatus === 'completed' ? 'Abgeschlossen' :
                                 upload.uploadStatus === 'processing' ? 'Verarbeitung' : 'Ausstehend'}
                              </Badge>
                              {upload.extractedFiles && (
                                <Badge variant="outline">
                                  {Array.isArray(upload.extractedFiles) ? upload.extractedFiles.length : 0} Dateien extrahiert
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(upload.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Enhanced Folder Structure Display */}
                      {upload.extractedFiles && Array.isArray(upload.extractedFiles) && upload.extractedFiles.length > 0 && (
                        <div className="mt-6 border-t border-gray-200/50 pt-4">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <Folder className="h-4 w-4 text-blue-600" />
                            Detaillierte Ordnerstruktur
                          </h4>
                          
                          {/* Organize files by folder */}
                          {(() => {
                            const folderMap = new Map<string, any[]>();
                            
                            upload.extractedFiles.forEach((fileInfo: any) => {
                              const folderPath = fileInfo.folderPath || 'Root';
                              if (!folderMap.has(folderPath)) {
                                folderMap.set(folderPath, []);
                              }
                              folderMap.get(folderPath)?.push(fileInfo);
                            });
                            
                            return Array.from(folderMap.entries()).map(([folderPath, files]) => (
                              <div key={folderPath} className="mb-4">
                                {/* Folder Header */}
                                <div className="flex items-center gap-2 mb-3 p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-lg border border-blue-200/30">
                                  <Folder className="h-5 w-5 text-blue-600" />
                                  <span className="font-medium text-blue-900">
                                    {folderPath === 'Root' ? '📁 Root-Verzeichnis' : `📁 ${folderPath}`}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {files.length} {files.length === 1 ? 'Datei' : 'Dateien'}
                                  </Badge>
                                </div>
                                
                                {/* Files in this folder */}
                                <div className="space-y-3 pl-4">
                                  {files.map((fileInfo: any, index: number) => (
                                    <div 
                                      key={index} 
                                      className="bg-gray-50/50 rounded-lg p-4 border border-gray-200/30 cursor-pointer hover:bg-gray-100/70 hover:border-gray-300/50 transition-all duration-200 hover:shadow-md"
                                      onClick={() => handleDocumentClick(fileInfo)}
                                    >
                                      <div className="flex items-center gap-3 mb-2">
                                        {fileInfo.fileType === 'excel' ? (
                                          <FileSpreadsheet className="h-5 w-5 text-green-600 flex-shrink-0" />
                                        ) : fileInfo.fileType === 'pdf' ? (
                                          <FileText className="h-5 w-5 text-red-600 flex-shrink-0" />
                                        ) : (
                                          <FileText className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                          <h5 className="font-medium text-gray-900">{fileInfo.fileName}</h5>
                                          <p className="text-sm text-gray-600">
                                            {fileInfo.fileType?.toUpperCase() || 'UNKNOWN'} • {fileInfo.originalPath || fileInfo.fileName}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            const hasOcrAnalysis = analysesArray.some((analysis: any) => 
                                              analysis.fileName === fileInfo.fileName && analysis.analysisType === 'mistral_ocr'
                                            );
                                            const hasRegularAnalysis = analysesArray.some((analysis: any) => 
                                              analysis.fileName === fileInfo.fileName && analysis.extractedData?.text
                                            );
                                            const isProcessing = fileInfo.ocrProcessed === false && ocrMutation.isPending;
                                            
                                            if (hasOcrAnalysis) {
                                              return (
                                                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                                  ✓ OCR abgeschlossen
                                                </Badge>
                                              );
                                            } else if (hasRegularAnalysis) {
                                              return (
                                                <Badge variant="secondary" className="text-xs">
                                                  Daten verfügbar
                                                </Badge>
                                              );
                                            } else if (isProcessing) {
                                              return (
                                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 animate-pulse">
                                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                  OCR läuft...
                                                </Badge>
                                              );
                                            } else if (fileInfo.ocrProcessed === false) {
                                              return (
                                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                                                  OCR ausstehend
                                                </Badge>
                                              );
                                            } else {
                                              return (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-xs h-6 px-2"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    processWithOCR(upload.id, fileInfo.fileName);
                                                  }}
                                                >
                                                  <Zap className="h-3 w-3 mr-1" />
                                                  OCR verarbeiten
                                                </Button>
                                              );
                                            }
                                          })()}
                                          <Eye className="h-4 w-4 text-blue-600" />
                                        </div>
                                      </div>
                                      
                                      {/* Worksheet Details for Excel Files */}
                                      {fileInfo.worksheets && Array.isArray(fileInfo.worksheets) && fileInfo.worksheets.length > 0 && (
                                        <div className="ml-8 mt-3 space-y-2">
                                          <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            Arbeitsblätter ({fileInfo.worksheets.length}):
                                          </p>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {fileInfo.worksheets.map((worksheet: any, wsIndex: number) => (
                                              <div key={wsIndex} className="bg-white/60 rounded-md p-2 border border-gray-200/40">
                                                <div className="flex items-center gap-2 text-sm">
                                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                  <span className="font-medium text-gray-800">
                                                    {typeof worksheet === 'string' ? worksheet : worksheet.name}
                                                  </span>
                                                </div>
                                                {typeof worksheet === 'object' && (worksheet.rowCount || worksheet.columnCount) && (
                                                  <div className="flex gap-2 mt-1">
                                                    {worksheet.rowCount && (
                                                      <Badge variant="secondary" className="text-xs">
                                                        {worksheet.rowCount} Zeilen
                                                      </Badge>
                                                    )}
                                                    {worksheet.columnCount && (
                                                      <Badge variant="outline" className="text-xs">
                                                        {worksheet.columnCount} Spalten
                                                      </Badge>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analyses Tab */}
          <TabsContent value="analyses" className="space-y-4">
            {analysesLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-4 text-gray-600">Lade Analysen...</p>
              </div>
            ) : analysesArray.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-50/60 to-white/40 backdrop-blur-xl border border-gray-200/40">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Noch keine Analysen verfügbar</p>
                  <p className="text-gray-500 mt-2">
                    Analysen werden automatisch erstellt, sobald Dateien hochgeladen werden.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {analysesArray.map((analysis: DocumentAnalysis) => (
                  <Card key={analysis.id} className="relative overflow-hidden bg-gradient-to-br from-white/60 to-gray-50/30 backdrop-blur-xl border border-white/30">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                              <Zap className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{analysis.fileName}</h3>
                              {analysis.worksheetName && (
                                <p className="text-sm text-gray-600">Arbeitsblatt: {analysis.worksheetName}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500">Typ</p>
                              <p className="font-medium">{analysis.analysisType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Status</p>
                              <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                                {analysis.status === 'completed' ? 'Abgeschlossen' : 'In Bearbeitung'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Preispunkte</p>
                              <p className="font-medium">{analysis.priceData?.length || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Verarbeitung</p>
                              <p className="font-medium">
                                {analysis.processingTime ? `${(analysis.processingTime / 1000).toFixed(1)}s` : '—'}
                              </p>
                            </div>
                          </div>

                          {analysis.insights && (
                            <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-200/30">
                              <h4 className="font-medium text-blue-900 mb-2">KI-Erkenntnisse</h4>
                              <p className="text-sm text-blue-800">
                                {analysis.insights.summary || 'Keine Zusammenfassung verfügbar'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* OCR Results Tab */}
          <TabsContent value="ocr" className="space-y-4">
            {analysesLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-4 text-gray-600">Lade OCR-Ergebnisse...</p>
              </div>
            ) : analysesArray.filter(a => a.analysisType === 'mistral_ocr').length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-50/60 to-white/40 backdrop-blur-xl border border-gray-200/40">
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Noch keine OCR-Ergebnisse verfügbar</p>
                  <p className="text-gray-500 mt-2">
                    OCR-Ergebnisse werden automatisch erstellt, sobald Bilddateien oder PDFs hochgeladen werden.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {analysesArray.filter(a => a.analysisType === 'mistral_ocr').map((analysis: DocumentAnalysis) => (
                  <Card key={analysis.id} className="relative overflow-hidden bg-gradient-to-br from-white/60 to-emerald-50/30 backdrop-blur-xl border border-emerald-200/40">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg">
                              <Zap className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">{analysis.fileName}</h3>
                              <p className="text-sm text-gray-600">
                                Mistral OCR • {analysis.processingTime ? `${analysis.processingTime}ms` : 'Verarbeitung'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                            {analysis.status}
                          </Badge>
                          <Badge variant="outline">
                            {analysis.insights?.textQuality?.confidence ? 
                              `${Math.round(analysis.insights.textQuality.confidence * 100)}% Genauigkeit` : 
                              'OCR'
                            }
                          </Badge>
                        </div>
                      </div>

                      {/* OCR Text Quality Indicators */}
                      {analysis.insights?.textQuality && (
                        <div className="mb-4 p-4 bg-white/50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">Textqualität</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-emerald-600">
                                {Math.round(analysis.insights.textQuality.confidence * 100)}%
                              </div>
                              <div className="text-gray-600">Genauigkeit</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-blue-600 capitalize">
                                {analysis.insights.textQuality.readability}
                              </div>
                              <div className="text-gray-600">Lesbarkeit</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-purple-600 capitalize">
                                {analysis.insights.textQuality.completeness}
                              </div>
                              <div className="text-gray-600">Vollständigkeit</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Extracted Text Display */}
                      {analysis.extractedData?.text && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Extrahierter Text</h4>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto">
                            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                              {analysis.extractedData.text}
                            </pre>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {analysis.extractedData.text.length} Zeichen extrahiert
                          </p>
                        </div>
                      )}

                      {/* Price Data Display */}
                      {analysis.priceData && analysis.priceData.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Gefundene Preise</h4>
                          <div className="grid gap-2">
                            {analysis.priceData.map((price: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{price.context}</span>
                                <span className="font-semibold text-green-600">
                                  {price.value} {price.currency}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comprehensive AI Insights */}
                      {analysis.insights && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Detaillierte KI-Analyse</h4>
                          
                          {/* Document Type */}
                          {analysis.insights.documentType && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Dokumenttyp:</span>
                              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                                {analysis.insights.documentType}
                              </Badge>
                            </div>
                          )}

                          {/* Key Findings */}
                          {analysis.insights.keyFindings && analysis.insights.keyFindings.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-2">Wichtige Erkenntnisse:</p>
                              <ul className="space-y-1">
                                {analysis.insights.keyFindings.map((finding: string, idx: number) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-emerald-500 mr-2 flex-shrink-0">•</span>
                                    <span>{finding}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Business Insights */}
                          {analysis.insights.businessInsights && analysis.insights.businessInsights.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-2">Geschäftseinblicke:</p>
                              <ul className="space-y-1">
                                {analysis.insights.businessInsights.map((insight: string, idx: number) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                    <span className="text-blue-500 mr-2 flex-shrink-0">💡</span>
                                    <span>{insight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Extracted Entities */}
                          {analysis.insights.extractedEntities && (
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-2">Extrahierte Entitäten:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {analysis.insights.extractedEntities.dates && analysis.insights.extractedEntities.dates.length > 0 && (
                                  <div className="bg-white/50 p-2 rounded">
                                    <strong>Daten:</strong> {analysis.insights.extractedEntities.dates.join(', ')}
                                  </div>
                                )}
                                {analysis.insights.extractedEntities.companies && analysis.insights.extractedEntities.companies.length > 0 && (
                                  <div className="bg-white/50 p-2 rounded">
                                    <strong>Unternehmen:</strong> {analysis.insights.extractedEntities.companies.join(', ')}
                                  </div>
                                )}
                                {analysis.insights.extractedEntities.emails && analysis.insights.extractedEntities.emails.length > 0 && (
                                  <div className="bg-white/50 p-2 rounded">
                                    <strong>E-Mails:</strong> {analysis.insights.extractedEntities.emails.join(', ')}
                                  </div>
                                )}
                                {analysis.insights.extractedEntities.phoneNumbers && analysis.insights.extractedEntities.phoneNumbers.length > 0 && (
                                  <div className="bg-white/50 p-2 rounded">
                                    <strong>Telefon:</strong> {analysis.insights.extractedEntities.phoneNumbers.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Recommendations */}
                          {analysis.insights.recommendations && analysis.insights.recommendations.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-2">Empfehlungen:</p>
                              <ul className="space-y-1">
                                {analysis.insights.recommendations.map((rec: string, idx: number) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                    <span className="text-green-500 mr-2 flex-shrink-0">→</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Processing Metadata */}
                      {analysis.extractedData?.ocrMetadata && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="font-medium text-gray-900 mb-2">Verarbeitungsdetails</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>Verarbeitungszeit: {analysis.processingTime || 0}ms</div>
                            <div>Methode: {analysis.extractedData.ocrMetadata.processingMethod || 'Mistral OCR'}</div>
                            {analysis.extractedData.ocrMetadata.imageWidth && (
                              <div>Bildgröße: {analysis.extractedData.ocrMetadata.imageWidth}x{analysis.extractedData.ocrMetadata.imageHeight}</div>
                            )}
                            {analysis.extractedData.ocrMetadata.pageCount && (
                              <div>Seiten: {analysis.extractedData.ocrMetadata.pageCount}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {insightsLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-4 text-gray-600">Lade Erkenntnisse...</p>
              </div>
            ) : insightsArray.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-50/60 to-white/40 backdrop-blur-xl border border-gray-200/40">
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Noch keine KI-Erkenntnisse verfügbar</p>
                  <p className="text-gray-500 mt-2">
                    KI-Erkenntnisse werden automatisch generiert, sobald mehrere Dokumente analysiert wurden.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {insightsArray.map((insight: DocumentInsight) => (
                  <Card key={insight.id} className="relative overflow-hidden bg-gradient-to-br from-white/60 to-purple-50/30 backdrop-blur-xl border border-purple-200/40">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <Brain className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">{insight.title}</h3>
                          {insight.description && (
                            <p className="text-gray-600 mb-4">{insight.description}</p>
                          )}
                          
                          {insight.data && (
                            <div className="bg-purple-50/50 rounded-lg p-4 border border-purple-200/30">
                              <h4 className="font-medium text-purple-900 mb-3">Zusammenfassung</h4>
                              <p className="text-sm text-purple-800 mb-4">
                                {insight.data.summary || 'Keine Zusammenfassung verfügbar'}
                              </p>
                              
                              {insight.data.recommendations && insight.data.recommendations.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-purple-900 mb-2">Empfehlungen</h5>
                                  <ul className="space-y-1">
                                    {insight.data.recommendations.slice(0, 3).map((rec: string, index: number) => (
                                      <li key={index} className="text-sm text-purple-800 flex items-start space-x-2">
                                        <span className="text-purple-600 mt-0.5">•</span>
                                        <span>{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Document OCR Content Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-gray-900 dark:text-white">{selectedDocument?.fileName}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                  OCR-Inhalt • {selectedDocument?.fileType?.toUpperCase() || 'DOKUMENT'}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Zeigt den extrahierten Text und die AI-Analyse für das ausgewählte Dokument an.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* OCR Content */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Extrahierter Text</h3>
                <Badge variant="outline" className="text-xs">
                  {selectedDocument?.ocrContent?.length || 0} Zeichen
                </Badge>
              </div>
              
              <ScrollArea className="h-60 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="p-4">
                  {selectedDocument?.ocrContent ? (
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                      {selectedDocument.ocrContent}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">Kein OCR-Inhalt verfügbar</p>
                      <p className="text-xs mt-1">Diese Datei wurde noch nicht durch OCR verarbeitet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Price Data */}
            {selectedDocument?.priceData && selectedDocument.priceData.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Gefundene Preise</h3>
                <div className="grid gap-2 max-h-32 overflow-y-auto">
                  {selectedDocument.priceData.map((price: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{price.context}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">
                          {price.value} {price.currency}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(price.confidence * 100)}% Genauigkeit
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {selectedDocument?.insights && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">KI-Erkenntnisse</h3>
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    {(() => {
                      try {
                        // Skip if insights is empty, null, or empty object
                        if (!selectedDocument.insights || 
                            selectedDocument.insights === '{}' ||
                            (typeof selectedDocument.insights === 'object' && Object.keys(selectedDocument.insights).length === 0)) {
                          return <div className="text-sm text-gray-500">Keine KI-Erkenntnisse verfügbar</div>;
                        }

                        // Parse the insights JSON string
                        let insights;
                        if (typeof selectedDocument.insights === 'string') {
                          // Handle empty string case
                          if (selectedDocument.insights.trim() === '' || selectedDocument.insights.trim() === '{}') {
                            return <div className="text-sm text-gray-500">Keine KI-Erkenntnisse verfügbar</div>;
                          }
                          insights = JSON.parse(selectedDocument.insights);
                        } else {
                          insights = selectedDocument.insights;
                        }
                        
                        // Check if insights is empty object after parsing
                        if (!insights || Object.keys(insights).length === 0) {
                          return <div className="text-sm text-gray-500">Keine KI-Erkenntnisse verfügbar</div>;
                        }
                        
                        // Check if insights has a summary property that contains the actual data
                        let actualInsights;
                        if (insights.summary) {
                          if (typeof insights.summary === 'string') {
                            // Clean up markdown formatting
                            const cleanSummary = insights.summary.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                            if (cleanSummary === '' || cleanSummary === '{}') {
                              return <div className="text-sm text-gray-500">Keine KI-Erkenntnisse verfügbar</div>;
                            }
                            actualInsights = JSON.parse(cleanSummary);
                          } else {
                            actualInsights = insights.summary;
                          }
                        } else {
                          actualInsights = insights;
                        }
                        
                        // Final check - if actualInsights is empty
                        if (!actualInsights || Object.keys(actualInsights).length === 0) {
                          return <div className="text-sm text-gray-500">Keine KI-Erkenntnisse verfügbar</div>;
                        }

                        return (
                          <>
                            {/* Document Type */}
                            {actualInsights.documentType && (
                              <div className="mb-3">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Dokumenttyp:</span>
                                <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800">
                                  {actualInsights.documentType}
                                </Badge>
                              </div>
                            )}

                            {/* Key Findings */}
                            {actualInsights.keyFindings && actualInsights.keyFindings.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Wichtige Erkenntnisse:</div>
                                <ul className="space-y-1">
                                  {actualInsights.keyFindings.map((finding: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                                      <span className="text-blue-500 mr-2 flex-shrink-0">•</span>
                                      <span>{finding}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Business Insights */}
                            {actualInsights.businessInsights && actualInsights.businessInsights.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Geschäftseinblicke:</div>
                                <ul className="space-y-1">
                                  {actualInsights.businessInsights.map((insight: any, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start bg-white dark:bg-gray-800 p-2 rounded mb-2">
                                      <span className="text-blue-500 mr-2 flex-shrink-0">💡</span>
                                      <div>
                                        {typeof insight === 'string' ? (
                                          <span>{insight}</span>
                                        ) : (
                                          <div>
                                            {insight.category && <div className="font-medium text-blue-600 mb-1">{insight.category}</div>}
                                            {insight.insight && <div>{insight.insight}</div>}
                                            {insight.insights && insight.insights.map((subInsight: string, subIdx: number) => (
                                              <div key={subIdx} className="ml-3 text-xs text-gray-600">→ {subInsight}</div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Recommendations */}
                            {actualInsights.recommendations && actualInsights.recommendations.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Empfehlungen:</div>
                                <ul className="space-y-1">
                                  {actualInsights.recommendations.map((rec: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                      <span className="text-green-500 mr-2 flex-shrink-0">→</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Summary */}
                            {actualInsights.summary && typeof actualInsights.summary === 'string' && (
                              <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Zusammenfassung:</div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                  {actualInsights.summary}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      } catch (error) {
                        console.error('Error parsing insights:', error);
                        return (
                          <div className="text-sm text-gray-500 text-center py-4">
                            <div className="text-gray-400 mb-2">⚠️</div>
                            <div>KI-Erkenntnisse werden noch verarbeitet...</div>
                            <div className="text-xs text-gray-400 mt-1">Bitte versuchen Sie es später erneut</div>
                          </div>
                        );
                      }
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Analysis Results Dialog */}
      <Dialog open={showComprehensiveAnalysis} onOpenChange={setShowComprehensiveAnalysis}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Umfassende KI-Analyse Ergebnisse
            </DialogTitle>
            <DialogDescription>
              Detaillierte Analyse aller hochgeladenen Dokumente mit KI-gestützter Datenextraktion
            </DialogDescription>
          </DialogHeader>
          
          {comprehensiveAnalysisData && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {comprehensiveAnalysisData.totalDocuments}
                    </div>
                    <div className="text-sm text-gray-600">Dokumente analysiert</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {comprehensiveAnalysisData.totalNumbers}
                    </div>
                    <div className="text-sm text-gray-600">Zahlen extrahiert</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {comprehensiveAnalysisData.totalInsights}
                    </div>
                    <div className="text-sm text-gray-600">Erkenntnisse gewonnen</div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-amber-600">
                      {comprehensiveAnalysisData.documentFindings?.filter(f => f.processingStatus === 'completed').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Erfolgreich verarbeitet</div>
                  </CardContent>
                </Card>
              </div>

              {/* Strategic Summary */}
              {comprehensiveAnalysisData.strategicSummary && (
                <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                  <CardHeader>
                    <CardTitle className="text-emerald-800">Strategische Zusammenfassung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {comprehensiveAnalysisData.strategicSummary.overallSummary && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Gesamtübersicht</h4>
                          <p className="text-gray-700">{comprehensiveAnalysisData.strategicSummary.overallSummary}</p>
                        </div>
                      )}
                      
                      {comprehensiveAnalysisData.strategicSummary.strategicRecommendations && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Strategische Empfehlungen</h4>
                          <ul className="space-y-1">
                            {comprehensiveAnalysisData.strategicSummary.strategicRecommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-emerald-600 mr-2">→</span>
                                <span className="text-gray-700">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Document Findings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Dokumentenbefunde</h3>
                {comprehensiveAnalysisData.documentFindings?.map((finding: any, idx: number) => (
                  <Card key={idx} className="border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{finding.documentName}</CardTitle>
                        <Badge variant={finding.processingStatus === 'completed' ? 'default' : 'destructive'}>
                          {finding.processingStatus}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {finding.analysis && finding.analysis.documentSummary && (
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-800 mb-2">Dokumentzusammenfassung</h5>
                          <p className="text-gray-700 text-sm">{finding.analysis.documentSummary}</p>
                        </div>
                      )}
                      
                      {finding.analysis && finding.analysis.numericalData && finding.analysis.numericalData.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-800 mb-2">Extrahierte Zahlen ({finding.numbersExtracted})</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                            {finding.analysis.numericalData.slice(0, 10).map((num: any, numIdx: number) => (
                              <div key={numIdx} className="bg-gray-50 p-2 rounded text-sm">
                                <div className="font-medium text-gray-800">{num.value}</div>
                                <div className="text-gray-600">{num.context}</div>
                              </div>
                            ))}
                          </div>
                          {finding.analysis.numericalData.length > 10 && (
                            <div className="text-xs text-gray-500 mt-2">
                              ... und {finding.analysis.numericalData.length - 10} weitere Zahlen
                            </div>
                          )}
                        </div>
                      )}
                      
                      {finding.analysis && finding.analysis.keyFindings && finding.analysis.keyFindings.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-800 mb-2">Wichtige Erkenntnisse</h5>
                          <ul className="space-y-1">
                            {finding.analysis.keyFindings.map((kf: string, kfIdx: number) => (
                              <li key={kfIdx} className="flex items-start text-sm">
                                <span className="text-blue-600 mr-2">•</span>
                                <span className="text-gray-700">{kf}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}