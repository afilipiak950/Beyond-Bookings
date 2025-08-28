import OpenAI from 'openai';
import { db } from './db';
import { voucherIntelligence, hotels, pricingCalculations } from '@shared/schema';
import { eq, desc, and, sql, asc } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface HotelCharacteristics {
  name: string;
  stars: number;
  roomCount?: number;
  location?: string;
  category?: string;
  amenities?: string[];
  averageMarketPrice?: number;
}

export interface MarketContext {
  competitorVoucherValues?: number[];
  seasonality?: 'high' | 'mid' | 'low';
  localEvents?: string[];
}

export interface VoucherPrediction {
  suggestedValue: number;
  confidence: number;
  reasoning: string;
  similarHotels: number;
  influencingFactors: string[];
}

export class VoucherIntelligenceEngine {
  private readonly MODEL = 'gpt-5'; // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

  /**
   * Generate vector embedding for hotel characteristics
   */
  async generateHotelEmbedding(characteristics: HotelCharacteristics): Promise<number[]> {
    try {
      const text = this.createHotelDescription(characteristics);
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating hotel embedding:', error);
      throw new Error('Failed to generate hotel embedding');
    }
  }

  /**
   * Generate vector embedding for market context
   */
  async generateContextEmbedding(context: MarketContext): Promise<number[]> {
    try {
      const text = this.createContextDescription(context);
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating context embedding:', error);
      throw new Error('Failed to generate context embedding');
    }
  }

