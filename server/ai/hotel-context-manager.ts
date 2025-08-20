// Hotel Context Manager - Ensures AI ALWAYS uses correct hotel data
export interface HotelData {
  name: string;
  stars: number;
  rooms: number;
  occupancyRate: string;
  averagePrice: string;
  voucherPrice: string;
  operationalCosts: string;
  vatRate: string;
  vatAmount: string;
  profitMargin: string;
  totalPrice: string;
  discountVsMarket: string;
}

// Predefined hotel data to ensure consistency
export const HOTEL_DATA_MAP: Record<string, HotelData> = {
  'mönchs waldhotel': {
    name: 'Mönchs Waldhotel',
    stars: 3,
    rooms: 78,
    occupancyRate: '70%',
    averagePrice: '120,00 €',
    voucherPrice: '30,00 €',
    operationalCosts: '1.326,00 €',
    vatRate: '19%',
    vatAmount: '3.800,00 €',
    profitMargin: '14.874,00 €',
    totalPrice: '23.800,00 €',
    discountVsMarket: '-14.440,00 €'
  },
  'the dolder grand': {
    name: 'The Dolder Grand',
    stars: 5,
    rooms: 175,
    occupancyRate: '70%',
    averagePrice: '750,00 €',
    voucherPrice: '50,00 €',
    operationalCosts: '2.975,00 €',
    vatRate: '19%',
    vatAmount: '2.850,00 €',
    profitMargin: '9.175,00 €',
    totalPrice: '17.850,00 €',
    discountVsMarket: '113.400,00 €'
  },
  'vier jahreszeiten hamburg': {
    name: 'Vier Jahreszeiten Hamburg',
    stars: 3,
    rooms: 50,
    occupancyRate: '70%',
    averagePrice: '100,00 €',
    voucherPrice: '25,00 €',
    operationalCosts: '1.200,00 €',
    vatRate: '19%',
    vatAmount: '2.500,00 €',
    profitMargin: '12.000,00 €',
    totalPrice: '18.500,00 €',
    discountVsMarket: '-10.000,00 €'
  }
};

export class HotelContextManager {
  private static currentHotel: string | null = null;
  private static conversationHistory: { role: string; content: string; hotel?: string | null; isHotelRelated?: boolean }[] = [];
  private static lastTopicWasHotel: boolean = false;

  // Check if query is about weather, general knowledge, etc. (NOT hotel-related)
  static isNonHotelQuery(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Non-hotel topics that should CLEAR hotel context
    const nonHotelPatterns = [
      'wetter', 'weather', 'temperatur', 'regen', 'sonne', 'schnee',
      'hauptstadt', 'capital', 'geschichte', 'history',
      'rezept', 'recipe', 'kochen', 'cooking',
      'sport', 'fußball', 'football', 'basketball',
      'wissenschaft', 'science', 'mathematik', 'math',
      'musik', 'music', 'kunst', 'art',
      'aktien', 'stocks', 'börse', 'market',
      'nachrichten', 'news', 'politik', 'politics',
      'gesundheit', 'health', 'medizin', 'medicine',
      'technologie', 'technology', 'programmieren', 'coding'
    ];
    
    // If query contains any non-hotel pattern and NO hotel keywords, it's not hotel-related
    const hasNonHotelTopic = nonHotelPatterns.some(pattern => lowerText.includes(pattern));
    const hasHotelKeywords = ['hotel', 'zimmer', 'übernachtung', 'kalkulation', 'belegung', 'mönchs', 'waldhotel', 'dolder', 'vier jahreszeiten'].some(keyword => lowerText.includes(keyword));
    
    return hasNonHotelTopic && !hasHotelKeywords;
  }

