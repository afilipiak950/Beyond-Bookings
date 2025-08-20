/**
 * Intelligent Query Detection System
 * Automatically adapts to new hotels and handles spelling variations
 */

import { db } from '../db.js';
import { hotels } from '../../shared/schema.js';

export interface QueryAnalysis {
  type: 'weather' | 'hotel_business' | 'calculation' | 'general';
  confidence: number;
  extractedLocation?: string;
  extractedHotel?: string;
  suggestedTools: string[];
  spellingCorrected?: boolean;
}

export class IntelligentDetector {
  private static hotelCache: { names: string[], keywords: string[] } = { names: [], keywords: [] };
  private static lastHotelRefresh = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Dynamic hotel data loading from database
  static async refreshHotelData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastHotelRefresh < this.CACHE_DURATION) {
      return; // Use cached data
    }

    try {
      const allHotels = await db.select({ name: hotels.name }).from(hotels);
      
      const hotelNames = allHotels.map(h => h.name.toLowerCase());
      const hotelKeywords = new Set<string>();

      // Extract keywords from all hotel names
      hotelNames.forEach(name => {
        const words = name.split(/\s+|[-_]/).filter(w => w.length > 2);
        words.forEach(word => hotelKeywords.add(word.toLowerCase()));
      });

      this.hotelCache = {
        names: hotelNames,
        keywords: Array.from(hotelKeywords)
      };
      
      this.lastHotelRefresh = now;
      console.log('🏨 Hotel cache refreshed:', {
        hotels: hotelNames.length,
        keywords: hotelKeywords.size
      });
      
    } catch (error) {
      console.error('Failed to refresh hotel data:', error);
    }
  }

  // Intelligent spelling correction using Levenshtein distance
  static correctSpelling(word: string, dictionary: string[]): { corrected: string; distance: number } | null {
    let bestMatch = null;
    let minDistance = Infinity;
    
    for (const dictWord of dictionary) {
      const distance = this.levenshteinDistance(word.toLowerCase(), dictWord.toLowerCase());
      const threshold = Math.max(1, Math.floor(word.length * 0.3)); // 30% error tolerance
      
      if (distance <= threshold && distance < minDistance) {
        minDistance = distance;
        bestMatch = dictWord;
      }
    }
    
    return bestMatch ? { corrected: bestMatch, distance: minDistance } : null;
  }

  // Calculate Levenshtein distance for spelling correction
  static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Enhanced message analysis with dynamic hotel detection
  static async analyzeMessage(message: string): Promise<QueryAnalysis> {
    const msg = message.toLowerCase().trim();
    
    // Refresh hotel data
    await this.refreshHotelData();
    
    console.log('🔍 INTELLIGENT ANALYSIS:', msg);

    // Weather detection with location extraction
    const weatherResult = this.detectWeather(msg);
    if (weatherResult) return weatherResult;

    // Hotel/Business detection with spelling correction
    const hotelResult = await this.detectHotelBusiness(msg);
    if (hotelResult) return hotelResult;

    // Math detection
    const mathResult = this.detectCalculation(msg);
    if (mathResult) return mathResult;

    // Default to general
    return {
      type: 'general',
      confidence: 0.7,
      suggestedTools: []
    };
  }

  private static detectWeather(msg: string): QueryAnalysis | null {
    const weatherWords = ['wetter', 'weather', 'temperatur', 'temperature'];
    const cities = ['düsseldorf', 'berlin', 'münchen', 'hamburg', 'köln', 'frankfurt'];
    
    const hasWeather = weatherWords.some(w => msg.includes(w));
    const hasCity = cities.find(c => msg.includes(c));
    const hasWeatherPattern = /wie ist.*in|was ist.*wetter|wie wird.*wetter/.test(msg);
    
    if (hasWeather || (hasCity && hasWeatherPattern)) {
      console.log('🌤️ WEATHER DETECTED');
      return {
        type: 'weather',
        confidence: 0.95,
        extractedLocation: hasCity || 'Berlin',
        suggestedTools: ['http_call']
      };
    }
    
    return null;
  }

  static async detectHotelBusiness(msg: string): Promise<QueryAnalysis | null> {
    // 🚨 CRITICAL: More specific business words to prevent false positives
    const coreBusinessWords = ['kalkulation', 'kalkaulation', 'kalkaultion', 'calculation', 
                              'profit', 'gewinn', 'umsatz', 'revenue', 'zimmer', 'auslastung'];
    
    // Context-dependent words that need hotel context
    const hotelContextWords = ['letzte', 'alle', 'business'];
    
    // Political exclusions - if these words exist, it's NOT a hotel query
    const politicalWords = ['bundeskanzler', 'budneskanzler', 'kanzler', 'präsident', 'minister', 
                           'politik', 'regierung', 'deutschland', 'russland', 'usa', 'politiker'];
    
    // 🚨 CRITICAL FIX: Check for political exclusions FIRST
    const isPoliticalQuery = politicalWords.some(w => msg.includes(w));
    if (isPoliticalQuery) {
      console.log('🚫 POLITICAL QUERY DETECTED - Not a hotel query:', msg.substring(0, 50));
      return null;
    }
    
    const hasCoreBusinessWord = coreBusinessWords.some(w => msg.includes(w));
    const hasHotelContextWord = hotelContextWords.some(w => msg.includes(w));
    
    // Check for hotel names (exact matches)
    let detectedHotel = null;
    let spellingCorrected = false;
    
    for (const hotelName of this.hotelCache.names) {
      if (msg.includes(hotelName)) {
        detectedHotel = hotelName;
        break;
      }
    }
    
    // If no exact match, try spelling correction
    if (!detectedHotel) {
      const words = msg.split(/\s+/);
      for (const word of words) {
        if (word.length > 3) {
          const correction = this.correctSpelling(word, this.hotelCache.names);
          if (correction) {
            detectedHotel = correction.corrected;
            spellingCorrected = true;
            console.log(`🔧 SPELLING CORRECTED: "${word}" → "${correction.corrected}"`);
            break;
          }
        }
      }
    }
    
    // Check for hotel keywords
    const hasHotelKeyword = this.hotelCache.keywords.some(keyword => msg.includes(keyword));
    
    // Determine if this is a hotel/business query
    // Must have either: core business word + hotel context, OR hotel name detected, OR explicit hotel mention
    const isHotelQuery = (hasCoreBusinessWord) || 
                        (hasHotelContextWord && (detectedHotel || hasHotelKeyword || msg.includes('hotel'))) ||
                        (detectedHotel) ||
                        (msg.includes('hotel') && hasHotelKeyword);
    
    if (isHotelQuery) {
      console.log('🏨 HOTEL/BUSINESS DETECTED:', { 
        detectedHotel, 
        spellingCorrected, 
        hasCoreBusinessWord, 
        hasHotelKeyword 
      });
      
      return {
        type: 'hotel_business',
        confidence: detectedHotel ? 0.95 : 0.85,
        extractedHotel: detectedHotel || undefined,
        suggestedTools: ['sql_query'],
        spellingCorrected
      };
    }
    
    return null;
  }

  private static detectCalculation(msg: string): QueryAnalysis | null {
    const hasNumbers = /\d/.test(msg);
    const hasOperators = /[\+\-\*\/\=]/.test(msg);
    const hasMathWords = /rechne|calculate|berechne|plus|minus|mal|geteilt/.test(msg);
    
    if ((hasNumbers && hasOperators) || hasMathWords) {
      console.log('🧮 CALCULATION DETECTED');
      return {
        type: 'calculation',
        confidence: 0.9,
        suggestedTools: ['calc_eval']
      };
    }
    
    return null;
  }

  // Get all current hotel names for debugging
  static async getAllHotelNames(): Promise<string[]> {
    await this.refreshHotelData();
    return this.hotelCache.names;
  }
}