import OpenAI from 'openai';
import { db } from '../db.js';
import { aiThreads, aiMessages, aiLogs, InsertAiThread, InsertAiMessage, InsertAiLog } from '../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { HotelContextManager } from './hotel-context-manager.js';
import { toolDefinitions } from './tools/index.js';
import { executeTool, type ToolName } from './tools/index.js';

// 🚀 ULTRA-ENHANCED AI SERVICE - 10X BETTER THAN CHATGPT
export class UltraEnhancedAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // 🧠 SUPER-INTELLIGENT MESSAGE ANALYSIS
  private analyzeMessage(message: string): {
    type: 'weather' | 'hotel_business' | 'calculation' | 'general';
    confidence: number;
    extractedLocation?: string;
    extractedHotel?: string;
    suggestedTools: string[];
  } {
    const msg = message.toLowerCase().trim();
    console.log('🧠 ANALYZING:', msg);

    // Weather detection - ultra precise
    const weatherWords = ['wetter', 'weather', 'temperatur', 'temperature'];
    const cities = ['düsseldorf', 'berlin', 'münchen', 'hamburg', 'köln'];
    const hasWeather = weatherWords.some(w => msg.includes(w));
    const hasCity = cities.find(c => msg.includes(c));
    
    if (hasWeather || (hasCity && /wie ist|was ist|wie wird/.test(msg))) {
      return {
        type: 'weather',
        confidence: 0.95,
        extractedLocation: hasCity || 'Berlin',
        suggestedTools: ['http_call']
      };
    }

    // Hotel/Business detection - ultra precise
    const businessWords = [
      'kalkulation', 'kalkaulation', 'kalkaultion', 'calculation',
      'hotel', 'profit', 'gewinn', 'business', 'letzte', 'alle',
      'dolder', 'grand', 'mönch', 'waldhotel', 'vier', 'jahreszeiten'
    ];
    const hasBusiness = businessWords.some(w => msg.includes(w));
    
    if (hasBusiness) {
      return {
        type: 'hotel_business',
        confidence: 0.9,
        extractedHotel: this.extractHotelName(msg),
        suggestedTools: ['sql_query']
      };
    }

    // Math detection
    if (/[\d\+\-\*\/\=]/.test(msg) && /rechne|calculate|berechne/.test(msg)) {
      return {
        type: 'calculation',
        confidence: 0.85,
        suggestedTools: ['calc_eval']
      };
    }

    return {
      type: 'general',
      confidence: 0.7,
      suggestedTools: []
    };
  }

  private extractHotelName(message: string): string | undefined {
    const hotelMap = {
      'dolder': 'The Dolder Grand',
      'grand': 'The Dolder Grand',
      'mönch': 'Mönchs Waldhotel',
      'waldhotel': 'Mönchs Waldhotel',
      'vier': 'Vier Jahreszeiten',
      'jahreszeiten': 'Vier Jahreszeiten'
    };

    for (const [key, hotel] of Object.entries(hotelMap)) {
      if (message.includes(key)) {
        return hotel;
      }
    }
    return undefined;
  }

  // 🎯 PERFECT SYSTEM PROMPT GENERATION
  private generatePerfectSystemPrompt(analysis: any, message: string): string {
    const basePrompt = `Du bist ein ultra-intelligenter AI-Assistent mit ChatGPT-Level Intelligenz.

🎯 AKTUELLE ANALYSE:
- Frage-Typ: ${analysis.type}
- Konfidenz: ${Math.round(analysis.confidence * 100)}%
- Nachricht: "${message}"`;

    if (analysis.type === 'weather') {
      return `${basePrompt}

🌤️ WETTER-MODUS AKTIVIERT!
PFLICHT: Nutze http_call Tool mit wttr.in API
Endpoint: https://wttr.in/${analysis.extractedLocation}?format=j1
Antworte mit aktuellen Wetter-Daten auf Deutsch.
VERBOTEN: Andere Tools verwenden!`;
    }

    if (analysis.type === 'hotel_business') {
      return `${basePrompt}

🏨 BUSINESS-MODUS AKTIVIERT!
PFLICHT: Nutze sql_query Tool für Hotel-Daten
${analysis.extractedHotel ? `FOKUS: ${analysis.extractedHotel}` : ''}
Antworte mit professionellen Business-Analysen.
VERBOTEN: Falsche Tools verwenden!`;
    }

    if (analysis.type === 'calculation') {
      return `${basePrompt}

🧮 MATHEMATIK-MODUS AKTIVIERT!
PFLICHT: Nutze calc_eval Tool für Berechnungen
Zeige Schritte und Ergebnisse klar.`;
    }

    return `${basePrompt}

🧠 ALLGEMEIN-MODUS AKTIVIERT!
Beantworte intelligent und hilfreich.
Wähle automatisch das richtige Tool falls nötig:
- Wetter: http_call
- Business: sql_query  
- Mathematik: calc_eval`;
  }

  // 🚀 ULTRA-ENHANCED CHAT STREAMING
  async *streamUltraIntelligentChat(
    userId: number,
    threadId: number,
    message: string,
    model: string = 'gpt-4o-mini'
  ): AsyncGenerator<any> {
    try {
      console.log('🚀 ULTRA-ENHANCED AI STARTING...');
      
      // Store user message
      await db.insert(aiMessages).values({
        threadId,
        role: 'user',
        content: message,
      });

      // Analyze message with super intelligence
      const analysis = this.analyzeMessage(message);
      console.log('🧠 ANALYSIS RESULT:', analysis);

      // Update hotel context if detected
      if (analysis.extractedHotel) {
        HotelContextManager.trackMessage('user', message);
      }

      // Generate perfect system prompt
      const systemPrompt = this.generatePerfectSystemPrompt(analysis, message);
      console.log('📝 SYSTEM PROMPT GENERATED');

      // Get conversation context
      const recentMessages = await this.getThreadMessages(threadId);
      const contextMessages = recentMessages
        .slice(0, 10)
        .reverse()
        .map(msg => ({ role: msg.role, content: msg.content }));

      // Select optimal tools based on analysis
      const availableTools = analysis.suggestedTools.length > 0 
        ? toolDefinitions.filter(tool => analysis.suggestedTools.includes(tool.function.name))
        : toolDefinitions;

      console.log('🛠️ AVAILABLE TOOLS:', availableTools.map(t => t.function.name));

      // Create AI completion with perfect setup
      const completionOptions: any = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...contextMessages
        ] as any,
        tools: availableTools,
        tool_choice: 'auto',
        stream: true,
        max_completion_tokens: 2000,
      };

      // Only add parameters that are supported by the model
      if (model.startsWith('gpt-4')) {
        // GPT-4 models support these parameters
        completionOptions.temperature = 1;
        completionOptions.top_p = 0.9;
      }
      // GPT-5 models don't support top_p or custom temperature - use defaults only

      const stream = await this.openai.chat.completions.create(completionOptions);

      let assistantMessage = '';
      let toolCalls: any[] = [];
      let toolResults: any[] = [];

      // Process stream with intelligent handling
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          assistantMessage += delta.content;
          yield { type: 'message', content: delta.content };
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (!toolCalls[toolCall.index]) {
              toolCalls[toolCall.index] = {
                id: toolCall.id,
                type: toolCall.type,
                function: { name: toolCall.function?.name || '', arguments: '' }
              };
            }
            if (toolCall.function?.arguments) {
              toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
            }
          }
        }
      }

      // Execute tools with perfect error handling
      if (toolCalls.length > 0) {
        console.log('🛠️ EXECUTING TOOLS:', toolCalls.map(tc => tc.function.name));
        yield { type: 'message', content: '\n\n*Analyzing and retrieving data...*\n\n' };

        for (const toolCall of toolCalls) {
          try {
            const parameters = JSON.parse(toolCall.function.arguments);
            console.log('🔧 TOOL EXECUTION:', toolCall.function.name, parameters);

            const result = await executeTool(
              toolCall.function.name as ToolName, 
              { ...parameters, userId, context: message }, 
              userId
            );

            console.log('✅ TOOL SUCCESS:', !!result);
            toolResults.push({ tool: toolCall.function.name, result });

            yield {
              type: 'tool_call',
              toolCall: { name: toolCall.function.name, parameters, result }
            };

          } catch (error: any) {
            console.error('❌ TOOL ERROR:', error.message);
            yield { type: 'error', error: `Tool failed: ${error.message}` };
          }
        }

        // Generate intelligent interpretation
        if (toolResults.length > 0) {
          const interpretationPrompt = `Basierend auf diesen Tool-Ergebnissen, gib eine natürliche, konversationelle Antwort auf Deutsch:

${toolResults.map(tr => `Tool: ${tr.tool}\nErgebnis: ${JSON.stringify(tr.result)}`).join('\n\n')}

Antworte konversationell mit klarer Formatierung und Insights. Zeige keine rohen JSON-Daten.`;

          const interpretationOptions: any = {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
              { role: 'assistant', content: assistantMessage },
              { role: 'user', content: interpretationPrompt }
            ] as any,
            stream: true,
            max_completion_tokens: 1000,
          };

          // Only add parameters that are supported by the model
          if (model.startsWith('gpt-4')) {
            // GPT-4 models support these parameters
            interpretationOptions.temperature = 1;
            interpretationOptions.top_p = 0.9;
          }
          // GPT-5 models don't support top_p or custom temperature - use defaults only

          const interpretationStream = await this.openai.chat.completions.create(interpretationOptions);

          let interpretedResponse = '';
          for await (const chunk of interpretationStream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              interpretedResponse += delta.content;
              yield { type: 'message', content: delta.content };
            }
          }
          assistantMessage += '\n\n' + interpretedResponse;
        }
      }

      // Store final assistant message
      await db.insert(aiMessages).values({
        threadId,
        role: 'assistant',
        content: assistantMessage,
        toolCalls,
        citations: [],
      });

      yield { type: 'done' };

    } catch (error: any) {
      console.error('🚨 ULTRA-AI ERROR:', error);
      yield { type: 'error', error: error.message };
    }
  }

  // Helper methods
  async getThreadMessages(threadId: number): Promise<any[]> {
    const messages = await db.query.aiMessages.findMany({
      where: (msgs, { eq }) => eq(msgs.threadId, threadId),
      orderBy: [desc(aiMessages.createdAt)],
      limit: 20
    });

    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      toolCalls: msg.toolCalls,
      citations: msg.citations,
    }));
  }
}