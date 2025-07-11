import { db } from "./db";
import { documentAnalyses } from "@shared/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import OpenAI from "openai";

/**
 * Insight Restorer - Intelligently restores and generates AI insights for documents
 * This service ensures documents maintain their AI summaries while generating new ones when needed
 */
export class InsightRestorer {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Restore insights for documents that need them
   * This function is smarter than the aggressive fresh analysis
   */
  async restoreInsights(userId: number): Promise<{ processed: number, skipped: number, failed: number }> {
    console.log('Starting intelligent insight restoration...');
    
    // Get all analyses for this user
    const analyses = await db.query.documentAnalyses.findMany({
      where: eq(documentAnalyses.userId, userId),
      orderBy: [documentAnalyses.createdAt],
    });

    console.log(`Found ${analyses.length} documents to check`);
    
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const analysis of analyses) {
      try {
        // Skip if this analysis already has good insights
        if (this.hasGoodInsights(analysis.insights)) {
          console.log(`✓ Skipping ${analysis.fileName} - already has good insights`);
          skipped++;
          continue;
        }

        // Skip if no extracted data
        if (!this.hasExtractedData(analysis.extractedData)) {
          console.log(`- Skipping ${analysis.fileName} - no extracted data`);
          skipped++;
          continue;
        }

        console.log(`🔄 Processing ${analysis.fileName} - generating new insights`);
        
        // Generate new insights
        const newInsights = await this.generateInsights(analysis);
        
        if (newInsights) {
          // Update the analysis with new insights
          await db.update(documentAnalyses)
            .set({ insights: newInsights })
            .where(eq(documentAnalyses.id, analysis.id));
          
          processed++;
          console.log(`✓ Generated insights for ${analysis.fileName}`);
        } else {
          failed++;
          console.log(`✗ Failed to generate insights for ${analysis.fileName}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error processing ${analysis.fileName}:`, error);
        failed++;
        
        // If quota exceeded, stop processing
        if (error.status === 429 || error.code === 'insufficient_quota') {
          console.log('OpenAI quota exceeded - stopping restoration');
          break;
        }
      }
    }

    return { processed, skipped, failed };
  }

  /**
   * Check if insights are good and should be preserved
   */
  private hasGoodInsights(insights: any): boolean {
    if (!insights) return false;
    
    // Handle string insights
    if (typeof insights === 'string') {
      if (insights.trim() === '' || insights.trim() === '{}') return false;
      try {
        const parsed = JSON.parse(insights);
        return this.hasComprehensiveInsights(parsed);
      } catch {
        return insights.length > 50; // Raw text insights with decent length
      }
    }
    
    // Handle object insights
    if (typeof insights === 'object') {
      return this.hasComprehensiveInsights(insights);
    }
    
    return false;
  }

  /**
   * Check if insights contain comprehensive analysis data
   */
  private hasComprehensiveInsights(insights: any): boolean {
    if (!insights || typeof insights !== 'object') return false;
    
    // Check for new comprehensive analysis structure
    const hasStatisticalData = insights.statisticalData && Array.isArray(insights.statisticalData) && insights.statisticalData.length > 0;
    const hasCalculationBreakdown = insights.calculationBreakdown && Array.isArray(insights.calculationBreakdown) && insights.calculationBreakdown.length > 0;
    const hasKeyMetrics = insights.keyMetrics && Array.isArray(insights.keyMetrics) && insights.keyMetrics.length > 0;
    const hasFinancialSummary = insights.financialSummary && typeof insights.financialSummary === 'object';
    const hasBusinessInsights = insights.businessInsights && Array.isArray(insights.businessInsights) && insights.businessInsights.length > 0;
    
    // For now, force regeneration of all insights to get the new comprehensive format
    // Later we can check: Must have at least 3 of these comprehensive analysis components
    // const comprehensiveCount = [hasStatisticalData, hasCalculationBreakdown, hasKeyMetrics, hasFinancialSummary, hasBusinessInsights].filter(Boolean).length;
    // return comprehensiveCount >= 3;
    
    // Force regeneration by always returning false for now
    return false;
  }

  /**
   * Check if insight object has meaningful content
   */
  private isValidInsightObject(obj: any): boolean {
    if (!obj || Object.keys(obj).length === 0) return false;
    
    // Check for meaningful content
    const hasContent = (
      (obj.summary && obj.summary.length > 10) ||
      (obj.keyFindings && obj.keyFindings.length > 0) ||
      (obj.documentType && obj.documentType.length > 0) ||
      (obj.businessInsights && obj.businessInsights.length > 0) ||
      (obj.recommendations && obj.recommendations.length > 0)
    );
    
    return hasContent;
  }

