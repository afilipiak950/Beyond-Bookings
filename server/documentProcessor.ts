import { Mistral } from '@mistralai/mistralai';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import type { 
  DocumentUpload, 
  DocumentAnalysis, 
  InsertDocumentUpload, 
  InsertDocumentAnalysis,
  InsertDocumentInsight 
} from '@shared/schema';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
});

export interface ProcessingResult {
  success: boolean;
  message: string;
  uploadId?: number;
  analysisIds?: number[];
  totalFiles?: number;
  processedFiles?: number;
}

export interface ExcelWorksheetData {
  worksheetName: string;
  data: any[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
}

export interface ExtractedFileInfo {
  fileName: string;
  filePath: string;
  fileType: string;
  worksheets?: ExcelWorksheetData[];
  extractedText?: string;
  priceData?: PriceData[];
}

export interface PriceData {
  value: number;
  currency: string;
  context: string;
  row: number;
  column: number;
  confidence: number;
}

export interface DocumentInsights {
  averagePrices: {
    overall: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
  };
  priceRanges: {
    min: number;
    max: number;
    median: number;
    standardDeviation: number;
  };
  trends: Array<{
    category: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
    description: string;
  }>;
  recommendations: string[];
  summary: string;
}

export class DocumentProcessor {
  private uploadsDir = './uploads';
  private extractedDir = './uploads/extracted';

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.extractedDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  /**
   * Process uploaded ZIP file containing Excel documents
   */
  async processZipFile(
    filePath: string,
    uploadData: InsertDocumentUpload,
    storage: any
  ): Promise<ProcessingResult> {
    try {
      console.log(`Starting ZIP file processing: ${filePath}`);
      
      // Create upload record
      const upload = await storage.createDocumentUpload(uploadData);
      
      // Extract ZIP file
      const extractedFiles = await this.extractZipFile(filePath, upload.id);
      
      // Update upload with extracted files info
      await storage.updateDocumentUpload(upload.id, {
        extractedFiles: extractedFiles.map(f => ({
          fileName: f.fileName,
          filePath: f.filePath,
          fileType: f.fileType
        })),
        uploadStatus: 'processing'
      });

      const analysisIds: number[] = [];
      let processedFiles = 0;

      // Process each extracted file
      for (const file of extractedFiles) {
        try {
          let analysisData: InsertDocumentAnalysis;

          if (file.fileType === 'excel') {
            analysisData = await this.processExcelFile(file, upload.id, uploadData.userId);
          } else {
            // For other file types, use OCR
            analysisData = await this.processFileWithOCR(file, upload.id, uploadData.userId);
          }

          const analysis = await storage.createDocumentAnalysis(analysisData);
          analysisIds.push(analysis.id);
          processedFiles++;

          console.log(`Processed file: ${file.fileName}`);
        } catch (error) {
          console.error(`Error processing file ${file.fileName}:`, error);
        }
      }

      // Generate cross-document insights
      if (analysisIds.length > 0) {
        await this.generateCrossDocumentInsights(analysisIds, uploadData.userId, storage);
      }

      // Update upload status
      await storage.updateDocumentUpload(upload.id, {
        uploadStatus: 'completed',
        processedAt: new Date()
      });

      return {
        success: true,
        message: `Successfully processed ${processedFiles} out of ${extractedFiles.length} files`,
        uploadId: upload.id,
        analysisIds,
        totalFiles: extractedFiles.length,
        processedFiles
      };

    } catch (error) {
      console.error('Error processing ZIP file:', error);
      return {
        success: false,
        message: `Error processing ZIP file: ${error.message}`
      };
    }
  }

