import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SemanticClassification {
  type: 'hotel_business' | 'weather' | 'general' | 'calculation';
  confidence: number;
  reasoning: string;
  shouldUseTools: boolean;
  suggestedTools: string[];
}

export class SemanticClassifier {
  static async classifyMessage(message: string): Promise<SemanticClassification> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a query classification system. Analyze the user's message and classify it into one of these categories:

CATEGORIES:
1. hotel_business - ANY question about SPECIFIC NAMED hotels (Dolder Grand, Ritz Carlton, etc.) - includes info requests, pricing, calculations
2. weather - Weather information, temperature, climate questions  
3. calculation - Pure mathematical calculations, arithmetic operations
4. general - Everything else including general hotel statistics, country data, historical facts, science, politics

CRITICAL RULES:
- "How many hotels in Germany?" = GENERAL (country statistics)
- "Tell me about Dolder Grand" = HOTEL_BUSINESS (specific hotel)
- "Dolder Grand pricing" = HOTEL_BUSINESS (specific hotel)
- "Hotel industry trends" = GENERAL (industry information)
- "Calculate 25 + 30" = CALCULATION (math only)

ANY mention of a SPECIFIC hotel name = HOTEL_BUSINESS (even for general info requests)

Respond with JSON only:
{
  "type": "hotel_business|weather|calculation|general",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "shouldUseTools": true/false,
  "suggestedTools": ["sql_query", "calc_eval", "http_call", etc.]
}`
          },
          {
            role: 'user',
            content: `Classify this message: "${message}"`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate response structure
      if (!result.type || !['hotel_business', 'weather', 'calculation', 'general'].includes(result.type)) {
        throw new Error('Invalid classification type');
      }

      return {
        type: result.type,
        confidence: result.confidence || 0.7,
        reasoning: result.reasoning || 'No reasoning provided',
        shouldUseTools: result.shouldUseTools || false,
        suggestedTools: result.suggestedTools || []
      };

    } catch (error) {
      console.error('Semantic classification failed:', error);
      
      // Fallback to simple heuristics
      const msg = message.toLowerCase();
      
      if (msg.includes('wetter') || msg.includes('weather')) {
        return {
          type: 'weather',
          confidence: 0.8,
          reasoning: 'Fallback: Contains weather keywords',
          shouldUseTools: false,
          suggestedTools: []
        };
      }
      
      if (/[\+\-\*\/=]/.test(msg) || msg.includes('rechne')) {
        return {
          type: 'calculation',
          confidence: 0.8,
          reasoning: 'Fallback: Contains math operators',
          shouldUseTools: true,
          suggestedTools: ['calc_eval']
        };
      }
      
      // Default to general
      return {
        type: 'general',
        confidence: 0.5,
        reasoning: 'Fallback: Classification failed',
        shouldUseTools: false,
        suggestedTools: []
      };
    }
  }
}