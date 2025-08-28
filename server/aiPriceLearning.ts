import OpenAI from "openai";
import { db } from "./db";
import { priceIntelligence, aiLearningSessions } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// Initialize OpenAI for vector embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface HotelFeatures {
  stars: number;
  roomCount: number;
  averagePrice: number;
  location?: string;
  category?: string;
  amenities?: string[];
}

export interface PricingData {
  hotelName: string;
  features: HotelFeatures;
  aiSuggestedPrice: number;
  actualPrice: number;
  userFeedback: string;
  userId: number;
}

export class AIPriceLearningService {
  // Generate vector embedding from hotel features
  private async generateFeatureVector(features: HotelFeatures): Promise<number[]> {
    const featureText = `
      Hotel: ${features.stars} stars, ${features.roomCount} rooms, 
      Average price: ${features.averagePrice}, 
      Location: ${features.location || 'unknown'}, 
      Category: ${features.category || 'unknown'}, 
      Amenities: ${features.amenities?.join(', ') || 'none'}
    `;

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: featureText,
    });

    return response.data[0].embedding;
  }

  // Calculate similarity between two vectors using cosine similarity
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Find similar hotels in the database using vector similarity
  private async findSimilarHotels(
    features: HotelFeatures, 
    userId: number, 
    limit: number = 10
  ): Promise<any[]> {
    const queryVector = await this.generateFeatureVector(features);
    
    // Get all price intelligence records for this user
    const records = await db
      .select()
      .from(priceIntelligence)
      .where(eq(priceIntelligence.userId, userId))
      .orderBy(desc(priceIntelligence.createdAt));

    // Calculate similarity scores
    const similarRecords = records
      .map(record => {
        if (!record.vectorEmbedding) return null;
        
        const similarity = this.cosineSimilarity(
          queryVector, 
          record.vectorEmbedding as number[]
        );
        
        return { ...record, similarity };
      })
      .filter(record => record !== null && record.similarity > 0.7) // 70% similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarRecords;
  }

  // Generate AI price suggestion based on similar hotels and learning data
  async generateAIPriceSuggestion(features: HotelFeatures, userId: number): Promise<{
    suggestedPrice: number;
    confidencePercentage: number;
    reasoning: string;
    basedOnSimilarHotels: number;
  }> {
    try {
      // Find similar hotels in the learning database
      const similarHotels = await this.findSimilarHotels(features, userId);
      
      let suggestedPercentage = 56; // Default baseline percentage
      let confidencePercentage = 56;
      let reasoning = "Based on standard 56% calculation for hotel pricing.";
      
      if (similarHotels.length > 0) {
        // Calculate weighted average based on similarity and manual adjustments
        let totalWeight = 0;
        let weightedPercentageSum = 0;
        
        similarHotels.forEach(hotel => {
          const weight = hotel.similarity * (hotel.wasManuallyEdited ? 1.5 : 1.0); // Give more weight to manually corrected data
          totalWeight += weight;
          weightedPercentageSum += hotel.actualPercentage * weight;
        });
        
        if (totalWeight > 0) {
          suggestedPercentage = weightedPercentageSum / totalWeight;
          
          // Confidence increases with more similar data points
          confidencePercentage = Math.min(95, 56 + (similarHotels.length * 5));
          
          reasoning = `AI learned from ${similarHotels.length} similar ${features.stars}-star hotels. `;
          reasoning += `Adjusted percentage to ${suggestedPercentage.toFixed(1)}% based on your previous corrections.`;
        }
      }
      
      const suggestedPrice = features.averagePrice * (suggestedPercentage / 100);
      
      return {
        suggestedPrice: Number(suggestedPrice.toFixed(2)),
        confidencePercentage: Math.round(confidencePercentage),
        reasoning,
        basedOnSimilarHotels: similarHotels.length
      };
    } catch (error: unknown) {
      console.error("AI price suggestion error:", error);
      
      // Fallback to standard calculation
      const fallbackPrice = features.averagePrice * 0.56;
      return {
        suggestedPrice: Number(fallbackPrice.toFixed(2)),
        confidencePercentage: 56,
        reasoning: "Standard 56% calculation (AI learning temporarily unavailable).",
        basedOnSimilarHotels: 0
      };
    }
  }

  // Store pricing data and user feedback for learning
  async storePricingFeedback(data: PricingData): Promise<void> {
    try {
      // Generate vector embedding for the hotel features
      const vectorEmbedding = await this.generateFeatureVector(data.features);
      
      // Calculate percentages
      const aiPercentage = (data.aiSuggestedPrice / data.features.averagePrice) * 100;
      const actualPercentage = (data.actualPrice / data.features.averagePrice) * 100;
      
      // Calculate learning metrics
      const accuracyDifference = Math.abs(actualPercentage - aiPercentage);
      const learningMetrics = {
        accuracyDifference,
        userSatisfaction: accuracyDifference < 5 ? 'high' : accuracyDifference < 10 ? 'medium' : 'low',
        adjustmentDirection: actualPercentage > aiPercentage ? 'increase' : 'decrease',
        feedbackLength: data.userFeedback.length,
        timestamp: new Date().toISOString()
      };
      
      // Store in price intelligence table
      await db.insert(priceIntelligence).values({
        userId: data.userId,
        hotelName: data.hotelName,
        stars: data.features.stars,
        roomCount: data.features.roomCount,
        averagePrice: data.features.averagePrice.toString(),
        aiSuggestedPrice: data.aiSuggestedPrice.toString(),
        actualPrice: data.actualPrice.toString(),
        aiPercentage: aiPercentage.toString(),
        actualPercentage: actualPercentage.toString(),
        userFeedback: data.userFeedback,
        wasManuallyEdited: Math.abs(data.actualPrice - data.aiSuggestedPrice) > 0.01,
        vectorEmbedding: vectorEmbedding,
        learningMetrics: learningMetrics
      });
      
      // Update learning session statistics
      await this.updateLearningSession(data.userId, accuracyDifference);
      
      console.log(`🧠 AI Learning: Stored feedback for ${data.hotelName} (${data.features.stars}⭐)`);
      console.log(`📊 Accuracy difference: ${accuracyDifference.toFixed(1)}%`);
    } catch (error) {
      console.error("Error storing pricing feedback:", error);
    }
  }

  // Update learning session with accuracy improvements
  private async updateLearningSession(userId: number, accuracyDifference: number): Promise<void> {
    try {
      // Get recent learning data to calculate accuracy trends
      const recentData = await db
        .select()
        .from(priceIntelligence)
        .where(eq(priceIntelligence.userId, userId))
        .orderBy(desc(priceIntelligence.createdAt))
        .limit(20);
      
      if (recentData.length >= 5) {
        const oldData = recentData.slice(10);
        const newData = recentData.slice(0, 10);
        
        const oldAccuracy = oldData.reduce((sum, item) => 
          sum + (item.learningMetrics as any)?.accuracyDifference || 0, 0) / oldData.length;
        
        const newAccuracy = newData.reduce((sum, item) => 
          sum + (item.learningMetrics as any)?.accuracyDifference || 0, 0) / newData.length;
        
        // Create learning session record
        await db.insert(aiLearningSessions).values({
          sessionType: 'manual_correction',
          dataPoints: newData.length,
          accuracyBefore: oldAccuracy.toString(),
          accuracyAfter: newAccuracy.toString(),
          adjustments: {
            improvementPercentage: ((oldAccuracy - newAccuracy) / oldAccuracy * 100),
            learningTrend: newAccuracy < oldAccuracy ? 'improving' : 'stable',
            userId: userId
          }
        });
      }
    } catch (error) {
      console.error("Error updating learning session:", error);
    }
  }

  // Get learning analytics for user
  async getLearningAnalytics(userId: number): Promise<{
    totalDataPoints: number;
    averageAccuracy: number;
    improvementTrend: string;
    confidenceGrowth: number;
  }> {
    try {
      const allData = await db
        .select()
        .from(priceIntelligence)
        .where(eq(priceIntelligence.userId, userId))
        .orderBy(desc(priceIntelligence.createdAt));
      
      if (allData.length === 0) {
        return {
          totalDataPoints: 0,
          averageAccuracy: 56,
          improvementTrend: 'learning',
          confidenceGrowth: 0
        };
      }
      
      const totalAccuracyDifference = allData.reduce((sum, item) => 
        sum + ((item.learningMetrics as any)?.accuracyDifference || 0), 0);
      
      const averageAccuracy = 100 - (totalAccuracyDifference / allData.length);
      
      // Calculate improvement trend
      const recent = allData.slice(0, 5);
      const older = allData.slice(-5);
      
      const recentAccuracy = recent.reduce((sum, item) => 
        sum + ((item.learningMetrics as any)?.accuracyDifference || 0), 0) / recent.length;
      
      const olderAccuracy = older.reduce((sum, item) => 
        sum + ((item.learningMetrics as any)?.accuracyDifference || 0), 0) / older.length;
      
      const improvementTrend = recentAccuracy < olderAccuracy ? 'improving' : 
                              recentAccuracy > olderAccuracy ? 'declining' : 'stable';
      
      const confidenceGrowth = Math.min(50, allData.length * 2); // Max 50% improvement
      
      return {
        totalDataPoints: allData.length,
        averageAccuracy: Math.round(averageAccuracy),
        improvementTrend,
        confidenceGrowth
      };
    } catch (error) {
      console.error("Error getting learning analytics:", error);
      return {
        totalDataPoints: 0,
        averageAccuracy: 56,
        improvementTrend: 'learning',
        confidenceGrowth: 0
      };
    }
  }
}

// Export singleton instance
export const aiLearningService = new AIPriceLearningService();