  /**
   * Check if analysis has extracted data
   */
  private hasExtractedData(extractedData: any): boolean {
    if (!extractedData) return false;
    
    if (typeof extractedData === 'string') {
      return extractedData.trim().length > 0;
    }
    
    if (typeof extractedData === 'object') {
      return (
        extractedData.text ||
        extractedData.worksheets ||
        Object.keys(extractedData).length > 0
      );
    }
    
    return false;
  }

  /**
   * Generate AI insights for a document analysis
   */
  private async generateInsights(analysis: any): Promise<any> {
    try {
      // Prepare document text
      let documentText = '';
      if (analysis.extractedData) {
        if (typeof analysis.extractedData === 'string') {
          documentText = analysis.extractedData;
        } else if (analysis.extractedData.text) {
          documentText = analysis.extractedData.text;
        } else if (analysis.extractedData.worksheets) {
          // For Excel files, combine worksheet data
          documentText = analysis.extractedData.worksheets.map((ws: any) => {
            return `=== ${ws.worksheetName} ===\n${ws.data?.map((row: any) => row.join('\t')).join('\n') || 'No data'}`;
          }).join('\n\n');
        } else if (typeof analysis.extractedData === 'object') {
          documentText = JSON.stringify(analysis.extractedData);
        }
      }

      if (!documentText || documentText.trim().length === 0) {
        return null;
      }

      // Truncate if too long
      if (documentText.length > 4000) {
        documentText = documentText.substring(0, 4000) + '... [truncated]';
      }

      const prompt = `You are an expert financial analyst. Extract EVERY calculation, formula, and number from this document. Be extremely thorough and detailed:

Document: ${analysis.fileName}
Content: ${documentText}

EXTRACT EVERYTHING NUMERICAL:
- Every single number with its context and meaning
- All calculations, formulas, and mathematical operations
- Financial metrics: prices, costs, revenues, margins, percentages, ratios
- Statistical data: averages, totals, counts, distributions
- Business calculations: ROI, profitability, break-even, pricing models
- VAT calculations, taxes, discounts, fees
- Hotel metrics: occupancy rates, room counts, ADR, RevPAR
- Operational data: capacity, utilization, performance indicators
- Time-based data: monthly, quarterly, yearly figures
- Benchmarks and comparisons
- Forecasts and projections

Return comprehensive JSON with ALL extracted data:
{
  "documentType": "Detailed document classification",
  "keyFindings": ["List ALL significant discoveries - be exhaustive"],
  "businessInsights": [
    {
      "category": "Financial Performance | Operations | Pricing | Revenue | Costs | Profitability | Risk Analysis",
      "insight": "Detailed insight with specific numbers and context",
      "insights": ["Multiple detailed sub-insights with numerical data"]
    }
  ],
  "statisticalData": [
    {
      "category": "Revenue Analysis | Cost Structure | Pricing Strategy | Profitability | Operational Metrics",
      "values": [
        {
          "label": "Specific metric name",
          "value": "Exact numerical value",
          "unit": "€ | % | rooms | nights | ratio | count",
          "calculation": "Exact formula or calculation method",
          "significance": "Business impact and importance"
        }
      ]
    }
  ],
  "calculationBreakdown": [
    {
      "formula": "Exact mathematical formula with variables",
      "inputs": ["All input values with their actual numbers"],
      "result": "Calculated result with units",
      "businessPurpose": "Strategic importance and business application"
    }
  ],
  "keyMetrics": [
    {
      "metric": "KPI or performance indicator name",
      "value": "Current value with precision",
      "unit": "Measurement unit",
      "benchmark": "Industry standard or comparison value",
      "trend": "Growth/decline pattern with percentages"
    }
  ],
  "financialSummary": {
    "totalRevenue": "Total revenue if available",
    "totalCosts": "Total costs if available", 
    "grossProfit": "Gross profit if available",
    "netProfit": "Net profit if available",
    "margins": "All margin percentages",
    "keyRatios": "Important financial ratios",
    "averagePrice": "Average price if found",
    "occupancyRate": "Occupancy rate if found",
    "roomCount": "Room count if found"
  },
  "recommendations": ["string - actionable recommendation based on the numbers"],
  "summary": "string - comprehensive summary of all the numerical findings"
}

IMPORTANT: Extract ALL actual numbers from the document. Do not make up or estimate values. Only include real data found in the document.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert financial analyst specializing in comprehensive document analysis. Extract ALL calculations, formulas, and numerical data. Provide exhaustive analysis in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const insights = JSON.parse(content);
      return insights;
      
    } catch (error) {
      console.error('Error generating insights:', error);
      return null;
    }
  }
}

export const insightRestorer = new InsightRestorer();