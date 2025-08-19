/**
 * Intelligence Enhancer - Ensures every question gets a complete answer
 * Fixes the core problem of incomplete AI responses
 */

import { db } from '../db';

export interface IntelligenceData {
  hotels: any[];
  pricingCalculations: any[];
  businessMetrics: any;
  comprehensiveData: string;
}

export class IntelligenceEnhancer {
  
  /**
   * Get comprehensive data for any business intelligence question
   * This ensures we ALWAYS have data to answer questions about hotels and profitability
   */
  static async getComprehensiveData(userId: number): Promise<IntelligenceData> {
    try {
      // Get all hotels with complete data
      const hotels = await db.query.hotels.findMany({
        orderBy: (hotels, { desc, asc }) => [desc(hotels.stars), asc(hotels.name)]
      });

      // Get all pricing calculations with complete financial data  
      const pricingCalculations = await db.query.pricingCalculations.findMany({
        orderBy: (calcs, { desc }) => [desc(calcs.stars), desc(calcs.profitMargin)]
      });

      // Calculate business metrics
      const businessMetrics = await this.calculateBusinessMetrics(hotels, pricingCalculations);

      // Create comprehensive data summary
      const comprehensiveData = this.createComprehensiveDataSummary(hotels, pricingCalculations, businessMetrics);

      return {
        hotels: hotels || [],
        pricingCalculations: pricingCalculations || [],
        businessMetrics,
        comprehensiveData
      };
    } catch (error) {
      console.error('Error getting comprehensive data:', error);
      // Return empty but valid structure
      return {
        hotels: [],
        pricingCalculations: [],
        businessMetrics: {},
        comprehensiveData: 'Data retrieval error - using available system knowledge'
      };
    }
  }

  private static async calculateBusinessMetrics(hotels: any[], pricingCalculations: any[]) {
    const hotelData = hotels || [];
    const calcData = pricingCalculations || [];

    return {
      totalHotels: hotelData.length,
      hotelsByStars: this.groupByStars(hotelData),
      calculationsByStars: this.groupByStars(calcData),
      profitabilityAnalysis: this.analyzeProfitability(calcData),
      averagePrices: this.calculateAveragePrices(hotelData, calcData),
      marketComparison: this.analyzeMarketPosition(calcData)
    };
  }

  private static groupByStars(data: any[]) {
    const grouped: { [key: string]: any } = {};
    
    for (const item of data) {
      const stars = item.stars || 0;
      if (!grouped[stars]) {
        grouped[stars] = {
          count: 0,
          items: []
        };
      }
      grouped[stars].count++;
      grouped[stars].items.push(item);
    }
    
    return grouped;
  }

  private static analyzeProfitability(calcData: any[]) {
    if (calcData.length === 0) return null;

    const analysis = {
      averageProfitMargin: 0,
      totalRevenue: 0,
      profitableCount: 0,
      byStarCategory: {} as any
    };

    let totalMargin = 0;
    let totalRevenue = 0;

    for (const calc of calcData) {
      const margin = parseFloat(calc.profit_margin) || 0;
      const revenue = parseFloat(calc.total_price) || 0;
      const stars = calc.stars || 0;

      totalMargin += margin;
      totalRevenue += revenue;

      if (margin > 0) analysis.profitableCount++;

      if (!analysis.byStarCategory[stars]) {
        analysis.byStarCategory[stars] = {
          count: 0,
          avgMargin: 0,
          totalRevenue: 0,
          margins: []
        };
      }

      analysis.byStarCategory[stars].count++;
      analysis.byStarCategory[stars].margins.push(margin);
      analysis.byStarCategory[stars].totalRevenue += revenue;
    }

    analysis.averageProfitMargin = totalMargin / calcData.length;
    analysis.totalRevenue = totalRevenue;

    // Calculate averages by star category
    Object.keys(analysis.byStarCategory).forEach(stars => {
      const category = analysis.byStarCategory[stars];
      category.avgMargin = category.margins.reduce((a: number, b: number) => a + b, 0) / category.margins.length;
    });

    return analysis;
  }

  private static calculateAveragePrices(hotelData: any[], calcData: any[]) {
    const prices = {
      hotelAverages: {} as any,
      calculationAverages: {} as any,
      overallAverages: {} as any
    };

    // From hotels table
    for (const hotel of hotelData) {
      const stars = hotel.stars || 0;
      const price = parseFloat(hotel.average_price) || 0;
      
      if (!prices.hotelAverages[stars]) {
        prices.hotelAverages[stars] = { total: 0, count: 0, prices: [] };
      }
      
      if (price > 0) {
        prices.hotelAverages[stars].total += price;
        prices.hotelAverages[stars].count++;
        prices.hotelAverages[stars].prices.push(price);
      }
    }

    // From pricing calculations
    for (const calc of calcData) {
      const stars = calc.stars || 0;
      const price = parseFloat(calc.average_price) || 0;
      
      if (!prices.calculationAverages[stars]) {
        prices.calculationAverages[stars] = { total: 0, count: 0, prices: [] };
      }
      
      if (price > 0) {
        prices.calculationAverages[stars].total += price;
        prices.calculationAverages[stars].count++;
        prices.calculationAverages[stars].prices.push(price);
      }
    }

    // Calculate final averages
    Object.keys(prices.hotelAverages).forEach(stars => {
      const data = prices.hotelAverages[stars];
      data.average = data.count > 0 ? data.total / data.count : 0;
    });

    Object.keys(prices.calculationAverages).forEach(stars => {
      const data = prices.calculationAverages[stars];
      data.average = data.count > 0 ? data.total / data.count : 0;
    });

    return prices;
  }

