import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, FileText, Download, Eye, Share2, Loader2, CheckCircle } from "lucide-react";
import type { WorkflowData } from "@/pages/workflow";

interface Props {
  data: WorkflowData;
  onUpdate: (data: Partial<WorkflowData>) => void;
  onPrevious: () => void;
}

export default function PdfGenerationStep({ data, onUpdate, onPrevious }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const defaultOptions = {
    includeCharts: true,
    includeBranding: true,
    includeComparison: true,
    template: 'detailed' as const
  };

  const [pdfOptions, setPdfOptions] = useState(data.pdfOptions || defaultOptions);

  const updateOptions = (updates: Partial<typeof pdfOptions>) => {
    const newOptions = { ...pdfOptions, ...updates };
    setPdfOptions(newOptions);
    onUpdate({ pdfOptions: newOptions });
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create a mock PDF URL (in real app, this would come from the server)
      const mockPdfUrl = `/api/reports/generate-pdf?hotel=${encodeURIComponent(data.hotelName)}&template=${pdfOptions.template}`;
      setPdfUrl(mockPdfUrl);
      setPdfGenerated(true);
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (pdfUrl) {
      // In a real app, this would trigger the actual download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${data.hotelName}-pricing-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getTemplateDescription = (template: string) => {
    switch (template) {
      case 'standard':
        return 'Basic pricing information with essential calculations (2-3 pages)';
      case 'detailed':
        return 'Comprehensive report with charts, comparisons, and recommendations (5-7 pages)';
      case 'executive':
        return 'Executive summary with key insights and strategic recommendations (1-2 pages)';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <FileText className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Generate PDF Report</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Create a professional pricing report with your calculations, market analysis, and recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card className="glass-card border-purple-200/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Report Configuration
              </CardTitle>
              <CardDescription>
                Customize your PDF report options and template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Report Template</Label>
                <Select 
                  value={pdfOptions.template} 
                  onValueChange={(value: 'standard' | 'detailed' | 'executive') => updateOptions({ template: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      <div className="space-y-1">
                        <div className="font-medium">Standard Report</div>
                        <div className="text-xs text-gray-500">Essential pricing data</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="detailed">
                      <div className="space-y-1">
                        <div className="font-medium">Detailed Report</div>
                        <div className="text-xs text-gray-500">Comprehensive analysis</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="executive">
                      <div className="space-y-1">
                        <div className="font-medium">Executive Summary</div>
                        <div className="text-xs text-gray-500">Key insights only</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  {getTemplateDescription(pdfOptions.template)}
                </p>
              </div>

              <Separator />

              {/* Include Options */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Include in Report</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="charts"
                      checked={pdfOptions.includeCharts}
                      onCheckedChange={(checked) => updateOptions({ includeCharts: Boolean(checked) })}
                    />
                    <Label htmlFor="charts" className="text-sm">
                      Charts and Visualizations
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">
                    Include pricing charts, profit margin graphs, and market position visualizations
                  </p>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="branding"
                      checked={pdfOptions.includeBranding}
                      onCheckedChange={(checked) => updateOptions({ includeBranding: Boolean(checked) })}
                    />
                    <Label htmlFor="branding" className="text-sm">
                      Beyond Bookings Branding
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">
                    Include company logo and professional branding elements
                  </p>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="comparison"
                      checked={pdfOptions.includeComparison}
                      onCheckedChange={(checked) => updateOptions({ includeComparison: Boolean(checked) })}
                    />
                    <Label htmlFor="comparison" className="text-sm">
                      Competitor Comparison
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">
                    Include detailed competitor analysis and market positioning data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Summary */}
          <Card className="glass-card border-blue-200/30">
            <CardHeader>
              <CardTitle className="text-lg">Report Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Hotel Name:</span>
                  <span className="font-medium">{data.hotelName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Voucher Price:</span>
                  <span className="font-medium">€{data.voucherPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Price (incl. VAT):</span>
                  <span className="font-medium">€{data.calculationResult?.totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Profit Margin:</span>
                  <span className="font-medium">€{data.calculationResult?.profitMargin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Market Position:</span>
                  <span className="font-medium">#{data.marketAnalysis?.positionRanking}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview and Actions */}
        <div className="space-y-6">
          {!pdfGenerated ? (
            <Card className="glass-card border-gray-200/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                      <h3 className="text-lg font-semibold">Generating PDF Report</h3>
                      <p className="text-gray-600">Creating your professional pricing report...</p>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">This may take a few moments</div>
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Processing calculations and market data
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileText className="h-12 w-12 mx-auto text-gray-400" />
                      <h3 className="text-lg font-semibold">Ready to Generate</h3>
                      <p className="text-gray-600">Click below to create your professional pricing report</p>
                      <Button 
                        onClick={generatePDF}
                        className="bg-purple-600 hover:bg-purple-700"
                        size="lg"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate PDF Report
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card border-green-200/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Report Generated Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">
                    {data.hotelName} - Pricing Report
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>Template: {pdfOptions.template.charAt(0).toUpperCase() + pdfOptions.template.slice(1)}</div>
                    <div>Generated: {new Date().toLocaleDateString()}</div>
                    <div>File size: ~2.3 MB</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={downloadPDF}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF Report
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="text-center">
                  <h4 className="font-semibold mb-2">What's Next?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Your pricing report is ready! You can now use these insights to optimize your hotel's pricing strategy.
                  </p>
                  <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Features */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">What's Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Detailed pricing calculations with VAT breakdown</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Market position analysis and competitor comparison</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Profit margin optimization recommendations</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Professional charts and visualizations</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Executive summary with key insights</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Comparison
        </Button>
        <div className="flex gap-2">
          {/* Complete badge hidden as requested */}
        </div>
      </div>
    </div>
  );
}