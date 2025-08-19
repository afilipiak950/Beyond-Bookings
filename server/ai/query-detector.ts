/**
 * Intelligent Query Detector - Routes questions to appropriate tools
 * Ensures weather questions use HTTP, business queries use SQL, etc.
 */

export interface QueryAnalysis {
  type: 'weather' | 'business' | 'calculation' | 'email' | 'general' | 'document' | 'world_knowledge' | 'current_events';
  confidence: number;
  extractedLocation?: string;
  suggestedTool: string;
  endpoint?: string;
  shouldUseTools: boolean;
  requiresRealTimeData: boolean;
}

export class QueryDetector {
  
  static analyzeQuery(message: string): QueryAnalysis {
    const msg = message.toLowerCase();
    
    // Weather detection with location extraction
    if (this.isWeatherQuery(msg)) {
      const location = this.extractLocation(message);
      return {
        type: 'weather',
        confidence: 0.95,
        extractedLocation: location,
        suggestedTool: 'http_call',
        endpoint: `https://wttr.in/${encodeURIComponent(location || 'Berlin')}?format=j1`,
        shouldUseTools: true
      };
    }
    
    // Business/hotel data detection
    if (this.isBusinessQuery(msg)) {
      return {
        type: 'business',
        confidence: 0.9,
        suggestedTool: 'sql_query',
        shouldUseTools: true
      };
    }
    
    // Mathematical calculation detection
    if (this.isCalculationQuery(msg)) {
      return {
        type: 'calculation', 
        confidence: 0.85,
        suggestedTool: 'calc_eval',
        shouldUseTools: true
      };
    }
    
    // Email writing detection
    if (this.isEmailQuery(msg)) {
      return {
        type: 'email',
        confidence: 0.8,
        suggestedTool: 'none', // Use AI intelligence directly
        shouldUseTools: false
      };
    }
    
    // Document search detection
    if (this.isDocumentQuery(msg)) {
      return {
        type: 'document',
        confidence: 0.8,
        suggestedTool: 'docs_search',
        shouldUseTools: true,
        requiresRealTimeData: false
      };
    }
    
    // Current events and news detection
    if (this.isCurrentEventsQuery(msg)) {
      return {
        type: 'current_events',
        confidence: 0.9,
        suggestedTool: 'http_call',
        shouldUseTools: true,
        requiresRealTimeData: true
      };
    }
    
    // World knowledge that might need verification
    if (this.isWorldKnowledgeQuery(msg)) {
      return {
        type: 'world_knowledge',
        confidence: 0.8,
        suggestedTool: 'none', // Use AI intelligence, but may need fact-checking
        shouldUseTools: false,
        requiresRealTimeData: false
      };
    }
    
    // Default to general intelligence
    return {
      type: 'general',
      confidence: 0.7,
      suggestedTool: 'none',
      shouldUseTools: false,
      requiresRealTimeData: false
    };
  }
  
  private static isWeatherQuery(msg: string): boolean {
    const weatherKeywords = [
      'wetter', 'weather', 'temperatur', 'temperature', 'regen', 'rain', 
      'sonne', 'sunny', 'bewölkt', 'cloudy', 'wind', 'schnee', 'snow',
      'heute', 'today', 'morgen', 'tomorrow', 'grad celsius', 'degrees',
      'wie ist das wetter', 'how is the weather', 'wie wird das wetter',
      'wettervorhersage', 'forecast', 'klima', 'climate'
    ];
    
    return weatherKeywords.some(keyword => msg.includes(keyword));
  }
  
  private static isBusinessQuery(msg: string): boolean {
    const businessKeywords = [
      'hotel', 'profitabilität', 'profitability', 'revenue', 'umsatz',
      'sterne', 'stars', 'preise', 'prices', 'berechnung', 'calculation',
      'margin', 'marge', 'business', 'geschäft', 'vergleiche', 'compare',
      '5-sterne', '4-sterne', 'five star', 'four star', 'durchschnitt', 'average'
    ];
    
    return businessKeywords.some(keyword => msg.includes(keyword));
  }
  
  private static isCalculationQuery(msg: string): boolean {
    const calcKeywords = [
      '+', '-', '*', '/', '=', 'rechne', 'calculate', 'berechne',
      'summe', 'sum', 'durchschnitt', 'average', 'prozent', 'percent',
      'math', 'mathe', 'formel', 'formula'
    ];
    
    const hasNumbers = /\d/.test(msg);
    const hasOperators = /[\+\-\*\/\=]/.test(msg);
    const hasCalcWords = calcKeywords.some(keyword => msg.includes(keyword));
    
    return (hasNumbers && hasOperators) || hasCalcWords;
  }
  
  private static isEmailQuery(msg: string): boolean {
    const emailKeywords = [
      'email', 'e-mail', 'mail', 'schreibe', 'write', 'brief', 'letter',
      'nachricht', 'message', 'antwort', 'reply', 'contact', 'kontakt'
    ];
    
    return emailKeywords.some(keyword => msg.includes(keyword));
  }
  
  private static isDocumentQuery(msg: string): boolean {
    const docKeywords = [
      'dokument', 'document', 'datei', 'file', 'pdf', 'excel',
      'suche in', 'search in', 'finde in', 'find in', 'uploaded'
    ];
    
    return docKeywords.some(keyword => msg.includes(keyword));
  }
  
  private static isCurrentEventsQuery(msg: string): boolean {
    const currentKeywords = [
      'news', 'nachrichten', 'aktuell', 'current', 'heute', 'today',
      'latest', 'neueste', 'breaking', 'happening', 'geschieht',
      'events', 'ereignisse', 'politik', 'politics', 'elections', 'wahlen'
    ];
    
    return currentKeywords.some(keyword => msg.includes(keyword));
  }
  
  private static isWorldKnowledgeQuery(msg: string): boolean {
    const knowledgeKeywords = [
      'wer ist', 'who is', 'was ist', 'what is', 'wie funktioniert', 'how does',
      'geschichte', 'history', 'wissenschaft', 'science', 'erkläre', 'explain',
      'definition', 'bedeutung', 'meaning', 'facts', 'fakten'
    ];
    
    return knowledgeKeywords.some(keyword => msg.includes(keyword));
  }
  
  private static extractLocation(message: string): string {
    // Common German and English cities
    const cities = [
      'berlin', 'münchen', 'hamburg', 'köln', 'frankfurt', 'stuttgart',
      'düsseldorf', 'dortmund', 'essen', 'leipzig', 'bremen', 'dresden',
      'hannover', 'nürnberg', 'duisburg', 'bochum', 'wuppertal', 'bielefeld',
      'bonn', 'münster', 'karlsruhe', 'mannheim', 'augsburg', 'wiesbaden',
      'london', 'paris', 'madrid', 'rome', 'amsterdam', 'vienna', 'prague',
      'zurich', 'geneva', 'basel', 'bern', 'salzburg', 'innsbruck', 'graz',
      'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia'
    ];
    
    const msg = message.toLowerCase();
    
    // Look for city mentions
    for (const city of cities) {
      if (msg.includes(city)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }
    
    // Look for "in CITY" pattern
    const inPattern = /in ([a-zA-ZäöüÄÖÜß]+)/i;
    const match = message.match(inPattern);
    if (match) {
      return match[1];
    }
    
    // Default to Berlin if no location found
    return 'Berlin';
  }
}