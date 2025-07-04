import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileSpreadsheet,
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
      queryClient.invalidateQueries({ queryKey: ["/api/document-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/document-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/document-insights"] });
      toast({
        title: "Upload erfolgreich",
        description: "Ihre Datei wird jetzt analysiert. Dies kann einige Minuten dauern.",
      });
      setIsUploading(false);
      setUploadProgress(0);
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
                <p className="text-sm text-gray-600 text-center">
                  Die Datei wird hochgeladen und analysiert. Dies kann einige Minuten dauern.
                </p>
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
          <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="uploads" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Uploads ({uploadsArray.length})
            </TabsTrigger>
            <TabsTrigger value="analyses" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analysen ({analysesArray.length})
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              KI-Erkenntnisse ({insightsArray.length})
            </TabsTrigger>
          </TabsList>

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
                                  {upload.extractedFiles.length} Dateien extrahiert
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
    </AppLayout>
  );
}