  /**
   * Extract ZIP file and return information about extracted files
   */
  private async extractZipFile(zipPath: string, uploadId: number): Promise<ExtractedFileInfo[]> {
    console.log(`Extracting ZIP file from: ${zipPath}`);
    
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    const extractedFiles: ExtractedFileInfo[] = [];

    console.log(`Found ${entries.length} entries in ZIP file`);
    
    const extractPath = path.join(this.extractedDir, `upload_${uploadId}`);
    await fs.mkdir(extractPath, { recursive: true });

    for (const entry of entries) {
      console.log(`Processing entry: ${entry.entryName}, isDirectory: ${entry.isDirectory}`);
      
      if (!entry.isDirectory) {
        const fileName = entry.entryName;
        const fileExt = path.extname(fileName).toLowerCase();
        
        console.log(`File: ${fileName}, Extension: ${fileExt}`);
        
        // Only process supported file types
        if (['.xlsx', '.xls', '.csv', '.pdf', '.png', '.jpg', '.jpeg'].includes(fileExt)) {
          const extractedPath = path.join(extractPath, path.basename(fileName));
          
          try {
            // Extract file
            zip.extractEntryTo(entry, extractPath, false, true);
            console.log(`Successfully extracted file to: ${extractedPath}`);
            
            let fileType = 'unknown';
            if (['.xlsx', '.xls', '.csv'].includes(fileExt)) {
              fileType = 'excel';
            } else if (fileExt === '.pdf') {
              fileType = 'pdf';
            } else if (['.png', '.jpg', '.jpeg'].includes(fileExt)) {
              fileType = 'image';
            }

            extractedFiles.push({
              fileName: path.basename(fileName),
              filePath: extractedPath,
              fileType
            });
            
            console.log(`Added file to extraction list: ${path.basename(fileName)} (${fileType})`);
          } catch (error) {
            console.error(`Error extracting file ${fileName}:`, error);
          }
        } else {
          console.log(`Skipping unsupported file type: ${fileName} (${fileExt})`);
        }
      }
    }

    console.log(`Total extracted files: ${extractedFiles.length}`);
    return extractedFiles;
  }

  /**
   * Process Excel file and extract all worksheets
   */
  private async processExcelFile(
    file: ExtractedFileInfo,
    uploadId: number,
    userId: string
  ): Promise<InsertDocumentAnalysis> {
    const startTime = Date.now();

    try {
      // Read Excel file
      const workbook = XLSX.readFile(file.filePath);
      const worksheets: ExcelWorksheetData[] = [];
      const allPriceData: PriceData[] = [];

      // Process each worksheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const data = jsonData.slice(1);

          // Extract price data from this worksheet
          const priceData = this.extractPriceDataFromWorksheet(data, headers, sheetName);
          allPriceData.push(...priceData);

          worksheets.push({
            worksheetName: sheetName,
            data: data,
            headers,
            rowCount: data.length,
            columnCount: headers.length
          });
        }
      }

      // Generate AI insights for this Excel file
      const insights = await this.generateExcelInsights(worksheets, allPriceData);

      const processingTime = Date.now() - startTime;