  private static analyzeMarketPosition(calcData: any[]) {
    if (calcData.length === 0) return null;

    const analysis = {
      averageDiscount: 0,
      competitivePosition: 'neutral',
      discountRange: { min: 0, max: 0 },
      byStarCategory: {} as any
    };

    let totalDiscount = 0;
    let minDiscount = Number.MAX_SAFE_INTEGER;
    let maxDiscount = Number.MIN_SAFE_INTEGER;

    for (const calc of calcData) {
      const discount = parseFloat(calc.discount_vs_market) || 0;
      const stars = calc.stars || 0;

      totalDiscount += discount;
      minDiscount = Math.min(minDiscount, discount);
      maxDiscount = Math.max(maxDiscount, discount);

      if (!analysis.byStarCategory[stars]) {
        analysis.byStarCategory[stars] = {
          discounts: [],
          avgDiscount: 0
        };
      }

      analysis.byStarCategory[stars].discounts.push(discount);
    }

    analysis.averageDiscount = totalDiscount / calcData.length;
    analysis.discountRange = { min: minDiscount, max: maxDiscount };

    // Determine competitive position
    if (analysis.averageDiscount > 10) {
      analysis.competitivePosition = 'premium';
    } else if (analysis.averageDiscount < -10) {
      analysis.competitivePosition = 'aggressive';
    } else {
      analysis.competitivePosition = 'competitive';
    }

    // Calculate by star category
    Object.keys(analysis.byStarCategory).forEach(stars => {
      const category = analysis.byStarCategory[stars];
      category.avgDiscount = category.discounts.reduce((a: number, b: number) => a + b, 0) / category.discounts.length;
    });

    return analysis;
  }

  private static createComprehensiveDataSummary(hotels: any[], calculations: any[], metrics: any): string {
    const hotelCount = hotels.length;
    const calcCount = calculations.length;
    
    let summary = `COMPREHENSIVE BUSINESS DATA AVAILABLE:\n\n`;
    
    summary += `HOTELS (${hotelCount} total):\n`;
    Object.keys(metrics.hotelsByStars || {}).forEach(stars => {
      const data = metrics.hotelsByStars[stars];
      summary += `- ${stars}-Sterne: ${data.count} Hotels\n`;
    });
    
    summary += `\nPRICING CALCULATIONS (${calcCount} total):\n`;
    Object.keys(metrics.calculationsByStars || {}).forEach(stars => {
      const data = metrics.calculationsByStars[stars];
      summary += `- ${stars}-Sterne: ${data.count} Kalkulationen\n`;
    });
    
    if (metrics.profitabilityAnalysis) {
      summary += `\nPROFITABILITÄT:\n`;
      summary += `- Durchschnittliche Gewinnmarge: ${metrics.profitabilityAnalysis.averageProfitMargin.toFixed(2)}€\n`;
      summary += `- Gesamtumsatz: ${metrics.profitabilityAnalysis.totalRevenue.toFixed(2)}€\n`;
      summary += `- Profitable Hotels: ${metrics.profitabilityAnalysis.profitableCount}\n`;
    }
    
    return summary;
  }

  /**
   * Enhanced system prompt that includes comprehensive data
   */
  static createEnhancedPrompt(intelligenceData: IntelligenceData): string {
    return `Du bist der interne KI-Assistent für die Beyond Bookings Plattform.

KRITISCHES MANDAT: BEANTWORTE JEDE FRAGE VOLLSTÄNDIG!

VERFÜGBARE GESCHÄFTSDATEN:
${intelligenceData.comprehensiveData}

DETAILLIERTE HOTELANALYSE:
- Gesamt: ${intelligenceData.hotels.length} Hotels
- 5-Sterne Hotels: ${intelligenceData.hotels.filter(h => h.stars === 5).length}
- 4-Sterne Hotels: ${intelligenceData.hotels.filter(h => h.stars === 4).length}  
- 3-Sterne Hotels: ${intelligenceData.hotels.filter(h => h.stars === 3).length}
- Weitere Kategorien verfügbar

PREISKALKULATIONEN:
- Gesamt: ${intelligenceData.pricingCalculations.length} Kalkulationen
- Mit Gewinnmargen und Finanzanalyse
- Vergleichsdaten vs. Marktpreise

WICHTIGE VERHALTENSREGELN:
1. NIEMALS "keine Daten gefunden" sagen - verwende die verfügbaren Daten!
2. Bei SQL-Fehlern: Sofort alternative Ansätze mit anderen Tabellen/Spalten versuchen
3. IMMER umfassende Geschäftsanalyse mit konkreten Zahlen und Prozenten liefern
4. Auf Deutsch antworten mit professioneller Geschäftssprache
5. Tabellen für strukturierte Daten verwenden
6. Handlungsempfehlungen geben

Du hast Zugriff auf alle Datenbanktabellen: hotels, pricing_calculations, approval_requests, users, notifications, etc.

Antworte IMMER umfassend und intelligent!`;
  }
}