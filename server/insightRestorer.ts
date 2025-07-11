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
        return this.isValidInsightObject(parsed);
      } catch {
        return insights.length > 50; // Raw text insights with decent length
      }
    }
    
    // Handle object insights
    if (typeof insights === 'object') {
      return this.isValidInsightObject(insights);
    }
    
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

      const prompt = `Extract DETAILED statistical data and calculations from this Excel/business document. Focus on REAL numbers, formulas, and calculations:

Document: ${analysis.fileName}
Content: ${documentText}

EXTRACT ALL NUMERICAL DATA INCLUDING:
- Every price, cost, revenue, margin, percentage
- All formulas and calculations with their exact results
- Financial ratios and metrics
- Statistical data (averages, totals, counts)
- Pricing models and calculation methodologies
- VAT calculations, taxes, discounts
- Occupancy rates, room counts, rates
- Profit margins, ROI calculations
- Any mathematical relationships between values

Return JSON in this EXACT format:
{
  "documentType": "string - type of document",
  "statisticalData": [
    {
      "category": "string - data category (e.g., 'Pricing', 'Costs', 'Revenue')",
      "values": [
        {
          "label": "string - what this number represents",
          "value": "number - the actual numerical value",
          "unit": "string - currency or unit (€, %, rooms, etc.)",
          "calculation": "string - how this was calculated if applicable",
          "significance": "string - why this number is important"
        }
      ]
    }
  ],
  "calculationBreakdown": [
    {
      "formula": "string - the actual formula or calculation",
      "inputs": ["list of input values with numbers"],
      "result": "number - the calculated result",
      "businessPurpose": "string - what this calculation achieves"
    }
  ],
  "keyMetrics": [
    {
      "metric": "string - metric name",
      "value": "number - actual value",
      "unit": "string - unit",
      "benchmark": "string - how this compares to industry standards",
      "trend": "string - is this increasing/decreasing/stable"
    }
  ],
  "financialSummary": {
    "totalRevenue": "number - if found",
    "totalCosts": "number - if found", 
    "profitMargin": "number - if calculable",
    "averagePrice": "number - if found",
    "occupancyRate": "number - if found",
    "roomCount": "number - if found"
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
            content: "You are an expert business analyst specializing in document analysis. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
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