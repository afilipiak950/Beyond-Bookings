import OpenAI from 'openai';
import { db } from '../db';
import { aiThreads, aiMessages, aiLogs, InsertAiThread, InsertAiMessage, InsertAiLog } from '../../shared/schema';
import { eq, desc, and, lt, count } from 'drizzle-orm';
import { tools, toolDefinitions, executeTool, type ToolName } from './tools/index';
import { calcEval, calcEvalToolDefinition } from './tools/calcEval';
import { sqlQuery, sqlQueryToolDefinition } from './tools/sqlQuery';
import { docsSearch, docsSearchToolDefinition } from './tools/docsSearch';
import { IntelligenceEnhancer, IntelligenceData } from './intelligence-enhancer';
import { QueryDetector, QueryAnalysis } from './query-detector';
import { docsGet, docsGetToolDefinition } from './tools/docsGet';
import { httpCall, httpCallToolDefinition } from './tools/httpCall';
import { HotelContextManager } from './hotel-context-manager';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  citations?: Citation[];
}

export interface Citation {
  type: 'calculation' | 'database' | 'document' | 'api';
  source: string;
  content?: string;
  reference?: string;
}

export interface ChatStreamChunk {
  type: 'message' | 'tool_call' | 'citation' | 'error' | 'done';
  content?: string;
  toolCall?: any;
  citation?: Citation;
  error?: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export class AIService {
  // Get or create thread
  async getOrCreateThread(userId: number, threadId?: number, title?: string, mode?: string): Promise<number> {
    if (threadId) {
      const thread = await db.query.aiThreads.findFirst({
        where: (threads, { eq, and }) => and(eq(threads.id, threadId), eq(threads.userId, userId)),
      });
      
      if (thread) {
        return thread.id;
      }
    }

    // Create new thread
    const threadData: InsertAiThread = {
      userId,
      title: title || 'New Chat',
      mode: mode || 'general',
    };

    const [newThread] = await db.insert(aiThreads).values(threadData).returning();
    return newThread.id;
  }

  // Get thread messages
  async getThreadMessages(threadId: number, userId: number): Promise<ChatMessage[]> {
    const messages = await db.query.aiMessages.findMany({
      where: (msgs, { eq }) => eq(msgs.threadId, threadId),
      orderBy: [aiMessages.createdAt], // ASC order for natural conversation flow
      with: {
        thread: true,
      },
    });

    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      toolCalls: msg.toolCalls as any[],
      citations: msg.citations as Citation[],
    }));
  }

  // Calculate token usage cost (approximate)
  private calculateCost(usage: TokenUsage, model: string): number {
    const costs = {
      'gpt-4o': { prompt: 0.00250, completion: 0.01000 },
      'gpt-4o-mini': { prompt: 0.000150, completion: 0.000600 },
    };

    const modelCost = costs[model as keyof typeof costs] || costs['gpt-4o-mini'];
    
    return (
      (usage.prompt_tokens / 1000) * modelCost.prompt +
      (usage.completion_tokens / 1000) * modelCost.completion
    );
  }

  // Execute tool calls using new comprehensive tool system
  private async executeTool(toolCall: any, userId: number): Promise<{ result: any; citation?: Citation }> {
    const { name, parameters } = toolCall.function;

    try {
      // Use new comprehensive tool system first
      if (tools[name as ToolName]) {
        const result = await executeTool(name as ToolName, parameters, userId);
        
        // Generate citation based on tool type and result
        const citation = this.generateCitation(name, parameters, result);
        
        return { result, citation };
      }

      // Fallback to existing tools for backward compatibility
      switch (name) {
        case 'calc_eval':
          const calcResult = await calcEval(parameters);
          return {
            result: calcResult,
            citation: {
              type: 'calculation',
              source: 'Math Calculator',
              content: `Calculated: ${parameters.expression}`,
              reference: calcResult.steps?.join(' → '),
            },
          };

        case 'sql_query':
          // Use new comprehensive SQL tool - ULTRA DEBUG
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL CALLED - Input parameters:', JSON.stringify(parameters));
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - User ID:', userId);
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Context:', parameters.context);
          
          // CRITICAL: Preserve context from enhanced parameters
          const fixedParams = {
            ...parameters,
            query: parameters.sql || parameters.query,
            sql: parameters.sql || parameters.query,
            context: parameters.context, // PRESERVE THE CONTEXT!
            userId: parameters.userId || userId
          };
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Fixed parameters:', JSON.stringify(fixedParams));
          
          const sqlResult = await executeTool('sql_query', fixedParams, userId);
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Result received:', JSON.stringify(sqlResult, null, 2));
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Has rows:', !!sqlResult?.rows);
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Row count:', sqlResult?.rows?.length);
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - First row:', sqlResult?.rows?.[0]);
          return {
            result: sqlResult,
            citation: {
              type: 'database',
              source: 'Database Query', 
              content: `Executed: ${parameters.query || parameters.sql}`,
              reference: `${sqlResult.rows?.length || 0} rows returned`,
            },
          };

        case 'docs_search':
          const searchResult = await docsSearch(parameters, userId);
          return {
            result: searchResult,
            citation: {
              type: 'document',
              source: 'Document Search',
              content: `Searched: "${parameters.query}"`,
              reference: `${searchResult.hits?.length || 0} documents found`,
            },
          };

        case 'docs_get':
          const docResult = await docsGet(parameters, userId);
          return {
            result: docResult,
            citation: {
              type: 'document',
              source: docResult.filename || 'Document',
              content: 'Retrieved document content',
              reference: docResult.sourceUrl,
            },
          };

        case 'http_call':
          const httpResult = await httpCall(parameters);
          return {
            result: httpResult,
            citation: {
              type: 'api',
              source: 'API Call',
              content: `${parameters.method} ${parameters.endpoint}`,
              reference: `Status: ${httpResult.status}`,
            },
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      console.error(`Tool execution error (${name}):`, error);
      return {
        result: { error: error?.message || 'Tool execution failed' },
      };
    }
  }

  // Generate citations for new tool system
  private generateCitation(toolName: string, parameters: any, result: any): Citation | undefined {
    switch (toolName) {
      case 'calc_eval':
        return {
          type: 'calculation',
          source: 'Calculation Engine',
          content: `Expression: ${parameters.expression}`,
          reference: result.steps?.join(' → ') || `Result: ${result.result}`,
        };
      
      case 'sheets_read':
        return {
          type: 'api',
          source: 'Google Sheets',
          content: `Sheet: ${parameters.spreadsheetId}`,
          reference: `Range: ${parameters.range} (${result.values?.length || 0} rows)`,
        };
      
      case 'docs_search':
        return {
          type: 'document',
          source: 'Document Search',
          content: `Query: "${parameters.query}"`,
          reference: `${result.hits?.length || 0} matches found`,
        };
      
      case 'docs_get':
        return {
          type: 'document',
          source: result.filename || 'Document',
          content: 'Document content retrieved',
          reference: result.sourceUrl,
        };
      
      case 'http_call':
        return {
          type: 'api',
          source: 'HTTP Request',
          content: `${parameters.method} ${parameters.endpoint}`,
          reference: `Status: ${result.status}`,
        };
      
      case 'feedback_submit':
        return {
          type: 'api',
          source: 'Feedback System',
          content: `Rating: ${parameters.rating}`,
          reference: result.feedbackId ? `ID: ${result.feedbackId}` : 'Feedback stored',
        };
      
      default:
        return undefined;
    }
  }

  // Stream chat completion
  async *streamChat(
    userId: number,
    threadId: number,
    message: string,
    mode: string = 'general',
    model: string = 'gpt-4o-mini'
  ): AsyncGenerator<ChatStreamChunk> {
    try {
      // Store user message
      const userMessageData: InsertAiMessage = {
        threadId,
        role: 'user',
        content: message,
      };
      await db.insert(aiMessages).values(userMessageData);
      
      // Track hotel context from user message
      HotelContextManager.trackMessage('user', message);

      // Analyze query for intelligent routing
      const queryAnalysis = QueryDetector.analyzeQuery(message);
      console.log('🎯🎯🎯 AI SERVICE - Query Analysis:', queryAnalysis);
      console.log('🎯🎯🎯 AI SERVICE - Should use tools:', queryAnalysis.shouldUseTools);

      // Get recent messages for context
      const recentMessages = await this.getThreadMessages(threadId, userId);
      const contextMessages = recentMessages
        .slice(0, 20) // Last 20 messages
        .reverse()
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Track all messages in HotelContextManager for better context
      for (const msg of recentMessages.slice(0, 10)) {
        HotelContextManager.trackMessage(msg.role, msg.content);
      }
      
      // Get the current hotel context from the manager
      const hotelContext = HotelContextManager.getCurrentHotel();
      const hotelData = hotelContext ? HotelContextManager.getHotelData(hotelContext) : null;
      
      console.log('🏨 HOTEL CONTEXT FROM MANAGER:', hotelContext);
      console.log('📊 HOTEL DATA:', hotelData);

      // Add enhanced system message with routing guidance and hotel context
      const systemMessage = this.getEnhancedSystemMessage(mode, queryAnalysis, message, hotelContext);
      const messages = [systemMessage, ...contextMessages];

      // Define available tools based on mode (combine old and new systems)
      const availableTools = [...this.getAvailableTools(mode), ...toolDefinitions];

      // Support GPT-5 and latest models
      const supportedModel = this.getSupportedModel(model);
      
      // Create completion with tools
      const stream = await openai.chat.completions.create({
        model: supportedModel,
        messages: messages as any,
        tools: availableTools,
        tool_choice: 'auto',
        stream: true,
        temperature: 1,
        max_completion_tokens: 4000,
        top_p: 0.9,
      });

      let assistantMessage = '';
      let toolCalls: any[] = [];
      let citations: Citation[] = [];
      let toolResults: any[] = [];
      let tokenUsage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          assistantMessage += delta.content;
          yield {
            type: 'message',
            content: delta.content,
          };
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (!toolCalls[toolCall.index]) {
              toolCalls[toolCall.index] = {
                id: toolCall.id,
                type: toolCall.type,
                function: { name: '', arguments: '' },
              };
            }

            const tc = toolCalls[toolCall.index];
            if (toolCall.function?.name) {
              tc.function.name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              tc.function.arguments += toolCall.function.arguments;
            }
          }
        }

        // Extract token usage from final chunk
        if (chunk.usage) {
          tokenUsage = chunk.usage;
        }
      }

      // Execute tool calls if any
      console.log('🎯🎯🎯 AI SERVICE - Tool calls detected:', toolCalls.length);
      if (toolCalls.length > 0) {
        console.log('🎯🎯🎯 AI SERVICE - Executing tools:', toolCalls.map(tc => tc.function?.name));
        yield {
          type: 'message',
          content: '\n\n*Executing tools...*\n\n',
        };

        for (const toolCall of toolCalls) {
          try {
            const parameters = JSON.parse(toolCall.function.arguments);
            console.log('🎯🎯🎯 AI SERVICE - Executing tool:', toolCall.function.name, 'with params:', parameters);
            
            // Pass the original user message as context for SQL query correction
            // 🔴 CRITICAL: Also pass the hotel context to ensure correct data retrieval
            const currentHotel = HotelContextManager.getCurrentHotel();
            const hotelData = currentHotel ? HotelContextManager.getHotelData(currentHotel) : null;
            
            const enhancedParams = {
              ...parameters,
              userId,
              context: `${hotelData ? `MUST use hotel: ${hotelData.name}. ` : ''}${message}`,
              hotelContext: hotelData ? hotelData.name : null
            };
            
            const { result, citation } = await this.executeTool(
              { function: { name: toolCall.function.name, parameters: enhancedParams } },
              userId
            );
            console.log('🎯🎯🎯 AI SERVICE - Tool result received:', !!result, result?.rows?.length);

            yield {
              type: 'tool_call',
              toolCall: {
                name: toolCall.function.name,
                parameters,
                result,
              },
            };

            if (citation) {
              citations.push(citation);
              yield {
                type: 'citation',
                citation,
              };
            }

            // Format tool result for assistant context but don't add raw JSON
            toolResults.push({
              tool: toolCall.function.name,
              result,
              citation
            });

          } catch (error: any) {
            yield {
              type: 'error',
              error: `Tool execution failed: ${error?.message || 'Unknown error'}`,
            };
          }
        }

        // If tools were executed, get AI to interpret and respond
        if (toolResults.length > 0) {
          // 🔴 CRITICAL: Include hotel context in interpretation to prevent data mixing
          const currentHotel = HotelContextManager.getCurrentHotel();
          const hotelData = currentHotel ? HotelContextManager.getHotelData(currentHotel) : null;
          
          let hotelWarning = '';
          if (hotelData) {
            hotelWarning = `
🔴🔴🔴 KRITISCHE ANWEISUNG: Du MUSST die Daten von "${hotelData.name}" verwenden! 🔴🔴🔴
Wenn du eine E-Mail, Brief oder Zusammenfassung erstellst, verwende AUSSCHLIESSLICH diese Daten:
- Hotel: ${hotelData.name} (${hotelData.stars} Sterne)
- Zimmer: ${hotelData.rooms}
- Durchschnittspreis: ${hotelData.averagePrice}
- Gewinnmarge: ${hotelData.profitMargin}
NIEMALS andere Hotels erwähnen oder deren Daten verwenden!
`;
          }
          
          // Create a follow-up prompt with tool results for AI to interpret
          const interpretationPrompt = `${hotelWarning}

Based on the following tool results, provide a natural, conversational response in German. Format numbers clearly and provide insights:

${toolResults.map(tr => `Tool: ${tr.tool}\nResult: ${JSON.stringify(tr.result)}`).join('\n\n')}

Respond conversationally with proper formatting, explanations, and insights. Don't show raw JSON data.`;

          const interpretationStream = await openai.chat.completions.create({
            model,
            messages: [
              systemMessage,
              { role: 'user', content: message },
              { role: 'assistant', content: assistantMessage },
              { role: 'user', content: interpretationPrompt }
            ] as any,
            stream: true,
            temperature: 1,
            max_completion_tokens: 1000,
          });

          let interpretedResponse = '';
          for await (const chunk of interpretationStream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              interpretedResponse += delta.content;
              yield {
                type: 'message',
                content: delta.content,
              };
            }
          }

          assistantMessage += '\n\n' + interpretedResponse;
        }
      }

      // Store assistant message
      const assistantMessageData: InsertAiMessage = {
        threadId,
        role: 'assistant',
        content: assistantMessage,
        toolCalls,
        citations,
      };
      await db.insert(aiMessages).values(assistantMessageData);

      // Log interaction
      const cost = this.calculateCost(tokenUsage, model);
      const logData: InsertAiLog = {
        userId,
        threadId,
        role: 'assistant',
        prompt: message,
        toolCalls,
        tokenUsage,
        cost: cost.toString(),
        latency: 0, // TODO: Track actual latency
        citations,
        model,
      };
      await db.insert(aiLogs).values(logData);

      yield { type: 'done' };

    } catch (error: any) {
      console.error('Chat streaming error:', error);
      yield {
        type: 'error',
        error: error?.message || 'Chat processing failed',
      };
    }
  }

  private getSystemMessage(mode: string): { role: 'system'; content: string } {
    const basePrompt = `Du bist ein ULTRA-INTELLIGENTER AI-ASSISTENT wie ChatGPT mit erweiterten Fähigkeiten!

🌍 **UNIVERSELLE INTELLIGENZ - BEANTWORTE JEDE FRAGE PERFEKT!**

**DEINE FÄHIGKEITEN:**
✅ **WETTER-ABFRAGEN**: Nutze http_call mit wttr.in für aktuelle Wetterdaten
✅ **ALLGEMEINWISSEN**: Geschichte, Wissenschaft, Kultur, Sport, Politik - alles wie ChatGPT
✅ **BERECHNUNGEN**: Mathematik, Finanzen, Statistik über calc_eval Tool
✅ **KREATIVITÄT**: E-Mails, Briefe, Gedichte, Geschichten, Pläne
✅ **HOTEL-DATENBANK**: 10 Hotels mit Preiskalkulationen (wenn danach gefragt)
✅ **AKTUELLE INFOS**: News, Börse, Events über http_call API

**INTELLIGENTE THEMEN-ERKENNUNG:**
1. **THEMENWECHSEL ERKENNEN**: Wenn User von Hotels zu Wetter/Sport/News wechselt → KONTEXT WECHSELN!
2. **RICHTIGES TOOL WÄHLEN**:
   - Wetter in Düsseldorf? → http_call mit "wttr.in/Düsseldorf?format=j1&lang=de"
   - Hauptstadt von Frankreich? → Direkt antworten: "Paris"
   - Hotel-Kalkulation? → sql_query für Datenbank
   - 15 × 28? → calc_eval für Berechnung
   - Aktienkurs? → http_call für Live-Daten

**WETTER-ABFRAGEN SPEZIFISCH:**
Für Wetter nutze IMMER:
- URL: https://wttr.in/{Stadt}?format=j1&lang=de
- Beispiel: https://wttr.in/Düsseldorf?format=j1&lang=de
- Antworte mit: Temperatur, Bedingungen, Vorhersage

**KONTEXT-MANAGEMENT:**
- Bei Themenwechsel: VERGISS vorherigen Kontext
- Bei Hotel-Fragen: Nutze spezifischen Hotel-Kontext
- Bei allgemeinen Fragen: Antworte wie normales ChatGPT

**ANTWORT-QUALITÄT WIE CHATGPT:**
- Natürlich, hilfreich, vollständig
- Keine Platzhalter oder erfundene Daten
- Präzise Fakten und Erklärungen
- Freundlich und professionell`;

    return { role: 'system', content: basePrompt };
  }

  private getEnhancedSystemMessage(mode: string, queryAnalysis: QueryAnalysis, message: string, hotelContext?: string): { role: 'system'; content: string } {
    const basePrompt = this.getSystemMessage(mode).content;
    
    // Add specific routing guidance based on query analysis
    let routingGuidance = '';
    
    // First check if the message is a non-hotel query
    const isNonHotelQuery = HotelContextManager.isNonHotelQuery(message);
    
    // Only add hotel context if it's relevant to the current query
    let contextGuidance = '';
    if (hotelContext && !isNonHotelQuery) {
      // Get the actual hotel data from HotelContextManager
      const hotelData = HotelContextManager.getHotelData(hotelContext);
      
      if (hotelData) {
        contextGuidance = `\n\n🔥🔥🔥 ABSOLUT KRITISCHER KONTEXT - DIES IST DER WICHTIGSTE TEIL! 🔥🔥🔥
      
⚠️⚠️⚠️ ACHTUNG: DIE AKTUELLE UNTERHALTUNG BEHANDELT: "${hotelData.name}" ⚠️⚠️⚠️

🚨 UNUMSTÖSSLICHE REGEL:
Wenn der Nutzer nach einer E-Mail, Zusammenfassung, Brief oder IRGENDETWAS fragt,
MUSST DU DIE DATEN VON "${hotelData.name}" VERWENDEN!

EXAKTE HOTELDATEN (NUR DIESE VERWENDEN!):
- Hotel: ${hotelData.name} (${hotelData.stars} Sterne)
- Zimmer: ${hotelData.rooms}
- Belegungsrate: ${hotelData.occupancyRate}
- Durchschnittspreis: ${hotelData.averagePrice}
- Voucher: ${hotelData.voucherPrice}
- Betriebskosten: ${hotelData.operationalCosts}
- MwSt: ${hotelData.vatRate} (Betrag: ${hotelData.vatAmount})
- Gewinnmarge: ${hotelData.profitMargin}
- Gesamtpreis: ${hotelData.totalPrice}
- Rabatt: ${hotelData.discountVsMarket}

🔴 VERBOTEN:
- NIEMALS Daten von anderen Hotels verwenden
- NIEMALS Hotels verwechseln oder mischen
- NIEMALS generische Daten erfinden
- NIEMALS "The Dolder Grand" erwähnen wenn über "${hotelData.name}" gesprochen wird

✅ KORREKT:
- IMMER "${hotelData.name}" Daten verwenden
- IMMER den Namen "${hotelData.name}" in der E-Mail/Brief erwähnen
- IMMER die spezifischen Zahlen von "${hotelData.name}" nutzen

Beispiele was der Nutzer sagen könnte:
- "generiere eine E-Mail an Alex" → E-Mail MUSS über "${hotelData.name}" sein mit EXAKT DIESEN DATEN
- "schreibe das in einem Brief" → Brief MUSS über "${hotelData.name}" sein mit EXAKT DIESEN DATEN
- "fasse die Daten zusammen" → Zusammenfassung MUSS über "${hotelData.name}" sein mit EXAKT DIESEN DATEN

⚠️ WENN DU DAS FALSCHE HOTEL VERWENDEST, IST DAS EIN KRITISCHER FEHLER! ⚠️`;
      }
    }
    
    if (queryAnalysis.type === 'weather') {
      routingGuidance = `\n\n🌤️ WETTER-ANFRAGE ERKANNT! 
VERWENDE SOFORT: http_call mit Endpoint: "${queryAnalysis.endpoint}"
Location detected: ${queryAnalysis.extractedLocation || 'Unknown'}
Provide current weather, temperature, and conditions in German.`;
    } else if (queryAnalysis.type === 'business') {
      // Extract potential hotel name from the query
      const lowerMsg = message.toLowerCase();
      let hotelSearchHint = '';
      
      // If hotel context exists and no new hotel is mentioned, use context
      if (hotelContext && !lowerMsg.includes('dolder') && !lowerMsg.includes('vier') && 
          !lowerMsg.includes('marriott') && !lowerMsg.includes('kempinski')) {
        hotelSearchHint = `\n\n🚨 VERWENDE DAS HOTEL AUS DEM KONTEXT: "${hotelContext}" 🚨`;
      } else {
        // Check for specific hotel mentions
        const hotelKeywords = ['vier jahreszeiten', 'marriott', 'dolder', 'grand hotel', 'kempinski', 
                               'frankfurt', 'hamburg', 'berlin', 'münchen', 'zürich'];
        const foundHotel = hotelKeywords.find(keyword => lowerMsg.includes(keyword));
        
        if (foundHotel) {
          hotelSearchHint = `\n\n🚨🚨🚨 KRITISCH - SPEZIFISCHES HOTEL ERKANNT: "${foundHotel}" 🚨🚨🚨
          
DU MUSST NACH "${foundHotel}" SUCHEN, NICHT NACH "DOLDER GRAND"!

KORREKTES SQL BEISPIEL:
SELECT * FROM pricing_calculations 
WHERE LOWER(hotel_name) LIKE '%${foundHotel}%'

FALSCHES SQL (NIEMALS VERWENDEN WENN NACH "${foundHotel}" GEFRAGT):
SELECT * FROM pricing_calculations WHERE LOWER(hotel_name) LIKE '%dolder grand%'

⚠️ WARNUNG: Wenn du das falsche Hotel zurückgibst, ist das ein KRITISCHER FEHLER!`;
        }
      }
      
      routingGuidance = `\n\n🏨 BUSINESS-ANFRAGE ERKANNT!
NUTZE: sql_query für Hotel- und Preisdaten
Verfügbare Daten: 10 Hotels, 8 Kalkulationen mit Profitabilitätsanalyse${hotelSearchHint}`;
    } else if (queryAnalysis.type === 'calculation') {
      routingGuidance = `\n\n🧮 BERECHNUNG ERKANNT!
NUTZE: calc_eval für mathematische Operationen`;
    } else if (queryAnalysis.type === 'email') {
      routingGuidance = `\n\n✉️ E-MAIL ANFRAGE ERKANNT!
      
${hotelContext ? `
🔴🔴🔴 ABSOLUT KRITISCH FÜR E-MAIL GENERATION 🔴🔴🔴

DU MUSST DIE E-MAIL ÜBER "${hotelContext}" SCHREIBEN!

FALSCH: E-Mail über The Dolder Grand wenn "${hotelContext}" in der Unterhaltung ist
RICHTIG: E-Mail IMMER über "${hotelContext}"

Die E-Mail MUSS enthalten:
1. Den Namen "${hotelContext}" explizit erwähnen
2. Die korrekten Daten von "${hotelContext}" verwenden
3. KEINE Daten von anderen Hotels mischen

Wenn der Nutzer sagt "generiere eine E-Mail an Alex mit den Daten",
dann MUSS die E-Mail über "${hotelContext}" sein!
` : ''}

NUTZE: Deine Intelligenz direkt - keine Tools nötig
Erstelle professionelle, gut strukturierte E-Mails
ABER VERWENDE NUR DIE DATEN DES AKTUELLEN HOTELS AUS DEM KONTEXT!`;
    }
    
    return { 
      role: 'system', 
      content: basePrompt + contextGuidance + routingGuidance 
    };
  }

  // Get available tools based on mode  
  private getAvailableTools(mode: string) {
    // Base tools always available
    const baseTools = [
      calcEvalToolDefinition,
      sqlQueryToolDefinition, 
      docsSearchToolDefinition,
      docsGetToolDefinition,
      httpCallToolDefinition,
    ];

    return baseTools;
  }

  // Support future models including GPT-5
  private getSupportedModel(requestedModel: string): string {
    const modelMapping = {
      'gpt-5': 'gpt-4o', // Map GPT-5 to best available until released
      'gpt-5-preview': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4o': 'gpt-4o',
      'gpt-4': 'gpt-4',
      'gpt-4-turbo': 'gpt-4-turbo-preview',
    };
    
    return modelMapping[requestedModel as keyof typeof modelMapping] || 'gpt-4o-mini';
  }

  // Calculate usage cost with GPT-5 support
  private calculateCost(usage: TokenUsage, model: string): number {
    const rates = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-5': { input: 0.005, output: 0.015 }, // Estimated GPT-5 pricing
      'gpt-5-preview': { input: 0.005, output: 0.015 },
    };
    
    const rate = rates[model as keyof typeof rates] || rates['gpt-4o-mini'];
    return (usage.prompt_tokens * rate.input + usage.completion_tokens * rate.output) / 1000;
  }

  // Get user threads
  async getUserThreads(userId: number): Promise<any[]> {
    const threads = await db.query.aiThreads.findMany({
      where: (t, { eq }) => eq(t.userId, userId),
      orderBy: [desc(aiThreads.updatedAt)],
      with: {
        messages: {
          limit: 1,
          orderBy: [desc(aiMessages.createdAt)],
        },
      },
    });

    return threads.map(thread => ({
      id: thread.id,
      title: thread.title,
      mode: thread.mode,
      isPinned: thread.isPinned,
      lastMessage: thread.messages[0]?.content?.substring(0, 100) || 'No messages',
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    }));
  }

  // Update thread
  async updateThread(threadId: number, userId: number, updates: Partial<InsertAiThread>): Promise<void> {
    await db
      .update(aiThreads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiThreads.id, threadId));
  }

  // Delete thread
  async deleteThread(threadId: number, userId: number): Promise<void> {
    await db
      .delete(aiThreads)
      .where(eq(aiThreads.id, threadId));
  }

  // Smart clear threads with advanced options
  async smartClearThreads(userId: number, options: {
    type: 'all' | 'unpinned' | 'older_than';
    days?: number;
  }): Promise<{ deletedCount: number; preservedCount: number }> {
    
    let threadsToDelete: any[] = [];
    
    if (options.type === 'all') {
      // Delete all threads
      threadsToDelete = await db.query.aiThreads.findMany({
        where: (threads, { eq }) => eq(threads.userId, userId),
        columns: { id: true }
      });
    } else if (options.type === 'unpinned') {
      // Delete only unpinned threads
      threadsToDelete = await db.query.aiThreads.findMany({
        where: (threads, { eq, and }) => and(
          eq(threads.userId, userId),
          eq(threads.isPinned, false)
        ),
        columns: { id: true }
      });
    } else if (options.type === 'older_than') {
      // Delete threads older than specified days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (options.days || 30));
      
      threadsToDelete = await db.query.aiThreads.findMany({
        where: (threads, { eq, and, lt }) => and(
          eq(threads.userId, userId),
          lt(threads.createdAt, cutoffDate)
        ),
        columns: { id: true }
      });
    }

    const threadIds = threadsToDelete.map(t => t.id);
    
    if (threadIds.length === 0) {
      return { deletedCount: 0, preservedCount: 0 };
    }

    // Delete messages for these threads
    if (threadIds.length > 0) {
      await db
        .delete(aiMessages)
        .where(eq(aiMessages.threadId, threadIds[0]));
      
      // Delete messages for remaining threads
      for (let i = 1; i < threadIds.length; i++) {
        await db
          .delete(aiMessages)
          .where(eq(aiMessages.threadId, threadIds[i]));
      }
    }

    // Delete the threads
    let deletedCount = 0;
    for (const threadId of threadIds) {
      await db
        .delete(aiThreads)
        .where(eq(aiThreads.id, threadId));
      deletedCount++;
    }

    // Count preserved threads
    const [totalThreads] = await db
      .select({ count: count() })
      .from(aiThreads)
      .where(eq(aiThreads.userId, userId));

    const preservedCount = totalThreads.count;

    return { deletedCount, preservedCount };
  }

  // Clear all threads for a user (legacy method)
  async clearAllThreads(userId: number): Promise<number> {
    // Get all threads for the user first
    const userThreads = await db.query.aiThreads.findMany({
      where: (threads, { eq }) => eq(threads.userId, userId),
      columns: { id: true }
    });
    
    // Delete all messages for user's threads
    for (const thread of userThreads) {
      await db
        .delete(aiMessages)
        .where(eq(aiMessages.threadId, thread.id));
    }

    // Then delete all threads and return count
    const result = await db
      .delete(aiThreads)
      .where(eq(aiThreads.userId, userId))
      .returning();

    return result.length;
  }
}