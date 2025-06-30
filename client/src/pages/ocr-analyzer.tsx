import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Eye, 
  BarChart3,
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  FileSpreadsheet
} from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
}

interface OCRAnalysis {
  id: string;
  fileId: string;
  fileName: string;
  extractedText: string;
  insights: {
    summary: string;
    keyMetrics: Array<{
      metric: string;
      value: string;
      change?: string;
    }>;
    recommendations: string[];
    trends: Array<{
      category: string;
      trend: 'up' | 'down' | 'stable';
      description: string;
    }>;
  };
  createdAt: string;
  processingTime: number;
}

export default function OCRAnalyzer() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch analyses
  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/ocr-analyses"],
    retry: false,
  });

  const analysesData = analyses as OCRAnalysis[] || [];

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/api/ocr/upload', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded successfully",
        description: "OCR analysis is now processing...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ocr-analyses"] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // OCR analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest(`/api/ocr/analyze/${fileId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Analysis completed",
        description: "OCR analysis has been processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ocr-analyses"] });
    },
    onError: (error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete analysis mutation
  const deleteMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      return apiRequest(`/api/ocr/analysis/${analysisId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Analysis deleted",
        description: "OCR analysis has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ocr-analyses"] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        uploadMutation.mutate(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload Excel files only (.xlsx, .xls)",
          variant: "destructive",
        });
      }
    });
  }, [uploadMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: true,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const selectedAnalysis = analysesData.find(a => a.id === selectedFile);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-600" />
              OCR File Analyzer
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload Excel files and get AI-powered insights using Mistral OCR
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              Bulk Analyze
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysesData.length}</div>
              <p className="text-xs text-muted-foreground">Files analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analysesData.filter(a => a.insights).length}
              </div>
              <p className="text-xs text-muted-foreground">Successfully processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analysesData.filter(a => !a.insights).length}
              </div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Processing</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analysesData.length > 0 
                  ? `${(analysesData.reduce((sum, a) => sum + (a.processingTime || 0), 0) / analysesData.length).toFixed(1)}s`
                  : '0s'
                }
              </div>
              <p className="text-xs text-muted-foreground">Time per file</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Upload and List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Excel Files</CardTitle>
                <CardDescription>
                  Drop your Excel files here for OCR analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : 'border-muted-foreground/25 hover:border-blue-500 hover:bg-muted/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the files here...</p>
                  ) : (
                    <div>
                      <p className="font-medium">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Excel files (.xlsx, .xls) up to 50MB
                      </p>
                    </div>
                  )}
                </div>
                {uploadMutation.isPending && (
                  <div className="mt-4">
                    <Progress value={60} className="w-full" />
                    <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Files List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Files</CardTitle>
                <CardDescription>
                  Your uploaded files and analysis status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : analysesData.length > 0 ? (
                  <div className="space-y-3">
                    {analysesData.map((analysis) => (
                      <div 
                        key={analysis.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedFile === analysis.id 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedFile(analysis.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium text-sm truncate max-w-32">
                                {analysis.fileName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(analysis.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(analysis.insights ? 'completed' : 'processing')}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(analysis.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No files uploaded yet. Start by uploading your first Excel file.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  {selectedAnalysis 
                    ? `Analysis for ${selectedAnalysis.fileName}`
                    : 'Select a file to view analysis results'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAnalysis ? (
                  <Tabs defaultValue="insights" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="insights">AI Insights</TabsTrigger>
                      <TabsTrigger value="text">Extracted Text</TabsTrigger>
                      <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="insights" className="space-y-6">
                      {selectedAnalysis.insights ? (
                        <div className="space-y-6">
                          {/* Summary */}
                          <div>
                            <h4 className="font-semibold mb-3">Executive Summary</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {selectedAnalysis.insights.summary}
                            </p>
                          </div>

                          {/* Recommendations */}
                          <div>
                            <h4 className="font-semibold mb-3">Recommendations</h4>
                            <ul className="space-y-2">
                              {selectedAnalysis.insights.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span className="text-sm">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Trends */}
                          <div>
                            <h4 className="font-semibold mb-3">Trends Analysis</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedAnalysis.insights.trends.map((trend, index) => (
                                <div key={index} className="p-4 border rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{trend.category}</span>
                                    <Badge variant={
                                      trend.trend === 'up' ? 'default' : 
                                      trend.trend === 'down' ? 'destructive' : 'secondary'
                                    }>
                                      {trend.trend}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {trend.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                          <p className="text-sm text-muted-foreground">
                            Analysis is being processed. This may take a few minutes...
                          </p>
                          <Button 
                            className="mt-4"
                            onClick={() => analyzeMutation.mutate(selectedAnalysis.id)}
                            disabled={analyzeMutation.isPending}
                          >
                            {analyzeMutation.isPending ? 'Processing...' : 'Retry Analysis'}
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="text" className="space-y-4">
                      <div>
                        <Label htmlFor="extracted-text">Extracted Text Content</Label>
                        <Textarea
                          id="extracted-text"
                          value={selectedAnalysis.extractedText || 'No text extracted yet...'}
                          readOnly
                          className="mt-2 min-h-[400px] font-mono text-sm"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="metrics" className="space-y-4">
                      {selectedAnalysis.insights?.keyMetrics ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedAnalysis.insights.keyMetrics.map((metric, index) => (
                            <Card key={index}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{metric.metric}</p>
                                    <p className="text-2xl font-bold">{metric.value}</p>
                                  </div>
                                  {metric.change && (
                                    <Badge variant={
                                      metric.change.startsWith('+') ? 'default' : 'destructive'
                                    }>
                                      {metric.change}
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground">
                            No metrics available yet. Analysis is in progress.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Select a file from the list to view its analysis results
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}