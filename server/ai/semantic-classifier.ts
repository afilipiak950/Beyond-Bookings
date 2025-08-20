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
1. hotel_business - Hotel calculations, pricing, business data, profit margins, room rates, occupancy, revenue analysis
2. weather - Weather information, temperature, climate questions  
3. calculation - Pure mathematical calculations, arithmetic operations
4. general - Everything else (politics, history, science, etc.)

IMPORTANT: Focus on INTENT, not keywords. Look for:
- Business/financial context → hotel_business
- Weather/climate context → weather  
- Math operations → calculation
- Everything else → general

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