  // Detect hotel from any text
  static detectHotel(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // First check if this is a non-hotel query
    if (this.isNonHotelQuery(text)) {
      console.log('🌍 Non-hotel query detected, clearing hotel context');
      return null;
    }
    
    // Priority order - check most specific patterns first
    const patterns = [
      { keywords: ['mönchs', 'waldhotel', 'mönch'], hotel: 'mönchs waldhotel' },
      { keywords: ['vier', 'jahreszeiten', 'hamburg'], hotel: 'vier jahreszeiten hamburg' },
      { keywords: ['dolder', 'grand'], hotel: 'the dolder grand' },
    ];

    for (const { keywords, hotel } of patterns) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        console.log(`🎯 Hotel detected: "${hotel}" from text containing: ${keywords.join(', ')}`);
        return hotel;
      }
    }

    return null;
  }

  // Track conversation and maintain hotel context
  static trackMessage(role: string, content: string): string | null {
    // Check if this is a non-hotel query FIRST
    if (role === 'user' && this.isNonHotelQuery(content)) {
      console.log('🔄 Topic change detected! Clearing hotel context for non-hotel query');
      this.currentHotel = null;
      this.lastTopicWasHotel = false;
      // Store in history with non-hotel flag
      this.conversationHistory.push({ role, content, hotel: null, isHotelRelated: false });
    } else {
      const detectedHotel = this.detectHotel(content);
      
      // If user mentions a hotel, update context
      if (role === 'user' && detectedHotel) {
        this.currentHotel = detectedHotel;
        this.lastTopicWasHotel = true;
        console.log(`🏨 Updated current hotel context to: ${this.currentHotel}`);
      }
      
      // Store in history
      this.conversationHistory.push({ role, content, hotel: detectedHotel, isHotelRelated: detectedHotel !== null });
    }
    
    // Keep only last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
    
    return this.currentHotel;
  }

  // Get the current hotel context
  static getCurrentHotel(): string | null {
    if (this.currentHotel) {
      return this.currentHotel;
    }
    
    // Check recent history for hotel mentions
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      const msg = this.conversationHistory[i];
      if (msg.hotel) {
        console.log(`🏨 Found hotel in history: ${msg.hotel}`);
        return msg.hotel;
      }
    }
    
    return null;
  }

  // Get hotel data with fallback to current context
  static getHotelData(hotelName?: string): HotelData | null {
    const hotel = hotelName?.toLowerCase() || this.getCurrentHotel();
    if (!hotel) return null;
    
    const data = HOTEL_DATA_MAP[hotel];
    if (data) {
      console.log(`✅ Retrieved data for hotel: ${data.name}`);
      return data;
    }
    
    console.log(`❌ No data found for hotel: ${hotel}`);
    return null;
  }

  // Validate if text contains correct hotel data
  static validateHotelData(text: string, expectedHotel: string): boolean {
    const lowerText = text.toLowerCase();
    const expectedData = HOTEL_DATA_MAP[expectedHotel.toLowerCase()];
    
    if (!expectedData) return false;
    
    // Check if the text mentions the correct hotel name
    const hasCorrectName = lowerText.includes(expectedData.name.toLowerCase());
    
    // Check if key data points match
    const hasCorrectRooms = text.includes(expectedData.rooms.toString());
    const hasCorrectPrice = text.includes(expectedData.averagePrice.split(',')[0]);
    
    const isValid = hasCorrectName && (hasCorrectRooms || hasCorrectPrice);
    
    if (!isValid) {
      console.log(`⚠️ Validation failed! Expected ${expectedHotel} but text doesn't match`);
      console.log(`   Name check: ${hasCorrectName}, Rooms: ${hasCorrectRooms}, Price: ${hasCorrectPrice}`);
    }
    
    return isValid;
  }

  // Generate corrected prompt with explicit hotel data
  static generateCorrectedPrompt(originalPrompt: string, hotelName: string): string {
    const hotelData = this.getHotelData(hotelName);
    if (!hotelData) return originalPrompt;
    
    return `
${originalPrompt}

🔴🔴🔴 KRITISCHE KORREKTUR - VERWENDE NUR DIESE DATEN 🔴🔴🔴

Du MUSST die folgenden EXAKTEN Daten für ${hotelData.name} verwenden:
- Hotel: ${hotelData.name}
- Sterne: ${hotelData.stars}
- Zimmeranzahl: ${hotelData.rooms}
- Belegungsrate: ${hotelData.occupancyRate}
- Durchschnittspreis pro Nacht: ${hotelData.averagePrice}
- Voucherpreis: ${hotelData.voucherPrice}
- Betriebskosten: ${hotelData.operationalCosts}
- MwSt.-Satz: ${hotelData.vatRate}
- MwSt.-Betrag: ${hotelData.vatAmount}
- Gewinnmarge: ${hotelData.profitMargin}
- Gesamtpreis: ${hotelData.totalPrice}
- Rabatt im Vergleich zum Markt: ${hotelData.discountVsMarket}

⚠️ VERWENDE KEINE ANDEREN DATEN! Diese Zahlen sind die EINZIGEN korrekten Werte!
`;
  }

  // Clear context (for new conversations)
  static clearContext(): void {
    this.currentHotel = null;
    this.conversationHistory = [];
    console.log('🧹 Hotel context cleared');
  }
}