  /**
   * Generate vector embedding for user feedback
   */
  async generateFeedbackEmbedding(feedback: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: feedback,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating feedback embedding:', error);
      throw new Error('Failed to generate feedback embedding');
    }
  }

  /**
   * Predict voucher value using AI and similar hotels
   */
  async predictVoucherValue(
    characteristics: HotelCharacteristics,
    context: MarketContext = {}
  ): Promise<VoucherPrediction> {
    console.log('🧠 Starting voucher prediction for:', characteristics.name, `(${characteristics.stars}⭐)`);
    
    try {
      // Step 1: Check if we have sufficient data for AI analysis
      console.log('📊 Step 1: Data availability check...');
      const hasMinimumData = characteristics.name && characteristics.stars > 0;
      
      if (!hasMinimumData) {
        console.log('⚠️ Insufficient data for AI analysis, using fallback');
        return this.getFallbackPrediction(characteristics);
      }

      // Step 2: Find similar hotels (simplified approach for now)
      console.log('🔍 Step 2: Finding similar hotels...');
      const similarHotels = await this.findSimilarHotels([], characteristics.stars);
      console.log('✅ Found', similarHotels.length, 'similar hotels');

      // Step 3: Calculate base voucher value
      console.log('⭐ Step 3: Calculating base value...');
      const baseValue = this.getStarBasedVoucherValue(characteristics.stars);
      console.log('✅ Base value:', '€' + baseValue);

      // Step 4: Apply adjustments based on similar hotels
      console.log('🤖 Step 4: Applying AI adjustments...');
      const adjustedValue = this.applySimpleAdjustments(baseValue, similarHotels, characteristics);
      console.log('✅ Adjusted value:', '€' + adjustedValue);

      // Step 5: Calculate confidence
      console.log('📈 Step 5: Calculating confidence...');
      const confidence = this.calculateSimpleConfidence(similarHotels, characteristics);
      console.log('✅ Confidence:', confidence + '%');

      // Step 6: Generate reasoning
      console.log('💭 Step 6: Generating reasoning...');
      const reasoning = this.generateSimpleReasoning(characteristics, adjustedValue, baseValue, similarHotels);
      console.log('✅ Reasoning generated');

      const result = {
        suggestedValue: Math.round(adjustedValue * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        reasoning,
        similarHotels: similarHotels.length,
        influencingFactors: this.getSimpleInfluencingFactors(characteristics, similarHotels),
      };

      console.log('💡 Final prediction:', '€' + result.suggestedValue, `(${result.confidence}% confidence)`);
      return result;
    } catch (error) {
      console.error('❌ Error predicting voucher value:', error);
      
      // Fallback to star-based calculation
      const fallbackValue = this.getStarBasedFallback(characteristics.stars);
      return {
        suggestedValue: fallbackValue,
        confidence: 60,
        reasoning: 'AI prediction temporarily unavailable. Using star-based estimation.',
        similarHotels: 0,
        influencingFactors: ['Hotel star rating', 'Industry standards'],
      };
    }
  }

  /**
   * Learn from user feedback and manual edits
   */
  async learnFromUserFeedback(
    userId: number,
    calculationId: number | null,
    characteristics: HotelCharacteristics,
    context: MarketContext,
    aiSuggestion: number,
    userChoice: number,
    userFeedback: string
  ): Promise<void> {
    try {
      // Generate embeddings
      const hotelEmbedding = await this.generateHotelEmbedding(characteristics);
      const contextEmbedding = await this.generateContextEmbedding(context);
      const feedbackEmbedding = await this.generateFeedbackEmbedding(userFeedback);

      // Calculate prediction accuracy
      const accuracy = this.calculateAccuracy(aiSuggestion, userChoice);

      // Categorize the manual edit reason
      const categorizedReason = await this.categorizeEditReason(userFeedback);

      // Get current learning iteration
      const currentIteration = await this.getCurrentLearningIteration();

      // Save learning data
      await db.insert(voucherIntelligence).values({
        userId,
        calculationId,
        hotelName: characteristics.name,
        stars: characteristics.stars,
        roomCount: characteristics.roomCount,
        location: characteristics.location,
        category: characteristics.category,
        amenities: characteristics.amenities,
        averageMarketPrice: characteristics.averageMarketPrice?.toString(),
        competitorVoucherValues: context.competitorVoucherValues ? JSON.stringify(context.competitorVoucherValues) : null,
        seasonality: context.seasonality,
        localEvents: context.localEvents,
        aiSuggestedVoucherValue: aiSuggestion.toString(),
        actualVoucherValue: userChoice.toString(),
        confidenceScore: '95', // High confidence in user feedback
        userFeedback,
        wasManuallyEdited: true,
        manualEditReason: categorizedReason,
        hotelVectorEmbedding: JSON.stringify(hotelEmbedding),
        contextVectorEmbedding: JSON.stringify(contextEmbedding),
        feedbackVectorEmbedding: JSON.stringify(feedbackEmbedding),
        predictionAccuracy: accuracy.toString(),
        similarHotelsCount: 0, // Will be calculated in future predictions
        learningIteration: currentIteration + 1,
      });

      console.log(`🧠 Learned from user feedback: ${characteristics.name} (${characteristics.stars}⭐) - AI: €${aiSuggestion}, User: €${userChoice}, Accuracy: ${accuracy}%`);
    } catch (error) {
      console.error('Error learning from user feedback:', error);
    }
  }

  /**
   * Find similar hotels using vector similarity search
   */
  private async findSimilarHotels(hotelEmbedding: number[], stars: number, limit: number = 10) {
    try {
      console.log('🔍 Searching for similar hotels with', stars, 'stars (±1)');
      
      // Simplified similarity search based on star rating
      const similarHotels = await db
        .select({
          id: voucherIntelligence.id,
          hotelName: voucherIntelligence.hotelName,
          stars: voucherIntelligence.stars,
          voucherValue: voucherIntelligence.voucherValue,
          userFeedback: voucherIntelligence.userFeedback,
          confidence: voucherIntelligence.confidence,
          wasManuallyEdited: voucherIntelligence.wasManuallyEdited,
          createdAt: voucherIntelligence.createdAt
        })
        .from(voucherIntelligence)
        .where(and(
          sql`${voucherIntelligence.stars} BETWEEN ${stars - 1} AND ${stars + 1}`,
          sql`${voucherIntelligence.voucherValue} > 0`
        ))
        .orderBy(desc(voucherIntelligence.confidence), desc(voucherIntelligence.createdAt))
        .limit(limit);

      console.log('✅ Found', similarHotels.length, 'similar hotels');
      return similarHotels;
    } catch (error) {
      console.error('❌ Error finding similar hotels:', error);
      return [];
    }
  }

  /**
   * Calculate base voucher value using AI
   */
  private async calculateBaseVoucherValue(
    characteristics: HotelCharacteristics,
    context: MarketContext,
    similarHotels: any[]
  ): Promise<number> {
    const similarData = similarHotels.map(h => ({
      stars: h.stars,
      aiSuggested: parseFloat(h.aiSuggestedVoucherValue),
      userChose: parseFloat(h.actualVoucherValue),
      feedback: h.userFeedback,
    }));

    const prompt = `
Calculate the optimal hotel voucher value based on hotel characteristics and market data.

Hotel Details:
- Name: ${characteristics.name}
- Stars: ${characteristics.stars}
- Room Count: ${characteristics.roomCount || 'Unknown'}
- Location: ${characteristics.location || 'Unknown'}
- Category: ${characteristics.category || 'Unknown'}
- Amenities: ${characteristics.amenities?.join(', ') || 'Unknown'}
- Average Market Price: €${characteristics.averageMarketPrice || 'Unknown'}

Market Context:
- Seasonality: ${context.seasonality || 'Unknown'}
- Competitor Voucher Values: €${context.competitorVoucherValues?.join(', €') || 'Unknown'}
- Local Events: ${context.localEvents?.join(', ') || 'None'}

Similar Hotels Learning Data:
${similarData.map(h => `- ${h.stars}⭐: AI suggested €${h.aiSuggested}, User chose €${h.userChose} (${h.feedback})`).join('\n')}

Standard voucher values by star rating:
- 1⭐: €15-20
- 2⭐: €20-25  
- 3⭐: €25-35
- 4⭐: €35-45
- 5⭐: €45-60

Consider: luxury level, location premium, amenities value, market positioning, user feedback patterns.

Respond with JSON: {"voucherValue": number, "reasoning": "explanation"}
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_completion_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.voucherValue || this.getStarBasedFallback(characteristics.stars);
    } catch (error) {
      console.error('Error calculating base voucher value:', error);
      return this.getStarBasedFallback(characteristics.stars);
    }
  }

  /**
   * Apply learned adjustments from historical user feedback
   */
  private async applyLearningAdjustments(
    baseValue: number,
    characteristics: HotelCharacteristics,
    similarHotels: any[]
  ) {
    // Calculate adjustment based on similar hotels' user preferences
    let totalAdjustment = 0;
    let totalWeight = 0;

    for (const hotel of similarHotels) {
      const aiSuggestion = parseFloat(hotel.aiSuggestedVoucherValue);
      const userChoice = parseFloat(hotel.actualVoucherValue);
      const accuracy = parseFloat(hotel.predictionAccuracy || '50');
      
      // Weight higher accuracy feedback more heavily
      const weight = accuracy / 100;
      const adjustment = (userChoice - aiSuggestion) / aiSuggestion;
      
      totalAdjustment += adjustment * weight;
      totalWeight += weight;
    }

    const avgAdjustment = totalWeight > 0 ? totalAdjustment / totalWeight : 0;
    const adjustedValue = baseValue * (1 + avgAdjustment);

    // Calculate confidence based on amount of learning data
    const confidence = Math.min(95, 60 + (similarHotels.length * 5));

    const reasoning = this.generateReasoning(baseValue, adjustedValue, similarHotels, characteristics);

    return {
      adjustedValue,
      confidence,
      reasoning,
    };
  }

  /**
   * Generate reasoning for the voucher value suggestion
   */
  private generateReasoning(
    baseValue: number,
    adjustedValue: number,
    similarHotels: any[],
    characteristics: HotelCharacteristics
  ): string {
    const adjustment = ((adjustedValue - baseValue) / baseValue * 100);
    const adjustmentText = Math.abs(adjustment) > 5 
      ? ` (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)}% based on user patterns)`
      : '';

    const reasons = [
      `${characteristics.stars}⭐ hotel standard: €${baseValue.toFixed(2)}`,
      similarHotels.length > 0 ? `Learned from ${similarHotels.length} similar hotels` : null,
      characteristics.location ? `Location: ${characteristics.location}` : null,
      characteristics.amenities?.length ? `Premium amenities included` : null,
    ].filter(Boolean);

    return `${reasons.join(' • ')}${adjustmentText}`;
  }

  /**
   * Identify factors that influenced the prediction
   */
  private identifyInfluencingFactors(
    characteristics: HotelCharacteristics,
    context: MarketContext,
    similarHotels: any[]
  ): string[] {
    const factors = [];

    factors.push(`${characteristics.stars}-star hotel category`);
    
    if (characteristics.location) factors.push(`Location: ${characteristics.location}`);
    if (characteristics.category) factors.push(`Category: ${characteristics.category}`);
    if (characteristics.amenities?.length) factors.push('Premium amenities');
    if (context.seasonality) factors.push(`${context.seasonality} season pricing`);
    if (context.competitorVoucherValues?.length) factors.push('Competitor analysis');
    if (similarHotels.length > 0) factors.push(`${similarHotels.length} similar hotels data`);

    return factors;
  }

  /**
   * Create text description for hotel embedding
   */
  private createHotelDescription(characteristics: HotelCharacteristics): string {
    return [
      `${characteristics.stars} star hotel`,
      characteristics.name,
      characteristics.location ? `located in ${characteristics.location}` : '',
      characteristics.category ? `${characteristics.category} category` : '',
      characteristics.roomCount ? `${characteristics.roomCount} rooms` : '',
      characteristics.amenities?.length ? `amenities: ${characteristics.amenities.join(', ')}` : '',
      characteristics.averageMarketPrice ? `average price €${characteristics.averageMarketPrice}` : '',
    ].filter(Boolean).join(' ');
  }

  /**
   * Create text description for context embedding
   */
  private createContextDescription(context: MarketContext): string {
    return [
      context.seasonality ? `${context.seasonality} season` : '',
      context.localEvents?.length ? `events: ${context.localEvents.join(', ')}` : '',
      context.competitorVoucherValues?.length ? `competitor vouchers: €${context.competitorVoucherValues.join(', €')}` : '',
    ].filter(Boolean).join(' ');
  }

  /**
   * Categorize user edit reason using AI
   */
  private async categorizeEditReason(feedback: string): Promise<string> {
    const categories = [
      'luxury_upgrade', 'location_premium', 'amenities_value', 'market_positioning',
      'competitor_comparison', 'seasonal_adjustment', 'cost_optimization', 'other'
    ];

    try {
      const response = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [{
          role: 'user',
          content: `Categorize this hotel voucher adjustment reason into one of these categories: ${categories.join(', ')}\n\nReason: "${feedback}"\n\nRespond with just the category name.`
        }],
        max_completion_tokens: 20,
      });

      const category = response.choices[0].message.content?.trim().toLowerCase();
      return categories.includes(category || '') ? category || 'other' : 'other';
    } catch (error) {
      return 'other';
    }
  }

  /**
   * Calculate prediction accuracy
   */
  private calculateAccuracy(aiSuggestion: number, userChoice: number): number {
    const difference = Math.abs(aiSuggestion - userChoice);
    const relativeError = difference / userChoice;
    const accuracy = Math.max(0, 100 - (relativeError * 100));
    return Math.round(accuracy);
  }

  /**
   * Get current learning iteration number
   */
  private async getCurrentLearningIteration(): Promise<number> {
    try {
      const result = await db
        .select({ maxIteration: sql<number>`MAX(${voucherIntelligence.learningIteration})` })
        .from(voucherIntelligence);
      
      return result[0]?.maxIteration || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Fallback star-based voucher values
   */
  private getStarBasedFallback(stars: number): number {
    const fallbackValues = {
      1: 17.5,
      2: 22.5,
      3: 30,
      4: 40,
      5: 52.5
    };
    return fallbackValues[stars as keyof typeof fallbackValues] || 30;
  }

  /**
   * Get voucher intelligence statistics
   */
  async getIntelligenceStats(): Promise<{
    totalLearningPoints: number;
    averageAccuracy: number;
    topPerformingStars: { stars: number; accuracy: number }[];
    mostCommonReasons: { reason: string; count: number }[];
  }> {
    try {
      const stats = await db
        .select({
          count: sql<number>`COUNT(*)`,
          avgAccuracy: sql<number>`AVG(${voucherIntelligence.predictionAccuracy})`,
        })
        .from(voucherIntelligence);

      const starStats = await db
        .select({
          stars: voucherIntelligence.stars,
          avgAccuracy: sql<number>`AVG(${voucherIntelligence.predictionAccuracy})`,
        })
        .from(voucherIntelligence)
        .groupBy(voucherIntelligence.stars)
        .orderBy(desc(sql`AVG(${voucherIntelligence.predictionAccuracy})`));

      const reasonStats = await db
        .select({
          reason: voucherIntelligence.manualEditReason,
          count: sql<number>`COUNT(*)`,
        })
        .from(voucherIntelligence)
        .where(eq(voucherIntelligence.wasManuallyEdited, true))
        .groupBy(voucherIntelligence.manualEditReason)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(5);

      return {
        totalLearningPoints: stats[0]?.count || 0,
        averageAccuracy: Math.round(stats[0]?.avgAccuracy || 0),
        topPerformingStars: starStats.map(s => ({
          stars: s.stars,
          accuracy: Math.round(s.avgAccuracy || 0)
        })),
        mostCommonReasons: reasonStats.map(r => ({
          reason: r.reason || 'Unknown',
          count: r.count
        }))
      };
    } catch (error) {
      console.error('Error getting intelligence stats:', error);
      return {
        totalLearningPoints: 0,
        averageAccuracy: 0,
        topPerformingStars: [],
        mostCommonReasons: []
      };
    }
  }

  /**
   * Get fallback prediction when AI analysis fails
   */
  private getFallbackPrediction(characteristics: HotelCharacteristics): VoucherPrediction {
    const fallbackValue = this.getStarBasedVoucherValue(characteristics.stars);
    return {
      suggestedValue: fallbackValue,
      confidence: 60,
      reasoning: `Standard-Empfehlung für ${characteristics.stars}-Sterne Hotels. KI-Analyse vorübergehend nicht verfügbar.`,
      similarHotels: 0,
      influencingFactors: ['Sterne-Kategorie']
    };
  }
  
  /**
   * Apply simple adjustments based on similar hotels
   */
  private applySimpleAdjustments(
    baseValue: number, 
    similarHotels: any[], 
    characteristics: HotelCharacteristics
  ): number {
    let adjustedValue = baseValue;
    
    if (similarHotels.length > 0) {
      // Calculate average voucher value from similar hotels
      const voucherValues = similarHotels.map(hotel => hotel.voucherValue || baseValue);
      const avgSimilarValue = voucherValues.reduce((sum, val) => sum + val, 0) / voucherValues.length;
      console.log('📊 Average similar hotel voucher value:', '€' + avgSimilarValue);
      
      // Weight the adjustment based on number of similar hotels
      const weight = Math.min(similarHotels.length / 10, 0.3); // Max 30% influence
      adjustedValue = (baseValue * (1 - weight)) + (avgSimilarValue * weight);
      console.log('⚖️ Weighted adjustment applied (weight:', weight + '):', '€' + adjustedValue);
    }
    
    // Apply room count adjustments
    if (characteristics.roomCount) {
      if (characteristics.roomCount > 200) {
        adjustedValue *= 1.05; // 5% increase for large hotels
        console.log('🏨 Large hotel bonus (+5%):', characteristics.roomCount, 'rooms');
      } else if (characteristics.roomCount < 50) {
        adjustedValue *= 0.95; // 5% decrease for small boutique hotels
        console.log('🏨 Boutique hotel adjustment (-5%):', characteristics.roomCount, 'rooms');
      }
    }
    
    return Math.max(adjustedValue, baseValue * 0.7); // Never go below 70% of base value
  }
  
  /**
   * Calculate simple confidence score
   */
  private calculateSimpleConfidence(similarHotels: any[], characteristics: HotelCharacteristics): number {
    let confidence = 60; // Base confidence
    
    // Increase confidence based on similar hotels
    confidence += Math.min(similarHotels.length * 5, 20); // +5% per similar hotel, max +20%
    
    // Increase confidence if we have room count data
    if (characteristics.roomCount) {
      confidence += 5;
    }
    
    // Increase confidence if we have location data
    if (characteristics.location) {
      confidence += 5;
    }
    
    return Math.min(confidence, 85); // Cap at 85%
  }
  
  /**
   * Generate simple reasoning explanation
   */
  private generateSimpleReasoning(
    characteristics: HotelCharacteristics,
    adjustedValue: number,
    baseValue: number,
    similarHotels: any[]
  ): string {
    const diff = adjustedValue - baseValue;
    const diffPercent = Math.round((diff / baseValue) * 100);
    
    let reasoning = `Empfehlung für ${characteristics.name} (${characteristics.stars}⭐): €${adjustedValue.toFixed(2)}`;
    
    if (Math.abs(diffPercent) > 2) {
      if (diffPercent > 0) {
        reasoning += `. Aufschlag von ${diffPercent}% aufgrund`;
      } else {
        reasoning += `. Abschlag von ${Math.abs(diffPercent)}% aufgrund`;
      }
      
      const factors = [];
      if (similarHotels.length > 0) {
        factors.push(`ähnlicher Hotels`);
      }
      if (characteristics.roomCount && characteristics.roomCount > 200) {
        factors.push('Hotelgröße');
      }
      if (characteristics.roomCount && characteristics.roomCount < 50) {
        factors.push('Boutique-Charakter');
      }
      
      reasoning += ` ${factors.join(', ')}.`;
    } else {
      reasoning += '. Standard-Wert für diese Sterne-Kategorie.';
    }
    
    return reasoning;
  }
  
  /**
   * Get simple influencing factors
   */
  private getSimpleInfluencingFactors(
    characteristics: HotelCharacteristics, 
    similarHotels: any[]
  ): string[] {
    const factors = [`${characteristics.stars}-Sterne-Kategorie`];
    
    if (similarHotels.length > 0) {
      factors.push(`${similarHotels.length} ähnliche Hotels`);
    }
    
    if (characteristics.roomCount) {
      if (characteristics.roomCount > 200) {
        factors.push('Großes Hotel');
      } else if (characteristics.roomCount < 50) {
        factors.push('Boutique Hotel');
      }
    }
    
    if (characteristics.location) {
      factors.push('Standort');
    }
    
    return factors;
  }
}

export const voucherIntelligence = new VoucherIntelligenceEngine();