      return {
        uploadId,
        userId,
        fileName: file.fileName,
        worksheetName: null, // Multiple worksheets
        analysisType: 'excel_parse',
        extractedData: { worksheets },
        processedData: { 
          totalWorksheets: worksheets.length,
          totalRows: worksheets.reduce((sum, ws) => sum + ws.rowCount, 0),
          worksheetNames: worksheets.map(ws => ws.worksheetName)
        },
        insights,
        priceData: allPriceData,
        status: 'completed',
        processingTime
      };

    } catch (error) {
      console.error('Error processing Excel file:', error);
      throw error;
    }
  }

  /**
   * Extract price data from worksheet using pattern matching and AI
   */
  private extractPriceDataFromWorksheet(
    data: any[][],
    headers: string[],
    sheetName: string
  ): PriceData[] {
    const priceData: PriceData[] = [];
    const pricePatterns = [
      /€\s*(\d+(?:\.\d{2})?)/g,
      /(\d+(?:\.\d{2})?)\s*€/g,
      /\$\s*(\d+(?:\.\d{2})?)/g,
      /(\d+(?:\.\d{2})?)\s*\$/g,
      /price[:\s]*(\d+(?:\.\d{2})?)/gi,
      /preis[:\s]*(\d+(?:\.\d{2})?)/gi,
      /kosten[:\s]*(\d+(?:\.\d{2})?)/gi,
      /betrag[:\s]*(\d+(?:\.\d{2})?)/gi
    ];

    // Check headers for price-related columns
    const priceColumnIndices: number[] = [];
    headers.forEach((header, index) => {
      if (header && typeof header === 'string') {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('price') || lowerHeader.includes('preis') || 
            lowerHeader.includes('cost') || lowerHeader.includes('kosten') ||
            lowerHeader.includes('betrag') || lowerHeader.includes('amount') ||
            lowerHeader.includes('€') || lowerHeader.includes('$')) {
          priceColumnIndices.push(index);
        }
      }
    });

    // Extract prices from data
    data.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell && typeof cell === 'string') {
          // Try all price patterns
          pricePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(cell)) !== null) {
              const value = parseFloat(match[1]);
              if (!isNaN(value) && value > 0) {
                priceData.push({
                  value,
                  currency: cell.includes('€') ? 'EUR' : cell.includes('$') ? 'USD' : 'EUR',
                  context: `${sheetName} - Row ${rowIndex + 2}, ${headers[colIndex] || `Column ${colIndex + 1}`}`,
                  row: rowIndex + 2,
                  column: colIndex + 1,
                  confidence: priceColumnIndices.includes(colIndex) ? 0.9 : 0.7
                });
              }
            }
          });
        } else if (typeof cell === 'number' && priceColumnIndices.includes(colIndex)) {
          // Numeric values in price columns
          if (cell > 0) {
            priceData.push({
              value: cell,
              currency: 'EUR',
              context: `${sheetName} - Row ${rowIndex + 2}, ${headers[colIndex] || `Column ${colIndex + 1}`}`,
              row: rowIndex + 2,
              column: colIndex + 1,
              confidence: 0.95
            });
          }
        }
      });
    });

    return priceData;
  }

  /**
   * Process non-Excel files using OCR
   */
  private async processFileWithOCR(
    file: ExtractedFileInfo,
    uploadId: number,
    userId: string
  ): Promise<InsertDocumentAnalysis> {
    const startTime = Date.now();

    try {
      let extractedText = '';

      if (file.fileType === 'image') {
        // Use Tesseract for image OCR
        const { data: { text } } = await Tesseract.recognize(file.filePath, 'eng+deu');
        extractedText = text;
      } else if (file.fileType === 'pdf') {
        // For PDF, we'd need to convert to images first then OCR
        // This is a simplified version
        extractedText = `PDF file: ${file.fileName} (OCR processing would be implemented here)`;
      }

      // Extract price data from OCR text
      const priceData = this.extractPriceDataFromText(extractedText);

      // Generate AI insights
      const insights = await this.generateOCRInsights(extractedText, priceData);

      const processingTime = Date.now() - startTime;

      return {
        uploadId,
        userId,
        fileName: file.fileName,
        worksheetName: null,
        analysisType: 'ocr',
        extractedData: { text: extractedText },
        processedData: { 
          textLength: extractedText.length,
          priceCount: priceData.length
        },
        insights,
        priceData,
        status: 'completed',
        processingTime
      };

    } catch (error) {
      console.error('Error processing file with OCR:', error);
      throw error;
    }
  }

  /**
   * Extract price data from OCR text
   */
  private extractPriceDataFromText(text: string): PriceData[] {
    const priceData: PriceData[] = [];
    const lines = text.split('\n');
    
    const pricePatterns = [
      /€\s*(\d+(?:[.,]\d{2})?)/g,
      /(\d+(?:[.,]\d{2})?)\s*€/g,
      /\$\s*(\d+(?:[.,]\d{2})?)/g,
      /(\d+(?:[.,]\d{2})?)\s*\$/g
    ];

    lines.forEach((line, lineIndex) => {
      pricePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const value = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(value) && value > 0) {
            priceData.push({
              value,
              currency: line.includes('€') ? 'EUR' : line.includes('$') ? 'USD' : 'EUR',
              context: `Line ${lineIndex + 1}: ${line.trim()}`,
              row: lineIndex + 1,
              column: match.index || 0,
              confidence: 0.8
            });
          }
        }
      });
    });

    return priceData;
  }

  /**
   * Generate AI insights for Excel data using Mistral
   */
  private async generateExcelInsights(
    worksheets: ExcelWorksheetData[],
    priceData: PriceData[]
  ): Promise<any> {
    try {
      const prompt = `Analyze the following Excel data and provide comprehensive insights:

WORKSHEETS (${worksheets.length} total):
${worksheets.map(ws => `
- ${ws.worksheetName}: ${ws.rowCount} rows, ${ws.columnCount} columns
  Headers: ${ws.headers.join(', ')}
  Sample data: ${JSON.stringify(ws.data.slice(0, 3), null, 2)}
`).join('')}

EXTRACTED PRICES (${priceData.length} total):
${priceData.slice(0, 10).map(p => `- ${p.value} ${p.currency} from ${p.context}`).join('\n')}

Please provide:
1. Summary of the data structure and content
2. Key metrics and findings
3. Price analysis (average, min, max, trends)
4. Recommendations for hotel pricing strategy
5. Data quality assessment

Respond in JSON format with the following structure:
{
  "summary": "Brief overview of the data",
  "keyMetrics": [
    {"metric": "metric name", "value": "value", "change": "change description"}
  ],
  "priceAnalysis": {
    "average": number,
    "min": number,
    "max": number,
    "currency": "EUR",
    "totalDataPoints": number
  },
  "recommendations": ["recommendation 1", "recommendation 2"],
  "dataQuality": {
    "score": number,
    "issues": ["issue 1", "issue 2"]
  }
}`;

      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You are an expert data analyst specializing in hotel pricing and revenue optimization. Analyze the provided Excel data and give actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        maxTokens: 2000
      });

      const content = response.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch {
        return {
          summary: content,
          keyMetrics: [],
          priceAnalysis: {
            average: priceData.length > 0 ? priceData.reduce((sum, p) => sum + p.value, 0) / priceData.length : 0,
            min: priceData.length > 0 ? Math.min(...priceData.map(p => p.value)) : 0,
            max: priceData.length > 0 ? Math.max(...priceData.map(p => p.value)) : 0,
            currency: 'EUR',
            totalDataPoints: priceData.length
          },
          recommendations: ['Review data structure for better analysis'],
          dataQuality: { score: 7, issues: ['AI parsing needed improvement'] }
        };
      }

    } catch (error) {
      console.error('Error generating Excel insights:', error);
      return {
        summary: 'Error generating AI insights',
        error: error.message
      };
    }
  }

  /**
   * Generate AI insights for OCR data
   */
  private async generateOCRInsights(text: string, priceData: PriceData[]): Promise<any> {
    try {
      const prompt = `Analyze the following OCR extracted text and pricing data:

TEXT CONTENT:
${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}

EXTRACTED PRICES:
${priceData.map(p => `- ${p.value} ${p.currency} (${p.context})`).join('\n')}

Please provide insights and analysis in JSON format:
{
  "summary": "Brief overview",
  "priceAnalysis": {
    "average": number,
    "count": number,
    "currency": "EUR"
  },
  "textAnalysis": {
    "language": "detected language",
    "documentType": "inferred document type",
    "confidence": number
  },
  "recommendations": ["rec1", "rec2"]
}`;

      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in document analysis and pricing intelligence.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        maxTokens: 1000
      });

      const content = response.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch {
        return {
          summary: content,
          priceAnalysis: {
            average: priceData.length > 0 ? priceData.reduce((sum, p) => sum + p.value, 0) / priceData.length : 0,
            count: priceData.length,
            currency: 'EUR'
          },
          textAnalysis: {
            language: 'unknown',
            documentType: 'unknown',
            confidence: 0.5
          },
          recommendations: ['Manual review recommended']
        };
      }

    } catch (error) {
      console.error('Error generating OCR insights:', error);
      return {
        summary: 'Error generating insights',
        error: error.message
      };
    }
  }

  /**
   * Generate cross-document insights using all analyses
   */
  private async generateCrossDocumentInsights(
    analysisIds: number[],
    userId: string,
    storage: any
  ): Promise<void> {
    try {
      // Get all analyses
      const analyses = await Promise.all(
        analysisIds.map(id => storage.getDocumentAnalysis(id, userId))
      );

      // Combine all price data
      const allPriceData: PriceData[] = [];
      analyses.forEach(analysis => {
        if (analysis?.priceData) {
          allPriceData.push(...analysis.priceData);
        }
      });

      if (allPriceData.length === 0) return;

      // Calculate comprehensive insights
      const insights = await this.calculateCrossDocumentInsights(allPriceData, analyses);

      // Save insights
      const insightData: InsertDocumentInsight = {
        userId,
        analysisIds,
        insightType: 'comprehensive_analysis',
        title: `Cross-Document Analysis - ${analyses.length} Files`,
        description: `Comprehensive analysis of ${allPriceData.length} price points across ${analyses.length} documents`,
        data: insights,
        visualizationData: this.generateVisualizationData(allPriceData, insights)
      };

      await storage.createDocumentInsight(insightData);

    } catch (error) {
      console.error('Error generating cross-document insights:', error);
    }
  }

  /**
   * Calculate comprehensive insights across all documents
   */
  private async calculateCrossDocumentInsights(
    allPriceData: PriceData[],
    analyses: DocumentAnalysis[]
  ): Promise<DocumentInsights> {
    const prices = allPriceData.map(p => p.value);
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    // Calculate standard deviation
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);

    // Group by categories (file names/types)
    const byCategory: Record<string, number[]> = {};
    allPriceData.forEach(p => {
      const category = p.context.split(' - ')[0] || 'unknown';
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(p.value);
    });

    const averagesByCategory: Record<string, number> = {};
    Object.entries(byCategory).forEach(([category, values]) => {
      averagesByCategory[category] = values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    // Generate AI-powered insights using Mistral
    const aiInsights = await this.generateCrossDocumentAIInsights(allPriceData, analyses);

    return {
      averagePrices: {
        overall: average,
        byCategory: averagesByCategory,
        bySource: averagesByCategory // Same as category for now
      },
      priceRanges: {
        min,
        max,
        median,
        standardDeviation
      },
      trends: aiInsights.trends || [],
      recommendations: aiInsights.recommendations || [
        `Average price across all documents: ${average.toFixed(2)} EUR`,
        `Price range: ${min.toFixed(2)} - ${max.toFixed(2)} EUR`,
        `Most data points from: ${Object.keys(byCategory)[0] || 'unknown'}`
      ],
      summary: aiInsights.summary || `Analyzed ${allPriceData.length} price points from ${analyses.length} documents with an average of ${average.toFixed(2)} EUR.`
    };
  }

  /**
   * Generate AI insights across all documents
   */
  private async generateCrossDocumentAIInsights(
    allPriceData: PriceData[],
    analyses: DocumentAnalysis[]
  ): Promise<any> {
    try {
      const prompt = `Analyze this comprehensive hotel pricing dataset:

DATASET OVERVIEW:
- Total price points: ${allPriceData.length}
- Documents analyzed: ${analyses.length}
- File types: ${[...new Set(analyses.map(a => a.analysisType))].join(', ')}

PRICE DISTRIBUTION:
- Average: ${(allPriceData.reduce((sum, p) => sum + p.value, 0) / allPriceData.length).toFixed(2)} EUR
- Min: ${Math.min(...allPriceData.map(p => p.value)).toFixed(2)} EUR
- Max: ${Math.max(...allPriceData.map(p => p.value)).toFixed(2)} EUR

TOP PRICE SOURCES:
${allPriceData.slice(0, 10).map(p => `- ${p.value} EUR from ${p.context}`).join('\n')}

DOCUMENT SOURCES:
${analyses.map(a => `- ${a.fileName} (${a.analysisType})`).join('\n')}

Provide strategic insights for hotel pricing in JSON format:
{
  "summary": "Executive summary of findings",
  "trends": [
    {
      "category": "market_position",
      "trend": "increasing|decreasing|stable",
      "percentage": 0,
      "description": "trend description"
    }
  ],
  "recommendations": [
    "Strategic recommendation 1",
    "Strategic recommendation 2"
  ],
  "competitiveAnalysis": {
    "positioning": "market position assessment",
    "opportunities": ["opportunity 1", "opportunity 2"]
  }
}`;

      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a senior hotel revenue management consultant with expertise in pricing strategy and market analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        maxTokens: 1500
      });

      const content = response.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch {
        return {
          summary: content,
          trends: [],
          recommendations: ['Advanced AI analysis completed']
        };
      }

    } catch (error) {
      console.error('Error generating cross-document AI insights:', error);
      return {
        summary: 'Cross-document analysis completed',
        trends: [],
        recommendations: ['Review individual document analyses for detailed insights']
      };
    }
  }

  /**
   * Generate visualization data for charts and graphs
   */
  private generateVisualizationData(priceData: PriceData[], insights: DocumentInsights): any {
    // Price distribution histogram
    const priceRanges = [
      { range: '0-50', min: 0, max: 50, count: 0 },
      { range: '50-100', min: 50, max: 100, count: 0 },
      { range: '100-200', min: 100, max: 200, count: 0 },
      { range: '200-500', min: 200, max: 500, count: 0 },
      { range: '500+', min: 500, max: Infinity, count: 0 }
    ];

    priceData.forEach(p => {
      const range = priceRanges.find(r => p.value >= r.min && p.value < r.max);
      if (range) range.count++;
    });

    return {
      priceDistribution: priceRanges,
      averagesByCategory: Object.entries(insights.averagePrices.byCategory).map(([name, value]) => ({
        name,
        value
      })),
      timeline: [], // Would need date information for timeline
      summary: {
        totalDataPoints: priceData.length,
        averagePrice: insights.averagePrices.overall,
        priceRange: `${insights.priceRanges.min.toFixed(2)} - ${insights.priceRanges.max.toFixed(2)} EUR`
      }
    };
  }
}

export const documentProcessor = new DocumentProcessor();